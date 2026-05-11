import type { LenderInfo } from '../../../types'
import { lenderToInsert, rowToLender, type LenderRow } from '../../lib/data-shapes'
import { requireAuth } from '../../lib/requireAuth'
import { assertRole, badRequest, forbidden, json } from '../../lib/route-utils'
import { supabaseAdmin } from '../../lib/supabase-server'

export async function GET(req: Request): Promise<Response> {
  const user = await requireAuth(req)
  if (user.role === 'merchant') return forbidden()

  let query = supabaseAdmin.from('lenders').select('*').order('company_name')
  if (user.role === 'lender') query = query.eq('user_id', user.id)

  const { data, error } = await query.returns<LenderRow[]>()
  if (error) return badRequest(error.message)

  return json((data ?? []).map(rowToLender))
}

export async function POST(req: Request): Promise<Response> {
  const user = await requireAuth(req)
  const roleError = assertRole(user, ['admin', 'lender'])
  if (roleError) return roleError

  const lender = await req.json() as LenderInfo
  const newLender = { ...lender, id: lender.id || crypto.randomUUID() }

  const { data, error } = await supabaseAdmin
    .from('lenders')
    .insert(lenderToInsert(newLender, user.role === 'lender' ? user.id : undefined))
    .select('*')
    .single<LenderRow>()

  if (error) return badRequest(error.message)
  return json(rowToLender(data), { status: 201 })
}
