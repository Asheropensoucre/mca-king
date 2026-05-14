import type { DocType } from '../../../types'
import { recordActivity } from '../../lib/activity'
import { getLenderIdForUser } from '../../lib/merchant-file-submissions'
import { requireAuth } from '../../lib/requireAuth'
import { badRequest, forbidden, json } from '../../lib/route-utils'
import { supabaseAdmin } from '../../lib/supabase-server'

const DOC_TYPES: DocType[] = ['bank_statement', 'contract', 'stipulation', 'id', 'other']

const isDocType = (value: FormDataEntryValue | null): value is DocType => (
  typeof value === 'string' && DOC_TYPES.includes(value as DocType)
)

async function canUploadRegularDocument(userId: string, role: string, merchantId: string): Promise<boolean | Response> {
  if (role === 'admin' || role === 'sales_rep') return true
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
  const formData = await req.formData()
  const fileValue = formData.get('file')
  const merchantIdValue = formData.get('merchant_id')
  const docTypeValue = formData.get('doc_type')
  const stipulationIdValue = formData.get('stipulation_id')
  const payoffRequestIdValue = formData.get('payoff_request_id')

  if (!(fileValue instanceof File)) return badRequest('file is required')
  if (typeof merchantIdValue !== 'string' || !merchantIdValue) return badRequest('merchant_id is required')
  if (!isDocType(docTypeValue)) return badRequest('invalid doc_type')

  const isPayoffUpload = typeof payoffRequestIdValue === 'string' && payoffRequestIdValue.length > 0
  const allowed = isPayoffUpload
    ? await canUploadPayoffLetter(user.id, user.role, merchantIdValue, payoffRequestIdValue)
    : await canUploadRegularDocument(user.id, user.role, merchantIdValue)
  if (allowed instanceof Response) return allowed
  if (!allowed) return forbidden(isPayoffUpload ? 'Only the funding lender/funder or admin can upload this payoff letter' : 'Forbidden')

  const safeName = fileValue.name.replace(/[^a-zA-Z0-9._-]/g, '_')
  const storagePath = `${merchantIdValue}/${docTypeValue}/${Date.now()}-${safeName}`
  const { error: uploadError } = await supabaseAdmin.storage
    .from('documents')
    .upload(storagePath, fileValue, { contentType: fileValue.type || 'application/octet-stream' })

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
  recordActivity({
    entity_type: 'document',
    entity_id: merchantIdValue,
    user_id: user.id,
    activity_type: 'upload',
    body: activityBody,
    metadata: activityMetadata,
  })
  recordActivity({
    entity_type: 'merchant',
    entity_id: merchantIdValue,
    user_id: user.id,
    activity_type: 'upload',
    body: activityBody,
    metadata: activityMetadata,
  })

  return json(data, { status: 201 })
}
