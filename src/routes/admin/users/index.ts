import { hashPassword } from '@better-auth/utils/password'
import { writeActivity } from '../../../lib/activity'
import { isUserRole, normalizeEmail, toUserProfile, type AccountUserRow } from '../../../lib/account-users'
import { requireAuth } from '../../../lib/requireAuth'
import { badRequest, forbidden, json } from '../../../lib/route-utils'
import { createUserWithCredential } from '../../../lib/session-auth'
import { supabaseAdmin } from '../../../lib/supabase-server'

type CreateSalesRepBody = {
  email?: string
  password?: string
  full_name?: string
}

export async function GET(req: Request): Promise<Response> {
  const user = await requireAuth(req)
  if (user.role !== 'admin') return forbidden()

  const url = new URL(req.url)
  const role = url.searchParams.get('role')
  const disabled = url.searchParams.get('is_disabled')
  const search = (url.searchParams.get('search') ?? '').trim().replace(/[%,()]/g, ' ')
  const status = url.searchParams.get('status')

  if (role && !isUserRole(role)) return badRequest('role is invalid')

  let query = supabaseAdmin
    .from('users')
    .select('id,email,role,full_name,name,is_disabled,disabled_at,closed_at,last_login_at,created_at,createdAt,updatedAt')
    .order('createdAt', { ascending: false })
    .limit(100)

  if (role) query = query.eq('role', role)
  if (disabled === 'true') query = query.eq('is_disabled', true).is('closed_at', null)
  if (disabled === 'false') query = query.eq('is_disabled', false).is('closed_at', null)
  if (status === 'closed') query = query.not('closed_at', 'is', null)
  if (search) query = query.or(`email.ilike.%${search}%,full_name.ilike.%${search}%,name.ilike.%${search}%`)

  const { data, error } = await query.returns<AccountUserRow[]>()
  if (error) return badRequest(error.message)

  return json((data ?? []).map(toUserProfile))
}

export async function POST(req: Request): Promise<Response> {
  const user = await requireAuth(req)
  if (user.role !== 'admin') return forbidden()

  const body = await req.json() as CreateSalesRepBody
  if (!body.email || !body.password) return badRequest('Email and password are required')
  if (body.password.length < 8) return badRequest('Password must be at least 8 characters')

  const email = normalizeEmail(body.email)
  const { data: existing, error: existingError } = await supabaseAdmin
    .from('users')
    .select('id')
    .eq('email', email)
    .maybeSingle<{ id: string }>()
  if (existingError) return badRequest(existingError.message)
  if (existing) return badRequest('Email already exists')

  try {
    const created = await createUserWithCredential({
      email,
      passwordHash: await hashPassword(body.password),
      role: 'sales_rep',
      fullName: body.full_name?.trim() || email,
    })

    await writeActivity({
      entity_type: 'user',
      entity_id: created.id,
      user_id: user.id,
      activity_type: 'system',
      body: `Sales rep account created: ${created.full_name ?? created.email}`,
    })

    const row = await supabaseAdmin
      .from('users')
      .select('id,email,role,full_name,name,is_disabled,disabled_at,closed_at,last_login_at,created_at,createdAt,updatedAt')
      .eq('id', created.id)
      .single<AccountUserRow>()

    if (row.error) return badRequest(row.error.message)
    return json(toUserProfile(row.data), { status: 201 })
  } catch (error) {
    console.error('Create sales rep failed', error)
    return badRequest(error instanceof Error ? error.message : 'Create sales rep failed')
  }
}
