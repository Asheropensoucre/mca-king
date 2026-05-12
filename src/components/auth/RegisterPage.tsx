import React, { useState } from 'react'
import type { AuthUser, UserRole } from '../../../types'
import { DarkModeToggle } from '../ui/DarkModeToggle'
import { PrimaryButton } from '../ui/PrimaryButton'
import { RoleToggle } from '../ui/RoleToggle'
import { blurAuthInput, focusAuthInput, getAuthCardStyle, getAuthInputStyle } from '../ui/authTheme'

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
  const isDark = theme === 'dark'
  const authInputStyle = getAuthInputStyle(isDark)

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
    <div className="relative min-h-screen bg-slate-50 p-4 dark:bg-dark-bg">
      <div className="absolute right-6 top-6 z-10">
        <DarkModeToggle isDark={theme === 'dark'} onToggle={() => setTheme(theme === 'dark' ? 'light' : 'dark')} />
      </div>
      <div className="flex min-h-[calc(100vh-6rem)] items-center justify-center">
        <div className="w-full max-w-md p-8" style={getAuthCardStyle(isDark)}>
          <img src="/logo.png" alt="MCA King Logo" className="mx-auto mb-6 h-20 w-auto" />
          <h1 className="text-center text-3xl font-bold text-slate-800 dark:text-slate-100">Create Account</h1>
          <p className="mt-2 text-center text-sm text-slate-500 dark:text-slate-400">Merchant and lender self-registration.</p>

          <form onSubmit={handleSubmit} className="mt-8 space-y-5">
            <label className="block">
              <span className="text-sm font-semibold text-slate-700 dark:text-slate-300">Full Name</span>
              <input name="full_name" type="text" required autoComplete="name" style={authInputStyle} onFocus={event => focusAuthInput(event, isDark)} onBlur={event => blurAuthInput(event, isDark)} />
            </label>

            <label className="block">
              <span className="text-sm font-semibold text-slate-700 dark:text-slate-300">Email</span>
              <input name="email" type="email" required autoComplete="email" style={authInputStyle} onFocus={event => focusAuthInput(event, isDark)} onBlur={event => blurAuthInput(event, isDark)} />
            </label>

            <label className="block">
              <span className="text-sm font-semibold text-slate-700 dark:text-slate-300">Password</span>
              <input name="password" type="password" required minLength={8} autoComplete="new-password" style={authInputStyle} onFocus={event => focusAuthInput(event, isDark)} onBlur={event => blurAuthInput(event, isDark)} />
            </label>

            <label className="block">
              <span className="text-sm font-semibold text-slate-700 dark:text-slate-300">Confirm Password</span>
              <input name="confirm_password" type="password" required minLength={8} autoComplete="new-password" style={authInputStyle} onFocus={event => focusAuthInput(event, isDark)} onBlur={event => blurAuthInput(event, isDark)} />
            </label>

            <div className="flex flex-col items-center gap-2">
              <span className="text-sm font-semibold text-slate-700 dark:text-slate-300">Account Type</span>
              <RoleToggle<SelfRegisterRole>
                value={role}
                onChange={setRole}
                options={[
                  { value: 'merchant', label: 'Merchant' },
                  { value: 'lender', label: 'Lender' },
                ]}
              />
            </div>

            {error && <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700 dark:bg-red-950/40 dark:text-red-300">{error}</p>}

            <div className="flex justify-center pt-2">
              <PrimaryButton type="submit" label={submitting ? 'Creating Account...' : 'Create Account'} disabled={submitting} onClick={() => undefined} fullWidth />
            </div>
          </form>

          <div className="mt-6 flex flex-col items-center gap-3 text-sm text-slate-600 dark:text-slate-400">
            <span>Already have an account?</span>
            <PrimaryButton label="Sign In" size="small" onClick={() => onModeChange('login')} />
          </div>
        </div>
      </div>
    </div>
  )
}
