import { hashPassword } from '@better-auth/utils/password'
import { writeActivity } from '../../../../lib/activity'
import { getAccountUserById } from '../../../../lib/account-users'
import { requireAuth } from '../../../../lib/requireAuth'
import { revokeUserSessions } from '../../../../lib/revoke-sessions'
import { badRequest, forbidden, getId, json, notFound, type RouteContext } from '../../../../lib/route-utils'
import { supabaseAdmin } from '../../../../lib/supabase-server'

type ResetPasswordBody = {
  new_password?: string
}

export async function POST(req: Request, context?: RouteContext): Promise<Response> {
  const currentUser = await requireAuth(req)
  if (currentUser.role !== 'admin') return forbidden()

  const id = getId(context)
  if (!id) return badRequest('id is required')

  const body = await req.json() as ResetPasswordBody
  if (!body.new_password) return badRequest('new_password is required')
  if (body.new_password.length < 8) return badRequest('Password must be at least 8 characters')

  const existing = await getAccountUserById(id)
  if (!existing) return notFound('User not found')

  const now = new Date().toISOString()
  const { error } = await supabaseAdmin
    .from('account')
    .update({ password: await hashPassword(body.new_password), updatedAt: now })
    .eq('userId', id)
    .eq('providerId', 'credential')

  if (error) return badRequest(error.message)

  await supabaseAdmin.from('users').update({ updatedAt: now }).eq('id', id)
  await revokeUserSessions(id)
  await writeActivity({
    entity_type: 'user',
    entity_id: id,
    user_id: currentUser.id,
    activity_type: 'system',
    body: 'Password reset by admin',
  })

  return json({ success: true })
}
