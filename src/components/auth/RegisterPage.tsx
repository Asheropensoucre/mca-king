import React, { useState } from 'react'
import type { AuthUser, UserRole } from '../../../types'
import { DarkModeToggle } from '../ui/DarkModeToggle'
import { PrimaryButton } from '../ui/PrimaryButton'
import { RoleToggle } from '../ui/RoleToggle'
import { authCardClassName, authInputClassName } from '../ui/authTheme'

type AuthMode = 'login' | 'register'

type SelfRegisterRole = Extract<UserRole, 'merchant' | 'lender'>

interface RegisterPageProps {
  onRegister: (user: AuthUser) => void
  onModeChange: (mode: AuthMode) => void
  theme: 'light' | 'dark'
  setTheme: (theme: 'light' | 'dark') => void
}

type AuthResponse = {
  user: AuthUser
}

async function loginAfterRegister(email: string, password: string): Promise<AuthUser> {
  const res = await fetch('/api/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password }),
  })

  if (!res.ok) throw new Error('Could not sign in after registration')
  const { user } = await res.json() as AuthResponse
  return user
}

export const RegisterPage: React.FC<RegisterPageProps> = ({ onRegister, onModeChange, theme, setTheme }) => {
  const [role, setRole] = useState<SelfRegisterRole>('merchant')
  const [error, setError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setError(null)
    setSubmitting(true)

    const form = new globalThis.FormData(event.currentTarget)
    const full_name = String(form.get('full_name') ?? '').trim()
    const email = String(form.get('email') ?? '').trim()
    const password = String(form.get('password') ?? '')
    const confirmPassword = String(form.get('confirm_password') ?? '')

    if (password.length < 8) {
      setError('Password must be at least 8 characters.')
      setSubmitting(false)
      return
    }

    if (password !== confirmPassword) {
      setError('Passwords do not match.')
      setSubmitting(false)
      return
    }

    try {
      const res = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password, role, full_name }),
      })

      if (!res.ok) {
        setError('Registration failed. Email may already be in use.')
        return
      }

      const user = await loginAfterRegister(email, password)
      onRegister(user)
    } catch {
      setError('Registration failed. Email may already be in use.')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="relative min-h-screen bg-app p-4 text-main">
      <div className="absolute right-6 top-6 z-10">
        <DarkModeToggle isDark={theme === 'dark'} onToggle={() => setTheme(theme === 'dark' ? 'light' : 'dark')} />
      </div>
      <div className="flex min-h-[calc(100vh-6rem)] items-center justify-center">
        <div className={`w-full max-w-md ${authCardClassName}`}>
          <img src="/logo.png" alt="MCA King Logo" className="mx-auto mb-6 h-20 w-auto" />
          <h1 className="text-center text-3xl font-black text-main">Create Account</h1>
          <p className="mt-2 text-center text-sm font-semibold text-muted">Merchant and lender self-registration.</p>

          <form onSubmit={handleSubmit} className="mt-8 space-y-5">
            <label className="block"><span className="text-sm font-bold text-main">Full Name</span><input name="full_name" type="text" required autoComplete="name" className={authInputClassName} /></label>
            <label className="block"><span className="text-sm font-bold text-main">Email</span><input name="email" type="email" required autoComplete="email" className={authInputClassName} /></label>
            <label className="block"><span className="text-sm font-bold text-main">Password</span><input name="password" type="password" required minLength={8} autoComplete="new-password" className={authInputClassName} /></label>
            <label className="block"><span className="text-sm font-bold text-main">Confirm Password</span><input name="confirm_password" type="password" required minLength={8} autoComplete="new-password" className={authInputClassName} /></label>

            <div className="flex flex-col items-center gap-2">
              <span className="text-sm font-bold text-main">Account Type</span>
              <RoleToggle<SelfRegisterRole>
                value={role}
                onChange={setRole}
                options={[{ value: 'merchant', label: 'Merchant' }, { value: 'lender', label: 'Lender' }]}
              />
            </div>

            {error && <p className="rounded-lg bg-danger px-3 py-2 text-sm font-bold text-on-danger">{error}</p>}

            <div className="flex justify-center pt-2">
              <PrimaryButton type="submit" label={submitting ? 'Creating Account...' : 'Create Account'} disabled={submitting} onClick={() => undefined} fullWidth />
            </div>
          </form>

          <div className="mt-6 flex flex-col items-center gap-3 text-sm font-semibold text-muted">
            <span>Already have an account?</span>
            <PrimaryButton label="Sign In" size="small" onClick={() => onModeChange('login')} />
          </div>
        </div>
      </div>
    </div>
  )
}
