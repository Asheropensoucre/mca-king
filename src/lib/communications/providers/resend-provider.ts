import { getEmailConfig } from '../../email'
import type { EmailPayload, SendResult } from '../types'

export async function sendResendEmail(payload: EmailPayload): Promise<SendResult> {
  const config = getEmailConfig()
  if (!config) return { ok: false, provider: 'resend', error: 'Resend email is not configured' }

  const result = await config.resend.emails.send({
    from: config.from,
    to: payload.to,
    subject: payload.subject,
    html: payload.html,
    text: payload.text,
  })

  if (result.error) {
    return { ok: false, provider: 'resend', error: result.error.message }
  }

  return { ok: true, provider: 'resend', provider_message_id: result.data?.id ?? null }
}
