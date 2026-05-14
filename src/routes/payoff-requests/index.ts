import type { PayoffRequest } from '../../../types'
import { recordActivity } from '../../lib/activity'
import { getPagination, hasListParams, paginatedJson } from '../../lib/list-query'
import { getLenderIdForUser } from '../../lib/merchant-file-submissions'
import { isPayoffRequestStatus, toPayoffRequest, type PayoffRequestRow } from '../../lib/renewals'
import { requireAuth } from '../../lib/requireAuth'
import { badRequest, forbidden, json } from '../../lib/route-utils'
import { supabaseAdmin } from '../../lib/supabase-server'

type PayoffRequestBody = Partial<Pick<PayoffRequest, 'merchant_id' | 'funding_id' | 'renewal_id' | 'requested_at' | 'notes'>>

type MerchantAccessRow = { id: string; user_id: string | null; assigned_rep_id: string | null; business_name: string }
type FundingLookupRow = { id: string; merchant_id: string; lender_id: string | null; funded_at: string; lender?: { company_name: string | null } | null }

const payoffSelect = '*, merchant:merchants(business_name,assigned_rep_id,user_id), funding:fundings(lender_id,lender:lenders(company_name)), document:documents(file_name)'

async function getMerchant(merchantId: string): Promise<MerchantAccessRow | Response> {
  const { data, error } = await supabaseAdmin
    .from('merchants')
    .select('id,user_id,assigned_rep_id,business_name')
    .eq('id', merchantId)
    .maybeSingle<MerchantAccessRow>()
  if (error) return badRequest(error.message)
  if (!data) return badRequest('merchant not found')
  return data
}

async function getFundingForRequest(merchantId: string, fundingId?: string | null): Promise<FundingLookupRow | Response> {
  let query = supabaseAdmin
    .from('fundings')
    .select('id,merchant_id,lender_id,funded_at,lender:lenders(company_name)')
    .eq('merchant_id', merchantId)

  if (fundingId) query = query.eq('id', fundingId)
  query = query.order('funded_at', { ascending: false }).limit(1)

  const { data, error } = await query.returns<FundingLookupRow[]>()
  if (error) return badRequest(error.message)
  const funding = data?.[0]
  if (!funding) return badRequest('A funded deal is required before requesting a payoff letter')
  return funding
}

async function validateRenewal(merchantId: string, renewalId?: string | null): Promise<Response | null> {
  if (!renewalId) return null
  const { data, error } = await supabaseAdmin
    .from('renewals')
    .select('id,merchant_id')
    .eq('id', renewalId)
    .maybeSingle<{ id: string; merchant_id: string }>()
  if (error) return badRequest(error.message)
  if (!data || data.merchant_id !== merchantId) return badRequest('renewal does not belong to merchant')
  return null
}

function safePayoffRequest(request: PayoffRequest): PayoffRequest {
  return { ...request, notes: null }
}

