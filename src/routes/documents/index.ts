import type { Document } from '../../../types'
import { writeAuditLog } from '../../lib/audit'
import { canAccessMerchant } from '../../lib/permissions'
import { requireAuth } from '../../lib/requireAuth'
import { badRequest, forbidden, json } from '../../lib/route-utils'
import { supabaseAdmin } from '../../lib/supabase-server'

type DocumentRow = Document

export async function GET(req: Request): Promise<Response> {
  const user = await requireAuth(req)
  const merchantId = new URL(req.url).searchParams.get('merchant_id')
  if (!merchantId) return badRequest('merchant_id is required')

  if (!(await canAccessMerchant(user, merchantId))) return forbidden()

  const { data, error } = await supabaseAdmin
    .from('documents')
    .select('*')
    .eq('merchant_id', merchantId)
    .order('uploaded_at', { ascending: false })
    .returns<DocumentRow[]>()
  if (error) return badRequest(error.message)

  const docs = await Promise.all((data ?? []).map(async doc => {
    const { data: signedData } = await supabaseAdmin.storage.from('documents').createSignedUrl(doc.storage_path, 900)
    await writeAuditLog({
      req,
      user_id: user.id,
      action: 'document.signed_url_generated',
      entity_type: 'document',
      entity_id: doc.id,
      metadata: { merchant_id: merchantId, doc_type: doc.doc_type, file_name: doc.file_name },
    })
    return { ...doc, signed_url: signedData?.signedUrl }
  }))

  await writeAuditLog({
    req,
    user_id: user.id,
    action: 'document.listed',
    entity_type: 'merchant',
    entity_id: merchantId,
    metadata: { count: docs.length },
  })

  return json(docs)
}
