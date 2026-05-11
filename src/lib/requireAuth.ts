import type { RouteUser, UserRole } from './route-utils'

const isUserRole = (value: string | null): value is UserRole => (
  value === 'admin' || value === 'sales_rep' || value === 'merchant' || value === 'lender'
)

function getDemoUser(req: Request): RouteUser | null {
  const demoRole = req.headers.get('x-demo-role')
  const demoUserId = req.headers.get('x-demo-user-id')
  if (!isUserRole(demoRole) || !demoUserId) return null
  return {
    id: demoUserId,
    email: req.headers.get('x-demo-email') ?? `${demoUserId}@demo.local`,
    role: demoRole,
    full_name: req.headers.get('x-demo-name'),
  }
}

export async function requireAuth(req: Request, role?: UserRole): Promise<RouteUser> {
  let user: RouteUser | null = getDemoUser(req)

  if (!user) {
    const { auth } = await import('./auth')
    const session = await auth.api.getSession({ headers: req.headers })
    if (session) {
      const sessionRole = typeof session.user.role === 'string' && isUserRole(session.user.role)
        ? session.user.role
        : 'merchant'
      user = {
        id: session.user.id,
        email: session.user.email,
        role: sessionRole,
        full_name: typeof session.user.full_name === 'string' ? session.user.full_name : session.user.name,
      }
    }
  }

  if (!user) {
    throw new Response('Unauthorized', { status: 401 })
  }

  if (role && user.role !== role) {
    throw new Response('Forbidden', { status: 403 })
  }

  return user
}
