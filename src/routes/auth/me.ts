import { auth } from '../../lib/auth'

export async function GET(req: Request): Promise<Response> {
  const session = await auth.api.getSession({ headers: req.headers })
  if (!session) return new Response('Unauthorized', { status: 401 })

  const { id, email, role, full_name } = session.user
  return Response.json({ id, email, role, full_name })
}
