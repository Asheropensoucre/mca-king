import { verifyPassword } from '@better-auth/utils/password'
import { writeAuditLog } from '../../lib/audit'
import { newCsrfToken, serializeCsrfCookie } from '../../lib/csrf'
import { checkRateLimit, rateLimitKey, recordFailedLogin, clearFailedLogin, getLoginDelayMs } from '../../lib/rate-limit'
import { createSession, findCredentialAccount, serializeSessionCookie, toAuthUser } from '../../lib/session-auth'
import { supabaseAdmin } from '../../lib/supabase-server'

type LoginBody = {
  email?: string
  password?: string
}

export async function POST(req: Request): Promise<Response> {
  try {
    const { email, password } = await req.json() as LoginBody
    const normalizedEmail = email?.toLowerCase().trim() ?? ''
    const loginKey = rateLimitKey(req, 'auth.login', normalizedEmail)
    const limited = await checkRateLimit({ key: loginKey, limit: 10, windowMs: 10 * 60 * 1000, req, action: 'auth.login' })
    if (limited) return limited

    const delayMs = await getLoginDelayMs(loginKey)
    if (delayMs > 0) {
      await writeAuditLog({ req, action: 'auth.login.failure', metadata: { email: normalizedEmail, reason: 'temporary_lockout', delay_ms: delayMs } })
      return new Response('Too many failed login attempts. Please try again later.', { status: 429 })
    }

    if (!email || !password) {
      await writeAuditLog({ req, action: 'auth.login.failure', metadata: { email: normalizedEmail, reason: 'missing_fields' } })
      return new Response('Email and password are required', { status: 400 })
    }

    const account = await findCredentialAccount(normalizedEmail)
    if (!account?.password || !account.users) {
      await recordFailedLogin(loginKey, normalizedEmail, req)
      await writeAuditLog({ req, action: 'auth.login.failure', metadata: { email: normalizedEmail, reason: 'invalid_credentials' } })
      return new Response('Invalid credentials', { status: 401 })
    }

    const valid = await verifyPassword(account.password, password)
    if (!valid) {
      await recordFailedLogin(loginKey, normalizedEmail, req)
      await writeAuditLog({ req, user_id: account.users.id, action: 'auth.login.failure', entity_type: 'user', entity_id: account.users.id, metadata: { email: normalizedEmail, reason: 'invalid_credentials' } })
      return new Response('Invalid credentials', { status: 401 })
    }

    if (account.users.is_disabled) {
      await writeAuditLog({ req, user_id: account.users.id, action: 'auth.login.failure', entity_type: 'user', entity_id: account.users.id, metadata: { email: normalizedEmail, reason: 'disabled' } })
      return new Response('Account is disabled. Please contact your administrator.', { status: 403 })
    }

    if (account.users.closed_at) {
      await writeAuditLog({ req, user_id: account.users.id, action: 'auth.login.failure', entity_type: 'user', entity_id: account.users.id, metadata: { email: normalizedEmail, reason: 'closed' } })
      return new Response('This account has been closed.', { status: 403 })
    }

    await supabaseAdmin
      .from('users')
      .update({ last_login_at: new Date().toISOString(), updatedAt: new Date().toISOString() })
      .eq('id', account.users.id)

    const csrfToken = newCsrfToken()
    const token = await createSession(account.users.id, csrfToken)
    await clearFailedLogin(loginKey)
    await writeAuditLog({ req, user_id: account.users.id, action: 'auth.login.success', entity_type: 'user', entity_id: account.users.id, metadata: { role: account.users.role } })
    const headers = new Headers()
    headers.append('set-cookie', serializeSessionCookie(token))
    headers.append('set-cookie', serializeCsrfCookie(csrfToken))
    return Response.json(
      { user: toAuthUser(account.users), csrf_token: csrfToken },
      { headers },
    )
  } catch (error) {
    console.error('Invalid credentials', error)
    return new Response('Invalid credentials', { status: 401 })
  }
}
