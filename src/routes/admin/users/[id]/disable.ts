import { writeActivity } from '../../../../lib/activity'
import { getAccountUserById } from '../../../../lib/account-users'
import { requireAuth } from '../../../../lib/requireAuth'
import { revokeUserSessions } from '../../../../lib/revoke-sessions'
import { badRequest, forbidden, getId, json, notFound, type RouteContext } from '../../../../lib/route-utils'
import { supabaseAdmin } from '../../../../lib/supabase-server'

type DisableBody = {
  reason?: string
}

export async function POST(req: Request, context?: RouteContext): Promise<Response> {
  const currentUser = await requireAuth(req)
  if (currentUser.role !== 'admin') return forbidden()

  const id = getId(context)
  if (!id) return badRequest('id is required')

  const target = await getAccountUserById(id)
  if (!target) return notFound('User not found')
  if (target.role === 'admin') return forbidden('Admin accounts cannot be disabled')

  const body = await req.json().catch(() => ({})) as DisableBody
  const now = new Date().toISOString()
  const { error } = await supabaseAdmin
    .from('users')
    .update({ is_disabled: true, disabled_at: now, updatedAt: now })
    .eq('id', id)

  if (error) return badRequest(error.message)

  await revokeUserSessions(id)
  const reason = body.reason?.trim()
  await writeActivity({
    entity_type: 'user',
    entity_id: id,
    user_id: currentUser.id,
    activity_type: 'system',
    body: `Account disabled${reason ? `: ${reason}` : ''}`,
  })

  return json({ success: true })
}
