import type { RouteUser } from './route-utils'
import { forbidden } from './route-utils'
import { supabaseAdmin } from './supabase-server'

export type ReportGranularity = 'day' | 'week' | 'month'

export type ReportFilters = {
  from: string
  to: string
  fromDate: Date
  toDate: Date
  label: string
  rep_id?: string
  lender_id?: string
  status?: string
  granularity: ReportGranularity
}

function isoDate(date: Date): string {
  return date.toISOString().slice(0, 10)
}

export function startOfDayIso(value: string): string {
  const date = new Date(`${value}T00:00:00.000Z`)
  return date.toISOString()
}

export function endOfDayIso(value: string): string {
  const date = new Date(`${value}T23:59:59.999Z`)
  return date.toISOString()
}

export function parseReportDateRange(url: URL): { from: string; to: string; label: string } {
  const today = new Date()
  const defaultFrom = new Date(Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), 1))
  const from = url.searchParams.get('from') || isoDate(defaultFrom)
  const to = url.searchParams.get('to') || isoDate(today)
  return { from, to, label: `${from} to ${to}` }
}

export function parseReportFilters(url: URL): ReportFilters {
  const range = parseReportDateRange(url)
  const granularityParam = url.searchParams.get('granularity')
  const granularity: ReportGranularity = granularityParam === 'week' || granularityParam === 'month' ? granularityParam : 'day'
  return {
    ...range,
    fromDate: new Date(startOfDayIso(range.from)),
    toDate: new Date(endOfDayIso(range.to)),
    rep_id: url.searchParams.get('rep_id') || undefined,
    lender_id: url.searchParams.get('lender_id') || undefined,
    status: url.searchParams.get('status') || undefined,
    granularity,
  }
}

export function moneyNumber(value: unknown): number {
  if (value === null || value === undefined || value === '') return 0
  const parsed = Number(String(value).replace(/[^0-9.-]/g, ''))
  return Number.isFinite(parsed) ? parsed : 0
}

export function safeDivide(numerator: number, denominator: number): number {
  return denominator === 0 ? 0 : numerator / denominator
}

export function percent(numerator: number, denominator: number): number {
  return Math.round(safeDivide(numerator, denominator) * 1000) / 10
}

export function dateInRange(value: string | null | undefined, filters: Pick<ReportFilters, 'fromDate' | 'toDate'>): boolean {
  if (!value) return false
  const date = new Date(value)
  return date.getTime() >= filters.fromDate.getTime() && date.getTime() <= filters.toDate.getTime()
}

export function daysBetween(from: string | null | undefined, to = new Date()): number {
  if (!from) return 0
  const start = new Date(from).getTime()
  if (!Number.isFinite(start)) return 0
  return Math.max(0, Math.floor((to.getTime() - start) / (24 * 60 * 60 * 1000)))
}

export function periodKey(value: string, granularity: ReportGranularity): string {
  const date = new Date(value)
  if (granularity === 'month') return `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, '0')}`
  if (granularity === 'week') {
    const start = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()))
    const day = start.getUTCDay() || 7
    start.setUTCDate(start.getUTCDate() - day + 1)
    return isoDate(start)
  }
  return isoDate(date)
}

export function bucketByDate<T extends Record<string, unknown>>(
  rows: T[],
  dateField: keyof T,
  granularity: ReportGranularity,
  amountField?: keyof T,
): Array<{ period: string; count: number; amount?: number }> {
  const map = new Map<string, { period: string; count: number; amount?: number }>()
  for (const row of rows) {
    const raw = row[dateField]
    if (typeof raw !== 'string' || !raw) continue
    const key = periodKey(raw, granularity)
    const current = map.get(key) ?? { period: key, count: 0, amount: amountField ? 0 : undefined }
    current.count += 1
    if (amountField) current.amount = (current.amount ?? 0) + moneyNumber(row[amountField])
    map.set(key, current)
  }
  return [...map.values()].sort((a, b) => a.period.localeCompare(b.period))
}

export function breakdownRows(map: Map<string, { label: string; count: number; amount?: number }>, totalCount?: number) {
  const total = totalCount ?? [...map.values()].reduce((sum, row) => sum + row.count, 0)
  return [...map.entries()]
    .map(([key, row]) => ({ key, label: row.label, count: row.count, amount: row.amount, percent: percent(row.count, total) }))
    .sort((a, b) => (b.amount ?? b.count) - (a.amount ?? a.count))
}

export function addBreakdown(map: Map<string, { label: string; count: number; amount?: number }>, key: string | null | undefined, label: string | null | undefined, amount?: number) {
  const safeKey = key || 'unassigned'
  const current = map.get(safeKey) ?? { label: label || 'Unassigned', count: 0, amount: amount === undefined ? undefined : 0 }
  current.count += 1
  if (amount !== undefined) current.amount = (current.amount ?? 0) + amount
  map.set(safeKey, current)
}

export function blockReportRole(user: RouteUser, adminOnly = false): Response | null {
  if (user.role === 'merchant' || user.role === 'lender') return forbidden()
  if (adminOnly && user.role !== 'admin') return forbidden()
  return null
}

export async function getSalesRepMerchantIds(user: RouteUser): Promise<string[] | null> {
  if (user.role !== 'sales_rep') return null
  const { data, error } = await supabaseAdmin
    .from('merchants')
    .select('id')
    .eq('assigned_rep_id', user.id)
    .returns<{ id: string }[]>()
  if (error) throw new Error(error.message)
  return (data ?? []).map(row => row.id)
}

export function isSalesRepScoped(user: RouteUser, merchantId: string | null | undefined, scopedMerchantIds: string[] | null): boolean {
  if (user.role !== 'sales_rep') return true
  if (!merchantId || !scopedMerchantIds) return false
  return scopedMerchantIds.includes(merchantId)
}
