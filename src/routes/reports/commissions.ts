import type { CommissionReport } from '../../../types'
import { requireAuth } from '../../lib/requireAuth'
import { badRequest, json } from '../../lib/route-utils'
import { addBreakdown, blockReportRole, breakdownRows, daysBetween, moneyNumber } from '../../lib/reporting'
import { supabaseAdmin } from '../../lib/supabase-server'
import { range, userName, type CommissionReportRow } from './common'

function agingKey(days: number): string {
  if (days <= 7) return '0-7 days'
  if (days <= 15) return '8-15 days'
  if (days <= 30) return '16-30 days'
  if (days <= 60) return '31-60 days'
  return '60+ days'
}

export async function GET(req: Request): Promise<Response> {
  const user = await requireAuth(req)
  const roleError = blockReportRole(user)
  if (roleError) return roleError
  const filters = range(new URL(req.url))
  let query = supabaseAdmin.from('sales_rep_commissions').select('*, sales_rep:sales_rep_id(full_name,name,email), funding:fundings(merchant_id,merchant:merchants(business_name))')
  if (user.role === 'sales_rep') query = query.eq('sales_rep_id', user.id)
  if (filters.rep_id && user.role === 'admin') query = query.eq('sales_rep_id', filters.rep_id)
  const { data, error } = await query.order('created_at', { ascending: false }).returns<CommissionReportRow[]>()
  if (error) return badRequest(error.message)
  const rows = (data ?? []).filter(row => {
    const relevant = row.status === 'paid' ? row.paid_at : row.created_at
    const time = new Date(relevant ?? row.created_at).getTime()
    return time >= filters.fromDate.getTime() && time <= filters.toDate.getTime()
  })
  const statusMap = new Map<string, { label: string; count: number; amount?: number }>()
  const repMap = new Map<string, { label: string; count: number; amount?: number }>()
  const agingMap = new Map<string, { label: string; count: number; amount?: number }>()
  rows.forEach(row => {
    const amount = moneyNumber(row.amount)
    addBreakdown(statusMap, row.status, row.status, amount)
    addBreakdown(repMap, row.sales_rep_id, userName(row.sales_rep), amount)
    if (row.status === 'unpaid' || row.status === 'approved') addBreakdown(agingMap, agingKey(daysBetween(row.created_at)), agingKey(daysBetween(row.created_at)), amount)
  })
  const report: CommissionReport = {
    range: { from: filters.from, to: filters.to, label: filters.label },
    metrics: {
      unpaid: rows.filter(row => row.status === 'unpaid').reduce((sum, row) => sum + moneyNumber(row.amount), 0),
      approved: rows.filter(row => row.status === 'approved').reduce((sum, row) => sum + moneyNumber(row.amount), 0),
      paid: rows.filter(row => row.status === 'paid').reduce((sum, row) => sum + moneyNumber(row.amount), 0),
      adjusted: rows.filter(row => row.status === 'adjusted').reduce((sum, row) => sum + moneyNumber(row.amount), 0),
      clawed_back: rows.filter(row => row.status === 'clawed_back').reduce((sum, row) => sum + moneyNumber(row.amount), 0),
      void: rows.filter(row => row.status === 'void').reduce((sum, row) => sum + moneyNumber(row.amount), 0),
      average_commission: Math.round(rows.reduce((sum, row) => sum + moneyNumber(row.amount), 0) / Math.max(1, rows.length)),
    },
    by_status: breakdownRows(statusMap),
    by_rep: user.role === 'admin' ? breakdownRows(repMap) : [],
    aging: breakdownRows(agingMap),
    rows: rows.slice(0, 100).map(row => ({ id: row.id, label: row.funding?.merchant?.business_name ?? 'Unknown Merchant', secondary: userName(row.sales_rep), status: row.status, amount: moneyNumber(row.amount), date: row.paid_at ?? row.created_at, metadata: { basis_type: row.basis_type, age_days: daysBetween(row.created_at) } })),
  }
  return json(report)
}
