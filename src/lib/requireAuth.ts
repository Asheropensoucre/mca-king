import { auth } from './auth'

export async function requireAuth(req: Request, role?: string) {
  const session = await auth.api.getSession({ headers: req.headers })
  if (!session) {
    throw new Response('Unauthorized', { status: 401 })
  }
  if (role && session.user.role !== role) {
    throw new Response('Forbidden', { status: 403 })
  }
  return session.user
}
