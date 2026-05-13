import type { FormData } from '../../../types'
import { recordActivity } from '../../lib/activity'
import { merchantToInsert, rowToMerchant, type MerchantRow } from '../../lib/data-shapes'
import { triggerNewMerchantAlert } from '../../lib/email-triggers'
import { requireAuth } from '../../lib/requireAuth'
import { assertRole, badRequest, forbidden, json } from '../../lib/route-utils'
import { supabaseAdmin } from '../../lib/supabase-server'

export async function GET(req: Request): Promise<Response> {
  const user = await requireAuth(req)
  let query = supabaseAdmin.from('merchants').select('*').order('created_at', { ascending: false })

  if (user.role === 'sales_rep') query = query.eq('assigned_rep_id', user.id)
  if (user.role === 'merchant') query = query.eq('user_id', user.id)
  if (user.role === 'lender') {
    const { data: lender, error: lenderError } = await supabaseAdmin
      .from('lenders')
      .select('id')
      .eq('user_id', user.id)
      .maybeSingle<{ id: string }>()

    if (lenderError) return badRequest(lenderError.message)
    if (!lender) return json([])

    const { data: matches, error: matchError } = await supabaseAdmin
      .from('lender_matches')
      .select('merchant_id')
      .eq('lender_id', lender.id)
      .returns<{ merchant_id: string }[]>()

    if (matchError) return badRequest(matchError.message)
    const merchantIds = (matches ?? []).map(match => match.merchant_id)
    if (merchantIds.length === 0) return json([])
    query = query.in('id', merchantIds)
  }

  const { data, error } = await query.returns<MerchantRow[]>()
  if (error) return badRequest(error.message)

  return json((data ?? []).map(rowToMerchant))
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
