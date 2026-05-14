import type { Renewal } from '../../../types'
import { recordActivity } from '../../lib/activity'
import { isRenewalStatus, toRenewal, type RenewalRow } from '../../lib/renewals'
import { requireAuth } from '../../lib/requireAuth'
import { badRequest, forbidden, getId, json, notFound, type RouteContext } from '../../lib/route-utils'
import { supabaseAdmin } from '../../lib/supabase-server'

type RenewalPatchBody = Partial<Pick<Renewal, 'eligibility_date' | 'status' | 'estimated_balance' | 'payoff_amount' | 'assigned_rep_id' | 'last_contacted_at' | 'next_follow_up_at' | 'notes'>>

const renewalSelect = '*, merchant:merchants(business_name,assigned_rep_id,user_id), funding:fundings(funded_amount,funded_at,lender:lenders(company_name)), assigned_rep:users!renewals_assigned_rep_id_fkey(full_name,name,email)'

function toNumber(value: unknown): number | null {
  if (value === null || value === undefined || value === '') return null
  const parsed = Number(String(value).replace(/[^0-9.-]/g, ''))
  return Number.isFinite(parsed) ? parsed : null
}

function canAccess(userId: string, role: string, renewal: RenewalRow): boolean {
  if (role === 'admin') return true
  if (role === 'sales_rep') return renewal.merchant?.assigned_rep_id === userId
  if (role === 'merchant') return renewal.merchant?.user_id === userId
  return false
}

function safeRenewalForMerchant(renewal: Renewal): Renewal {
  return { ...renewal, estimated_balance: null, payoff_amount: null, notes: null, assigned_rep_id: null, assigned_rep_name: null }
}

async function fetchRenewal(id: string): Promise<RenewalRow | Response | null> {
  const { data, error } = await supabaseAdmin
    .from('renewals')
    .select(renewalSelect)
    .eq('id', id)
    .maybeSingle<RenewalRow>()
  if (error) return badRequest(error.message)
  return data ?? null
}

export async function GET(req: Request, context?: RouteContext): Promise<Response> {
  const user = await requireAuth(req)
  if (user.role === 'lender') return forbidden()
  const id = getId(context)
  if (!id) return badRequest('id is required')

  const renewal = await fetchRenewal(id)
  if (renewal instanceof Response) return renewal
  if (!renewal) return notFound()
  if (!canAccess(user.id, user.role, renewal)) return forbidden()

  const mapped = toRenewal(renewal)
  return json(user.role === 'merchant' ? safeRenewalForMerchant(mapped) : mapped)
}

export async function PATCH(req: Request, context?: RouteContext): Promise<Response> {
  const user = await requireAuth(req)
  if (user.role !== 'admin' && user.role !== 'sales_rep') return forbidden()
  const id = getId(context)
  if (!id) return badRequest('id is required')

  const existing = await fetchRenewal(id)
  if (existing instanceof Response) return existing
  if (!existing) return notFound()
  if (!canAccess(user.id, user.role, existing)) return forbidden()

  const body = await req.json() as RenewalPatchBody
  if (body.status && !isRenewalStatus(body.status)) return badRequest('status is invalid')

  const update: Record<string, unknown> = { updated_at: new Date().toISOString() }
  if (body.eligibility_date !== undefined) update.eligibility_date = body.eligibility_date
  if (body.status !== undefined) update.status = body.status
  if (body.estimated_balance !== undefined) update.estimated_balance = toNumber(body.estimated_balance)
  if (body.payoff_amount !== undefined) update.payoff_amount = toNumber(body.payoff_amount)
  if (body.last_contacted_at !== undefined) update.last_contacted_at = body.last_contacted_at
  if (body.next_follow_up_at !== undefined) update.next_follow_up_at = body.next_follow_up_at
  if (body.notes !== undefined) update.notes = body.notes?.trim() || null
  if (body.assigned_rep_id !== undefined && user.role === 'admin') update.assigned_rep_id = body.assigned_rep_id

  const { data, error } = await supabaseAdmin
    .from('renewals')
    .update(update)
    .eq('id', id)
    .select(renewalSelect)
    .single<RenewalRow>()

  if (error) return badRequest(error.message)
  const renewal = toRenewal(data)

  if (body.status && body.status !== existing.status) {
    recordActivity({
      entity_type: 'merchant',
      entity_id: existing.merchant_id,
      user_id: user.id,
      activity_type: 'system',
      body: `Renewal status changed from ${existing.status} to ${body.status}`,
      metadata: { renewal_id: id, previous_status: existing.status, new_status: body.status },
    })
  }

  if (body.last_contacted_at || body.status === 'contacted') {
    recordActivity({
      entity_type: 'merchant',
      entity_id: existing.merchant_id,
      user_id: user.id,
      activity_type: 'call',
      body: 'Merchant contacted for renewal',
      metadata: { renewal_id: id, last_contacted_at: body.last_contacted_at ?? new Date().toISOString() },
    })
  }

  return json(renewal)
}
