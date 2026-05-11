import { triggerLenderNotifications } from '../../lib/email-triggers'
import { requireAuth } from '../../lib/requireAuth'
import { assertRole, badRequest, json } from '../../lib/route-utils'
import { supabaseAdmin } from '../../lib/supabase-server'

type NotifyBody = {
  merchant_id?: string
}

export async function POST(req: Request): Promise<Response> {
  const user = await requireAuth(req)
  const roleError = assertRole(user, ['admin', 'sales_rep'])
  if (roleError) return roleError

  const body = await req.json() as NotifyBody
  if (!body.merchant_id) return badRequest('merchant_id is required')

  const notifiedAt = new Date().toISOString()
  const { data, error } = await supabaseAdmin
    .from('lender_matches')
    .update({ notified_at: notifiedAt })
    .eq('merchant_id', body.merchant_id)
    .select('id')
    .returns<{ id: string }[]>()

  if (error) return badRequest(error.message)

  triggerLenderNotifications(body.merchant_id)

  return json({ notified: data?.length ?? 0, notified_at: notifiedAt })
}
