import { writeActivity } from '../../../lib/activity'
import { isRenewalEligible, type RenewalRow } from '../../../lib/renewals'
import { requireAuth } from '../../../lib/requireAuth'
import { badRequest, forbidden, getId, json, notFound, type RouteContext } from '../../../lib/route-utils'
import { supabaseAdmin } from '../../../lib/supabase-server'

export async function POST(req: Request, context?: RouteContext): Promise<Response> {
  const user = await requireAuth(req)
  if (user.role !== 'merchant') return forbidden()

  const id = getId(context)
  if (!id) return badRequest('id is required')

  const { data: renewal, error } = await supabaseAdmin
    .from('renewals')
    .select('*, merchant:merchants(business_name,assigned_rep_id,user_id)')
    .eq('id', id)
    .maybeSingle<RenewalRow>()

  if (error) return badRequest(error.message)
  if (!renewal) return notFound()
  if (renewal.merchant?.user_id !== user.id) return forbidden()
  if (!isRenewalEligible(renewal.eligibility_date, renewal.status)) return badRequest('renewal is not currently eligible')

  await supabaseAdmin
    .from('renewals')
    .update({ status: 'application_started', updated_at: new Date().toISOString() })
    .eq('id', id)

  await writeActivity({
    entity_type: 'merchant',
    entity_id: renewal.merchant_id,
    user_id: user.id,
    activity_type: 'system',
    body: 'Merchant requested renewal review.',
    metadata: { renewal_id: id },
  })

  return json({ success: true })
}
