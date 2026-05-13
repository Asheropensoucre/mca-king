import type { BrokerRevenue } from '../../../types'
import { requireAuth } from '../../lib/requireAuth'
import { assertRole, badRequest, getId, json, type RouteContext } from '../../lib/route-utils'
import { supabaseAdmin } from '../../lib/supabase-server'

type BrokerRevenueRow = BrokerRevenue & {
  merchant?: { business_name: string } | null
  lender?: { company_name: string } | null
}

type BrokerRevenuePatchBody = Partial<Pick<BrokerRevenue, 'revenue_type' | 'basis_amount' | 'rate' | 'amount' | 'status' | 'expected_payment_date' | 'received_at' | 'notes'>>

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

export async function PATCH(req: Request, context?: RouteContext): Promise<Response> {
  const user = await requireAuth(req)
  const roleError = assertRole(user, ['admin'])
  if (roleError) return roleError

  const id = getId(context)
  if (!id) return badRequest()

  const body = await req.json() as BrokerRevenuePatchBody
  const update: Record<string, unknown> = { updated_at: new Date().toISOString() }
  if (body.revenue_type !== undefined) update.revenue_type = body.revenue_type
  if (body.basis_amount !== undefined) update.basis_amount = toNumber(body.basis_amount)
  if (body.rate !== undefined) update.rate = toNumber(body.rate)
  if (body.amount !== undefined) {
    const amount = toNumber(body.amount)
    if (amount === null || amount < 0) return badRequest('amount is invalid')
    update.amount = amount
  }
  if (body.status !== undefined) update.status = body.status
  if (body.expected_payment_date !== undefined) update.expected_payment_date = body.expected_payment_date
  if (body.received_at !== undefined) update.received_at = body.received_at
  if (body.notes !== undefined) update.notes = body.notes?.trim() || null

  const { data, error } = await supabaseAdmin
    .from('broker_revenue')
    .update(update)
    .eq('id', id)
    .select('*, merchant:merchants(business_name), lender:lenders(company_name)')
    .single<BrokerRevenueRow>()

  if (error) return badRequest(error.message)
  return json(toBrokerRevenue(data))
}
