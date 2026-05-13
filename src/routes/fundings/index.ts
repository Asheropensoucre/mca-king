import type { ApplicationStatus, BrokerRevenue, Funding, SalesRepCommission } from '../../../types'
import { recordActivity } from '../../lib/activity'
import { rowToMerchant, type MerchantRow, type OfferRow } from '../../lib/data-shapes'
import { triggerMerchantStatusEmail } from '../../lib/email-triggers'
import { requireAuth } from '../../lib/requireAuth'
import { assertRole, badRequest, forbidden, json } from '../../lib/route-utils'
import { supabaseAdmin } from '../../lib/supabase-server'

const FUNDED_STATUS: ApplicationStatus = 'FUNDED'
const PAYMENT_FREQUENCIES = ['daily', 'weekly', 'biweekly', 'monthly'] as const

type FundingRow = Funding & {
  merchant?: { business_name: string; assigned_rep_id: string | null } | null
  lender?: { company_name: string } | null
}

type FundingBody = {
  merchant_id?: string
  lender_id?: string | null
  offer_id?: string | null
  funded_amount?: number | string
  payback_amount?: number | string | null
  factor_rate?: number | string | null
  buy_rate?: number | string | null
  sell_rate?: number | string | null
  payment_frequency?: string | null
  term_days?: number | string | null
  funded_at?: string | null
  notes?: string | null
  broker_revenue_amount?: number | string | null
  broker_revenue_rate?: number | string | null
  broker_revenue_status?: BrokerRevenue['status']
  sales_rep_commission_amount?: number | string | null
  sales_rep_commission_rate?: number | string | null
  sales_rep_commission_status?: SalesRepCommission['status']
}

function toNumber(value: unknown): number | null {
  if (value === null || value === undefined || value === '') return null
  const parsed = Number(String(value).replace(/[^0-9.-]/g, ''))
  return Number.isFinite(parsed) ? parsed : null
}

function toInt(value: unknown): number | null {
  const parsed = toNumber(value)
  return parsed === null ? null : Math.trunc(parsed)
}

function isPaymentFrequency(value: string | null | undefined): value is Funding['payment_frequency'] {
  return typeof value === 'string' && PAYMENT_FREQUENCIES.includes(value as NonNullable<Funding['payment_frequency']>)
}

