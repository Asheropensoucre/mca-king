import type { AuthUser, UserRole } from '../../types'
import { supabaseAdmin } from './supabase-server'

export const SESSION_COOKIE_NAME = 'mca_session'
const SESSION_MAX_AGE_SECONDS = 60 * 60 * 24 * 7
const isProduction = process.env.NODE_ENV === 'production'

function sessionCookieAttributes(maxAge: number): string {
  return [
    'Path=/',
    `Max-Age=${maxAge}`,
    'HttpOnly',
    'SameSite=Lax',
    ...(isProduction ? ['Secure'] : []),
  ].join('; ')
}

export type UserRow = {
  id: string
  email: string
  role: UserRole
  full_name: string | null
  name: string | null
  is_disabled?: boolean
  disabled_at?: string | null
  closed_at?: string | null
  last_login_at?: string | null
  created_at?: string | null
}

type AccountRow = {
  password: string | null
  users: UserRow | null
}

export type SessionRow = {
  id: string
  token: string
  expiresAt: string
  csrf_token?: string | null
  users: UserRow | null
}

export function serializeSessionCookie(token: string): string {
  return `${SESSION_COOKIE_NAME}=${encodeURIComponent(token)}; ${sessionCookieAttributes(SESSION_MAX_AGE_SECONDS)}`
}

export function serializeExpiredSessionCookie(): string {
  return `${SESSION_COOKIE_NAME}=; ${sessionCookieAttributes(0)}`
}

function parseCookies(header: string | null): Map<string, string> {
  const cookies = new Map<string, string>()
  if (!header) return cookies

  for (const part of header.split(';')) {
    const [rawName, ...rawValue] = part.trim().split('=')
    if (!rawName || rawValue.length === 0) continue
    cookies.set(rawName, decodeURIComponent(rawValue.join('=')))
  }

  return cookies
}

export function getSessionToken(req: Request): string | null {
  return parseCookies(req.headers.get('cookie')).get(SESSION_COOKIE_NAME) ?? null
}

export function toAuthUser(row: UserRow): AuthUser {
  return {
    id: row.id,
    email: row.email,
    role: row.role,
    full_name: row.full_name,
    name: row.name,
  }
}

export async function findUserByEmail(email: string): Promise<UserRow | null> {
  const { data, error } = await supabaseAdmin
    .from('users')
    .select('id,email,role,full_name,name,is_disabled,disabled_at,closed_at,last_login_at,created_at')
    .eq('email', email.toLowerCase())
    .maybeSingle<UserRow>()

  if (error) throw new Error(error.message)
  return data ?? null
}

export async function findCredentialAccount(email: string): Promise<AccountRow | null> {
  const user = await findUserByEmail(email)
  if (!user) return null

  const { data, error } = await supabaseAdmin
    .from('account')
    .select('password')
    .eq('providerId', 'credential')
    .eq('userId', user.id)
    .maybeSingle<{ password: string | null }>()

  if (error) throw new Error(error.message)
  return data ? { password: data.password, users: user } : null
}

export async function createUserWithCredential(params: {
  email: string
  passwordHash: string
  role: UserRole
  fullName: string
}): Promise<AuthUser> {
  const now = new Date().toISOString()
  const userId = crypto.randomUUID()

  const { data: createdUser, error: userError } = await supabaseAdmin
    .from('users')
    .insert({
      id: userId,
      email: params.email.toLowerCase(),
      password_hash: null,
      role: params.role,
      full_name: params.fullName,
      name: params.fullName,
      emailVerified: false,
      image: null,
      createdAt: now,
      updatedAt: now,
    })
    .select('id,email,role,full_name,name,is_disabled,disabled_at,closed_at,last_login_at,created_at')
    .single<UserRow>()

  if (userError) throw new Error(userError.message)

  const { error: accountError } = await supabaseAdmin
    .from('account')
    .insert({
      id: crypto.randomUUID(),
      accountId: createdUser.id,
      providerId: 'credential',
      userId: createdUser.id,
      password: params.passwordHash,
      createdAt: now,
      updatedAt: now,
    })

  if (accountError) {
    await supabaseAdmin.from('users').delete().eq('id', createdUser.id)
    throw new Error(accountError.message)
  }

  return toAuthUser(createdUser)
}

export async function createSession(userId: string, csrfToken?: string): Promise<string> {
  const tokenBytes = new Uint8Array(32)
  crypto.getRandomValues(tokenBytes)
  const token = Array.from(tokenBytes, byte => byte.toString(16).padStart(2, '0')).join('')
  const now = new Date()
  const expiresAt = new Date(now.getTime() + SESSION_MAX_AGE_SECONDS * 1000).toISOString()

  const { error } = await supabaseAdmin
    .from('session')
    .insert({
      id: crypto.randomUUID(),
      token,
      userId,
      csrf_token: csrfToken ?? null,
      expiresAt,
      createdAt: now.toISOString(),
      updatedAt: now.toISOString(),
    })

  if (error) throw new Error(error.message)
  return token
}

export async function deleteSession(token: string): Promise<void> {
  const { error } = await supabaseAdmin.from('session').delete().eq('token', token)
  if (error) throw new Error(error.message)
}

export async function getSessionRecordByToken(token: string | null): Promise<SessionRow | null> {
  if (!token) return null

  const { data, error } = await supabaseAdmin
    .from('session')
    .select('id,token,expiresAt,csrf_token, users:userId(id,email,role,full_name,name,is_disabled,disabled_at,closed_at,last_login_at,created_at)')
    .eq('token', token)
    .maybeSingle<SessionRow>()

  if (error) throw new Error(error.message)
  return data ?? null
}

export async function setSessionCsrfToken(token: string, csrfToken: string): Promise<void> {
  const { error } = await supabaseAdmin
    .from('session')
    .update({ csrf_token: csrfToken, updatedAt: new Date().toISOString() })
    .eq('token', token)
  if (error) throw new Error(error.message)
}

export async function getUserFromSessionToken(token: string | null): Promise<AuthUser | null> {
  const data = await getSessionRecordByToken(token)
  if (!data?.users) return null

  if (new Date(data.expiresAt).getTime() <= Date.now()) {
    if (token) await deleteSession(token)
    return null
  }

  if (data.users.is_disabled || data.users.closed_at) {
    if (token) await deleteSession(token)
    return null
  }

  return toAuthUser(data.users)
}
