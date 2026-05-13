import type { MerchantFileSubmissionStatus } from '../../../types'
import { recordActivity } from '../../lib/activity'
import { isSubmissionStatus, toMerchantFileSubmission, upsertMerchantFileSubmission, type MerchantFileSubmissionRow } from '../../lib/merchant-file-submissions'
import { requireAuth } from '../../lib/requireAuth'
import { assertRole, badRequest, forbidden, json } from '../../lib/route-utils'
import { supabaseAdmin } from '../../lib/supabase-server'

type SubmissionBody = {
  merchant_id?: string
  lender_id?: string
  match_id?: string | null
  notes?: string | null
  status?: MerchantFileSubmissionStatus
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

async function getCurrentLenderId(userId: string): Promise<string | null | Response> {
  const { data, error } = await supabaseAdmin
    .from('lenders')
    .select('id')
    .eq('user_id', userId)
    .maybeSingle<{ id: string }>()

  if (error) return badRequest(error.message)
  return data?.id ?? null
}

export async function GET(req: Request): Promise<Response> {
  const user = await requireAuth(req)
  if (user.role === 'merchant') return forbidden()

  const url = new URL(req.url)
  const merchantId = url.searchParams.get('merchant_id')
  if (!merchantId) return badRequest('merchant_id is required')

  let query = supabaseAdmin
    .from('merchant_file_submissions')
    .select('*, merchant:merchants(business_name,assigned_rep_id), lender:lenders(company_name,contact_name,contact_email)')
    .eq('merchant_id', merchantId)
    .order('submitted_at', { ascending: false })

  if (user.role === 'sales_rep') {
    const allowed = await salesRepCanAccessMerchant(user.id, merchantId)
    if (allowed instanceof Response) return allowed
    if (!allowed) return forbidden()
  }

  if (user.role === 'lender') {
    const lenderId = await getCurrentLenderId(user.id)
    if (lenderId instanceof Response) return lenderId
    if (!lenderId) return forbidden()
    query = query.eq('lender_id', lenderId)
  }

  const { data, error } = await query.returns<MerchantFileSubmissionRow[]>()
  if (error) return badRequest(error.message)
  return json((data ?? []).map(toMerchantFileSubmission))
}

export async function POST(req: Request): Promise<Response> {
  const user = await requireAuth(req)
  const roleError = assertRole(user, ['admin', 'sales_rep'])
  if (roleError) return roleError

  const body = await req.json() as SubmissionBody
  if (!body.merchant_id || !body.lender_id) return badRequest('merchant_id and lender_id are required')
  if (body.status && !isSubmissionStatus(body.status)) return badRequest('status is invalid')

  if (user.role === 'sales_rep') {
    const allowed = await salesRepCanAccessMerchant(user.id, body.merchant_id)
    if (allowed instanceof Response) return allowed
    if (!allowed) return forbidden()
  }

  let matchId = body.match_id ?? null
  if (!matchId) {
    const { data: match, error: matchError } = await supabaseAdmin
      .from('lender_matches')
      .select('id')
      .eq('merchant_id', body.merchant_id)
      .eq('lender_id', body.lender_id)
      .maybeSingle<{ id: string }>()
    if (matchError) return badRequest(matchError.message)
    matchId = match?.id ?? null
  }

  try {
    const row = await upsertMerchantFileSubmission({
      merchant_id: body.merchant_id,
      lender_id: body.lender_id,
      match_id: matchId,
      submitted_by: user.id,
      submitted_at: new Date().toISOString(),
      status: body.status ?? 'submitted',
      notes: body.notes ?? null,
    })

    recordActivity({
      entity_type: 'merchant',
      entity_id: body.merchant_id,
      user_id: user.id,
      activity_type: 'match',
      body: `Merchant file submitted to ${row.lender?.company_name ?? 'lender/funder'}`,
      metadata: { submission_id: row.id, lender_id: body.lender_id, status: row.status },
    })

    return json(toMerchantFileSubmission(row), { status: 201 })
  } catch (error) {
    return badRequest(error instanceof Error ? error.message : 'Could not create merchant-file submission')
  }
}
