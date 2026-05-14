import type { PayoffRequest, PayoffRequestStatus, Renewal, RenewalStatus } from '../../types'
import { supabaseAdmin } from './supabase-server'

export const RENEWAL_STATUSES: RenewalStatus[] = ['not_ready', 'eligible', 'contacted', 'application_started', 'submitted', 'renewed', 'declined', 'not_interested']
export const PAYOFF_REQUEST_STATUSES: PayoffRequestStatus[] = ['requested', 'received', 'expired', 'used', 'cancelled']

export type RenewalRow = Renewal & {
  merchant?: { business_name: string; assigned_rep_id: string | null; user_id?: string | null } | null
  funding?: { funded_amount: number | string | null; funded_at: string | null; lender?: { company_name: string | null } | null } | null
  assigned_rep?: { full_name: string | null; name: string | null; email: string } | null
}

export type PayoffRequestRow = PayoffRequest & {
  merchant?: { business_name: string; assigned_rep_id?: string | null; user_id?: string | null } | null
  funding?: { lender_id: string | null } | null
  document?: { file_name: string | null } | null
}

export function isRenewalStatus(value: unknown): value is RenewalStatus {
  return typeof value === 'string' && RENEWAL_STATUSES.includes(value as RenewalStatus)
}

export function isPayoffRequestStatus(value: unknown): value is PayoffRequestStatus {
  return typeof value === 'string' && PAYOFF_REQUEST_STATUSES.includes(value as PayoffRequestStatus)
}

export function defaultRenewalEligibilityDate(fundedAt: string): string {
  const date = new Date(fundedAt)
  date.setDate(date.getDate() + 90)
  return date.toISOString().slice(0, 10)
}

export function isRenewalEligible(eligibilityDate: string, status: RenewalStatus): boolean {
  if (status === 'renewed' || status === 'declined' || status === 'not_interested') return false
  return new Date(`${eligibilityDate}T00:00:00Z`).getTime() <= Date.now()
}

export function toRenewal(row: RenewalRow): Renewal {
  return {
    id: row.id,
    merchant_id: row.merchant_id,
    funding_id: row.funding_id,
    eligibility_date: row.eligibility_date,
    status: row.status,
    estimated_balance: row.estimated_balance,
    payoff_amount: row.payoff_amount,
    assigned_rep_id: row.assigned_rep_id,
    last_contacted_at: row.last_contacted_at,
    next_follow_up_at: row.next_follow_up_at,
    notes: row.notes,
    created_by: row.created_by,
    created_at: row.created_at,
    updated_at: row.updated_at,
    merchant_name: row.merchant?.business_name,
    lender_name: row.funding?.lender?.company_name ?? null,
    funded_amount: row.funding?.funded_amount ?? null,
    funded_at: row.funding?.funded_at ?? null,
    assigned_rep_name: row.assigned_rep?.full_name ?? row.assigned_rep?.name ?? row.assigned_rep?.email ?? null,
    is_eligible: isRenewalEligible(row.eligibility_date, row.status),
  }
}

export function toPayoffRequest(row: PayoffRequestRow): PayoffRequest {
  return {
    id: row.id,
    merchant_id: row.merchant_id,
    funding_id: row.funding_id,
    renewal_id: row.renewal_id,
    requested_from_lender_id: row.requested_from_lender_id,
    requested_from_name: row.requested_from_name,
    payoff_amount: row.payoff_amount,
    requested_at: row.requested_at,
    received_at: row.received_at,
    expires_at: row.expires_at,
    file_document_id: row.file_document_id,
    status: row.status,
    notes: row.notes,
    created_by: row.created_by,
    created_at: row.created_at,
    updated_at: row.updated_at,
    merchant_name: row.merchant?.business_name,
    document_name: row.document?.file_name ?? null,
    funding_lender_id: row.funding?.lender_id ?? null,
  }
}

export async function ensureRenewalForFunding(params: {
  funding_id: string
  merchant_id: string
  funded_at: string
  assigned_rep_id?: string | null
  created_by?: string | null
}): Promise<Renewal | null> {
  const eligibilityDate = defaultRenewalEligibilityDate(params.funded_at)
  const { data, error } = await supabaseAdmin
    .from('renewals')
    .upsert({
      merchant_id: params.merchant_id,
      funding_id: params.funding_id,
      eligibility_date: eligibilityDate,
      status: 'not_ready',
      assigned_rep_id: params.assigned_rep_id ?? null,
      created_by: params.created_by ?? null,
      updated_at: new Date().toISOString(),
    }, { onConflict: 'merchant_id,funding_id', ignoreDuplicates: true })
    .select('*, merchant:merchants(business_name,assigned_rep_id,user_id), funding:fundings(funded_amount,funded_at,lender:lenders(company_name)), assigned_rep:users!renewals_assigned_rep_id_fkey(full_name,name,email)')
    .maybeSingle<RenewalRow>()

  if (error) throw new Error(error.message)
  return data ? toRenewal(data) : null
}
