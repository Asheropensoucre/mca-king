import type { MerchantFileSubmissionStatus } from '../../../types'
import { recordActivity } from '../../lib/activity'
import { isSubmissionStatus, toMerchantFileSubmission, type MerchantFileSubmissionRow } from '../../lib/merchant-file-submissions'
import { requireAuth } from '../../lib/requireAuth'
import { assertRole, badRequest, forbidden, getId, json, notFound, type RouteContext } from '../../lib/route-utils'
import { supabaseAdmin } from '../../lib/supabase-server'

type SubmissionPatchBody = {
  status?: MerchantFileSubmissionStatus
  decline_reason?: string | null
  notes?: string | null
}

async function fetchSubmission(id: string): Promise<MerchantFileSubmissionRow | null | Response> {
  const { data, error } = await supabaseAdmin
    .from('merchant_file_submissions')
    .select('*, merchant:merchants(business_name,assigned_rep_id), lender:lenders(company_name,contact_name,contact_email)')
    .eq('id', id)
    .maybeSingle<MerchantFileSubmissionRow>()

  if (error) return badRequest(error.message)
  return data ?? null
}

function canManageSubmission(userId: string, role: string, submission: MerchantFileSubmissionRow): boolean {
  if (role === 'admin') return true
  if (role === 'sales_rep') return submission.merchant?.assigned_rep_id === userId
  return false
}

export async function PATCH(req: Request, context?: RouteContext): Promise<Response> {
  const user = await requireAuth(req)
  const roleError = assertRole(user, ['admin', 'sales_rep'])
  if (roleError) return roleError

  const id = getId(context)
  if (!id) return badRequest()

  const submission = await fetchSubmission(id)
  if (submission instanceof Response) return submission
  if (!submission) return notFound()
  if (!canManageSubmission(user.id, user.role, submission)) return forbidden()

  const body = await req.json() as SubmissionPatchBody
  if (body.status !== undefined && !isSubmissionStatus(body.status)) return badRequest('status is invalid')

  const update: Record<string, unknown> = { updated_at: new Date().toISOString() }
  if (body.status !== undefined) {
    update.status = body.status
    if (body.status === 'declined' || body.status === 'no_response' || body.status === 'offer_received' || body.status === 'stips_requested') {
      update.response_at = new Date().toISOString()
    }
  }
  if (body.decline_reason !== undefined) update.decline_reason = body.decline_reason?.trim() || null
  if (body.notes !== undefined) update.notes = body.notes?.trim() || null

  const { data, error } = await supabaseAdmin
    .from('merchant_file_submissions')
    .update(update)
    .eq('id', id)
    .select('*, merchant:merchants(business_name,assigned_rep_id), lender:lenders(company_name,contact_name,contact_email)')
    .single<MerchantFileSubmissionRow>()

  if (error) return badRequest(error.message)

  const changedStatus = body.status && body.status !== submission.status
  recordActivity({
    entity_type: 'merchant',
    entity_id: data.merchant_id,
    user_id: user.id,
    activity_type: 'match',
    body: changedStatus
      ? `Merchant-file submission to ${data.lender?.company_name ?? 'lender/funder'} marked ${data.status}`
      : `Merchant-file submission updated for ${data.lender?.company_name ?? 'lender/funder'}`,
    metadata: { submission_id: data.id, lender_id: data.lender_id, status: data.status, previous_status: submission.status },
  })

  return json(toMerchantFileSubmission(data))
}
