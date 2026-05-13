import type { Funding } from '../../../types'
import { requireAuth } from '../../lib/requireAuth'
import { assertRole, badRequest, forbidden, getId, json, notFound, type RouteContext } from '../../lib/route-utils'
import { supabaseAdmin } from '../../lib/supabase-server'

type FundingRow = Funding & {
  merchant?: { business_name: string; assigned_rep_id: string | null } | null
  lender?: { company_name: string } | null
}

type FundingPatchBody = Partial<Pick<Funding, 'funded_amount' | 'payback_amount' | 'factor_rate' | 'buy_rate' | 'sell_rate' | 'payment_frequency' | 'term_days' | 'funded_at' | 'notes'>>

function toNumber(value: unknown): number | null {
  if (value === null || value === undefined || value === '') return null
  const parsed = Number(String(value).replace(/[^0-9.-]/g, ''))
  return Number.isFinite(parsed) ? parsed : null
}

function toInt(value: unknown): number | null {
  const parsed = toNumber(value)
  return parsed === null ? null : Math.trunc(parsed)
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

async function fetchFunding(id: string): Promise<FundingRow | null | Response> {
  const { data, error } = await supabaseAdmin
    .from('fundings')
    .select('*, merchant:merchants(business_name,assigned_rep_id), lender:lenders(company_name)')
    .eq('id', id)
    .maybeSingle<FundingRow>()
  if (error) return badRequest(error.message)
  return data ?? null
}

function canReadFunding(userId: string, role: string, funding: FundingRow): boolean {
  if (role === 'admin') return true
  if (role === 'sales_rep') return funding.merchant?.assigned_rep_id === userId
  return false
}

export async function GET(req: Request, context?: RouteContext): Promise<Response> {
  const user = await requireAuth(req)
  const id = getId(context)
  if (!id) return badRequest()

  const funding = await fetchFunding(id)
  if (funding instanceof Response) return funding
  if (!funding) return notFound()
  if (!canReadFunding(user.id, user.role, funding)) return forbidden()

  return json(toFunding(funding))
}

export async function PATCH(req: Request, context?: RouteContext): Promise<Response> {
  const user = await requireAuth(req)
  const roleError = assertRole(user, ['admin'])
  if (roleError) return roleError

  const id = getId(context)
  if (!id) return badRequest()

  const body = await req.json() as FundingPatchBody
  const update: Record<string, unknown> = { updated_at: new Date().toISOString() }
  if (body.funded_amount !== undefined) {
    const value = toNumber(body.funded_amount)
    if (value === null || value <= 0) return badRequest('funded_amount is invalid')
    update.funded_amount = value
  }
  if (body.payback_amount !== undefined) update.payback_amount = toNumber(body.payback_amount)
  if (body.factor_rate !== undefined) update.factor_rate = toNumber(body.factor_rate)
  if (body.buy_rate !== undefined) update.buy_rate = toNumber(body.buy_rate)
  if (body.sell_rate !== undefined) update.sell_rate = toNumber(body.sell_rate)
  if (body.payment_frequency !== undefined) update.payment_frequency = body.payment_frequency
  if (body.term_days !== undefined) update.term_days = toInt(body.term_days)
  if (body.funded_at !== undefined) update.funded_at = body.funded_at
  if (body.notes !== undefined) update.notes = body.notes?.trim() || null

  const { data, error } = await supabaseAdmin
    .from('fundings')
    .update(update)
    .eq('id', id)
    .select('*, merchant:merchants(business_name,assigned_rep_id), lender:lenders(company_name)')
    .single<FundingRow>()

  if (error) return badRequest(error.message)
  return json(toFunding(data))
}
