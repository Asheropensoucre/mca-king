import { auth } from '../../lib/auth'

export async function POST(req: Request): Promise<Response> {
  try {
    await auth.api.signOut({ headers: req.headers })
    return new Response('Logged out', { status: 200 })
  } catch {
    return new Response('Logout failed', { status: 400 })
  }
}
