import { recordActivity } from '../activity'
import { writeAuditLog } from '../audit'
import { supabaseAdmin } from '../supabase-server'
import { sendResendEmail } from './providers/resend-provider'
import { sendDisabledSms } from './providers/sms-disabled-provider'
import { evaluateEmailEligibility } from './suppression'
import { injectUnsubscribeFooter, unsubscribeUrl } from './unsubscribe'
import type { EmailPayload, SendResult } from './types'

function bodyPreview(html: string): string {
  return html.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim().slice(0, 500)
}

export async function appendCommunicationEvent(params: {
  entity_type: string
  entity_id: string
  channel: 'email' | 'sms_future' | 'call' | 'system'
  communication_type: 'manual' | 'campaign' | 'transactional' | 'delivery_event' | 'call' | 'system'
  from_user_id?: string | null
  to_contact?: string | null
  subject?: string | null
  body_preview?: string | null
  status?: string
  provider?: string | null
  provider_message_id?: string | null
  campaign_id?: string | null
  campaign_recipient_id?: string | null
  metadata?: Record<string, unknown>
}): Promise<void> {
  const { error } = await supabaseAdmin.from('communications').insert({
    entity_type: params.entity_type,
    entity_id: params.entity_id,
    channel: params.channel,
    communication_type: params.communication_type,
    from_user_id: params.from_user_id ?? null,
    to_contact: params.to_contact ?? null,
    subject: params.subject ?? null,
    body_preview: params.body_preview ?? null,
    status: params.status ?? 'logged',
    provider: params.provider ?? null,
    provider_message_id: params.provider_message_id ?? null,
    campaign_id: params.campaign_id ?? null,
    campaign_recipient_id: params.campaign_recipient_id ?? null,
    metadata: params.metadata ?? {},
  })
  if (error) throw new Error(error.message)
}

export async function sendEmailWithCompliance(payload: EmailPayload & { req?: Request }): Promise<SendResult> {
  const eligible = await evaluateEmailEligibility({
    entity_type: payload.entity_type,
    entity_id: payload.entity_id,
    email: payload.to,
  })
  if (!eligible.sendable) {
    const result = { ok: false, provider: 'resend', error: eligible.skip_reason ?? 'suppressed' }
    await appendCommunicationEvent({
      entity_type: payload.entity_type,
      entity_id: payload.entity_id,
      channel: 'email',
      communication_type: payload.category === 'campaign' ? 'campaign' : 'manual',
      from_user_id: payload.user.id,
      to_contact: payload.to,
      subject: payload.subject,
      body_preview: bodyPreview(payload.html),
      status: 'skipped',
      provider: 'resend',
      campaign_id: payload.campaign_id ?? null,
      campaign_recipient_id: payload.campaign_recipient_id ?? null,
      metadata: { reason: result.error },
    })
    return result
  }

  if (payload.category === 'campaign' && !process.env.BROKER_PHYSICAL_ADDRESS?.trim()) {
    return { ok: false, provider: 'resend', error: 'BROKER_PHYSICAL_ADDRESS is required before campaign email can be sent' }
  }

  const html = payload.category === 'campaign'
    ? injectUnsubscribeFooter(payload.html, unsubscribeUrl({
        email: payload.to,
        entity_type: payload.entity_type,
        entity_id: payload.entity_id,
        campaign_id: payload.campaign_id ?? null,
        campaign_recipient_id: payload.campaign_recipient_id ?? null,
      }))
    : payload.html

  const result = await sendResendEmail({ ...payload, html })

  await appendCommunicationEvent({
    entity_type: payload.entity_type,
    entity_id: payload.entity_id,
    channel: 'email',
    communication_type: payload.category === 'campaign' ? 'campaign' : 'manual',
    from_user_id: payload.user.id,
    to_contact: payload.to,
    subject: payload.subject,
    body_preview: bodyPreview(html),
    status: result.ok ? 'sent' : 'failed',
    provider: result.provider,
    provider_message_id: result.provider_message_id ?? null,
    campaign_id: payload.campaign_id ?? null,
    campaign_recipient_id: payload.campaign_recipient_id ?? null,
    metadata: result.error ? { error: result.error } : {},
  })

  recordActivity({
    entity_type: payload.entity_type === 'contact' ? 'lead' : payload.entity_type,
    entity_id: payload.entity_id,
    user_id: payload.user.id,
    activity_type: 'email',
    body: `${payload.category === 'campaign' ? 'Campaign email' : 'Email'} ${result.ok ? 'sent' : 'failed'}: ${payload.subject}`,
    metadata: { provider: result.provider, provider_message_id: result.provider_message_id, campaign_id: payload.campaign_id, error: result.error },
  })

  await writeAuditLog({
    req: payload.req,
    user_id: payload.user.id,
    action: payload.category === 'campaign' ? 'communications.campaign_email.sent' : 'communications.manual_email.sent',
    entity_type: payload.entity_type,
    entity_id: payload.entity_id,
    metadata: { to: payload.to, subject: payload.subject, ok: result.ok, provider_message_id: result.provider_message_id, error: result.error },
  })

  return result
}

export async function sendSmsDisabled(): Promise<SendResult> {
  return sendDisabledSms()
}
