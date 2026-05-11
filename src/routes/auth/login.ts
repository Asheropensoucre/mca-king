import { auth } from '../../lib/auth'

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

    const result = await auth.api.signInEmail({
      body: { email, password },
    })

    return Response.json(result)
  } catch {
    return new Response('Invalid credentials', { status: 401 })
  }
}
