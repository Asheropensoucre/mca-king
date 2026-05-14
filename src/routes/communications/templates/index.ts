import { writeAuditLog } from '../../../lib/audit'
import { requireAuth } from '../../../lib/requireAuth'
import { assertRole, badRequest, forbidden, json } from '../../../lib/route-utils'
import { supabaseAdmin } from '../../../lib/supabase-server'

export async function GET(req: Request): Promise<Response> {
  const user = await requireAuth(req)
  if (user.role === 'merchant' || user.role === 'lender') return forbidden()
  const { data, error } = await supabaseAdmin
    .from('message_templates')
    .select('*')
    .order('created_at', { ascending: false })
  if (error) return badRequest(error.message)
  return json(data ?? [])
}

export async function POST(req: Request): Promise<Response> {
  const user = await requireAuth(req)
  const roleError = assertRole(user, ['admin'])
  if (roleError) return roleError
  const body = await req.json() as Record<string, unknown>
  const channel = body.channel === 'sms_future' ? 'sms_future' : 'email'
  if (channel === 'sms_future') return badRequest('SMS templates are future-ready only and cannot be created for sending in Phase I')
  const category = body.category === 'transactional' ? 'transactional' : 'campaign'
  if (!body.name || !body.body) return badRequest('name and body are required')

  const { data, error } = await supabaseAdmin
    .from('message_templates')
    .insert({
      name: String(body.name),
      channel,
      category,
      subject: body.subject ? String(body.subject) : null,
      body: String(body.body),
      variables: Array.isArray(body.variables) ? body.variables : [],
      is_active: body.is_active !== false,
      created_by: user.id,
      updated_by: user.id,
    })
    .select('*')
    .single()
  if (error) return badRequest(error.message)
  await writeAuditLog({ req, user_id: user.id, action: 'communications.template.created', entity_type: 'message_template', entity_id: data.id, metadata: { name: data.name, category: data.category } })
  return json(data, { status: 201 })
}
