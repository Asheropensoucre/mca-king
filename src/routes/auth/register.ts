import { auth } from '../../lib/auth'

type RegisterBody = {
  email?: string
  password?: string
  role?: string
  full_name?: string
}

export async function POST(req: Request): Promise<Response> {
  try {
    const { email, password, role, full_name } = await req.json() as RegisterBody

    if (!email || !password) {
      return new Response('Email and password are required', { status: 400 })
    }

    const result = await auth.api.signUpEmail({
      body: {
        email,
        password,
        name: full_name ?? email,
        role,
        full_name,
      },
    })

    return Response.json(result)
  } catch {
    return new Response('Registration failed', { status: 400 })
  }
}
