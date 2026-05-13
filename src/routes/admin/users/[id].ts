import { writeActivity } from '../../../lib/activity'
import { emailBelongsToAnotherUser, getAccountUserById, isUserRole, normalizeEmail, toUserProfile } from '../../../lib/account-users'
import { requireAuth } from '../../../lib/requireAuth'
import { revokeUserSessions } from '../../../lib/revoke-sessions'
import { badRequest, forbidden, getId, json, notFound, type RouteContext } from '../../../lib/route-utils'
import { supabaseAdmin } from '../../../lib/supabase-server'

type UserPatchBody = {
  full_name?: string | null
  email?: string
  role?: string
}

export async function GET(req: Request, context?: RouteContext): Promise<Response> {
  const currentUser = await requireAuth(req)
  if (currentUser.role !== 'admin') return forbidden()

  const id = getId(context)
  if (!id) return badRequest('id is required')

  const row = await getAccountUserById(id)
  if (!row) return notFound('User not found')
  return json(toUserProfile(row))
}

export async function PATCH(req: Request, context?: RouteContext): Promise<Response> {
  const currentUser = await requireAuth(req)
  if (currentUser.role !== 'admin') return forbidden()

  const id = getId(context)
  if (!id) return badRequest('id is required')

  const existing = await getAccountUserById(id)
  if (!existing) return notFound('User not found')

  const body = await req.json() as UserPatchBody
  const update: Record<string, unknown> = { updatedAt: new Date().toISOString() }
  const activityBodies: string[] = []
  let shouldRevokeSessions = false

  if (body.full_name !== undefined) {
    const fullName = body.full_name?.trim() || null
    update.full_name = fullName
    update.name = fullName
  }

  if (body.email !== undefined) {
    const nextEmail = normalizeEmail(body.email)
    if (!nextEmail) return badRequest('email cannot be blank')
    if (await emailBelongsToAnotherUser(nextEmail, id)) return badRequest('Email already exists')
    if (nextEmail !== existing.email) {
      update.email = nextEmail
      activityBodies.push(`Email changed from ${existing.email} to ${nextEmail}`)
      shouldRevokeSessions = true
    }
  }

  if (body.role !== undefined) {
    if (!isUserRole(body.role)) return badRequest('role is invalid')
    if (body.role !== existing.role) {
      update.role = body.role
      activityBodies.push(`Role changed from ${existing.role} to ${body.role}`)
      shouldRevokeSessions = true
    }
  }

  const { data, error } = await supabaseAdmin
    .from('users')
    .update(update)
    .eq('id', id)
    .select('id,email,role,full_name,name,is_disabled,disabled_at,closed_at,last_login_at,created_at,createdAt,updatedAt')
    .single()

  if (error) return badRequest(error.message)

  if (shouldRevokeSessions) await revokeUserSessions(id)
  await Promise.all(activityBodies.map(bodyText => writeActivity({
    entity_type: 'user',
    entity_id: id,
    user_id: currentUser.id,
    activity_type: 'system',
    body: bodyText,
  })))

  return json(toUserProfile(data))
}
