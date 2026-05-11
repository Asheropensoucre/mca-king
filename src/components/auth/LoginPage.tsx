import React, { useState } from 'react'
import type { AuthUser } from '../../../types'

type AuthMode = 'login' | 'register'

interface LoginPageProps {
  onLogin: (user: AuthUser) => void
  onModeChange: (mode: AuthMode) => void
}

type LoginResponse = {
  user: AuthUser
}

export const LoginPage: React.FC<LoginPageProps> = ({ onLogin, onModeChange }) => {
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
    <div className="min-h-screen flex items-center justify-center p-4 bg-slate-50 dark:bg-dark-bg">
      <div className="w-full max-w-md rounded-2xl bg-white p-8 shadow-xl dark:bg-dark-card">
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
              className="mt-1 block w-full rounded-lg border-0 px-3 py-2 text-slate-900 shadow-sm ring-1 ring-inset ring-slate-300 focus:ring-2 focus:ring-theme-yellow dark:bg-slate-700 dark:text-slate-100 dark:ring-slate-600"
            />
          </label>

          <label className="block">
            <span className="text-sm font-semibold text-slate-700 dark:text-slate-300">Password</span>
            <input
              name="password"
              type="password"
              required
              autoComplete="current-password"
              className="mt-1 block w-full rounded-lg border-0 px-3 py-2 text-slate-900 shadow-sm ring-1 ring-inset ring-slate-300 focus:ring-2 focus:ring-theme-yellow dark:bg-slate-700 dark:text-slate-100 dark:ring-slate-600"
            />
          </label>

          {error && <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700 dark:bg-red-950/40 dark:text-red-300">{error}</p>}

          <button
            type="submit"
            disabled={submitting}
            className="w-full rounded-lg bg-theme-yellow px-4 py-3 text-sm font-bold text-theme-black transition hover:bg-theme-yellow/90 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {submitting ? 'Signing In...' : 'Sign In'}
          </button>
        </form>

        <p className="mt-6 text-center text-sm text-slate-600 dark:text-slate-400">
          Don&apos;t have an account?{' '}
          <button type="button" onClick={() => onModeChange('register')} className="font-semibold text-theme-teal hover:text-theme-teal/80">
            Register
          </button>
        </p>
      </div>
    </div>
  )
}
