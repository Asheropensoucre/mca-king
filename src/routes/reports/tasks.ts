import type { TaskReport } from '../../../types'
import { requireAuth } from '../../lib/requireAuth'
import { badRequest, json } from '../../lib/route-utils'
import { addBreakdown, blockReportRole, breakdownRows, dateInRange, daysBetween, percent } from '../../lib/reporting'
import { supabaseAdmin } from '../../lib/supabase-server'
import { range, userName, type TaskReportRow } from './common'

export async function GET(req: Request): Promise<Response> {
  const user = await requireAuth(req)
  const roleError = blockReportRole(user)
  if (roleError) return roleError
  const filters = range(new URL(req.url))
  let query = supabaseAdmin.from('tasks').select('*, assignee:assigned_to(full_name,name,email)')
  if (user.role === 'sales_rep') query = query.or(`assigned_to.eq.${user.id},created_by.eq.${user.id}`)
  if (filters.rep_id && user.role === 'admin') query = query.eq('assigned_to', filters.rep_id)
  const { data, error } = await query.order('due_at', { ascending: true, nullsFirst: false }).returns<TaskReportRow[]>()
  if (error) return badRequest(error.message)
  const rows = (data ?? []).filter(row => dateInRange(row.due_at ?? row.created_at, filters) || dateInRange(row.completed_at, filters))
  const statusMap = new Map<string, { label: string; count: number; amount?: number }>()
  const repMap = new Map<string, { label: string; count: number; amount?: number }>()
  const priorityMap = new Map<string, { label: string; count: number; amount?: number }>()
  rows.forEach(row => {
    addBreakdown(statusMap, row.status, row.status)
    addBreakdown(repMap, row.assigned_to, userName(row.assignee))
    addBreakdown(priorityMap, row.priority, row.priority)
  })
  const now = new Date()
  const completedRows = rows.filter(row => row.status === 'completed' && row.completed_at)
  const report: TaskReport = {
    range: { from: filters.from, to: filters.to, label: filters.label },
    metrics: {
      open: rows.filter(row => row.status === 'open').length,
      completed: completedRows.length,
      cancelled: rows.filter(row => row.status === 'cancelled').length,
      overdue: rows.filter(row => row.status === 'open' && row.due_at && new Date(row.due_at).getTime() < now.getTime()).length,
      due_today: rows.filter(row => row.status === 'open' && row.due_at && new Date(row.due_at).toDateString() === now.toDateString()).length,
      due_this_week: rows.filter(row => row.status === 'open' && row.due_at && new Date(row.due_at).getTime() <= now.getTime() + 7 * 24 * 60 * 60 * 1000).length,
      completion_rate: percent(completedRows.length, rows.length),
      average_completion_days: Math.round(completedRows.reduce((sum, row) => sum + daysBetween(row.created_at, new Date(row.completed_at as string)), 0) / Math.max(1, completedRows.length)),
    },
    by_status: breakdownRows(statusMap),
    by_rep: user.role === 'admin' ? breakdownRows(repMap) : [],
    by_priority: breakdownRows(priorityMap),
    rows: rows.slice(0, 100).map(row => ({ id: row.id, label: row.title, secondary: userName(row.assignee), status: row.status, date: row.due_at ?? row.created_at, metadata: { priority: row.priority, entity_type: row.entity_type, entity_id: row.entity_id } })),
  }
  return json(report)
}
