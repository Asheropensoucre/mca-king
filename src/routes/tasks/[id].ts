import type { Task, TaskPriority, TaskStatus } from '../../../types'
import { recordActivity } from '../../lib/activity'
import { requireAuth } from '../../lib/requireAuth'
import { assertRole, badRequest, forbidden, getId, json, notFound, type RouteContext } from '../../lib/route-utils'
import { supabaseAdmin } from '../../lib/supabase-server'

const PRIORITIES: TaskPriority[] = ['low', 'normal', 'high', 'urgent']
const STATUSES: TaskStatus[] = ['open', 'completed', 'cancelled']

type TaskRow = Task & {
  assignee?: { full_name: string | null; name: string | null; email: string } | null
}

type TaskPatchBody = {
  status?: TaskStatus
  title?: string
  description?: string | null
  priority?: TaskPriority
  assigned_to?: string | null
  due_at?: string | null
}

const isPriority = (value: string | null | undefined): value is TaskPriority => (
  typeof value === 'string' && PRIORITIES.includes(value as TaskPriority)
)

const isStatus = (value: string | null | undefined): value is TaskStatus => (
  typeof value === 'string' && STATUSES.includes(value as TaskStatus)
)

function toTask(row: TaskRow): Task {
  return {
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
  }
}

async function fetchTask(id: string): Promise<TaskRow | null | Response> {
  const { data, error } = await supabaseAdmin
    .from('tasks')
    .select('*, assignee:assigned_to(full_name,name,email)')
    .eq('id', id)
    .maybeSingle<TaskRow>()

  if (error) return badRequest(error.message)
  return data ?? null
}

function canManageTask(userId: string, role: string, task: TaskRow): boolean {
  if (role === 'admin') return true
  if (role === 'sales_rep') return task.assigned_to === userId || task.created_by === userId
  return false
}

export async function PATCH(req: Request, context?: RouteContext): Promise<Response> {
  const user = await requireAuth(req)
  const roleError = assertRole(user, ['admin', 'sales_rep'])
  if (roleError) return roleError

  const id = getId(context)
  if (!id) return badRequest()

  const task = await fetchTask(id)
  if (task instanceof Response) return task
  if (!task) return notFound()
  if (!canManageTask(user.id, user.role, task)) return forbidden()

  const body = await req.json() as TaskPatchBody
  if (body.status !== undefined && !isStatus(body.status)) return badRequest('status is invalid')
  if (body.priority !== undefined && !isPriority(body.priority)) return badRequest('priority is invalid')

  const update: TaskPatchBody & { updated_at: string; completed_at?: string | null } = {
    updated_at: new Date().toISOString(),
  }
  if (body.title !== undefined) {
    if (!body.title.trim()) return badRequest('title cannot be empty')
    update.title = body.title.trim()
  }
  if (body.description !== undefined) update.description = body.description?.trim() || null
  if (body.priority !== undefined) update.priority = body.priority
  if (body.assigned_to !== undefined) update.assigned_to = body.assigned_to
  if (body.due_at !== undefined) update.due_at = body.due_at
  if (body.status !== undefined) {
    update.status = body.status
    update.completed_at = body.status === 'completed' ? new Date().toISOString() : null
  }

  const { data, error } = await supabaseAdmin
    .from('tasks')
    .update(update)
    .eq('id', id)
    .select('*, assignee:assigned_to(full_name,name,email)')
    .single<TaskRow>()

  if (error) return badRequest(error.message)

  const changedStatus = body.status && body.status !== task.status
  recordActivity({
    entity_type: data.entity_type,
    entity_id: data.entity_id,
    user_id: user.id,
    activity_type: 'task',
    body: changedStatus ? `Task ${data.status}: ${data.title}` : `Task updated: ${data.title}`,
    metadata: { task_id: data.id, status: data.status, previous_status: task.status },
  })

  return json(toTask(data))
}

export async function DELETE(req: Request, context?: RouteContext): Promise<Response> {
  const user = await requireAuth(req)
  const roleError = assertRole(user, ['admin'])
  if (roleError) return roleError

  const id = getId(context)
  if (!id) return badRequest()

  const { error } = await supabaseAdmin.from('tasks').delete().eq('id', id)
  if (error) return badRequest(error.message)

  return new Response(null, { status: 204 })
}
