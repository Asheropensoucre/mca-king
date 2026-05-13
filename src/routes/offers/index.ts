import type { FormData, Offer } from '../../../types'
import { recordActivity } from '../../lib/activity'
import { normalizeOfferStatus, rowToMerchant, type MerchantRow, type OfferRow } from '../../lib/data-shapes'
import { triggerOfferReceived } from '../../lib/email-triggers'
import { requireAuth } from '../../lib/requireAuth'
import { assertRole, badRequest, forbidden, json } from '../../lib/route-utils'
import { supabaseAdmin } from '../../lib/supabase-server'

const OFFER_STATUS = "one or more lender's sent offer" as const

function rowToOffer(row: OfferRow): Offer {
  if (row.payload) return { ...row.payload, id: row.id }
  return {
    id: row.id,
    lenderId: row.lender_id,
    lenderName: row.lender_id,
    amount: String(row.amount),
    rate: row.factor_rate ? String(row.factor_rate) : undefined,
    term: row.term_months ? String(row.term_months) : '',
    status: row.status === 'accepted' ? 'Accepted' : row.status === 'declined' ? 'Rejected' : 'Pending',
  }
}

async function updateMerchantOffers(merchantId: string, newOffer: Offer, changedBy: string): Promise<Response | null> {
  const { data: merchantRow, error } = await supabaseAdmin
    .from('merchants')
    .select('*')
    .eq('id', merchantId)
    .single<MerchantRow>()

  if (error) return badRequest(error.message)

  const merchant = rowToMerchant(merchantRow)
  const updatedMerchant: FormData = {
    ...merchant,
    offers: [...(merchant.offers ?? []), newOffer],
    status: OFFER_STATUS,
  }

  const { error: updateError } = await supabaseAdmin
    .from('merchants')
    .update({ status: OFFER_STATUS, payload: updatedMerchant, updated_at: new Date().toISOString() })
    .eq('id', merchantId)

  if (updateError) return badRequest(updateError.message)

  if (merchantRow.status !== OFFER_STATUS) {
    const { error: historyError } = await supabaseAdmin.from('status_history').insert({
      merchant_id: merchantId,
      changed_by: changedBy,
      previous_status: merchantRow.status,
      new_status: OFFER_STATUS,
      note: 'Offer created',
    })
    if (historyError) return badRequest(historyError.message)
  }

  return null
}

export async function GET(req: Request): Promise<Response> {
  const user = await requireAuth(req)
  let query = supabaseAdmin.from('offers').select('*').order('created_at', { ascending: false })

  if (user.role === 'lender') {
    const { data: lender } = await supabaseAdmin.from('lenders').select('id').eq('user_id', user.id).maybeSingle<{ id: string }>()
    if (!lender) return json([])
    query = query.eq('lender_id', lender.id)
  }

  if (user.role === 'merchant') {
    const { data: merchant } = await supabaseAdmin.from('merchants').select('id').eq('user_id', user.id).maybeSingle<{ id: string }>()
    if (!merchant) return json([])
    query = query.eq('merchant_id', merchant.id)
  }

  if (user.role === 'sales_rep') {
    const { data: merchants, error: merchantError } = await supabaseAdmin
      .from('merchants')
      .select('id')
      .eq('assigned_rep_id', user.id)
      .returns<{ id: string }[]>()
    if (merchantError) return badRequest(merchantError.message)
    const ids = (merchants ?? []).map(merchant => merchant.id)
    if (ids.length === 0) return json([])
    query = query.in('merchant_id', ids)
  }

  const { data, error } = await query.returns<OfferRow[]>()
  if (error) return badRequest(error.message)

  return json((data ?? []).map(rowToOffer))
}

export async function POST(req: Request): Promise<Response> {
  const user = await requireAuth(req)
  const roleError = assertRole(user, ['lender', 'admin'])
  if (roleError) return roleError

  const body = await req.json() as Offer & { merchantId?: string; merchant_id?: string }
  const merchantId = body.merchantId ?? body.merchant_id
  if (!merchantId || !body.lenderId || !body.amount) return badRequest('merchantId, lenderId, and amount are required')

  if (user.role === 'lender') {
    const { data: lender } = await supabaseAdmin.from('lenders').select('id').eq('id', body.lenderId).eq('user_id', user.id).maybeSingle<{ id: string }>()
    if (!lender) return forbidden()
  }

  const offer: Offer = {
    id: body.id || crypto.randomUUID(),
    lenderId: body.lenderId,
    lenderName: body.lenderName,
    amount: body.amount,
    rate: body.rate,
    term: body.term,
    status: 'Pending',
    notes: body.notes,
  }

  const { data, error } = await supabaseAdmin
    .from('offers')
    .insert({
      id: offer.id,
      merchant_id: merchantId,
      lender_id: offer.lenderId,
      amount: Number(offer.amount),
      factor_rate: offer.rate ? Number(offer.rate) : null,
      term_months: offer.term ? Number(String(offer.term).replace(/[^0-9.-]/g, '')) : null,
      status: normalizeOfferStatus(offer.status),
      payload: offer,
    })
    .select('*')
    .single<OfferRow>()

  if (error) return badRequest(error.message)

  const merchantUpdateError = await updateMerchantOffers(merchantId, offer, user.id)
  if (merchantUpdateError) return merchantUpdateError

  triggerOfferReceived(data.id)
  recordActivity({
    entity_type: 'offer',
    entity_id: merchantId,
    user_id: user.id,
    activity_type: 'offer',
    body: `Offer received from ${offer.lenderName || offer.lenderId}: $${offer.amount}`,
    metadata: { offer_id: data.id, lender_id: offer.lenderId, amount: offer.amount, factor_rate: offer.rate },
  })

  return json(rowToOffer(data), { status: 201 })
}
