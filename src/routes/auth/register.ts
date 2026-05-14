import { hashPassword } from '@better-auth/utils/password'
import type { UserRole } from '../../../types'
import { writeAuditLog } from '../../lib/audit'
import { checkRateLimit, rateLimitKey } from '../../lib/rate-limit'
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
    const normalizedEmail = email?.toLowerCase().trim() ?? ''
    const limited = await checkRateLimit({ key: rateLimitKey(req, 'auth.register', normalizedEmail), limit: 5, windowMs: 60 * 60 * 1000, req, action: 'auth.register' })
    if (limited) return limited

    if (!email || !password) {
      await writeAuditLog({ req, action: 'auth.register.failure', metadata: { email: normalizedEmail, reason: 'missing_fields' } })
      return new Response('Email and password are required', { status: 400 })
    }

    if (password.length < 8) {
      return new Response('Password must be at least 8 characters', { status: 400 })
    }

    const existing = await findUserByEmail(normalizedEmail)
    if (existing) {
      await writeAuditLog({ req, action: 'auth.register.failure', entity_type: 'user', entity_id: existing.id, metadata: { email: normalizedEmail, reason: 'duplicate_email' } })
      return new Response('Email already exists', { status: 400 })
    }

    const user = await createUserWithCredential({
      email: normalizedEmail,
      passwordHash: await hashPassword(password),
      role: isSelfRegisterRole(role) ? role : 'merchant',
      fullName: full_name?.trim() || normalizedEmail,
    })

    await writeAuditLog({ req, user_id: user.id, action: 'auth.register', entity_type: 'user', entity_id: user.id, metadata: { role: user.role } })
    return Response.json({ user })
  } catch (error) {
    console.error('Registration failed', error)
    return new Response('Registration failed', { status: 400 })
  }
}
