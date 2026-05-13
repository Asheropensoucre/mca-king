import { hashPassword } from '@better-auth/utils/password'
import type { UserRole } from '../../../types'
import { createUserWithCredential, findUserByEmail } from '../../lib/session-auth'

type RegisterBody = {
  email?: string
  password?: string
  role?: string
  full_name?: string
}

function isSelfRegisterRole(value: string | undefined): value is Extract<UserRole, 'merchant' | 'lender'> {
  return value === 'merchant' || value === 'lender'
}

export async function POST(req: Request): Promise<Response> {
  try {
    const { email, password, role, full_name } = await req.json() as RegisterBody

    if (!email || !password) {
      return new Response('Email and password are required', { status: 400 })
    }

    if (password.length < 8) {
      return new Response('Password must be at least 8 characters', { status: 400 })
    }

    const normalizedEmail = email.toLowerCase().trim()
    const existing = await findUserByEmail(normalizedEmail)
    if (existing) return new Response('Email already exists', { status: 400 })

    const user = await createUserWithCredential({
      email: normalizedEmail,
      passwordHash: await hashPassword(password),
      role: isSelfRegisterRole(role) ? role : 'merchant',
      fullName: full_name?.trim() || normalizedEmail,
    })

    return Response.json({ user })
  } catch (error) {
    console.error('Registration failed', error)
    return new Response('Registration failed', { status: 400 })
  }
}
