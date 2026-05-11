import type { LenderInfo } from '../../../types'
import { lenderToUpdate, rowToLender, type LenderRow } from '../../lib/data-shapes'
import { requireAuth } from '../../lib/requireAuth'
import { assertRole, badRequest, forbidden, getId, json, notFound, type RouteContext } from '../../lib/route-utils'
import { supabaseAdmin } from '../../lib/supabase-server'

async function fetchLender(id: string): Promise<LenderRow | null | Response> {
  const { data, error } = await supabaseAdmin.from('lenders').select('*').eq('id', id).single<LenderRow>()
  if (error) return error.code === 'PGRST116' ? null : badRequest(error.message)
  return data
}

export async function GET(req: Request, context?: RouteContext): Promise<Response> {
  const user = await requireAuth(req)
  const id = getId(context)
  if (!id) return badRequest()
  if (user.role === 'merchant') return forbidden()

  const row = await fetchLender(id)
  if (row instanceof Response) return row
  if (!row) return notFound()
  if (user.role === 'lender' && row.user_id !== user.id) return forbidden()

  return json(rowToLender(row))
}

export async function PATCH(req: Request, context?: RouteContext): Promise<Response> {
  const user = await requireAuth(req)
  const roleError = assertRole(user, ['admin'])
  if (roleError) return roleError

  const id = getId(context)
  if (!id) return badRequest()

  const patch = await req.json() as Partial<LenderInfo>
  const { data, error } = await supabaseAdmin
    .from('lenders')
    .update(lenderToUpdate({ ...patch, id }))
    .eq('id', id)
    .select('*')
    .single<LenderRow>()

  if (error) return badRequest(error.message)
  return json(rowToLender(data))
}

export async function DELETE(req: Request, context?: RouteContext): Promise<Response> {
  await requireAuth(req, 'admin')
  const id = getId(context)
  if (!id) return badRequest()

  const { error } = await supabaseAdmin.from('lenders').delete().eq('id', id)
  if (error) return badRequest(error.message)

  return new Response(null, { status: 204 })
}
