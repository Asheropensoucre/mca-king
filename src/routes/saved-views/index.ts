import type { SavedView, SavedViewEntityType } from '../../../types'
import { requireAuth } from '../../lib/requireAuth'
import { assertRole, badRequest, forbidden, json } from '../../lib/route-utils'
import { supabaseAdmin } from '../../lib/supabase-server'

const ENTITY_TYPES: SavedViewEntityType[] = ['merchants', 'leads', 'lenders', 'tasks', 'fundings']

type SavedViewRow = SavedView

type SavedViewBody = {
  name?: string
  entity_type?: SavedViewEntityType
  filters?: Record<string, string>
  sort?: SavedView['sort']
  is_shared?: boolean
}

export const isSavedViewEntityType = (value: string | null | undefined): value is SavedViewEntityType => (
  typeof value === 'string' && ENTITY_TYPES.includes(value as SavedViewEntityType)
)

export function toSavedView(row: SavedViewRow): SavedView {
  return {
    id: row.id,
    user_id: row.user_id,
    name: row.name,
    entity_type: row.entity_type,
    filters: row.filters ?? {},
    sort: row.sort ?? {},
    is_shared: Boolean(row.is_shared),
    created_at: row.created_at,
    updated_at: row.updated_at,
  }
}

export async function GET(req: Request): Promise<Response> {
  const user = await requireAuth(req)
  const roleError = assertRole(user, ['admin', 'sales_rep'])
  if (roleError) return roleError

  const url = new URL(req.url)
  const entityType = url.searchParams.get('entity_type')
  if (entityType && !isSavedViewEntityType(entityType)) return badRequest('entity_type is invalid')

  let query = supabaseAdmin
    .from('saved_views')
    .select('*')
    .or(`user_id.eq.${user.id},is_shared.eq.true`)
    .order('is_shared', { ascending: false })
    .order('name', { ascending: true })

  if (entityType) query = query.eq('entity_type', entityType)

  const { data, error } = await query.returns<SavedViewRow[]>()
  if (error) return badRequest(error.message)

  return json((data ?? []).map(toSavedView))
}

export async function POST(req: Request): Promise<Response> {
  const user = await requireAuth(req)
  const roleError = assertRole(user, ['admin', 'sales_rep'])
  if (roleError) return roleError

  const body = await req.json() as SavedViewBody
  if (!body.name?.trim()) return badRequest('name is required')
  if (!isSavedViewEntityType(body.entity_type)) return badRequest('entity_type is required')
  if (body.is_shared && user.role !== 'admin') return forbidden('Only admins can create shared saved views')

  const { data, error } = await supabaseAdmin
    .from('saved_views')
    .insert({
      user_id: user.id,
      name: body.name.trim(),
      entity_type: body.entity_type,
      filters: body.filters ?? {},
      sort: body.sort ?? {},
      is_shared: user.role === 'admin' ? Boolean(body.is_shared) : false,
    })
    .select('*')
    .single<SavedViewRow>()

  if (error) return badRequest(error.message)
  return json(toSavedView(data), { status: 201 })
}
