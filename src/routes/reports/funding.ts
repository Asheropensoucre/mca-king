import type { FundingReport } from '../../../types'
import { requireAuth } from '../../lib/requireAuth'
import { badRequest, json } from '../../lib/route-utils'
import { addBreakdown, blockReportRole, breakdownRows, bucketByDate, moneyNumber } from '../../lib/reporting'
import { supabaseAdmin } from '../../lib/supabase-server'
import { merchantIdsForRep, range, scopedByMerchant, userName, type FundingReportRow } from './common'

export async function GET(req: Request): Promise<Response> {
  const user = await requireAuth(req)
  const roleError = blockReportRole(user)
  if (roleError) return roleError
  const filters = range(new URL(req.url))
  const scopedIds = await merchantIdsForRep(user)
  if (scopedIds instanceof Response) return scopedIds

  let query = supabaseAdmin
    .from('fundings')
    .select('*, merchant:merchants(business_name,assigned_rep_id,assigned_rep:users!merchants_assigned_rep_id_fkey(full_name,name,email)), lender:lenders(company_name)')
    .gte('funded_at', filters.from)
    .lte('funded_at', filters.to)
  if (filters.lender_id && user.role === 'admin') query = query.eq('lender_id', filters.lender_id)
  const { data, error } = await query.order('funded_at', { ascending: false }).returns<FundingReportRow[]>()
  if (error) return badRequest(error.message)
  let rows = scopedByMerchant(data ?? [], user, scopedIds)
  if (filters.rep_id && user.role === 'admin') rows = rows.filter(row => row.merchant?.assigned_rep_id === filters.rep_id)

  const totalFunded = rows.reduce((sum, row) => sum + moneyNumber(row.funded_amount), 0)
  const repMap = new Map<string, { label: string; count: number; amount?: number }>()
  const lenderMap = new Map<string, { label: string; count: number; amount?: number }>()
  const typeMap = new Map<string, { label: string; count: number; amount?: number }>()
  const positionMap = new Map<string, { label: string; count: number; amount?: number }>()
  rows.forEach(row => {
    const amount = moneyNumber(row.funded_amount)
    addBreakdown(repMap, row.merchant?.assigned_rep_id, userName(row.merchant?.assigned_rep), amount)
    addBreakdown(lenderMap, row.lender_id, row.lender?.company_name ?? 'Unknown Lender/Funder', amount)
    addBreakdown(typeMap, row.funding_type, row.funding_type === 'first_funding' ? 'First Funding' : row.funding_type === 'renewal' ? 'Renewal' : 'Additional Funding', amount)
    addBreakdown(positionMap, String(row.funding_position || 1), `Position #${row.funding_position || 1}`, amount)
  })

  const report: FundingReport = {
    range: { from: filters.from, to: filters.to, label: filters.label },
    metrics: {
      funded_volume: totalFunded,
      funded_deals: rows.length,
      average_funded_amount: Math.round(totalFunded / Math.max(1, rows.length)),
      average_factor_rate: Number((rows.reduce((sum, row) => sum + moneyNumber(row.factor_rate), 0) / Math.max(1, rows.filter(row => row.factor_rate !== null).length)).toFixed(3)),
      average_term_days: Math.round(rows.reduce((sum, row) => sum + Number(row.term_days ?? 0), 0) / Math.max(1, rows.filter(row => row.term_days).length)),
      first_funding_count: rows.filter(row => row.funding_type === 'first_funding').length,
      renewal_count: rows.filter(row => row.funding_type === 'renewal').length,
      additional_funding_count: rows.filter(row => row.funding_type === 'additional_funding').length,
    },
    series: bucketByDate(rows, 'funded_at', filters.granularity, 'funded_amount'),
    by_rep: user.role === 'admin' ? breakdownRows(repMap) : [],
    by_lender: user.role === 'admin' ? breakdownRows(lenderMap) : [],
    by_funding_type: breakdownRows(typeMap),
    by_position: breakdownRows(positionMap),
    rows: rows.slice(0, 100).map(row => ({
      id: row.id,
      label: row.merchant?.business_name ?? 'Unknown Merchant',
      secondary: row.lender?.company_name ?? 'Unknown Lender/Funder',
      status: row.funding_type,
      amount: moneyNumber(row.funded_amount),
      date: row.funded_at,
      metadata: { renewal_number: row.renewal_number, funding_position: row.funding_position, factor_rate: moneyNumber(row.factor_rate), term_days: row.term_days },
    })),
  }
  return json(report)
}
