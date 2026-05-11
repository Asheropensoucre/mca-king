import type { DocType } from '../../../types'
import { requireAuth } from '../../lib/requireAuth'
import { badRequest, forbidden, json } from '../../lib/route-utils'
import { supabaseAdmin } from '../../lib/supabase-server'

const DOC_TYPES: DocType[] = ['bank_statement', 'contract', 'stipulation', 'id', 'other']

const isDocType = (value: FormDataEntryValue | null): value is DocType => (
  typeof value === 'string' && DOC_TYPES.includes(value as DocType)
)

async function canUpload(userId: string, role: string, merchantId: string): Promise<boolean | Response> {
  if (role === 'admin' || role === 'sales_rep' || role === 'lender') return true
  if (role !== 'merchant') return false
  const { data, error } = await supabaseAdmin.from('merchants').select('id').eq('id', merchantId).eq('user_id', userId).maybeSingle<{ id: string }>()
  if (error) return badRequest(error.message)
  return Boolean(data)
}

export async function POST(req: Request): Promise<Response> {
  const user = await requireAuth(req)
  const formData = await req.formData()
  const fileValue = formData.get('file')
  const merchantIdValue = formData.get('merchant_id')
  const docTypeValue = formData.get('doc_type')
  const stipulationIdValue = formData.get('stipulation_id')

  if (!(fileValue instanceof File)) return badRequest('file is required')
  if (typeof merchantIdValue !== 'string' || !merchantIdValue) return badRequest('merchant_id is required')
  if (!isDocType(docTypeValue)) return badRequest('invalid doc_type')

  const allowed = await canUpload(user.id, user.role, merchantIdValue)
  if (allowed instanceof Response) return allowed
  if (!allowed) return forbidden()

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

  return json(data, { status: 201 })
}
