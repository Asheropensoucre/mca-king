import { writeAuditLog } from '../../../lib/audit'
import { sendEmailWithCompliance } from '../../../lib/communications/communication-service'
import { listRecipientCandidates, renderTemplate } from '../../../lib/communications/entities'
import { buildCommunicationEmailHtml } from '../../../lib/communications/html'
import { evaluateEmailEligibility } from '../../../lib/communications/suppression'
import { requireAuth } from '../../../lib/requireAuth'
import { badRequest, forbidden, getId, json, notFound, type RouteContext } from '../../../lib/route-utils'
import { supabaseAdmin } from '../../../lib/supabase-server'

const MAX_BATCH_SEND = 50

async function loadCampaign(id: string, userId: string, role: string) {
  let query = supabaseAdmin.from('campaigns').select('*').eq('id', id)
  if (role === 'sales_rep') query = query.eq('created_by', userId)
  const { data, error } = await query.maybeSingle<{ id: string; name: string; channel: string; subject: string | null; body: string | null; status: string; created_by: string | null }>()
  if (error) throw new Error(error.message)
  return data
}

export async function POST(req: Request, context?: RouteContext): Promise<Response> {
  const user = await requireAuth(req)
  if (user.role === 'merchant' || user.role === 'lender') return forbidden()
  const id = getId(context)
  if (!id) return badRequest()
  const campaign = await loadCampaign(id, user.id, user.role)
  if (!campaign) return notFound()
  if (campaign.channel !== 'email') return badRequest('SMS campaigns are disabled in Phase I')
  if (!['draft', 'scheduled', 'failed'].includes(campaign.status)) return badRequest('Campaign cannot be sent in its current status')
  if (!process.env.BROKER_PHYSICAL_ADDRESS?.trim()) return badRequest('BROKER_PHYSICAL_ADDRESS is required before campaign email can be sent')
  if (!campaign.subject || !campaign.body) return badRequest('Campaign subject and body are required')

  const body = await req.json().catch(() => ({})) as { entity_type?: 'lead' | 'merchant'; entity_ids?: string[] }
  const entityType = body.entity_type === 'merchant' ? 'merchant' : 'lead'
  const candidates = (await listRecipientCandidates(user, entityType, Array.isArray(body.entity_ids) ? body.entity_ids : undefined)).slice(0, MAX_BATCH_SEND)

  await supabaseAdmin.from('campaigns').update({ status: 'sending', started_at: new Date().toISOString(), updated_at: new Date().toISOString() }).eq('id', id)

  let sent = 0
  let failed = 0
  let skipped = 0
  const details: Array<{ entity_id: string; status: string; reason?: string }> = []

  for (const candidate of candidates) {
    const eligibility = await evaluateEmailEligibility({ entity_type: candidate.entity_type, entity_id: candidate.entity_id, email: candidate.email, phone: candidate.phone })
    const { data: recipient, error: recipientError } = await supabaseAdmin
      .from('campaign_recipients')
      .insert({
        campaign_id: id,
        entity_type: candidate.entity_type,
        entity_id: candidate.entity_id,
        email: candidate.email,
        phone: candidate.phone,
        status: eligibility.sendable ? 'queued' : 'skipped',
        skip_reason: eligibility.skip_reason,
        provider: 'resend',
      })
      .select('*')
      .single<{ id: string }>()

    if (recipientError || !recipient) {
      failed++
      details.push({ entity_id: candidate.entity_id, status: 'failed', reason: recipientError?.message ?? 'recipient insert failed' })
      continue
    }

    if (!eligibility.sendable || !candidate.email) {
      skipped++
      details.push({ entity_id: candidate.entity_id, status: 'skipped', reason: eligibility.skip_reason ?? 'not_sendable' })
      continue
    }

    const result = await sendEmailWithCompliance({
      req,
      to: candidate.email,
      subject: renderTemplate(campaign.subject, candidate),
      html: buildCommunicationEmailHtml({ title: renderTemplate(campaign.subject, candidate), body: renderTemplate(campaign.body, candidate), preheader: renderTemplate(campaign.subject, candidate) }),
      category: 'campaign',
      entity_type: candidate.entity_type,
      entity_id: candidate.entity_id,
      user,
      campaign_id: id,
      campaign_recipient_id: recipient.id,
    })

    await supabaseAdmin
      .from('campaign_recipients')
      .update({
        status: result.ok ? 'sent' : 'failed',
        provider: result.provider,
        provider_message_id: result.provider_message_id ?? null,
        sent_at: result.ok ? new Date().toISOString() : null,
        failed_at: result.ok ? null : new Date().toISOString(),
        metadata: result.error ? { error: result.error } : {},
        updated_at: new Date().toISOString(),
      })
      .eq('id', recipient.id)

    if (result.ok) sent++
    else failed++
    details.push({ entity_id: candidate.entity_id, status: result.ok ? 'sent' : 'failed', reason: result.error })
  }

  await supabaseAdmin.from('campaigns').update({
    status: failed > 0 && sent === 0 ? 'failed' : 'completed',
    completed_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    metadata: { sent, failed, skipped, capped_at: MAX_BATCH_SEND },
  }).eq('id', id)

  await writeAuditLog({ req, user_id: user.id, action: 'communications.campaign.sent', entity_type: 'campaign', entity_id: id, metadata: { sent, failed, skipped, total: candidates.length } })

  return json({ sent, failed, skipped, total: candidates.length, details })
}
