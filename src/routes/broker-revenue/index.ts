import type { BrokerRevenue } from '../../../types'
import { requireAuth } from '../../lib/requireAuth'
import { assertRole, badRequest, forbidden, json } from '../../lib/route-utils'
import { supabaseAdmin } from '../../lib/supabase-server'

type BrokerRevenueRow = BrokerRevenue & {
  merchant?: { business_name: string } | null
  lender?: { company_name: string } | null
}

type BrokerRevenueBody = Partial<Pick<BrokerRevenue, 'funding_id' | 'merchant_id' | 'lender_id' | 'revenue_type' | 'basis_amount' | 'rate' | 'amount' | 'status' | 'expected_payment_date' | 'received_at' | 'notes'>>

function toNumber(value: unknown): number | null {
  if (value === null || value === undefined || value === '') return null
  const parsed = Number(String(value).replace(/[^0-9.-]/g, ''))
  return Number.isFinite(parsed) ? parsed : null
}

function toBrokerRevenue(row: BrokerRevenueRow): BrokerRevenue {
  return {
    id: row.id,
    funding_id: row.funding_id,
    merchant_id: row.merchant_id,
    lender_id: row.lender_id,
    revenue_type: row.revenue_type,
    basis_amount: row.basis_amount,
    rate: row.rate,
    amount: row.amount,
    status: row.status,
    expected_payment_date: row.expected_payment_date,
    received_at: row.received_at,
    notes: row.notes,
    created_at: row.created_at,
    updated_at: row.updated_at,
    merchant_name: row.merchant?.business_name,
    lender_name: row.lender?.company_name,
  }
}

export async function GET(req: Request): Promise<Response> {
  const user = await requireAuth(req)
  if (user.role === 'merchant' || user.role === 'lender' || user.role === 'sales_rep') return forbidden()

  const url = new URL(req.url)
  const fundingId = url.searchParams.get('funding_id')
  const merchantId = url.searchParams.get('merchant_id')

  let query = supabaseAdmin
    .from('broker_revenue')
    .select('*, merchant:merchants(business_name), lender:lenders(company_name)')
    .order('created_at', { ascending: false })

  if (fundingId) query = query.eq('funding_id', fundingId)
  if (merchantId) query = query.eq('merchant_id', merchantId)

  const { data, error } = await query.returns<BrokerRevenueRow[]>()
  if (error) return badRequest(error.message)
  return json((data ?? []).map(toBrokerRevenue))
}

export async function POST(req: Request): Promise<Response> {
  const user = await requireAuth(req)
  const roleError = assertRole(user, ['admin'])
  if (roleError) return roleError

  const body = await req.json() as BrokerRevenueBody
  const amount = toNumber(body.amount)
  if (amount === null || amount < 0) return badRequest('amount is required')

  const { data, error } = await supabaseAdmin
    .from('broker_revenue')
    .insert({
      funding_id: body.funding_id ?? null,
      merchant_id: body.merchant_id ?? null,
      lender_id: body.lender_id ?? null,
      revenue_type: body.revenue_type ?? 'commission',
      basis_amount: toNumber(body.basis_amount),
      rate: toNumber(body.rate),
      amount,
      status: body.status ?? 'expected',
      expected_payment_date: body.expected_payment_date ?? null,
      received_at: body.received_at ?? null,
      notes: body.notes?.trim() || null,
    })
    .select('*, merchant:merchants(business_name), lender:lenders(company_name)')
    .single<BrokerRevenueRow>()

  if (error) return badRequest(error.message)
  return json(toBrokerRevenue(data), { status: 201 })
}
