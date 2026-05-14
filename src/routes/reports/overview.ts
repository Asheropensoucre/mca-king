import type { OverviewReport } from '../../../types'
import { requireAuth } from '../../lib/requireAuth'
import { badRequest, json } from '../../lib/route-utils'
import { addBreakdown, blockReportRole, breakdownRows, bucketByDate, dateInRange, moneyNumber, percent } from '../../lib/reporting'
import { supabaseAdmin } from '../../lib/supabase-server'
import { merchantIdsForRep, range, scopedByMerchant, userName, type FundingReportRow, type LeadReportRow, type MerchantReportRow, type OfferReportRow, type RevenueReportRow, type CommissionReportRow, type RenewalReportRow, type TaskReportRow } from './common'

export async function GET(req: Request): Promise<Response> {
  const user = await requireAuth(req)
  const roleError = blockReportRole(user)
  if (roleError) return roleError
  const filters = range(new URL(req.url))
  const scopedIds = await merchantIdsForRep(user)
  if (scopedIds instanceof Response) return scopedIds

  const [merchantsRes, leadsRes, fundingsRes, offersRes, revenueRes, commissionsRes, renewalsRes, tasksRes] = await Promise.all([
    supabaseAdmin.from('merchants').select('id,business_name,status,assigned_rep_id,requested_amount,created_at,updated_at,assigned_rep:users!merchants_assigned_rep_id_fkey(full_name,name,email)').returns<MerchantReportRow[]>(),
    supabaseAdmin.from('leads').select('id,created_by,assigned_rep_id,business_name,owner_name,status,converted_to,created_at,updated_at,assigned_rep:users!leads_assigned_rep_id_fkey(full_name,name,email)').returns<LeadReportRow[]>(),
    supabaseAdmin.from('fundings').select('*, merchant:merchants(business_name,assigned_rep_id,assigned_rep:users!merchants_assigned_rep_id_fkey(full_name,name,email)), lender:lenders(company_name)').gte('funded_at', filters.from).lte('funded_at', filters.to).returns<FundingReportRow[]>(),
    supabaseAdmin.from('offers').select('id,merchant_id,lender_id,amount,status,created_at').gte('created_at', filters.from).lte('created_at', filters.to).returns<OfferReportRow[]>(),
    supabaseAdmin.from('broker_revenue').select('*, merchant:merchants(business_name,assigned_rep_id), lender:lenders(company_name)').returns<RevenueReportRow[]>(),
    supabaseAdmin.from('sales_rep_commissions').select('*, sales_rep:sales_rep_id(full_name,name,email), funding:fundings(merchant_id,merchant:merchants(business_name))').returns<CommissionReportRow[]>(),
    supabaseAdmin.from('renewals').select('*, merchant:merchants(business_name,assigned_rep_id), funding:fundings(funded_amount,lender:lenders(company_name)), assigned_rep:users!renewals_assigned_rep_id_fkey(full_name,name,email)').returns<RenewalReportRow[]>(),
    supabaseAdmin.from('tasks').select('*, assignee:assigned_to(full_name,name,email)').returns<TaskReportRow[]>(),
  ])

  for (const res of [merchantsRes, leadsRes, fundingsRes, offersRes, revenueRes, commissionsRes, renewalsRes, tasksRes]) {
    if (res.error) return badRequest(res.error.message)
  }

  const merchants = user.role === 'sales_rep' ? (merchantsRes.data ?? []).filter(row => row.assigned_rep_id === user.id) : (merchantsRes.data ?? [])
  const leads = user.role === 'sales_rep' ? (leadsRes.data ?? []).filter(row => row.assigned_rep_id === user.id || row.created_by === user.id) : (leadsRes.data ?? [])
  const fundings = scopedByMerchant(fundingsRes.data ?? [], user, scopedIds)
  const offers = user.role === 'sales_rep' ? (offersRes.data ?? []).filter(row => scopedIds?.includes(row.merchant_id)) : (offersRes.data ?? [])
  const revenue = user.role === 'admin' ? (revenueRes.data ?? []) : []
  const commissions = user.role === 'sales_rep' ? (commissionsRes.data ?? []).filter(row => row.sales_rep_id === user.id) : (commissionsRes.data ?? [])
  const renewals = user.role === 'sales_rep' ? (renewalsRes.data ?? []).filter(row => row.assigned_rep_id === user.id || row.merchant?.assigned_rep_id === user.id) : (renewalsRes.data ?? [])
  const tasks = user.role === 'sales_rep' ? (tasksRes.data ?? []).filter(row => row.assigned_to === user.id || row.created_by === user.id) : (tasksRes.data ?? [])

  const rangedLeads = leads.filter(row => dateInRange(row.created_at, filters))
  const totalFunded = fundings.reduce((sum, row) => sum + moneyNumber(row.funded_amount), 0)
  const pipelineMap = new Map<string, { label: string; count: number; amount?: number }>()
  merchants.forEach(row => addBreakdown(pipelineMap, row.status, row.status))
  const repMap = new Map<string, { label: string; count: number; amount?: number }>()
  fundings.forEach(row => addBreakdown(repMap, row.merchant?.assigned_rep_id, userName(row.merchant?.assigned_rep), moneyNumber(row.funded_amount)))
  const lenderMap = new Map<string, { label: string; count: number; amount?: number }>()
  fundings.forEach(row => addBreakdown(lenderMap, row.lender_id, row.lender?.company_name ?? 'Unknown Lender/Funder', moneyNumber(row.funded_amount)))

  const report: OverviewReport = {
    range: { from: filters.from, to: filters.to, label: filters.label },
    metrics: {
      total_leads: rangedLeads.length,
      converted_leads: rangedLeads.filter(row => row.status === 'converted' || row.converted_to).length,
      total_merchants: merchants.length,
      funded_deals: fundings.length,
      funded_volume: totalFunded,
      average_funding_amount: Math.round(totalFunded / Math.max(1, fundings.length)),
      lead_conversion_rate: percent(rangedLeads.filter(row => row.status === 'converted' || row.converted_to).length, rangedLeads.length),
      offer_to_funded_rate: percent(fundings.length, offers.length),
      broker_revenue_expected: revenue.filter(row => row.status !== 'received' && row.status !== 'waived').reduce((sum, row) => sum + moneyNumber(row.amount), 0),
      broker_revenue_received: revenue.filter(row => row.status === 'received').reduce((sum, row) => sum + moneyNumber(row.amount), 0),
      commissions_unpaid: commissions.filter(row => row.status === 'unpaid' || row.status === 'approved').reduce((sum, row) => sum + moneyNumber(row.amount), 0),
      overdue_tasks: tasks.filter(row => row.status === 'open' && row.due_at && new Date(row.due_at).getTime() < Date.now()).length,
      eligible_renewals: renewals.filter(row => new Date(`${row.eligibility_date}T00:00:00Z`).getTime() <= Date.now() && !['renewed', 'declined', 'not_interested'].includes(row.status)).length,
    },
    funding_series: bucketByDate(fundings, 'funded_at', filters.granularity, 'funded_amount'),
    pipeline_breakdown: breakdownRows(pipelineMap),
    top_reps: breakdownRows(repMap).slice(0, 5),
    top_lenders: user.role === 'admin' ? breakdownRows(lenderMap).slice(0, 5) : [],
  }

  return json(report)
}
