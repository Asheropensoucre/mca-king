import { writeAuditLog } from '../../lib/audit'
import { requireAuth } from '../../lib/requireAuth'
import { badRequest, getId, json, notFound, type RouteContext } from '../../lib/route-utils'
import { supabaseAdmin } from '../../lib/supabase-server'

type DocumentRow = { id: string; storage_path: string; merchant_id: string | null; file_name: string; doc_type: string | null }

export async function DELETE(req: Request, context?: RouteContext): Promise<Response> {
  const user = await requireAuth(req, 'admin')
  const id = getId(context)
  if (!id) return badRequest()

  const { data: doc, error: fetchError } = await supabaseAdmin.from('documents').select('id,storage_path,merchant_id,file_name,doc_type').eq('id', id).maybeSingle<DocumentRow>()
  if (fetchError) return badRequest(fetchError.message)
  if (!doc) return notFound()

  const { error: storageError } = await supabaseAdmin.storage.from('documents').remove([doc.storage_path])
  if (storageError) return badRequest(storageError.message)

  const { error } = await supabaseAdmin.from('documents').delete().eq('id', id)
  if (error) return badRequest(error.message)

  await writeAuditLog({ req, user_id: user.id, action: 'document.deleted', entity_type: 'document', entity_id: id, metadata: { merchant_id: doc.merchant_id, file_name: doc.file_name, doc_type: doc.doc_type } })

  return json({ success: true })
}
