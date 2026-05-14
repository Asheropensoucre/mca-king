import { writeAuditLog } from '../../../lib/audit'
import { requireAuth } from '../../../lib/requireAuth'
import { badRequest, forbidden, getId, json, notFound, type RouteContext } from '../../../lib/route-utils'
import { supabaseAdmin } from '../../../lib/supabase-server'

async function loadCampaign(id: string, userId: string, role: string) {
  let query = supabaseAdmin.from('campaigns').select('*').eq('id', id)
  if (role === 'sales_rep') query = query.eq('created_by', userId)
  const { data, error } = await query.maybeSingle()
  if (error) throw new Error(error.message)
  return data
}

export async function GET(req: Request, context?: RouteContext): Promise<Response> {
  const user = await requireAuth(req)
  if (user.role === 'merchant' || user.role === 'lender') return forbidden()
  const id = getId(context)
  if (!id) return badRequest()
  const campaign = await loadCampaign(id, user.id, user.role)
  if (!campaign) return notFound()
  const { data: recipients, error } = await supabaseAdmin.from('campaign_recipients').select('*').eq('campaign_id', id).order('created_at', { ascending: false })
  if (error) return badRequest(error.message)
  return json({ ...campaign, recipients: recipients ?? [] })
}

export async function PATCH(req: Request, context?: RouteContext): Promise<Response> {
  const user = await requireAuth(req)
  if (user.role === 'merchant' || user.role === 'lender') return forbidden()
  const id = getId(context)
  if (!id) return badRequest()
  const campaign = await loadCampaign(id, user.id, user.role)
  if (!campaign) return notFound()
  if (!['draft', 'scheduled'].includes(campaign.status)) return badRequest('Only draft/scheduled campaigns can be edited')
  const body = await req.json() as Record<string, unknown>
  const patch: Record<string, unknown> = { updated_at: new Date().toISOString() }
  for (const key of ['name', 'subject', 'body', 'scheduled_at']) if (Object.prototype.hasOwnProperty.call(body, key)) patch[key] = body[key]
  if (typeof body.template_id === 'string') patch.template_id = body.template_id || null
  if (typeof body.status === 'string' && ['draft', 'scheduled', 'cancelled'].includes(body.status)) patch.status = body.status
  if (body.channel === 'sms_future') return badRequest('SMS campaigns are disabled in Phase I')
  const { data, error } = await supabaseAdmin.from('campaigns').update(patch).eq('id', id).select('*').single()
  if (error) return badRequest(error.message)
  await writeAuditLog({ req, user_id: user.id, action: 'communications.campaign.updated', entity_type: 'campaign', entity_id: id, metadata: patch })
  return json(data)
}
