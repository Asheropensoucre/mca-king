import type { DocType } from '../../../types'
import { recordActivity } from '../../lib/activity'
import { writeAuditLog } from '../../lib/audit'
import { checkRateLimit, rateLimitKey } from '../../lib/rate-limit'
import { getLenderIdForUser } from '../../lib/merchant-file-submissions'
import { requireAuth } from '../../lib/requireAuth'
import { badRequest, forbidden, json } from '../../lib/route-utils'
import { supabaseAdmin } from '../../lib/supabase-server'

const DOC_TYPES: DocType[] = ['bank_statement', 'contract', 'stipulation', 'id', 'other']
const MAX_FILE_SIZE = 100 * 1024 * 1024
const ALLOWED_MIME_TYPES = new Map<string, string[]>([
  ['application/pdf', ['pdf']],
  ['image/png', ['png']],
  ['image/jpeg', ['jpg', 'jpeg']],
  ['text/csv', ['csv']],
  ['application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', ['xlsx']],
  ['application/vnd.ms-excel', ['xls']],
])

const isDocType = (value: FormDataEntryValue | null): value is DocType => (
  typeof value === 'string' && DOC_TYPES.includes(value as DocType)
)

function extensionOf(name: string): string {
  return name.includes('.') ? name.split('.').pop()?.toLowerCase() ?? '' : ''
}

function validateFile(file: File): Response | null {
  if (file.size > MAX_FILE_SIZE) return badRequest('File is too large. Maximum size is 100 MB.')
  const allowedExtensions = ALLOWED_MIME_TYPES.get(file.type)
  if (!allowedExtensions) return badRequest('Unsupported file type. Upload PDF, PNG, JPG, CSV, XLS, or XLSX files only.')
  if (!allowedExtensions.includes(extensionOf(file.name))) return badRequest('File extension does not match the uploaded file type.')
  return null
}

async function canUploadRegularDocument(userId: string, role: string, merchantId: string): Promise<boolean | Response> {
  if (role === 'admin') return true
  if (role === 'sales_rep') {
    const { data, error } = await supabaseAdmin.from('merchants').select('id').eq('id', merchantId).eq('assigned_rep_id', userId).maybeSingle<{ id: string }>()
    if (error) return badRequest(error.message)
    return Boolean(data)
  }
  if (role === 'merchant') {
    const { data, error } = await supabaseAdmin.from('merchants').select('id').eq('id', merchantId).eq('user_id', userId).maybeSingle<{ id: string }>()
    if (error) return badRequest(error.message)
    return Boolean(data)
  }
  if (role === 'lender') {
    const lenderId = await getLenderIdForUser(userId)
    if (!lenderId) return false
    const { data, error } = await supabaseAdmin
      .from('lender_matches')
      .select('id')
      .eq('merchant_id', merchantId)
      .eq('lender_id', lenderId)
      .maybeSingle<{ id: string }>()
    if (error) return badRequest(error.message)
    return Boolean(data)
  }
  return false
}

async function canUploadPayoffLetter(userId: string, role: string, merchantId: string, payoffRequestId: string): Promise<boolean | Response> {
  const { data: payoffRequest, error } = await supabaseAdmin
    .from('payoff_requests')
    .select('id,merchant_id,funding:fundings(lender_id)')
    .eq('id', payoffRequestId)
    .maybeSingle<{ id: string; merchant_id: string; funding?: { lender_id: string | null } | null }>()

  if (error) return badRequest(error.message)
  if (!payoffRequest || payoffRequest.merchant_id !== merchantId) return badRequest('payoff request does not belong to merchant')

  if (role === 'admin') return true
  if (role !== 'lender') return false

  const lenderId = await getLenderIdForUser(userId)
  return Boolean(lenderId && payoffRequest.funding?.lender_id === lenderId)
}

