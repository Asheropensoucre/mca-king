import { deleteSession, getSessionToken, serializeExpiredSessionCookie } from '../../lib/session-auth'

export async function POST(req: Request): Promise<Response> {
  try {
    const token = getSessionToken(req)
    if (token) await deleteSession(token)
    return new Response('Logged out', { status: 200, headers: { 'set-cookie': serializeExpiredSessionCookie() } })
  } catch {
    return new Response('Logout failed', { status: 400 })
  }
}
