import type { PipelineReport } from '../../../types'
import { requireAuth } from '../../lib/requireAuth'
import { badRequest, json } from '../../lib/route-utils'
import { addBreakdown, blockReportRole, breakdownRows, daysBetween, moneyNumber } from '../../lib/reporting'
import { supabaseAdmin } from '../../lib/supabase-server'
import { userName, type MerchantReportRow } from './common'

export async function GET(req: Request): Promise<Response> {
  const user = await requireAuth(req)
  const roleError = blockReportRole(user)
  if (roleError) return roleError
  const now = new Date()
  let query = supabaseAdmin
    .from('merchants')
    .select('id,business_name,status,assigned_rep_id,requested_amount,created_at,updated_at,assigned_rep:users!merchants_assigned_rep_id_fkey(full_name,name,email)')
  if (user.role === 'sales_rep') query = query.eq('assigned_rep_id', user.id)
  const { data, error } = await query.returns<MerchantReportRow[]>()
  if (error) return badRequest(error.message)
  const rows = data ?? []

  const statusMap = new Map<string, { label: string; count: number; amount?: number }>()
  const repMap = new Map<string, { label: string; count: number; amount?: number }>()
  rows.forEach(row => {
    addBreakdown(statusMap, row.status, row.status)
    addBreakdown(repMap, row.assigned_rep_id, userName(row.assigned_rep))
  })
  const stale = rows
    .filter(row => row.status !== 'FUNDED' && daysBetween(row.updated_at, now) > 7)
    .sort((a, b) => daysBetween(b.updated_at, now) - daysBetween(a.updated_at, now))
    .slice(0, 50)

  const report: PipelineReport = {
    range: { from: '', to: '', label: 'Current pipeline' },
    metrics: {
      total_deals: rows.length,
      stale_deals: stale.length,
      funded_count: rows.filter(row => row.status === 'FUNDED').length,
      declined_count: rows.filter(row => row.status.toLowerCase().includes('decline')).length,
      average_age_days: Math.round(rows.reduce((sum, row) => sum + daysBetween(row.created_at, now), 0) / Math.max(1, rows.length)),
      average_days_since_update: Math.round(rows.reduce((sum, row) => sum + daysBetween(row.updated_at, now), 0) / Math.max(1, rows.length)),
    },
    by_status: breakdownRows(statusMap),
    by_rep: user.role === 'admin' ? breakdownRows(repMap) : [],
    stale_deals: stale.map(row => ({
      id: row.id,
      label: row.business_name,
      secondary: userName(row.assigned_rep),
      status: row.status,
      amount: moneyNumber(row.requested_amount),
      date: row.updated_at,
      metadata: { days_stale: daysBetween(row.updated_at, now) },
    })),
  }
  return json(report)
}
