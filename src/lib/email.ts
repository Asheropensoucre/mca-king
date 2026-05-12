import { Resend } from 'resend'

let resendClient: Resend | null = null

export function getEmailConfig(): { resend: Resend; from: string; appUrl: string } | null {
  const apiKey = process.env.RESEND_API_KEY
  const from = process.env.EMAIL_FROM
  const appUrl = process.env.BETTER_AUTH_URL

  if (!apiKey || !from || !appUrl) {
    console.warn('[email] Email is not configured. Required env vars: RESEND_API_KEY, EMAIL_FROM, BETTER_AUTH_URL')
    return null
  }

  resendClient ??= new Resend(apiKey)
  return { resend: resendClient, from, appUrl }
}

export function getAppUrl(): string {
  return process.env.BETTER_AUTH_URL ?? 'http://localhost:3000'
}
