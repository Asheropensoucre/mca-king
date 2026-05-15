import { newCsrfToken, serializeCsrfCookie } from '../../lib/csrf'
import { getSessionToken, getSessionRecordByToken, getUserFromSessionToken, setSessionCsrfToken } from '../../lib/session-auth'

export async function GET(req: Request): Promise<Response> {
  const token = getSessionToken(req)
  const user = await getUserFromSessionToken(token)
  if (!user) return new Response('Unauthorized', { status: 401 })

  const session = await getSessionRecordByToken(token)
  if (!session?.csrf_token && token) {
    const csrfToken = newCsrfToken()
    await setSessionCsrfToken(token, csrfToken)
    return Response.json({ ...user, csrf_token: csrfToken }, { headers: { 'set-cookie': serializeCsrfCookie(csrfToken) } })
  }

  return Response.json(user)
}
