import type { LenderInfo } from '../../../types'
import { lenderToInsert, rowToLender, type LenderRow } from '../../lib/data-shapes'
import { getPagination, paginatedJson, cleanSearchTerm, hasListParams } from '../../lib/list-query'
import { requireAuth } from '../../lib/requireAuth'
import { assertRole, badRequest, forbidden, json } from '../../lib/route-utils'
import { supabaseAdmin } from '../../lib/supabase-server'

export async function GET(req: Request): Promise<Response> {
  const user = await requireAuth(req)
  if (user.role === 'merchant') return forbidden()

  const url = new URL(req.url)
  const shouldPaginate = hasListParams(url)
  const pagination = getPagination(url)
  const search = cleanSearchTerm(url.searchParams.get('search'))
  const active = url.searchParams.get('active')
  const industry = url.searchParams.get('industry')
  const state = url.searchParams.get('state')

  let query = supabaseAdmin
    .from('lenders')
    .select('*', { count: shouldPaginate ? 'exact' : undefined })

  if (user.role === 'lender') query = query.eq('user_id', user.id)
  if (search) query = query.or(`company_name.ilike.%${search}%,contact_name.ilike.%${search}%,contact_email.ilike.%${search}%`)
  if (active === 'true') query = query.eq('is_active', true)
  if (active === 'false') query = query.eq('is_active', false)
  if (industry) query = query.contains('industries', [industry])
  if (state) query = query.contains('states', [state])

  query = query.order('company_name')
  if (shouldPaginate) query = query.range(pagination.from, pagination.to)

  const { data, error, count } = await query.returns<LenderRow[]>()
  if (error) return badRequest(error.message)

  const lenders = (data ?? []).map(rowToLender)
  return shouldPaginate ? paginatedJson(lenders, count, pagination.page, pagination.perPage) : json(lenders)
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
