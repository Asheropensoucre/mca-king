import type { RouteUser, UserRole } from './route-utils'
import { getSessionToken, getUserFromSessionToken } from './session-auth'

export async function requireAuth(req: Request, role?: UserRole): Promise<RouteUser> {
  const user = await getUserFromSessionToken(getSessionToken(req))

  if (!user) {
    throw new Response('Unauthorized', { status: 401 })
  }

  if (role && user.role !== role) {
    throw new Response('Forbidden', { status: 403 })
  }

  return user
}
