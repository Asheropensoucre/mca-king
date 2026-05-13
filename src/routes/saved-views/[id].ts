import type { SavedView } from '../../../types'
import { requireAuth } from '../../lib/requireAuth'
import { assertRole, badRequest, forbidden, getId, json, notFound, type RouteContext } from '../../lib/route-utils'
import { supabaseAdmin } from '../../lib/supabase-server'
import { isSavedViewEntityType, toSavedView } from './index'

type SavedViewRow = SavedView

type SavedViewPatch = {
  name?: string
  entity_type?: string
  filters?: Record<string, string>
  sort?: SavedView['sort']
  is_shared?: boolean
}

async function getSavedView(id: string): Promise<SavedViewRow | Response> {
  const { data, error } = await supabaseAdmin
    .from('saved_views')
    .select('*')
    .eq('id', id)
    .maybeSingle<SavedViewRow>()

  if (error) return badRequest(error.message)
  if (!data) return notFound('Saved view not found')
  return data
}

function canModify(user: { id: string; role: string }, view: SavedViewRow): boolean {
  return user.role === 'admin' || view.user_id === user.id
}

export async function PATCH(req: Request, context?: RouteContext): Promise<Response> {
  const user = await requireAuth(req)
  const roleError = assertRole(user, ['admin', 'sales_rep'])
  if (roleError) return roleError

  const id = getId(context)
  if (!id) return badRequest('id is required')

  const existing = await getSavedView(id)
  if (existing instanceof Response) return existing
  if (!canModify(user, existing)) return forbidden()

  const body = await req.json() as SavedViewPatch
  if (body.entity_type && !isSavedViewEntityType(body.entity_type)) return badRequest('entity_type is invalid')
  if (body.is_shared && user.role !== 'admin') return forbidden('Only admins can create shared saved views')

  const update: Record<string, unknown> = { updated_at: new Date().toISOString() }
  if (body.name !== undefined) {
    if (!body.name.trim()) return badRequest('name cannot be blank')
    update.name = body.name.trim()
  }
  if (body.entity_type !== undefined) update.entity_type = body.entity_type
  if (body.filters !== undefined) update.filters = body.filters
  if (body.sort !== undefined) update.sort = body.sort
  if (body.is_shared !== undefined) update.is_shared = user.role === 'admin' ? Boolean(body.is_shared) : false

  const { data, error } = await supabaseAdmin
    .from('saved_views')
    .update(update)
    .eq('id', id)
    .select('*')
    .single<SavedViewRow>()

  if (error) return badRequest(error.message)
  return json(toSavedView(data))
}

export async function DELETE(_req: Request, context?: RouteContext): Promise<Response> {
  const user = await requireAuth(_req)
  const roleError = assertRole(user, ['admin', 'sales_rep'])
  if (roleError) return roleError

  const id = getId(context)
  if (!id) return badRequest('id is required')

  const existing = await getSavedView(id)
  if (existing instanceof Response) return existing
  if (!canModify(user, existing)) return forbidden()

  const { error } = await supabaseAdmin.from('saved_views').delete().eq('id', id)
  if (error) return badRequest(error.message)
  return json({ success: true })
}
