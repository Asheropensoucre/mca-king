import type { LenderDashboardAnalytics } from '../../../types'
import { requireAuth } from '../../lib/requireAuth'
import { badRequest, forbidden, json } from '../../lib/route-utils'
import { moneyNumber } from '../../lib/reporting'
import { supabaseAdmin } from '../../lib/supabase-server'

type LenderProfile = { id: string; company_name: string }
type SubmissionRow = { id: string; merchant_id: string; status: string; submitted_at: string; merchant?: { business_name: string; status: string } | null }
type MatchRow = { id: string; merchant_id: string; created_at: string; merchant?: { business_name: string; status: string } | null }
type OfferRow = { id: string; merchant_id: string; amount: number | string; status: string; created_at: string; merchant?: { business_name: string; status: string } | null }
type FundingRow = { id: string; merchant_id: string; funded_amount: number | string; payback_amount: number | string | null; funded_at: string; funding_type: string; renewal_number: number; funding_position: number; merchant?: { business_name: string; status: string } | null }
type PayoffRow = { id: string; merchant_id: string; funding_id: string | null; status: string; requested_at: string; merchant?: { business_name: string; status: string } | null }

export async function GET(req: Request): Promise<Response> {
  const user = await requireAuth(req)
  if (user.role !== 'lender') return forbidden()

  const { data: lender, error: lenderError } = await supabaseAdmin
    .from('lenders')
    .select('id,company_name')
    .eq('user_id', user.id)
    .maybeSingle<LenderProfile>()
  if (lenderError) return badRequest(lenderError.message)
  if (!lender) return forbidden('No lender profile found for this user')

  const monthStart = new Date()
  monthStart.setUTCDate(1)
  monthStart.setUTCHours(0, 0, 0, 0)
  const ninetyDaysAgo = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000)

  const [submissionsRes, matchesRes, offersRes, fundingsRes, payoffsRes] = await Promise.all([
    supabaseAdmin.from('merchant_file_submissions').select('id,merchant_id,status,submitted_at,merchant:merchants(business_name,status)').eq('lender_id', lender.id).order('submitted_at', { ascending: false }).returns<SubmissionRow[]>(),
    supabaseAdmin.from('lender_matches').select('id,merchant_id,created_at,merchant:merchants(business_name,status)').eq('lender_id', lender.id).order('created_at', { ascending: false }).returns<MatchRow[]>(),
    supabaseAdmin.from('offers').select('id,merchant_id,amount,status,created_at,merchant:merchants(business_name,status)').eq('lender_id', lender.id).order('created_at', { ascending: false }).returns<OfferRow[]>(),
    supabaseAdmin.from('fundings').select('id,merchant_id,funded_amount,payback_amount,funded_at,funding_type,renewal_number,funding_position,merchant:merchants(business_name,status)').eq('lender_id', lender.id).order('funded_at', { ascending: false }).returns<FundingRow[]>(),
    supabaseAdmin.from('payoff_requests').select('id,merchant_id,funding_id,status,requested_at,merchant:merchants(business_name,status)').eq('requested_from_lender_id', lender.id).order('requested_at', { ascending: false }).returns<PayoffRow[]>(),
  ])
  for (const res of [submissionsRes, matchesRes, offersRes, fundingsRes, payoffsRes]) {
    if (res.error) return badRequest(res.error.message)
  }

  const submissions = submissionsRes.data ?? []
  const matches = matchesRes.data ?? []
  const offers = offersRes.data ?? []
  const fundings = fundingsRes.data ?? []
  const payoffs = payoffsRes.data ?? []
  const submittedMerchantIds = new Set([...submissions.map(row => row.merchant_id), ...matches.map(row => row.merchant_id)])
  const totalFunded = fundings.reduce((sum, row) => sum + moneyNumber(row.funded_amount), 0)
  const totalPayback = fundings.reduce((sum, row) => sum + moneyNumber(row.payback_amount), 0)

  const report: LenderDashboardAnalytics = {
    metrics: {
      files_sent: submittedMerchantIds.size,
      pending_review: submissions.filter(row => row.status === 'submitted' || row.status === 'viewed' || row.status === 'no_response').length,
      offers_sent: offers.filter(row => row.status === 'pending' || row.status === 'accepted').length,
      declines: submissions.filter(row => row.status === 'declined').length + offers.filter(row => row.status === 'declined').length,
      funded_deals: fundings.length,
      total_funded: totalFunded,
      total_payback: totalPayback,
      average_funded: Math.round(totalFunded / Math.max(1, fundings.length)),
      this_month_funded: fundings.filter(row => new Date(row.funded_at).getTime() >= monthStart.getTime()).reduce((sum, row) => sum + moneyNumber(row.funded_amount), 0),
      last_90_days_funded: fundings.filter(row => new Date(row.funded_at).getTime() >= ninetyDaysAgo.getTime()).reduce((sum, row) => sum + moneyNumber(row.funded_amount), 0),
      payoff_requests_pending: payoffs.filter(row => row.status === 'requested').length,
    },
    recent_submissions: submissions.slice(0, 8).map(row => ({ id: row.id, label: row.merchant?.business_name ?? 'Merchant File', status: row.status, date: row.submitted_at, metadata: { merchant_id: row.merchant_id } })),
    recent_fundings: fundings.slice(0, 8).map(row => ({ id: row.id, label: row.merchant?.business_name ?? 'Merchant File', status: row.funding_type, amount: moneyNumber(row.funded_amount), date: row.funded_at, metadata: { merchant_id: row.merchant_id, renewal_number: row.renewal_number, funding_position: row.funding_position, payback_amount: moneyNumber(row.payback_amount) } })),
    pending_payoff_requests: payoffs.filter(row => row.status === 'requested').slice(0, 8).map(row => ({ id: row.id, label: row.merchant?.business_name ?? 'Merchant File', status: row.status, date: row.requested_at, metadata: { merchant_id: row.merchant_id, funding_id: row.funding_id } })),
  }
  return json(report)
}
