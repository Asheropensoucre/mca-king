import { writeActivity } from '../../../../lib/activity'
import { getAccountUserById } from '../../../../lib/account-users'
import { requireAuth } from '../../../../lib/requireAuth'
import { badRequest, forbidden, getId, json, notFound, type RouteContext } from '../../../../lib/route-utils'
import { supabaseAdmin } from '../../../../lib/supabase-server'

export async function POST(req: Request, context?: RouteContext): Promise<Response> {
  const currentUser = await requireAuth(req)
  if (currentUser.role !== 'admin') return forbidden()

  const id = getId(context)
  if (!id) return badRequest('id is required')

  const target = await getAccountUserById(id)
  if (!target) return notFound('User not found')
  if (target.closed_at) return forbidden('Closed accounts cannot be reactivated')

  const now = new Date().toISOString()
  const { error } = await supabaseAdmin
    .from('users')
    .update({ is_disabled: false, disabled_at: null, updatedAt: now })
    .eq('id', id)

  if (error) return badRequest(error.message)

  await writeActivity({
    entity_type: 'user',
    entity_id: id,
    user_id: currentUser.id,
    activity_type: 'system',
    body: 'Account reactivated',
  })

  return json({ success: true })
}
