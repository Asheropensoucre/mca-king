import type { EntityType, Task, TaskPriority } from '../../../types'
import { recordActivity } from '../../lib/activity'
import { getPagination, paginatedJson, hasListParams } from '../../lib/list-query'
import { canAccessActivityEntity } from '../../lib/permissions'
import { requireAuth } from '../../lib/requireAuth'
import { assertRole, badRequest, forbidden, json } from '../../lib/route-utils'
import { supabaseAdmin } from '../../lib/supabase-server'

const TASK_ENTITY_TYPES: EntityType[] = ['lead', 'merchant', 'lender', 'funding']
const PRIORITIES: TaskPriority[] = ['low', 'normal', 'high', 'urgent']

type TaskRow = Task & {
  assignee?: { full_name: string | null; name: string | null; email: string } | null
}

type TaskBody = {
  entity_type?: EntityType
  entity_id?: string
  title?: string
  description?: string | null
  priority?: TaskPriority
  assigned_to?: string | null
  due_at?: string | null
}

const isTaskEntityType = (value: string | null | undefined): value is EntityType => (
  typeof value === 'string' && TASK_ENTITY_TYPES.includes(value as EntityType)
)

const isPriority = (value: string | null | undefined): value is TaskPriority => (
  typeof value === 'string' && PRIORITIES.includes(value as TaskPriority)
)

function sortTasks(tasks: Task[]): Task[] {
  return [...tasks].sort((a, b) => {
    if (a.status !== b.status) {
      if (a.status === 'open') return -1
      if (b.status === 'open') return 1
    }

    const aDue = a.due_at ? new Date(a.due_at).getTime() : Number.POSITIVE_INFINITY
    const bDue = b.due_at ? new Date(b.due_at).getTime() : Number.POSITIVE_INFINITY
    if (aDue !== bDue) return aDue - bDue

    return new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
  })
}

async function entityNames(tasks: Task[]): Promise<Map<string, string>> {
  const names = new Map<string, string>()
  const merchantIds = tasks.filter(task => task.entity_type === 'merchant').map(task => task.entity_id)
  const leadIds = tasks.filter(task => task.entity_type === 'lead').map(task => task.entity_id)

  if (merchantIds.length > 0) {
    const { data, error } = await supabaseAdmin
      .from('merchants')
      .select('id,business_name')
      .in('id', merchantIds)
      .returns<{ id: string; business_name: string }[]>()
    if (!error) (data ?? []).forEach(row => names.set(`merchant:${row.id}`, row.business_name))
  }

  if (leadIds.length > 0) {
    const { data, error } = await supabaseAdmin
      .from('leads')
      .select('id,business_name')
      .in('id', leadIds)
      .returns<{ id: string; business_name: string }[]>()
    if (!error) (data ?? []).forEach(row => names.set(`lead:${row.id}`, row.business_name))
  }

  return names
}

async function mapTasks(rows: TaskRow[]): Promise<Task[]> {
  const baseTasks = rows.map(row => ({
    id: row.id,
    assigned_to: row.assigned_to,
    created_by: row.created_by,
    entity_type: row.entity_type,
    entity_id: row.entity_id,
    title: row.title,
    description: row.description,
    priority: row.priority,
    status: row.status,
    due_at: row.due_at,
    completed_at: row.completed_at,
    created_at: row.created_at,
    updated_at: row.updated_at,
    assignee_name: row.assignee?.full_name ?? row.assignee?.name ?? row.assignee?.email,
  }))

  const names = await entityNames(baseTasks)
  return sortTasks(baseTasks.map(task => ({
    ...task,
    entity_name: names.get(`${task.entity_type}:${task.entity_id}`),
  })))
}

export async function GET(req: Request): Promise<Response> {
  const user = await requireAuth(req)
  if (user.role === 'merchant' || user.role === 'lender') return forbidden()

  const url = new URL(req.url)
  const paramKeys = Array.from(url.searchParams.keys())
  const shouldPaginate = hasListParams(url) && !(paramKeys.length <= 2 && url.searchParams.has('entity_type') && url.searchParams.has('entity_id'))
  const pagination = getPagination(url)
  const entityType = url.searchParams.get('entity_type')
  const entityId = url.searchParams.get('entity_id')
  const status = url.searchParams.get('status')
  const priority = url.searchParams.get('priority')
  const assignedTo = url.searchParams.get('assigned_to')
  const dueBefore = url.searchParams.get('due_before')
  const overdue = url.searchParams.get('overdue')

  let query = supabaseAdmin
    .from('tasks')
    .select('*, assignee:assigned_to(full_name,name,email)', { count: shouldPaginate ? 'exact' : undefined })

  if (entityType || entityId) {
    if (!isTaskEntityType(entityType)) return badRequest('entity_type is invalid')
    if (!entityId) return badRequest('entity_id is required')
    query = query.eq('entity_type', entityType).eq('entity_id', entityId)
  }

  if (user.role === 'sales_rep') {
    query = query.or(`assigned_to.eq.${user.id},created_by.eq.${user.id}`)
  }

  if (status) query = query.eq('status', status)
  if (priority) {
    if (!isPriority(priority)) return badRequest('priority is invalid')
    query = query.eq('priority', priority)
  }
  if (assignedTo && user.role === 'admin') query = query.eq('assigned_to', assignedTo)
  if (dueBefore) query = query.lte('due_at', dueBefore)
  if (overdue === 'true') query = query.eq('status', 'open').lt('due_at', new Date().toISOString())

  query = query.order('due_at', { ascending: true, nullsFirst: false }).order('created_at', { ascending: false })
  if (shouldPaginate) query = query.range(pagination.from, pagination.to)

  const { data, error, count } = await query.returns<TaskRow[]>()
  if (error) return badRequest(error.message)

  const tasks = await mapTasks(data ?? [])
  return shouldPaginate ? paginatedJson(tasks, count, pagination.page, pagination.perPage) : json(tasks)
}

export async function POST(req: Request): Promise<Response> {
  const user = await requireAuth(req)
  const roleError = assertRole(user, ['admin', 'sales_rep'])
  if (roleError) return roleError

  const body = await req.json() as TaskBody
  if (!isTaskEntityType(body.entity_type)) return badRequest('entity_type is required')
  if (!body.entity_id) return badRequest('entity_id is required')
  if (!(await canAccessActivityEntity(user, body.entity_type, body.entity_id))) return forbidden()
  if (!body.title?.trim()) return badRequest('title is required')
  if (body.priority && !isPriority(body.priority)) return badRequest('priority is invalid')

  const { data, error } = await supabaseAdmin
    .from('tasks')
    .insert({
      assigned_to: user.role === 'admin' ? (body.assigned_to ?? user.id) : user.id,
      created_by: user.id,
      entity_type: body.entity_type,
      entity_id: body.entity_id,
      title: body.title.trim(),
      description: body.description?.trim() || null,
      priority: body.priority ?? 'normal',
      due_at: body.due_at ?? null,
    })
    .select('*, assignee:assigned_to(full_name,name,email)')
    .single<TaskRow>()

  if (error) return badRequest(error.message)

  recordActivity({
    entity_type: body.entity_type,
    entity_id: body.entity_id,
    user_id: user.id,
    activity_type: 'task',
    body: `Task created: ${data.title}`,
    metadata: { task_id: data.id, priority: data.priority, assigned_to: data.assigned_to },
  })

  const [task] = await mapTasks([data])
  return json(task, { status: 201 })
}
