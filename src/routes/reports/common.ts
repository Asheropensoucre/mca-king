import type { RouteUser } from '../../lib/route-utils'
import { badRequest } from '../../lib/route-utils'
import { parseReportFilters, type ReportFilters } from '../../lib/reporting'
import { supabaseAdmin } from '../../lib/supabase-server'

export type MerchantReportRow = {
  id: string
  business_name: string
  status: string
  assigned_rep_id: string | null
  requested_amount: number | string | null
  created_at: string
  updated_at: string
  assigned_rep?: { full_name: string | null; name: string | null; email: string } | null
}

export type LeadReportRow = {
  id: string
  created_by: string
  assigned_rep_id: string | null
  business_name: string
  owner_name: string | null
  status: string
  converted_to: string | null
  created_at: string
  updated_at: string
  assigned_rep?: { full_name: string | null; name: string | null; email: string } | null
}

export type FundingReportRow = {
  id: string
  merchant_id: string
  lender_id: string | null
  funded_amount: number | string
  payback_amount: number | string | null
  factor_rate: number | string | null
  term_days: number | null
  funded_at: string
  funding_type: string
  renewal_number: number
  funding_position: number
  merchant?: { business_name: string; assigned_rep_id: string | null; assigned_rep?: { full_name: string | null; name: string | null; email: string } | null } | null
  lender?: { company_name: string } | null
}

export type SubmissionReportRow = {
  id: string
  merchant_id: string
  lender_id: string
  status: string
  submitted_at: string
  response_at: string | null
  merchant?: { business_name: string; assigned_rep_id: string | null } | null
  lender?: { company_name: string } | null
}

export type OfferReportRow = {
  id: string
  merchant_id: string
  lender_id: string
  amount: number | string
  status: string
  created_at: string
}

export type RevenueReportRow = {
  id: string
  funding_id: string | null
  merchant_id: string | null
  lender_id: string | null
  revenue_type: string
  amount: number | string
  status: string
  expected_payment_date: string | null
  received_at: string | null
  created_at: string
  merchant?: { business_name: string; assigned_rep_id: string | null } | null
  lender?: { company_name: string } | null
}

export type CommissionReportRow = {
  id: string
  funding_id: string | null
  sales_rep_id: string | null
  basis_type: string
  amount: number | string
  status: string
  paid_at: string | null
  created_at: string
  sales_rep?: { full_name: string | null; name: string | null; email: string } | null
  funding?: { merchant_id: string | null; merchant?: { business_name: string } | null } | null
}

export type RenewalReportRow = {
  id: string
  merchant_id: string
  funding_id: string | null
  eligibility_date: string
  status: string
  assigned_rep_id: string | null
  next_follow_up_at: string | null
  updated_at: string
  merchant?: { business_name: string; assigned_rep_id: string | null } | null
  funding?: { funded_amount: number | string | null; lender?: { company_name: string | null } | null } | null
  assigned_rep?: { full_name: string | null; name: string | null; email: string } | null
}

export type TaskReportRow = {
  id: string
  assigned_to: string | null
  created_by: string
  entity_type: string
  entity_id: string
  title: string
  priority: string
  status: string
  due_at: string | null
  completed_at: string | null
  created_at: string
  assignee?: { full_name: string | null; name: string | null; email: string } | null
}

export function userName(user?: { full_name?: string | null; name?: string | null; email?: string | null } | null): string {
  return user?.full_name ?? user?.name ?? user?.email ?? 'Unassigned'
}

export async function merchantIdsForRep(user: RouteUser): Promise<string[] | Response | null> {
  if (user.role !== 'sales_rep') return null
  const { data, error } = await supabaseAdmin.from('merchants').select('id').eq('assigned_rep_id', user.id).returns<{ id: string }[]>()
  if (error) return badRequest(error.message)
  return (data ?? []).map(row => row.id)
}

export function scopedByMerchant<T extends { merchant_id?: string | null; merchant?: { assigned_rep_id?: string | null } | null }>(rows: T[], user: RouteUser, merchantIds: string[] | null): T[] {
  if (user.role !== 'sales_rep') return rows
  const idSet = new Set(merchantIds ?? [])
  return rows.filter(row => (row.merchant_id && idSet.has(row.merchant_id)) || row.merchant?.assigned_rep_id === user.id)
}

export function range(url: URL): ReportFilters {
  return parseReportFilters(url)
}
