import type { Renewal, RenewalStatus } from '../../../types'
import { recordActivity } from '../../lib/activity'
import { getPagination, hasListParams, paginatedJson } from '../../lib/list-query'
import { isRenewalEligible, isRenewalStatus, toRenewal, type RenewalRow } from '../../lib/renewals'
import { requireAuth } from '../../lib/requireAuth'
import { assertRole, badRequest, forbidden, json } from '../../lib/route-utils'
import { supabaseAdmin } from '../../lib/supabase-server'

type RenewalBody = Partial<Pick<Renewal, 'merchant_id' | 'funding_id' | 'eligibility_date' | 'status' | 'estimated_balance' | 'payoff_amount' | 'assigned_rep_id' | 'last_contacted_at' | 'next_follow_up_at' | 'notes'>>

type MerchantAccessRow = { id: string; user_id: string | null; assigned_rep_id: string | null; business_name: string }

const renewalSelect = '*, merchant:merchants(business_name,assigned_rep_id,user_id), funding:fundings(funded_amount,funded_at,lender:lenders(company_name)), assigned_rep:users!renewals_assigned_rep_id_fkey(full_name,name,email)'

function toNumber(value: unknown): number | null {
  if (value === null || value === undefined || value === '') return null
  const parsed = Number(String(value).replace(/[^0-9.-]/g, ''))
  return Number.isFinite(parsed) ? parsed : null
}

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

function safeRenewalForMerchant(renewal: Renewal): Renewal {
  return { ...renewal, estimated_balance: null, payoff_amount: null, notes: null, assigned_rep_id: null, assigned_rep_name: null }
}

export async function GET(req: Request): Promise<Response> {
  const user = await requireAuth(req)
  if (user.role === 'lender') return forbidden()

  const url = new URL(req.url)
  const shouldPaginate = hasListParams(url)
  const pagination = getPagination(url)
  const merchantId = url.searchParams.get('merchant_id')
  const fundingId = url.searchParams.get('funding_id')
  const status = url.searchParams.get('status')
  const assignedRepId = url.searchParams.get('assigned_rep_id')
  const eligible = url.searchParams.get('eligible')
  const from = url.searchParams.get('from')
  const to = url.searchParams.get('to')

  if (status && !isRenewalStatus(status)) return badRequest('status is invalid')

  let query = supabaseAdmin
    .from('renewals')
    .select(renewalSelect, { count: shouldPaginate ? 'exact' : undefined })

  if (merchantId) query = query.eq('merchant_id', merchantId)
  if (fundingId) query = query.eq('funding_id', fundingId)
  if (status) query = query.eq('status', status)
  if (from) query = query.gte('eligibility_date', from)
  if (to) query = query.lte('eligibility_date', to)
  if (eligible === 'true') query = query.lte('eligibility_date', new Date().toISOString().slice(0, 10)).not('status', 'in', '(renewed,declined,not_interested)')

  if (user.role === 'sales_rep') {
    const { data: merchants, error } = await supabaseAdmin
      .from('merchants')
      .select('id')
      .eq('assigned_rep_id', user.id)
      .returns<{ id: string }[]>()
    if (error) return badRequest(error.message)
    const ids = (merchants ?? []).map(merchant => merchant.id)
    if (ids.length === 0) return shouldPaginate ? paginatedJson([], 0, pagination.page, pagination.perPage) : json([])
    query = query.in('merchant_id', ids)
  } else if (user.role === 'merchant') {
    const { data: merchants, error } = await supabaseAdmin
      .from('merchants')
      .select('id')
      .eq('user_id', user.id)
      .returns<{ id: string }[]>()
    if (error) return badRequest(error.message)
    const ids = (merchants ?? []).map(merchant => merchant.id)
    if (ids.length === 0) return shouldPaginate ? paginatedJson([], 0, pagination.page, pagination.perPage) : json([])
    query = query.in('merchant_id', ids)
  } else if (assignedRepId) {
    query = query.eq('assigned_rep_id', assignedRepId)
  }

  query = query.order('eligibility_date', { ascending: true }).order('created_at', { ascending: false })
  if (shouldPaginate) query = query.range(pagination.from, pagination.to)

  const { data, error, count } = await query.returns<RenewalRow[]>()
  if (error) return badRequest(error.message)

  if (user.role === 'merchant') {
    const requestedStatuses = new Set(['eligible', 'application_started'])
    const filtered = (data ?? []).filter(row => row.merchant?.user_id === user.id && isRenewalEligible(row.eligibility_date, row.status) && requestedStatuses.has(row.status))
    const renewals = filtered.map(toRenewal).map(safeRenewalForMerchant)
    return shouldPaginate ? paginatedJson(renewals, renewals.length, pagination.page, pagination.perPage) : json(renewals)
  }

  const renewals = (data ?? [])
    .filter(row => user.role !== 'sales_rep' || row.merchant?.assigned_rep_id === user.id)
    .filter(row => user.role !== 'merchant' || row.merchant?.user_id === user.id)
    .map(toRenewal)
    .map(renewal => user.role === 'merchant' ? safeRenewalForMerchant(renewal) : renewal)

  return shouldPaginate ? paginatedJson(renewals, count, pagination.page, pagination.perPage) : json(renewals)
}

export async function POST(req: Request): Promise<Response> {
  const user = await requireAuth(req)
  const roleError = assertRole(user, ['admin', 'sales_rep'])
  if (roleError) return roleError

  const body = await req.json() as RenewalBody
  if (!body.merchant_id) return badRequest('merchant_id is required')
  if (!body.eligibility_date) return badRequest('eligibility_date is required')
  if (body.status && !isRenewalStatus(body.status)) return badRequest('status is invalid')

  const merchant = await getMerchant(body.merchant_id)
  if (merchant instanceof Response) return merchant
  if (user.role === 'sales_rep' && merchant.assigned_rep_id !== user.id) return forbidden()

  if (body.funding_id) {
    const { data: funding, error } = await supabaseAdmin
      .from('fundings')
      .select('id,merchant_id')
      .eq('id', body.funding_id)
      .maybeSingle<{ id: string; merchant_id: string }>()
    if (error) return badRequest(error.message)
    if (!funding || funding.merchant_id !== body.merchant_id) return badRequest('funding does not belong to merchant')
  }

  const status: RenewalStatus = body.status ?? (isRenewalEligible(body.eligibility_date, 'not_ready') ? 'eligible' : 'not_ready')
  const { data, error } = await supabaseAdmin
    .from('renewals')
    .insert({
      merchant_id: body.merchant_id,
      funding_id: body.funding_id ?? null,
      eligibility_date: body.eligibility_date,
      status,
      estimated_balance: toNumber(body.estimated_balance),
      payoff_amount: toNumber(body.payoff_amount),
      assigned_rep_id: user.role === 'sales_rep' ? user.id : body.assigned_rep_id ?? merchant.assigned_rep_id,
      last_contacted_at: body.last_contacted_at ?? null,
      next_follow_up_at: body.next_follow_up_at ?? null,
      notes: body.notes?.trim() || null,
      created_by: user.id,
    })
    .select(renewalSelect)
    .single<RenewalRow>()

  if (error) return badRequest(error.message)
  const renewal = toRenewal(data)

  recordActivity({
    entity_type: 'merchant',
    entity_id: body.merchant_id,
    user_id: user.id,
    activity_type: 'system',
    body: `Renewal opportunity created; eligible on ${body.eligibility_date}`,
    metadata: { renewal_id: renewal.id, funding_id: body.funding_id ?? null, status },
  })

  return json(renewal, { status: 201 })
}
