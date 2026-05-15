import { writeAuditLog } from '../../lib/audit'
import { serializeExpiredCsrfCookie } from '../../lib/csrf'
import { requireAuth } from '../../lib/requireAuth'
import { deleteSession, getSessionToken, serializeExpiredSessionCookie } from '../../lib/session-auth'

export async function POST(req: Request): Promise<Response> {
  try {
    const user = await requireAuth(req).catch(() => null)
    const token = getSessionToken(req)
    if (token) await deleteSession(token)
    await writeAuditLog({ req, user_id: user?.id ?? null, action: 'auth.logout', entity_type: user ? 'user' : null, entity_id: user?.id ?? null })
    const headers = new Headers()
    headers.append('set-cookie', serializeExpiredSessionCookie())
    headers.append('set-cookie', serializeExpiredCsrfCookie())
    return new Response('Logged out', { status: 200, headers })
  } catch {
    return new Response('Logout failed', { status: 400 })
  }
}
