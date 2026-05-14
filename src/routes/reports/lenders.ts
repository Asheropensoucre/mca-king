import type { LenderReport } from '../../../types'
import { requireAuth } from '../../lib/requireAuth'
import { badRequest, json } from '../../lib/route-utils'
import { blockReportRole, moneyNumber, percent } from '../../lib/reporting'
import { supabaseAdmin } from '../../lib/supabase-server'
import { merchantIdsForRep, range, scopedByMerchant, type FundingReportRow, type SubmissionReportRow } from './common'

type LenderRow = { id: string; company_name: string }

type PayoffRow = { id: string; requested_from_lender_id: string | null; status: string; requested_at: string }

export async function GET(req: Request): Promise<Response> {
  const user = await requireAuth(req)
  const roleError = blockReportRole(user)
  if (roleError) return roleError
  const filters = range(new URL(req.url))
  const scopedIds = await merchantIdsForRep(user)
  if (scopedIds instanceof Response) return scopedIds

  const [lendersRes, submissionsRes, fundingsRes, payoffRes] = await Promise.all([
    supabaseAdmin.from('lenders').select('id,company_name').returns<LenderRow[]>(),
    supabaseAdmin.from('merchant_file_submissions').select('*, merchant:merchants(business_name,assigned_rep_id), lender:lenders(company_name)').gte('submitted_at', filters.from).lte('submitted_at', filters.to).returns<SubmissionReportRow[]>(),
    supabaseAdmin.from('fundings').select('*, merchant:merchants(business_name,assigned_rep_id), lender:lenders(company_name)').gte('funded_at', filters.from).lte('funded_at', filters.to).returns<FundingReportRow[]>(),
    supabaseAdmin.from('payoff_requests').select('id,requested_from_lender_id,status,requested_at').gte('requested_at', filters.from).lte('requested_at', filters.to).returns<PayoffRow[]>(),
  ])
  for (const res of [lendersRes, submissionsRes, fundingsRes, payoffRes]) if (res.error) return badRequest(res.error.message)
  const submissions = scopedByMerchant(submissionsRes.data ?? [], user, scopedIds)
  const fundings = scopedByMerchant(fundingsRes.data ?? [], user, scopedIds)

  const rows = (lendersRes.data ?? []).map(lender => {
    const lenderSubs = submissions.filter(row => row.lender_id === lender.id)
    const lenderFundings = fundings.filter(row => row.lender_id === lender.id)
    const offers = lenderSubs.filter(row => row.status === 'offer_received').length
    const declines = lenderSubs.filter(row => row.status === 'declined').length
    const volume = lenderFundings.reduce((sum, row) => sum + moneyNumber(row.funded_amount), 0)
    const responseRows = lenderSubs.filter(row => row.response_at)
    const avgResponseHours = responseRows.reduce((sum, row) => sum + Math.max(0, (new Date(row.response_at as string).getTime() - new Date(row.submitted_at).getTime()) / 36e5), 0) / Math.max(1, responseRows.length)
    return {
      id: lender.id,
      label: lender.company_name,
      secondary: `${lenderSubs.length} submissions • ${lenderFundings.length} funded`,
      amount: volume,
      metadata: {
        submission_count: lenderSubs.length,
        offer_count: offers,
        decline_count: declines,
        offer_rate: percent(offers, lenderSubs.length),
        decline_rate: percent(declines, lenderSubs.length),
        funded_count: lenderFundings.length,
        funded_volume: volume,
        average_funded_amount: Math.round(volume / Math.max(1, lenderFundings.length)),
        avg_response_hours: Math.round(avgResponseHours),
        payoff_requests: (payoffRes.data ?? []).filter(row => row.requested_from_lender_id === lender.id).length,
      },
    }
  }).filter(row => user.role === 'admin' || Number(row.metadata?.submission_count ?? 0) > 0 || Number(row.metadata?.funded_count ?? 0) > 0)

  const report: LenderReport = {
    range: { from: filters.from, to: filters.to, label: filters.label },
    metrics: {
      lender_count: rows.length,
      submission_count: submissions.length,
      funded_count: fundings.length,
      funded_volume: fundings.reduce((sum, row) => sum + moneyNumber(row.funded_amount), 0),
    },
    rows,
  }
  return json(report)
}
