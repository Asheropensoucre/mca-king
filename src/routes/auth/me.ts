import { getSessionToken, getUserFromSessionToken } from '../../lib/session-auth'

export async function GET(req: Request): Promise<Response> {
  const user = await getUserFromSessionToken(getSessionToken(req))
  if (!user) return new Response('Unauthorized', { status: 401 })
  return Response.json(user)
}
