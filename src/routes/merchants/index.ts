import type { FormData } from '../../../types'
import { recordActivity } from '../../lib/activity'
import { merchantToInsert, rowToMerchant, type MerchantRow } from '../../lib/data-shapes'
import { triggerNewMerchantAlert } from '../../lib/email-triggers'
import { requireAuth } from '../../lib/requireAuth'
import { assertRole, badRequest, forbidden, json } from '../../lib/route-utils'
import { getPagination, paginatedJson, cleanSearchTerm, hasListParams } from '../../lib/list-query'
import { supabaseAdmin } from '../../lib/supabase-server'

function sanitizeMerchantForLender(merchant: FormData, lenderId: string): FormData {
  return {
    ...merchant,
    offers: (merchant.offers ?? []).filter(offer => offer.lenderId === lenderId),
  }
}

export async function GET(req: Request): Promise<Response> {
  const user = await requireAuth(req)
  const url = new URL(req.url)
  const shouldPaginate = hasListParams(url)
  const pagination = getPagination(url)
  const search = cleanSearchTerm(url.searchParams.get('search'))
  const status = url.searchParams.get('status')
  const repId = url.searchParams.get('rep_id')
  const state = url.searchParams.get('state')
  const industry = url.searchParams.get('industry')
  const minRevenue = url.searchParams.get('min_revenue')
  const maxRevenue = url.searchParams.get('max_revenue')
  const stale = url.searchParams.get('stale')

  let query = supabaseAdmin
    .from('merchants')
    .select('*', { count: shouldPaginate ? 'exact' : undefined })
  let currentLenderId: string | null = null

  if (user.role === 'sales_rep') query = query.eq('assigned_rep_id', user.id)
  if (user.role === 'merchant') query = query.eq('user_id', user.id)
  if (user.role === 'lender') {
    const { data: lender, error: lenderError } = await supabaseAdmin
      .from('lenders')
      .select('id')
      .eq('user_id', user.id)
      .maybeSingle<{ id: string }>()

    if (lenderError) return badRequest(lenderError.message)
    if (!lender) return shouldPaginate ? paginatedJson([], 0, pagination.page, pagination.perPage) : json([])
    currentLenderId = lender.id

    const { data: matches, error: matchError } = await supabaseAdmin
      .from('lender_matches')
      .select('merchant_id')
      .eq('lender_id', lender.id)
      .returns<{ merchant_id: string }[]>()

    if (matchError) return badRequest(matchError.message)
    const merchantIds = (matches ?? []).map(match => match.merchant_id)
    if (merchantIds.length === 0) return shouldPaginate ? paginatedJson([], 0, pagination.page, pagination.perPage) : json([])
    query = query.in('id', merchantIds)
  }

  if (search) query = query.or(`business_name.ilike.%${search}%,state.ilike.%${search}%,industry.ilike.%${search}%`)
  if (status) query = query.eq('status', status)
  if (repId && user.role === 'admin') query = query.eq('assigned_rep_id', repId)
  if (state) query = query.eq('state', state)
  if (industry) query = query.ilike('industry', `%${industry}%`)
  if (minRevenue) query = query.gte('monthly_revenue', Number(minRevenue))
  if (maxRevenue) query = query.lte('monthly_revenue', Number(maxRevenue))
  if (stale === 'true') {
    const threeDaysAgo = new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString()
    query = query.lte('updated_at', threeDaysAgo)
  }

  query = query.order('created_at', { ascending: false })
  if (shouldPaginate) query = query.range(pagination.from, pagination.to)

  const { data, error, count } = await query.returns<MerchantRow[]>()
  if (error) return badRequest(error.message)

  const merchants = (data ?? []).map(rowToMerchant)
  const visibleMerchants = user.role === 'lender' && currentLenderId
    ? merchants.map(merchant => sanitizeMerchantForLender(merchant, currentLenderId as string))
    : merchants

  return shouldPaginate
    ? paginatedJson(visibleMerchants, count, pagination.page, pagination.perPage)
    : json(visibleMerchants)
}

export async function POST(req: Request): Promise<Response> {
  const user = await requireAuth(req)
  const roleError = assertRole(user, ['admin', 'sales_rep', 'merchant'])
  if (roleError) return roleError

  const merchant = await req.json() as FormData
  const id = merchant.id || crypto.randomUUID()
  const newMerchant = { ...merchant, id }
  const insert = merchantToInsert(newMerchant, user.role === 'merchant' ? user.id : undefined)

  const { data, error } = await supabaseAdmin
    .from('merchants')
    .insert(insert)
    .select('*')
    .single<MerchantRow>()

  if (error) return badRequest(error.message)

  const created = rowToMerchant(data)
  const history = await supabaseAdmin.from('status_history').insert({
    merchant_id: created.id,
    changed_by: user.id,
    previous_status: null,
    new_status: created.status,
    note: 'Merchant created',
  })

  if (history.error) return badRequest(history.error.message)

  triggerNewMerchantAlert(created.id)
  recordActivity({
    entity_type: 'merchant',
    entity_id: created.id,
    user_id: user.id,
    activity_type: 'system',
    body: `Merchant application created: ${data.business_name}`,
  })

  return json(created, { status: 201 })
}
