import type { Activity, ActivityType, EntityType } from '../../../types'
import { requireAuth } from '../../lib/requireAuth'
import { assertRole, badRequest, forbidden, json } from '../../lib/route-utils'
import { supabaseAdmin } from '../../lib/supabase-server'

const ENTITY_TYPES: EntityType[] = ['lead', 'merchant', 'lender', 'offer', 'document', 'stipulation', 'user', 'funding']
const MANUAL_ACTIVITY_TYPES: ActivityType[] = ['note', 'call']

type ActivityRow = Activity & {
  users?: { full_name: string | null; name: string | null; email: string } | null
}

type ActivityBody = {
  entity_type?: EntityType
  entity_id?: string
  activity_type?: ActivityType
  body?: string
}

const isEntityType = (value: string | null | undefined): value is EntityType => (
  typeof value === 'string' && ENTITY_TYPES.includes(value as EntityType)
)

const isManualActivityType = (value: string | null | undefined): value is 'note' | 'call' => (
  typeof value === 'string' && MANUAL_ACTIVITY_TYPES.includes(value as ActivityType)
)

function toActivity(row: ActivityRow): Activity {
  return {
    id: row.id,
    entity_type: row.entity_type,
    entity_id: row.entity_id,
    user_id: row.user_id,
    activity_type: row.activity_type,
    body: row.body,
    metadata: row.metadata ?? {},
    created_at: row.created_at,
    author_name: row.users?.full_name ?? row.users?.name ?? row.users?.email,
  }
}

export async function GET(req: Request): Promise<Response> {
  const user = await requireAuth(req)
  if (user.role === 'merchant' || user.role === 'lender') return forbidden()

  const url = new URL(req.url)
  const entityType = url.searchParams.get('entity_type')
  const entityId = url.searchParams.get('entity_id')
  if (!isEntityType(entityType)) return badRequest('entity_type is required')
  if (!entityId) return badRequest('entity_id is required')

  const { data, error } = await supabaseAdmin
    .from('activities')
    .select('*, users:user_id(full_name,name,email)')
    .eq('entity_type', entityType)
    .eq('entity_id', entityId)
    .order('created_at', { ascending: false })
    .limit(100)
    .returns<ActivityRow[]>()

  if (error) return badRequest(error.message)
  return json((data ?? []).map(toActivity))
}

export async function POST(req: Request): Promise<Response> {
  const user = await requireAuth(req)
  const roleError = assertRole(user, ['admin', 'sales_rep'])
  if (roleError) return roleError

  const body = await req.json() as ActivityBody
  if (!isEntityType(body.entity_type)) return badRequest('entity_type is required')
  if (!body.entity_id) return badRequest('entity_id is required')
  if (!isManualActivityType(body.activity_type)) return badRequest('activity_type must be note or call')
  if (!body.body?.trim()) return badRequest('body is required')

  const insert = {
    entity_type: body.entity_type,
    entity_id: body.entity_id,
    user_id: user.id,
    activity_type: body.activity_type,
    body: body.body.trim(),
    metadata: {},
  }

  const { data, error } = await supabaseAdmin
    .from('activities')
    .insert(insert)
    .select('*, users:user_id(full_name,name,email)')
    .single<ActivityRow>()

  if (error) return badRequest(error.message)

  return json(toActivity(data), { status: 201 })
}
