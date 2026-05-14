import type { RenewalReport } from '../../../types'
import { requireAuth } from '../../lib/requireAuth'
import { badRequest, json } from '../../lib/route-utils'
import { addBreakdown, blockReportRole, breakdownRows, dateInRange, moneyNumber, percent } from '../../lib/reporting'
import { supabaseAdmin } from '../../lib/supabase-server'
import { range, userName, type FundingReportRow, type RenewalReportRow } from './common'

export async function GET(req: Request): Promise<Response> {
  const user = await requireAuth(req)
  const roleError = blockReportRole(user)
  if (roleError) return roleError
  const filters = range(new URL(req.url))
  let query = supabaseAdmin.from('renewals').select('*, merchant:merchants(business_name,assigned_rep_id), funding:fundings(funded_amount,lender:lenders(company_name)), assigned_rep:users!renewals_assigned_rep_id_fkey(full_name,name,email)')
  if (user.role === 'sales_rep') query = query.or(`assigned_rep_id.eq.${user.id}`)
  if (filters.rep_id && user.role === 'admin') query = query.eq('assigned_rep_id', filters.rep_id)
  const [renewalsRes, fundingsRes] = await Promise.all([
    query.order('eligibility_date', { ascending: true }).returns<RenewalReportRow[]>(),
    supabaseAdmin.from('fundings').select('*, merchant:merchants(business_name,assigned_rep_id), lender:lenders(company_name)').eq('funding_type', 'renewal').gte('funded_at', filters.from).lte('funded_at', filters.to).returns<FundingReportRow[]>(),
  ])
  if (renewalsRes.error) return badRequest(renewalsRes.error.message)
  if (fundingsRes.error) return badRequest(fundingsRes.error.message)
  const rows = (renewalsRes.data ?? []).filter(row => dateInRange(row.eligibility_date, filters) || dateInRange(row.updated_at, filters))
  const renewalFundings = user.role === 'sales_rep' ? (fundingsRes.data ?? []).filter(row => row.merchant?.assigned_rep_id === user.id) : (fundingsRes.data ?? [])
  const statusMap = new Map<string, { label: string; count: number; amount?: number }>()
  const repMap = new Map<string, { label: string; count: number; amount?: number }>()
  rows.forEach(row => {
    addBreakdown(statusMap, row.status, row.status)
    addBreakdown(repMap, row.assigned_rep_id ?? row.merchant?.assigned_rep_id, userName(row.assigned_rep))
  })
  const now = Date.now()
  const terminal = rows.filter(row => ['renewed', 'declined', 'not_interested'].includes(row.status)).length
  const report: RenewalReport = {
    range: { from: filters.from, to: filters.to, label: filters.label },
    metrics: {
      eligible: rows.filter(row => new Date(`${row.eligibility_date}T00:00:00Z`).getTime() <= now && !['renewed', 'declined', 'not_interested'].includes(row.status)).length,
      not_ready: rows.filter(row => row.status === 'not_ready').length,
      contacted: rows.filter(row => row.status === 'contacted').length,
      application_started: rows.filter(row => row.status === 'application_started').length,
      submitted: rows.filter(row => row.status === 'submitted').length,
      renewed: rows.filter(row => row.status === 'renewed').length,
      declined: rows.filter(row => row.status === 'declined').length,
      not_interested: rows.filter(row => row.status === 'not_interested').length,
      conversion_rate: percent(rows.filter(row => row.status === 'renewed').length, terminal),
      renewal_funded_volume: renewalFundings.reduce((sum, row) => sum + moneyNumber(row.funded_amount), 0),
      overdue_follow_ups: rows.filter(row => row.next_follow_up_at && new Date(row.next_follow_up_at).getTime() < now && !['renewed', 'declined', 'not_interested'].includes(row.status)).length,
    },
    by_status: breakdownRows(statusMap),
    by_rep: user.role === 'admin' ? breakdownRows(repMap) : [],
    rows: rows.slice(0, 100).map(row => ({ id: row.id, label: row.merchant?.business_name ?? 'Unknown Merchant', secondary: row.funding?.lender?.company_name ?? userName(row.assigned_rep), status: row.status, amount: moneyNumber(row.funding?.funded_amount), date: row.next_follow_up_at ?? row.eligibility_date, metadata: { funding_id: row.funding_id } })),
  }
  return json(report)
}
