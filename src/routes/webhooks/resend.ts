import { appendCommunicationEvent } from '../../lib/communications/communication-service'
import { addSuppression, markEmailUnsubscribed, normalizeEmail } from '../../lib/communications/suppression'
import { badRequest, json } from '../../lib/route-utils'
import { supabaseAdmin } from '../../lib/supabase-server'

function eventType(body: Record<string, unknown>): string {
  return String(body.type || body.event || body.event_type || '')
}

function eventData(body: Record<string, unknown>): Record<string, unknown> {
  const data = body.data
  return typeof data === 'object' && data !== null ? data as Record<string, unknown> : body
}

function emailFrom(data: Record<string, unknown>): string | null {
  const candidates = [data.to, data.email, data.recipient, data.rcpt_to]
  for (const candidate of candidates) {
    if (typeof candidate === 'string') return normalizeEmail(candidate)
    if (Array.isArray(candidate) && typeof candidate[0] === 'string') return normalizeEmail(candidate[0])
  }
  return null
}

function messageIdFrom(data: Record<string, unknown>): string | null {
  for (const key of ['email_id', 'message_id', 'id']) {
    if (typeof data[key] === 'string') return data[key]
  }
  return null
}

export async function POST(req: Request): Promise<Response> {
  const body = await req.json().catch(() => null) as Record<string, unknown> | null
  if (!body) return badRequest('Invalid webhook payload')
  const type = eventType(body)
  const data = eventData(body)
  const providerMessageId = messageIdFrom(data)
  const email = emailFrom(data)

  let recipient: { id: string; entity_type: string; entity_id: string; campaign_id: string; email: string | null } | null = null
  if (providerMessageId) {
    const { data: found } = await supabaseAdmin
      .from('campaign_recipients')
      .select('id,entity_type,entity_id,campaign_id,email')
      .eq('provider_message_id', providerMessageId)
      .maybeSingle<{ id: string; entity_type: string; entity_id: string; campaign_id: string; email: string | null }>()
    recipient = found ?? null
  }

  const normalizedType = type.toLowerCase()
  let status: string | null = null
  if (normalizedType.includes('delivered')) status = 'delivered'
  if (normalizedType.includes('bounce')) status = 'bounced'
  if (normalizedType.includes('complain') || normalizedType.includes('spam')) status = 'complained'
  if (normalizedType.includes('unsubscribe')) status = 'unsubscribed'

  if (recipient && status) {
    const patch: Record<string, unknown> = { status, updated_at: new Date().toISOString() }
    if (status === 'delivered') patch.delivered_at = new Date().toISOString()
    if (status === 'bounced' || status === 'complained') patch.failed_at = new Date().toISOString()
    await supabaseAdmin.from('campaign_recipients').update(patch).eq('id', recipient.id)
  }

  if (email && (status === 'bounced' || status === 'complained')) {
    await addSuppression({ channel: 'email', identifier: email, reason: status === 'bounced' ? 'bounce' : 'complaint', source: 'resend_webhook', metadata: { event_type: type, provider_message_id: providerMessageId } })
  }
  if (email && status === 'unsubscribed') {
    await markEmailUnsubscribed({ email, entity_type: recipient?.entity_type as never, entity_id: recipient?.entity_id, source: 'resend_webhook', metadata: { event_type: type, provider_message_id: providerMessageId } })
  }

  if (recipient) {
    await appendCommunicationEvent({
      entity_type: recipient.entity_type,
      entity_id: recipient.entity_id,
      channel: 'email',
      communication_type: 'delivery_event',
      to_contact: email ?? recipient.email,
      status: status ?? type,
      provider: 'resend',
      provider_message_id: providerMessageId,
      campaign_id: recipient.campaign_id,
      campaign_recipient_id: recipient.id,
      metadata: { event_type: type },
    })
  }

  return json({ received: true })
}
