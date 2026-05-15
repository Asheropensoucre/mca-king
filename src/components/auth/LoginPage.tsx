import React, { useState } from 'react'
import type { AuthUser } from '../../../types'
import { DarkModeToggle } from '../ui/DarkModeToggle'
import { PrimaryButton } from '../ui/PrimaryButton'
import { authCardClassName, authInputClassName } from '../ui/authTheme'

type AuthMode = 'login' | 'register'

interface LoginPageProps {
  onLogin: (user: AuthUser) => void
  onModeChange: (mode: AuthMode) => void
  theme: 'light' | 'dark'
  setTheme: (theme: 'light' | 'dark') => void
}

type LoginResponse = {
  user: AuthUser
}

export const LoginPage: React.FC<LoginPageProps> = ({ onLogin, onModeChange, theme, setTheme }) => {
  const [error, setError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setError(null)
    setSubmitting(true)

    const form = new globalThis.FormData(event.currentTarget)
    const email = String(form.get('email') ?? '')
    const password = String(form.get('password') ?? '')

    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      })

      if (!res.ok) {
        setError('Invalid email or password')
        return
      }

      const { user } = await res.json() as LoginResponse
      onLogin(user)
    } catch {
      setError('Invalid email or password')
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
          <h1 className="text-center text-3xl font-black text-main">Sign In</h1>
          <p className="mt-2 text-center text-sm font-semibold text-muted">Access your MCA King dashboard.</p>

          <form onSubmit={handleSubmit} className="mt-8 space-y-5">
            <label className="block">
              <span className="text-sm font-bold text-main">Email</span>
              <input name="email" type="email" required autoComplete="email" className={authInputClassName} />
            </label>

            <label className="block">
              <span className="text-sm font-bold text-main">Password</span>
              <input name="password" type="password" required autoComplete="current-password" className={authInputClassName} />
            </label>

            {error && <p className="rounded-lg bg-danger px-3 py-2 text-sm font-bold text-on-danger">{error}</p>}

            <div className="flex justify-center pt-2">
              <PrimaryButton type="submit" label={submitting ? 'Signing In...' : 'Sign In'} disabled={submitting} onClick={() => undefined} fullWidth />
            </div>
          </form>

          <div className="mt-6 flex flex-col items-center gap-3 text-sm font-semibold text-muted">
            <span>Don&apos;t have an account?</span>
            <PrimaryButton label="Register" size="small" onClick={() => onModeChange('register')} />
          </div>
        </div>
      </div>
    </div>
  )
}
