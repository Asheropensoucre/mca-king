import { writeAuditLog } from '../../../lib/audit'
import { requireAuth } from '../../../lib/requireAuth'
import { assertRole, badRequest, getId, json, notFound, type RouteContext } from '../../../lib/route-utils'
import { supabaseAdmin } from '../../../lib/supabase-server'

export async function PATCH(req: Request, context?: RouteContext): Promise<Response> {
  const user = await requireAuth(req)
  const roleError = assertRole(user, ['admin'])
  if (roleError) return roleError
  const id = getId(context)
  if (!id) return badRequest()
  const body = await req.json() as Record<string, unknown>
  const patch: Record<string, unknown> = { updated_by: user.id, updated_at: new Date().toISOString() }
  for (const key of ['name', 'subject', 'body', 'is_active']) {
    if (Object.prototype.hasOwnProperty.call(body, key)) patch[key] = body[key]
  }
  if (body.category === 'transactional' || body.category === 'campaign') patch.category = body.category
  if (body.channel === 'email') patch.channel = 'email'
  if (Array.isArray(body.variables)) patch.variables = body.variables

  const { data, error } = await supabaseAdmin
    .from('message_templates')
    .update(patch)
    .eq('id', id)
    .select('*')
    .single()
  if (error) return error.code === 'PGRST116' ? notFound() : badRequest(error.message)
  await writeAuditLog({ req, user_id: user.id, action: 'communications.template.updated', entity_type: 'message_template', entity_id: id, metadata: patch })
  return json(data)
}

export async function DELETE(req: Request, context?: RouteContext): Promise<Response> {
  const user = await requireAuth(req)
  const roleError = assertRole(user, ['admin'])
  if (roleError) return roleError
  const id = getId(context)
  if (!id) return badRequest()
  const { error } = await supabaseAdmin
    .from('message_templates')
    .update({ is_active: false, updated_by: user.id, updated_at: new Date().toISOString() })
    .eq('id', id)
  if (error) return badRequest(error.message)
  await writeAuditLog({ req, user_id: user.id, action: 'communications.template.disabled', entity_type: 'message_template', entity_id: id })
  return json({ success: true })
}
