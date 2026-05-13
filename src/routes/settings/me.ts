import { hashPassword, verifyPassword } from '@better-auth/utils/password'
import { writeActivity } from '../../lib/activity'
import { getAccountUserById, toUserProfile } from '../../lib/account-users'
import { requireAuth } from '../../lib/requireAuth'
import { revokeUserSessions } from '../../lib/revoke-sessions'
import { badRequest, json } from '../../lib/route-utils'
import { supabaseAdmin } from '../../lib/supabase-server'

type PasswordBody = {
  current_password?: string
  new_password?: string
}

export async function GET(req: Request): Promise<Response> {
  const user = await requireAuth(req)
  const row = await getAccountUserById(user.id)
  if (!row) return new Response('User not found', { status: 404 })
  return json(toUserProfile(row))
}

export async function PATCH(req: Request): Promise<Response> {
  const user = await requireAuth(req)
  const body = await req.json() as PasswordBody

  if (!body.current_password || !body.new_password) return badRequest('Current password and new password are required')
  if (body.new_password.length < 8) return badRequest('New password must be at least 8 characters')

  const { data, error } = await supabaseAdmin
    .from('account')
    .select('password')
    .eq('userId', user.id)
    .eq('providerId', 'credential')
    .maybeSingle<{ password: string | null }>()

  if (error) return badRequest(error.message)
  if (!data?.password) return new Response('Credential account not found', { status: 404 })

  const valid = await verifyPassword(data.password, body.current_password)
  if (!valid) return new Response('Current password is incorrect', { status: 401 })

  const now = new Date().toISOString()
  const { error: updateError } = await supabaseAdmin
    .from('account')
    .update({ password: await hashPassword(body.new_password), updatedAt: now })
    .eq('userId', user.id)
    .eq('providerId', 'credential')

  if (updateError) return badRequest(updateError.message)

  await supabaseAdmin.from('users').update({ updatedAt: now }).eq('id', user.id)
  await revokeUserSessions(user.id)
  await writeActivity({
    entity_type: 'user',
    entity_id: user.id,
    user_id: user.id,
    activity_type: 'system',
    body: 'Password changed',
  })

  return json({ success: true })
}
