import type { SalesRepCommission } from '../../../types'
import { requireAuth } from '../../lib/requireAuth'
import { assertRole, badRequest, getId, json, type RouteContext } from '../../lib/route-utils'
import { supabaseAdmin } from '../../lib/supabase-server'

type CommissionRow = SalesRepCommission & {
  sales_rep?: { full_name: string | null; name: string | null; email: string } | null
  funding?: { merchant?: { business_name: string } | null } | null
}

type CommissionPatchBody = Partial<Pick<SalesRepCommission, 'basis_type' | 'basis_amount' | 'rate' | 'amount' | 'status' | 'paid_at' | 'notes'>>

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

export async function PATCH(req: Request, context?: RouteContext): Promise<Response> {
  const user = await requireAuth(req)
  const roleError = assertRole(user, ['admin'])
  if (roleError) return roleError

  const id = getId(context)
  if (!id) return badRequest()

  const body = await req.json() as CommissionPatchBody
  const update: Record<string, unknown> = { updated_at: new Date().toISOString() }
  if (body.basis_type !== undefined) update.basis_type = body.basis_type
  if (body.basis_amount !== undefined) update.basis_amount = toNumber(body.basis_amount)
  if (body.rate !== undefined) update.rate = toNumber(body.rate)
  if (body.amount !== undefined) {
    const amount = toNumber(body.amount)
    if (amount === null || amount < 0) return badRequest('amount is invalid')
    update.amount = amount
  }
  if (body.status !== undefined) update.status = body.status
  if (body.paid_at !== undefined) update.paid_at = body.paid_at
  if (body.notes !== undefined) update.notes = body.notes?.trim() || null

  const { data, error } = await supabaseAdmin
    .from('sales_rep_commissions')
    .update(update)
    .eq('id', id)
    .select('*, sales_rep:sales_rep_id(full_name,name,email), funding:fundings(merchant:merchants(business_name))')
    .single<CommissionRow>()

  if (error) return badRequest(error.message)
  return json(toCommission(data))
}
