import type { LeadReport } from '../../../types'
import { requireAuth } from '../../lib/requireAuth'
import { badRequest, json } from '../../lib/route-utils'
import { addBreakdown, blockReportRole, breakdownRows, bucketByDate, dateInRange, daysBetween, percent } from '../../lib/reporting'
import { supabaseAdmin } from '../../lib/supabase-server'
import { range, userName, type LeadReportRow } from './common'

export async function GET(req: Request): Promise<Response> {
  const user = await requireAuth(req)
  const roleError = blockReportRole(user)
  if (roleError) return roleError
  const filters = range(new URL(req.url))

  let query = supabaseAdmin.from('leads').select('id,created_by,assigned_rep_id,business_name,owner_name,status,converted_to,created_at,updated_at,assigned_rep:users!leads_assigned_rep_id_fkey(full_name,name,email)')
  if (user.role === 'sales_rep') query = query.or(`assigned_rep_id.eq.${user.id},created_by.eq.${user.id}`)
  if (filters.rep_id && user.role === 'admin') query = query.eq('assigned_rep_id', filters.rep_id)
  const { data, error } = await query.returns<LeadReportRow[]>()
  if (error) return badRequest(error.message)
  const rows = (data ?? []).filter(row => dateInRange(row.created_at, filters) || dateInRange(row.updated_at, filters))

  const statusMap = new Map<string, { label: string; count: number; amount?: number }>()
  const repMap = new Map<string, { label: string; count: number; amount?: number }>()
  rows.forEach(row => {
    addBreakdown(statusMap, row.status, row.status)
    addBreakdown(repMap, row.assigned_rep_id, userName(row.assigned_rep))
  })
  const converted = rows.filter(row => row.status === 'converted' || row.converted_to)

  const report: LeadReport = {
    range: { from: filters.from, to: filters.to, label: filters.label },
    metrics: {
      total_leads: rows.length,
      converted_leads: converted.length,
      conversion_rate: percent(converted.length, rows.length),
      dead_leads: rows.filter(row => row.status === 'dead').length,
      unassigned_leads: rows.filter(row => !row.assigned_rep_id).length,
      average_days_to_conversion: Math.round(converted.reduce((sum, row) => sum + daysBetween(row.created_at, new Date(row.updated_at)), 0) / Math.max(1, converted.length)),
    },
    by_status: breakdownRows(statusMap),
    by_rep: user.role === 'admin' ? breakdownRows(repMap) : [],
    series: bucketByDate(rows, 'created_at', filters.granularity),
    rows: rows.slice(0, 100).map(row => ({ id: row.id, label: row.business_name, secondary: userName(row.assigned_rep), status: row.status, date: row.created_at, metadata: { owner_name: row.owner_name, converted_to: row.converted_to } })),
  }
  return json(report)
}
