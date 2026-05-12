import React, { useState } from 'react'
import type { AuthUser } from '../../../types'
import { DarkModeToggle } from '../ui/DarkModeToggle'
import { PrimaryButton } from '../ui/PrimaryButton'
import { blurAuthInput, focusAuthInput, getAuthCardStyle, getAuthInputStyle } from '../ui/authTheme'

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
  const isDark = theme === 'dark'
  const authInputStyle = getAuthInputStyle(isDark)

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
    <div className="relative min-h-screen bg-slate-50 p-4 dark:bg-dark-bg">
      <div className="absolute right-6 top-6 z-10">
        <DarkModeToggle isDark={theme === 'dark'} onToggle={() => setTheme(theme === 'dark' ? 'light' : 'dark')} />
      </div>
      <div className="flex min-h-[calc(100vh-6rem)] items-center justify-center">
        <div className="w-full max-w-md p-8" style={getAuthCardStyle(isDark)}>
          <img src="/logo.png" alt="MCA King Logo" className="mx-auto mb-6 h-20 w-auto" />
          <h1 className="text-center text-3xl font-bold text-slate-800 dark:text-slate-100">Sign In</h1>
          <p className="mt-2 text-center text-sm text-slate-500 dark:text-slate-400">Access your MCA King dashboard.</p>

          <form onSubmit={handleSubmit} className="mt-8 space-y-5">
            <label className="block">
              <span className="text-sm font-semibold text-slate-700 dark:text-slate-300">Email</span>
              <input
                name="email"
                type="email"
                required
                autoComplete="email"
                style={authInputStyle}
                onFocus={event => focusAuthInput(event, isDark)}
                onBlur={event => blurAuthInput(event, isDark)}
              />
            </label>

            <label className="block">
              <span className="text-sm font-semibold text-slate-700 dark:text-slate-300">Password</span>
              <input
                name="password"
                type="password"
                required
                autoComplete="current-password"
                style={authInputStyle}
                onFocus={event => focusAuthInput(event, isDark)}
                onBlur={event => blurAuthInput(event, isDark)}
              />
            </label>

            {error && <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700 dark:bg-red-950/40 dark:text-red-300">{error}</p>}

            <div className="flex justify-center pt-2">
              <PrimaryButton type="submit" label={submitting ? 'Signing In...' : 'Sign In'} disabled={submitting} onClick={() => undefined} fullWidth />
            </div>
          </form>

          <div className="mt-6 flex flex-col items-center gap-3 text-sm text-slate-600 dark:text-slate-400">
            <span>Don&apos;t have an account?</span>
            <PrimaryButton label="Register" size="small" onClick={() => onModeChange('register')} />
          </div>
        </div>
      </div>
    </div>
  )
}
