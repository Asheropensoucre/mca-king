import { evaluateEmailEligibility } from '../../../lib/communications/suppression'
import { listRecipientCandidates } from '../../../lib/communications/entities'
import { requireAuth } from '../../../lib/requireAuth'
import { badRequest, forbidden, getId, json, notFound, type RouteContext } from '../../../lib/route-utils'
import { supabaseAdmin } from '../../../lib/supabase-server'
import type { RecipientPreview, RecipientPreviewRow } from '../../../lib/communications/types'

async function loadCampaign(id: string, userId: string, role: string) {
  let query = supabaseAdmin.from('campaigns').select('*').eq('id', id)
  if (role === 'sales_rep') query = query.eq('created_by', userId)
  const { data, error } = await query.maybeSingle()
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
  const body = await req.json().catch(() => ({})) as { entity_type?: 'lead' | 'merchant'; entity_ids?: string[] }
  const entityType = body.entity_type === 'merchant' ? 'merchant' : 'lead'
  const candidates = await listRecipientCandidates(user, entityType, Array.isArray(body.entity_ids) ? body.entity_ids : undefined)
  const rows: RecipientPreviewRow[] = []
  for (const candidate of candidates) {
    const eligibility = await evaluateEmailEligibility({ entity_type: candidate.entity_type, entity_id: candidate.entity_id, email: candidate.email, phone: candidate.phone })
    rows.push({ ...candidate, sendable: eligibility.sendable, skip_reason: eligibility.skip_reason })
  }
  const preview: RecipientPreview = {
    total: rows.length,
    sendable: rows.filter(row => row.sendable).length,
    skipped: rows.filter(row => !row.sendable).length,
    suppressed: rows.filter(row => row.skip_reason && !['missing_email', 'do_not_contact'].includes(row.skip_reason)).length,
    missing_email: rows.filter(row => row.skip_reason === 'missing_email').length,
    do_not_contact: rows.filter(row => row.skip_reason === 'do_not_contact').length,
    rows,
  }
  return json(preview)
}
