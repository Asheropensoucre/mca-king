import type { AuditLog } from '../../../types'
import { getPagination, paginatedJson } from '../../lib/list-query'
import { requireAuth } from '../../lib/requireAuth'
import { badRequest, forbidden } from '../../lib/route-utils'
import { supabaseAdmin } from '../../lib/supabase-server'

type AuditLogRow = AuditLog & {
  user?: { full_name: string | null; name: string | null; email: string } | null
}

function toAuditLog(row: AuditLogRow): AuditLog {
  return {
    id: row.id,
    user_id: row.user_id,
    action: row.action,
    entity_type: row.entity_type,
    entity_id: row.entity_id,
    ip_address: row.ip_address,
    user_agent: row.user_agent,
    metadata: row.metadata ?? {},
    created_at: row.created_at,
    user_name: row.user?.full_name ?? row.user?.name ?? null,
    user_email: row.user?.email ?? null,
  }
}

export async function GET(req: Request): Promise<Response> {
  const user = await requireAuth(req)
  if (user.role !== 'admin') return forbidden()

  const url = new URL(req.url)
  const pagination = getPagination(url)
  const action = url.searchParams.get('action')
  const entityType = url.searchParams.get('entity_type')
  const entityId = url.searchParams.get('entity_id')
  const userId = url.searchParams.get('user_id')
  const from = url.searchParams.get('from')
  const to = url.searchParams.get('to')

  let query = supabaseAdmin
    .from('audit_logs')
    .select('*, user:users(full_name,name,email)', { count: 'exact' })

  if (action) query = query.ilike('action', `%${action.replace(/[%,()]/g, ' ')}%`)
  if (entityType) query = query.eq('entity_type', entityType)
  if (entityId) query = query.eq('entity_id', entityId)
  if (userId) query = query.eq('user_id', userId)
  if (from) query = query.gte('created_at', `${from}T00:00:00.000Z`)
  if (to) query = query.lte('created_at', `${to}T23:59:59.999Z`)

  const { data, error, count } = await query
    .order('created_at', { ascending: false })
    .range(pagination.from, pagination.to)
    .returns<AuditLogRow[]>()

  if (error) return badRequest(error.message)
  return paginatedJson((data ?? []).map(toAuditLog), count, pagination.page, pagination.perPage)
}
