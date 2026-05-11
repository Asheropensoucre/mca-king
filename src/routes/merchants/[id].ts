import type { FormData } from '../../../types'
import { merchantToUpdate, rowToMerchant, type MerchantRow } from '../../lib/data-shapes'
import { requireAuth } from '../../lib/requireAuth'
import { assertRole, badRequest, forbidden, getId, json, notFound, type RouteContext } from '../../lib/route-utils'
import { supabaseAdmin } from '../../lib/supabase-server'

async function fetchMerchant(id: string): Promise<MerchantRow | null | Response> {
  const { data, error } = await supabaseAdmin.from('merchants').select('*').eq('id', id).single<MerchantRow>()
  if (error) return error.code === 'PGRST116' ? null : badRequest(error.message)
  return data
}

function canRead(userRole: string, userId: string, row: MerchantRow): boolean {
  if (userRole === 'admin') return true
  if (userRole === 'sales_rep') return row.assigned_rep_id === userId
  if (userRole === 'merchant') return row.user_id === userId
  return false
}

export async function GET(req: Request, context?: RouteContext): Promise<Response> {
  const user = await requireAuth(req)
  const id = getId(context)
  if (!id) return badRequest()

  const row = await fetchMerchant(id)
  if (row instanceof Response) return row
  if (!row) return notFound()
  if (!canRead(user.role, user.id, row)) return forbidden()

  return json(rowToMerchant(row))
}

export async function PATCH(req: Request, context?: RouteContext): Promise<Response> {
  const user = await requireAuth(req)
  const roleError = assertRole(user, ['admin', 'sales_rep'])
  if (roleError) return roleError

  const id = getId(context)
  if (!id) return badRequest()

  const existing = await fetchMerchant(id)
  if (existing instanceof Response) return existing
  if (!existing) return notFound()
  if (user.role === 'sales_rep' && existing.assigned_rep_id !== user.id) return forbidden()

  const patch = await req.json() as Partial<FormData>
  const currentPayload = rowToMerchant(existing)
  const merged: FormData = { ...currentPayload, ...patch, id }
  if (patch.businessInfo) merged.businessInfo = { ...currentPayload.businessInfo, ...patch.businessInfo }
  if (patch.owners) merged.owners = patch.owners
  if (patch.agreements) merged.agreements = { ...currentPayload.agreements, ...patch.agreements }
  if (patch.documents) merged.documents = patch.documents
  if (patch.offers) merged.offers = patch.offers
  if (patch.matchedLenderIds) merged.matchedLenderIds = patch.matchedLenderIds

  const update = merchantToUpdate(merged)
  const { data, error } = await supabaseAdmin
    .from('merchants')
    .update(update)
    .eq('id', id)
    .select('*')
    .single<MerchantRow>()

  if (error) return badRequest(error.message)

  if (patch.status && patch.status !== existing.status) {
    const history = await supabaseAdmin.from('status_history').insert({
      merchant_id: id,
      changed_by: user.id,
      previous_status: existing.status,
      new_status: patch.status,
    })
    if (history.error) return badRequest(history.error.message)
  }

  return json(rowToMerchant(data))
}

export async function DELETE(req: Request, context?: RouteContext): Promise<Response> {
  const user = await requireAuth(req, 'admin')
  const id = getId(context)
  if (!user || !id) return badRequest()

  const { error } = await supabaseAdmin.from('merchants').delete().eq('id', id)
  if (error) return badRequest(error.message)

  return new Response(null, { status: 204 })
}