function toFunding(row: FundingRow): Funding {
  return {
    id: row.id,
    merchant_id: row.merchant_id,
    lender_id: row.lender_id,
    offer_id: row.offer_id,
    funded_amount: row.funded_amount,
    payback_amount: row.payback_amount,
    factor_rate: row.factor_rate,
    buy_rate: row.buy_rate,
    sell_rate: row.sell_rate,
    payment_frequency: row.payment_frequency,
    term_days: row.term_days,
    funded_at: row.funded_at,
    created_by: row.created_by,
    notes: row.notes,
    created_at: row.created_at,
    updated_at: row.updated_at,
    merchant_name: row.merchant?.business_name,
    lender_name: row.lender?.company_name,
  }
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

export async function GET(req: Request): Promise<Response> {
  const user = await requireAuth(req)
  if (user.role === 'merchant' || user.role === 'lender') return forbidden()

  const url = new URL(req.url)
  const merchantId = url.searchParams.get('merchant_id')

  let query = supabaseAdmin
    .from('fundings')
    .select('*, merchant:merchants(business_name,assigned_rep_id), lender:lenders(company_name)')
    .order('funded_at', { ascending: false })

  if (merchantId) query = query.eq('merchant_id', merchantId)

  if (user.role === 'sales_rep') {
    const { data: merchants, error } = await supabaseAdmin
      .from('merchants')
      .select('id')
      .eq('assigned_rep_id', user.id)
      .returns<{ id: string }[]>()
    if (error) return badRequest(error.message)
    const ids = (merchants ?? []).map(merchant => merchant.id)
    if (ids.length === 0) return json([])
    query = query.in('merchant_id', ids)
  }

  const { data, error } = await query.returns<FundingRow[]>()
  if (error) return badRequest(error.message)
  return json((data ?? []).map(toFunding))
}

export async function POST(req: Request): Promise<Response> {
  const user = await requireAuth(req)
  const roleError = assertRole(user, ['admin', 'sales_rep'])
  if (roleError) return roleError

  const body = await req.json() as FundingBody
  if (!body.merchant_id) return badRequest('merchant_id is required')

  const fundedAmount = toNumber(body.funded_amount)
  if (fundedAmount === null || fundedAmount <= 0) return badRequest('funded_amount is required')

  if (body.payment_frequency && !isPaymentFrequency(body.payment_frequency)) return badRequest('payment_frequency is invalid')

  const { data: merchantRow, error: merchantError } = await supabaseAdmin
    .from('merchants')
    .select('*')
    .eq('id', body.merchant_id)
    .single<MerchantRow>()

  if (merchantError) return badRequest(merchantError.message)
  if (user.role === 'sales_rep' && merchantRow.assigned_rep_id !== user.id) return forbidden()

  let lenderId = body.lender_id ?? null
  let offerId = body.offer_id ?? null
  let factorRate = toNumber(body.factor_rate)

  if (offerId) {
    const { data: offer, error: offerError } = await supabaseAdmin
      .from('offers')
      .select('*')
      .eq('id', offerId)
      .single<OfferRow>()

    if (offerError) return badRequest(offerError.message)
    if (offer.merchant_id !== body.merchant_id) return badRequest('offer does not belong to merchant')
    lenderId = offer.lender_id
    factorRate = factorRate ?? toNumber(offer.factor_rate)
  }

  const { data: fundingRow, error: fundingError } = await supabaseAdmin
    .from('fundings')
    .insert({
      merchant_id: body.merchant_id,
      lender_id: lenderId,
      offer_id: offerId,
      funded_amount: fundedAmount,
      payback_amount: toNumber(body.payback_amount),
      factor_rate: factorRate,
      buy_rate: toNumber(body.buy_rate),
      sell_rate: toNumber(body.sell_rate),
      payment_frequency: body.payment_frequency ?? null,
      term_days: toInt(body.term_days),
      funded_at: body.funded_at || new Date().toISOString(),
      created_by: user.id,
      notes: body.notes?.trim() || null,
    })
    .select('*, merchant:merchants(business_name,assigned_rep_id), lender:lenders(company_name)')
    .single<FundingRow>()

  if (fundingError) return badRequest(fundingError.message)

  const merchant = rowToMerchant(merchantRow)
  const updatedMerchant = { ...merchant, status: FUNDED_STATUS }
  const { error: merchantUpdateError } = await supabaseAdmin
    .from('merchants')
    .update({ status: FUNDED_STATUS, payload: updatedMerchant, updated_at: new Date().toISOString() })
    .eq('id', body.merchant_id)

  if (merchantUpdateError) return badRequest(merchantUpdateError.message)

  if (merchantRow.status !== FUNDED_STATUS) {
    const { error: historyError } = await supabaseAdmin.from('status_history').insert({
      merchant_id: body.merchant_id,
      changed_by: user.id,
      previous_status: merchantRow.status,
      new_status: FUNDED_STATUS,
      note: 'Deal marked funded',
    })
    if (historyError) return badRequest(historyError.message)
  }

  const brokerRevenueAmount = toNumber(body.broker_revenue_amount)
  if (user.role === 'admin' && brokerRevenueAmount !== null && brokerRevenueAmount >= 0) {
    const { error } = await supabaseAdmin.from('broker_revenue').insert({
      funding_id: fundingRow.id,
      merchant_id: body.merchant_id,
      lender_id: lenderId,
      revenue_type: 'commission',
      basis_amount: fundedAmount,
      rate: toNumber(body.broker_revenue_rate),
      amount: brokerRevenueAmount,
      status: body.broker_revenue_status ?? 'expected',
    })
    if (error) return badRequest(error.message)
  }

  const repCommissionAmount = toNumber(body.sales_rep_commission_amount)
  if (user.role === 'admin' && repCommissionAmount !== null && repCommissionAmount >= 0 && merchantRow.assigned_rep_id) {
    const { error } = await supabaseAdmin.from('sales_rep_commissions').insert({
      funding_id: fundingRow.id,
      sales_rep_id: merchantRow.assigned_rep_id,
      basis_type: 'broker_revenue',
      basis_amount: brokerRevenueAmount ?? fundedAmount,
      rate: toNumber(body.sales_rep_commission_rate),
      amount: repCommissionAmount,
      status: body.sales_rep_commission_status ?? 'unpaid',
    })
    if (error) return badRequest(error.message)
  }

  recordActivity({
    entity_type: 'funding',
    entity_id: fundingRow.id,
    user_id: user.id,
    activity_type: 'system',
    body: `Deal funded: ${fundingRow.merchant?.business_name ?? body.merchant_id} for $${fundedAmount.toLocaleString()}`,
    metadata: { merchant_id: body.merchant_id, lender_id: lenderId, funding_id: fundingRow.id, funded_amount: fundedAmount },
  })
  recordActivity({
    entity_type: 'merchant',
    entity_id: body.merchant_id,
    user_id: user.id,
    activity_type: 'system',
    body: `Deal funded for $${fundedAmount.toLocaleString()}`,
    metadata: { funding_id: fundingRow.id, lender_id: lenderId, funded_amount: fundedAmount },
  })

  triggerMerchantStatusEmail(body.merchant_id, FUNDED_STATUS)

  return json(toFunding(fundingRow), { status: 201 })
}
