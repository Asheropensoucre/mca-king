import { appendCommunicationEvent } from '../../lib/communications/communication-service'
import { markEmailUnsubscribed } from '../../lib/communications/suppression'
import { verifyUnsubscribeToken } from '../../lib/communications/unsubscribe'
import { badRequest, json } from '../../lib/route-utils'
import { supabaseAdmin } from '../../lib/supabase-server'

function html(message: string): Response {
  return new Response(`<!doctype html><html><head><title>Email Preferences</title><meta name="viewport" content="width=device-width,initial-scale=1" /></head><body style="font-family:system-ui,sans-serif;max-width:680px;margin:60px auto;padding:24px"><h1>${message}</h1><p>Your email preferences have been updated. You may close this page.</p></body></html>`, {
    headers: { 'Content-Type': 'text/html; charset=utf-8' },
  })
}

async function processToken(token: string | null): Promise<Response> {
  const payload = verifyUnsubscribeToken(token)
  if (!payload) return badRequest('Invalid or expired unsubscribe token')
  await markEmailUnsubscribed({
    email: payload.email,
    entity_type: payload.entity_type,
    entity_id: payload.entity_id,
    source: 'unsubscribe_link',
    metadata: { campaign_id: payload.campaign_id, campaign_recipient_id: payload.campaign_recipient_id },
  })
  if (payload.campaign_recipient_id) {
    await supabaseAdmin.from('campaign_recipients').update({ status: 'unsubscribed', updated_at: new Date().toISOString() }).eq('id', payload.campaign_recipient_id)
  }
  await appendCommunicationEvent({
    entity_type: payload.entity_type,
    entity_id: payload.entity_id,
    channel: 'email',
    communication_type: 'delivery_event',
    to_contact: payload.email,
    status: 'unsubscribed',
    campaign_id: payload.campaign_id ?? null,
    campaign_recipient_id: payload.campaign_recipient_id ?? null,
    metadata: { source: 'unsubscribe_link' },
  })
  return html('You have been unsubscribed')
}

export async function GET(req: Request): Promise<Response> {
  const token = new URL(req.url).searchParams.get('token')
  return processToken(token)
}

export async function POST(req: Request): Promise<Response> {
  const body = await req.json().catch(() => ({})) as { token?: string }
  const response = await processToken(body.token ?? null)
  if (response.headers.get('content-type')?.includes('text/html')) return json({ success: true })
  return response
}
