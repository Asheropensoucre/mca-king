import type { RevenueReport } from '../../../types'
import { requireAuth } from '../../lib/requireAuth'
import { badRequest, json } from '../../lib/route-utils'
import { addBreakdown, blockReportRole, breakdownRows, daysBetween, moneyNumber } from '../../lib/reporting'
import { supabaseAdmin } from '../../lib/supabase-server'
import { range, type RevenueReportRow } from './common'

function agingKey(days: number): string {
  if (days <= 7) return '0-7 days'
  if (days <= 15) return '8-15 days'
  if (days <= 30) return '16-30 days'
  if (days <= 60) return '31-60 days'
  return '60+ days'
}

export async function GET(req: Request): Promise<Response> {
  const user = await requireAuth(req)
  const roleError = blockReportRole(user, true)
  if (roleError) return roleError
  const filters = range(new URL(req.url))
  let query = supabaseAdmin.from('broker_revenue').select('*, merchant:merchants(business_name,assigned_rep_id), lender:lenders(company_name)')
  if (filters.lender_id) query = query.eq('lender_id', filters.lender_id)
  const { data, error } = await query.order('created_at', { ascending: false }).returns<RevenueReportRow[]>()
  if (error) return badRequest(error.message)
  const rows = (data ?? []).filter(row => {
    const relevant = row.status === 'received' ? row.received_at : row.expected_payment_date ?? row.created_at
    const time = new Date(relevant ?? row.created_at).getTime()
    return time >= filters.fromDate.getTime() && time <= filters.toDate.getTime()
  })
  const statusMap = new Map<string, { label: string; count: number; amount?: number }>()
  const lenderMap = new Map<string, { label: string; count: number; amount?: number }>()
  const agingMap = new Map<string, { label: string; count: number; amount?: number }>()
  rows.forEach(row => {
    const amount = moneyNumber(row.amount)
    addBreakdown(statusMap, row.status, row.status, amount)
    addBreakdown(lenderMap, row.lender_id, row.lender?.company_name ?? 'Unknown Lender/Funder', amount)
    if (row.status !== 'received' && row.status !== 'waived') addBreakdown(agingMap, agingKey(daysBetween(row.expected_payment_date ?? row.created_at)), agingKey(daysBetween(row.expected_payment_date ?? row.created_at)), amount)
  })
  const report: RevenueReport = {
    range: { from: filters.from, to: filters.to, label: filters.label },
    metrics: {
      expected: rows.filter(row => row.status === 'expected').reduce((sum, row) => sum + moneyNumber(row.amount), 0),
      invoiced: rows.filter(row => row.status === 'invoiced').reduce((sum, row) => sum + moneyNumber(row.amount), 0),
      received: rows.filter(row => row.status === 'received').reduce((sum, row) => sum + moneyNumber(row.amount), 0),
      short_paid: rows.filter(row => row.status === 'short_paid').reduce((sum, row) => sum + moneyNumber(row.amount), 0),
      disputed: rows.filter(row => row.status === 'disputed').reduce((sum, row) => sum + moneyNumber(row.amount), 0),
      waived: rows.filter(row => row.status === 'waived').reduce((sum, row) => sum + moneyNumber(row.amount), 0),
    },
    by_status: breakdownRows(statusMap),
    by_lender: breakdownRows(lenderMap),
    aging: breakdownRows(agingMap),
    rows: rows.slice(0, 100).map(row => ({ id: row.id, label: row.merchant?.business_name ?? 'Unknown Merchant', secondary: row.lender?.company_name, status: row.status, amount: moneyNumber(row.amount), date: row.received_at ?? row.expected_payment_date ?? row.created_at, metadata: { revenue_type: row.revenue_type, age_days: daysBetween(row.expected_payment_date ?? row.created_at) } })),
  }
  return json(report)
}