export async function GET(req: Request): Promise<Response> {
  const user = await requireAuth(req)

  const url = new URL(req.url)
  const shouldPaginate = hasListParams(url)
  const pagination = getPagination(url)
  const merchantId = url.searchParams.get('merchant_id')
  const fundingId = url.searchParams.get('funding_id')
  const renewalId = url.searchParams.get('renewal_id')
  const status = url.searchParams.get('status')
  const expiresBefore = url.searchParams.get('expires_before')

  if (status && !isPayoffRequestStatus(status)) return badRequest('status is invalid')

  let query = supabaseAdmin
    .from('payoff_requests')
    .select(payoffSelect, { count: shouldPaginate ? 'exact' : undefined })

  if (merchantId) query = query.eq('merchant_id', merchantId)
  if (fundingId) query = query.eq('funding_id', fundingId)
  if (renewalId) query = query.eq('renewal_id', renewalId)
  if (status) query = query.eq('status', status)
  if (expiresBefore) query = query.lte('expires_at', expiresBefore)

  if (user.role === 'sales_rep') {
    const { data: merchants, error } = await supabaseAdmin.from('merchants').select('id').eq('assigned_rep_id', user.id).returns<{ id: string }[]>()
    if (error) return badRequest(error.message)
    const ids = (merchants ?? []).map(merchant => merchant.id)
    if (ids.length === 0) return shouldPaginate ? paginatedJson([], 0, pagination.page, pagination.perPage) : json([])
    query = query.in('merchant_id', ids)
  } else if (user.role === 'merchant') {
    const { data: merchants, error } = await supabaseAdmin.from('merchants').select('id').eq('user_id', user.id).returns<{ id: string }[]>()
    if (error) return badRequest(error.message)
    const ids = (merchants ?? []).map(merchant => merchant.id)
    if (ids.length === 0) return shouldPaginate ? paginatedJson([], 0, pagination.page, pagination.perPage) : json([])
    query = query.in('merchant_id', ids)
  } else if (user.role === 'lender') {
    const lenderId = await getLenderIdForUser(user.id)
    if (!lenderId) return shouldPaginate ? paginatedJson([], 0, pagination.page, pagination.perPage) : json([])
    const { data: fundings, error } = await supabaseAdmin.from('fundings').select('id').eq('lender_id', lenderId).returns<{ id: string }[]>()
    if (error) return badRequest(error.message)
    const ids = (fundings ?? []).map(funding => funding.id)
    if (ids.length === 0) return shouldPaginate ? paginatedJson([], 0, pagination.page, pagination.perPage) : json([])
    query = query.in('funding_id', ids)
  }

  query = query.order('requested_at', { ascending: false }).order('created_at', { ascending: false })
  if (shouldPaginate) query = query.range(pagination.from, pagination.to)

  const { data, error, count } = await query.returns<PayoffRequestRow[]>()
  if (error) return badRequest(error.message)

  const requests = (data ?? [])
    .filter(row => user.role !== 'sales_rep' || row.merchant?.assigned_rep_id === user.id)
    .map(toPayoffRequest)
    .map(request => (user.role === 'merchant' || user.role === 'lender') ? safePayoffRequest(request) : request)

  return shouldPaginate ? paginatedJson(requests, count, pagination.page, pagination.perPage) : json(requests)
}

export async function POST(req: Request): Promise<Response> {
  const user = await requireAuth(req)
  if (!['admin', 'sales_rep', 'merchant'].includes(user.role)) return forbidden()

  const body = await req.json() as PayoffRequestBody
  if (!body.merchant_id) return badRequest('merchant_id is required')

  const merchant = await getMerchant(body.merchant_id)
  if (merchant instanceof Response) return merchant
  if (user.role === 'sales_rep' && merchant.assigned_rep_id !== user.id) return forbidden()
  if (user.role === 'merchant' && merchant.user_id !== user.id) return forbidden()

  const funding = await getFundingForRequest(body.merchant_id, body.funding_id)
  if (funding instanceof Response) return funding

  const renewalError = await validateRenewal(body.merchant_id, body.renewal_id)
  if (renewalError) return renewalError

  const { data, error } = await supabaseAdmin
    .from('payoff_requests')
    .insert({
      merchant_id: body.merchant_id,
      funding_id: funding.id,
      renewal_id: body.renewal_id ?? null,
      requested_from_lender_id: funding.lender_id,
      requested_from_name: funding.lender?.company_name ?? null,
      requested_at: body.requested_at ?? new Date().toISOString(),
      status: 'requested',
      notes: user.role === 'merchant' ? null : body.notes?.trim() || null,
      created_by: user.id,
    })
    .select(payoffSelect)
    .single<PayoffRequestRow>()

  if (error) return badRequest(error.message)
  const request = toPayoffRequest(data)

  recordActivity({
    entity_type: 'merchant',
    entity_id: body.merchant_id,
    user_id: user.id,
    activity_type: 'system',
    body: `Payoff letter requested${request.requested_from_name ? ` from ${request.requested_from_name}` : ''}`,
    metadata: { payoff_request_id: request.id, funding_id: funding.id, requested_from_lender_id: funding.lender_id, status: request.status },
  })

  return json(user.role === 'merchant' ? safePayoffRequest(request) : request, { status: 201 })
}
