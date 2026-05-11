import { requireAuth } from '../../lib/requireAuth'
import { badRequest, getId, json, notFound, type RouteContext } from '../../lib/route-utils'
import { supabaseAdmin } from '../../lib/supabase-server'

type DocumentRow = { id: string; storage_path: string }

export async function DELETE(req: Request, context?: RouteContext): Promise<Response> {
  await requireAuth(req, 'admin')
  const id = getId(context)
  if (!id) return badRequest()

  const { data: doc, error: fetchError } = await supabaseAdmin.from('documents').select('id,storage_path').eq('id', id).maybeSingle<DocumentRow>()
  if (fetchError) return badRequest(fetchError.message)
  if (!doc) return notFound()

  const { error: storageError } = await supabaseAdmin.storage.from('documents').remove([doc.storage_path])
  if (storageError) return badRequest(storageError.message)

  const { error } = await supabaseAdmin.from('documents').delete().eq('id', id)
  if (error) return badRequest(error.message)

  return json({ success: true })
}
