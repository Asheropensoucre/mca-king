import { verifyPassword } from '@better-auth/utils/password'
import { createSession, findCredentialAccount, serializeSessionCookie, toAuthUser } from '../../lib/session-auth'

type LoginBody = {
  email?: string
  password?: string
}

export async function POST(req: Request): Promise<Response> {
  try {
    const { email, password } = await req.json() as LoginBody

    if (!email || !password) {
      return new Response('Email and password are required', { status: 400 })
    }

    const account = await findCredentialAccount(email.toLowerCase().trim())
    if (!account?.password || !account.users) {
      return new Response('Invalid credentials', { status: 401 })
    }

    const valid = await verifyPassword(account.password, password)
    if (!valid) {
      return new Response('Invalid credentials', { status: 401 })
    }

    const token = await createSession(account.users.id)
    return Response.json(
      { user: toAuthUser(account.users) },
      { headers: { 'set-cookie': serializeSessionCookie(token) } },
    )
  } catch (error) {
    console.error('Invalid credentials', error)
    return new Response('Invalid credentials', { status: 401 })
  }
}