export async function POST(req: Request): Promise<Response> {
  const user = await requireAuth(req)
  const limited = await checkRateLimit({ key: rateLimitKey(req, 'documents.upload', user.id), limit: 30, windowMs: 60 * 60 * 1000, req, userId: user.id, action: 'documents.upload' })
  if (limited) return limited

  const formData = await req.formData()
  const fileValue = formData.get('file')
  const merchantIdValue = formData.get('merchant_id')
  const docTypeValue = formData.get('doc_type')
  const stipulationIdValue = formData.get('stipulation_id')
  const payoffRequestIdValue = formData.get('payoff_request_id')

  if (!(fileValue instanceof File)) return badRequest('file is required')
  if (typeof merchantIdValue !== 'string' || !merchantIdValue) return badRequest('merchant_id is required')
  if (!isDocType(docTypeValue)) return badRequest('invalid doc_type')
  const validationError = validateFile(fileValue)
  if (validationError) return validationError

  const isPayoffUpload = typeof payoffRequestIdValue === 'string' && payoffRequestIdValue.length > 0
  const allowed = isPayoffUpload
    ? await canUploadPayoffLetter(user.id, user.role, merchantIdValue, payoffRequestIdValue)
    : await canUploadRegularDocument(user.id, user.role, merchantIdValue)
  if (allowed instanceof Response) return allowed
  if (!allowed) return forbidden(isPayoffUpload ? 'Only the funding lender/funder or admin can upload this payoff letter' : 'Forbidden')

  const safeName = fileValue.name.replace(/[^a-zA-Z0-9._-]/g, '_')
  const storagePath = `${merchantIdValue}/${docTypeValue}/${crypto.randomUUID()}-${safeName}`
  const { error: uploadError } = await supabaseAdmin.storage
    .from('documents')
    .upload(storagePath, fileValue, { contentType: fileValue.type })

  if (uploadError) return badRequest(uploadError.message)

  const { data, error } = await supabaseAdmin
    .from('documents')
    .insert({
      merchant_id: merchantIdValue,
      uploaded_by: user.id,
      doc_type: docTypeValue,
      file_name: fileValue.name,
      storage_path: storagePath,
    })
    .select('*')
    .single()

  if (error) return badRequest(error.message)

  if (typeof stipulationIdValue === 'string' && stipulationIdValue) {
    const { error: stipError } = await supabaseAdmin
      .from('stipulations')
      .update({ is_fulfilled: true, fulfilled_at: new Date().toISOString() })
      .eq('id', stipulationIdValue)
      .eq('merchant_id', merchantIdValue)
    if (stipError) return badRequest(stipError.message)
  }

  if (isPayoffUpload) {
    const now = new Date().toISOString()
    const { error: payoffError } = await supabaseAdmin
      .from('payoff_requests')
      .update({ file_document_id: data.id, status: 'received', received_at: now, updated_at: now })
      .eq('id', payoffRequestIdValue)
      .eq('merchant_id', merchantIdValue)
    if (payoffError) return badRequest(payoffError.message)
  }

  const activityBody = isPayoffUpload
    ? `Payoff letter uploaded: ${fileValue.name}`
    : `Document uploaded: ${fileValue.name} (${docTypeValue})`
  const activityMetadata = { doc_type: docTypeValue, file_name: fileValue.name, document_id: data.id, payoff_request_id: isPayoffUpload ? payoffRequestIdValue : undefined }
  recordActivity({ entity_type: 'document', entity_id: merchantIdValue, user_id: user.id, activity_type: 'upload', body: activityBody, metadata: activityMetadata })
  recordActivity({ entity_type: 'merchant', entity_id: merchantIdValue, user_id: user.id, activity_type: 'upload', body: activityBody, metadata: activityMetadata })

  await writeAuditLog({ req, user_id: user.id, action: isPayoffUpload ? 'payoff_request.official_document_uploaded' : 'document.uploaded', entity_type: 'document', entity_id: data.id, metadata: { merchant_id: merchantIdValue, doc_type: docTypeValue, file_name: fileValue.name, file_size: fileValue.size, mime_type: fileValue.type, payoff_request_id: isPayoffUpload ? payoffRequestIdValue : null } })

  return json(data, { status: 201 })
}
