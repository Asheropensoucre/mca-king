import { writeAuditLog } from '../../../lib/audit'
import { requireAuth } from '../../../lib/requireAuth'
import { assertRole, badRequest, forbidden, json } from '../../../lib/route-utils'
import { supabaseAdmin } from '../../../lib/supabase-server'

export async function GET(req: Request): Promise<Response> {
  const user = await requireAuth(req)
  if (user.role === 'merchant' || user.role === 'lender') return forbidden()
  let query = supabaseAdmin.from('campaigns').select('*').order('created_at', { ascending: false }).limit(100)
  if (user.role === 'sales_rep') query = query.eq('created_by', user.id)
  const { data, error } = await query
  if (error) return badRequest(error.message)
  return json(data ?? [])
}

export async function POST(req: Request): Promise<Response> {
  const user = await requireAuth(req)
  if (user.role === 'merchant' || user.role === 'lender') return forbidden()
  const body = await req.json() as Record<string, unknown>
  const channel = body.channel === 'sms_future' ? 'sms_future' : 'email'
  if (channel !== 'email') return badRequest('SMS campaigns are disabled in Phase I')
  if (!body.name) return badRequest('name is required')
  const metadata = typeof body.metadata === 'object' && body.metadata ? body.metadata as Record<string, unknown> : {}
  const { data, error } = await supabaseAdmin
    .from('campaigns')
    .insert({
      name: String(body.name),
      channel,
      category: 'campaign',
      template_id: typeof body.template_id === 'string' && body.template_id ? body.template_id : null,
      subject: typeof body.subject === 'string' ? body.subject : null,
      body: typeof body.body === 'string' ? body.body : null,
      status: 'draft',
      created_by: user.id,
      metadata,
    })
    .select('*')
    .single()
  if (error) return badRequest(error.message)
  await writeAuditLog({ req, user_id: user.id, action: 'communications.campaign.created', entity_type: 'campaign', entity_id: data.id, metadata: { name: data.name } })
  return json(data, { status: 201 })
}
