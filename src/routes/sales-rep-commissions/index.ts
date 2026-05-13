import type { SalesRepCommission } from '../../../types'
import { requireAuth } from '../../lib/requireAuth'
import { assertRole, badRequest, forbidden, json } from '../../lib/route-utils'
import { supabaseAdmin } from '../../lib/supabase-server'

type CommissionRow = SalesRepCommission & {
  sales_rep?: { full_name: string | null; name: string | null; email: string } | null
  funding?: { merchant?: { business_name: string } | null } | null
}

type CommissionBody = Partial<Pick<SalesRepCommission, 'funding_id' | 'sales_rep_id' | 'basis_type' | 'basis_amount' | 'rate' | 'amount' | 'status' | 'paid_at' | 'notes'>>

function toNumber(value: unknown): number | null {
  if (value === null || value === undefined || value === '') return null
  const parsed = Number(String(value).replace(/[^0-9.-]/g, ''))
  return Number.isFinite(parsed) ? parsed : null
}

function toCommission(row: CommissionRow): SalesRepCommission {
  return {
    id: row.id,
    funding_id: row.funding_id,
    sales_rep_id: row.sales_rep_id,
    basis_type: row.basis_type,
    basis_amount: row.basis_amount,
    rate: row.rate,
    amount: row.amount,
    status: row.status,
    paid_at: row.paid_at,
    notes: row.notes,
    created_at: row.created_at,
    updated_at: row.updated_at,
    merchant_name: row.funding?.merchant?.business_name,
    sales_rep_name: row.sales_rep?.full_name ?? row.sales_rep?.name ?? row.sales_rep?.email,
  }
}

export async function GET(req: Request): Promise<Response> {
  const user = await requireAuth(req)
  if (user.role === 'merchant' || user.role === 'lender') return forbidden()

  const url = new URL(req.url)
  const fundingId = url.searchParams.get('funding_id')

  let query = supabaseAdmin
    .from('sales_rep_commissions')
    .select('*, sales_rep:sales_rep_id(full_name,name,email), funding:fundings(merchant:merchants(business_name))')
    .order('created_at', { ascending: false })

  if (fundingId) query = query.eq('funding_id', fundingId)
  if (user.role === 'sales_rep') query = query.eq('sales_rep_id', user.id)

  const { data, error } = await query.returns<CommissionRow[]>()
  if (error) return badRequest(error.message)
  return json((data ?? []).map(toCommission))
}

export async function POST(req: Request): Promise<Response> {
  const user = await requireAuth(req)
  const roleError = assertRole(user, ['admin'])
  if (roleError) return roleError

  const body = await req.json() as CommissionBody
  const amount = toNumber(body.amount)
  if (amount === null || amount < 0) return badRequest('amount is required')
  if (!body.sales_rep_id) return badRequest('sales_rep_id is required')

  const { data, error } = await supabaseAdmin
    .from('sales_rep_commissions')
    .insert({
      funding_id: body.funding_id ?? null,
      sales_rep_id: body.sales_rep_id,
      basis_type: body.basis_type ?? 'broker_revenue',
      basis_amount: toNumber(body.basis_amount),
      rate: toNumber(body.rate),
      amount,
      status: body.status ?? 'unpaid',
      paid_at: body.paid_at ?? null,
      notes: body.notes?.trim() || null,
    })
    .select('*, sales_rep:sales_rep_id(full_name,name,email), funding:fundings(merchant:merchants(business_name))')
    .single<CommissionRow>()

  if (error) return badRequest(error.message)
  return json(toCommission(data), { status: 201 })
}
