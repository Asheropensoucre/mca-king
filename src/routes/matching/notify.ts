import { triggerLenderNotifications } from '../../lib/email-triggers'
import { recordActivity } from '../../lib/activity'
import { upsertMerchantFileSubmission } from '../../lib/merchant-file-submissions'
import { requireAuth } from '../../lib/requireAuth'
import { assertRole, badRequest, forbidden, json } from '../../lib/route-utils'
import { supabaseAdmin } from '../../lib/supabase-server'

type NotifyBody = {
  merchant_id?: string
}

type MatchRow = {
  id: string
  merchant_id: string
  lender_id: string
}

async function salesRepCanAccessMerchant(userId: string, merchantId: string): Promise<boolean | Response> {
  const { data, error } = await supabaseAdmin
    .from('merchants')
    .select('id')
    .eq('id', merchantId)
    .eq('assigned_rep_id', userId)
    .maybeSingle<{ id: string }>()

  if (error) return badRequest(error.message)
  return Boolean(data)
}

export async function POST(req: Request): Promise<Response> {
  const user = await requireAuth(req)
  const roleError = assertRole(user, ['admin', 'sales_rep'])
  if (roleError) return roleError

  const body = await req.json() as NotifyBody
  if (!body.merchant_id) return badRequest('merchant_id is required')

  if (user.role === 'sales_rep') {
    const allowed = await salesRepCanAccessMerchant(user.id, body.merchant_id)
    if (allowed instanceof Response) return allowed
    if (!allowed) return forbidden()
  }

  const notifiedAt = new Date().toISOString()
  const { data, error } = await supabaseAdmin
    .from('lender_matches')
    .update({ notified_at: notifiedAt })
    .eq('merchant_id', body.merchant_id)
    .select('id,merchant_id,lender_id')
    .returns<MatchRow[]>()

  if (error) return badRequest(error.message)

  try {
    await Promise.all((data ?? []).map(match => upsertMerchantFileSubmission({
      merchant_id: match.merchant_id,
      lender_id: match.lender_id,
      match_id: match.id,
      submitted_by: user.id,
      submitted_at: notifiedAt,
      status: 'submitted',
    })))
  } catch (submissionError) {
    return badRequest(submissionError instanceof Error ? submissionError.message : 'Could not create merchant-file submissions')
  }

  triggerLenderNotifications(body.merchant_id)
  recordActivity({
    entity_type: 'merchant',
    entity_id: body.merchant_id,
    user_id: user.id,
    activity_type: 'match',
    body: `${data?.length ?? 0} lender(s) notified and merchant-file submission(s) created`,
    metadata: { submission_count: data?.length ?? 0 },
  })

  return json({ notified: data?.length ?? 0, notified_at: notifiedAt })
}
