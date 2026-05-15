import { recordActivity } from '../../../lib/activity'
import { canAccessLead } from '../../../lib/permissions'
import { requireAuth } from '../../../lib/requireAuth'
import { assertRole, badRequest, getId, json, type RouteContext } from '../../../lib/route-utils'
import { supabaseAdmin } from '../../../lib/supabase-server'

type NoteBody = { body?: string }

export async function POST(req: Request, context?: RouteContext): Promise<Response> {
  const user = await requireAuth(req)
  const roleError = assertRole(user, ['admin', 'sales_rep'])
  if (roleError) return roleError
  const id = getId(context)
  if (!id) return badRequest()
  if (!(await canAccessLead(user, id))) return new Response('Forbidden', { status: 403 })

  const body = await req.json() as NoteBody
  if (!body.body?.trim()) return badRequest('Note body is required')

  const { data, error } = await supabaseAdmin
    .from('lead_notes')
    .insert({ lead_id: id, written_by: user.id, body: body.body.trim() })
    .select('*')
    .single()
  if (error) return badRequest(error.message)

  recordActivity({
    entity_type: 'lead',
    entity_id: id,
    user_id: user.id,
    activity_type: 'note',
    body: body.body.trim(),
  })

  return json(data, { status: 201 })
}
