import type { FormData, Offer } from '../../../types'
import { recordActivity } from '../../lib/activity'
import { normalizeOfferStatus, rowToMerchant, type MerchantRow, type OfferRow } from '../../lib/data-shapes'
import { triggerOfferAccepted } from '../../lib/email-triggers'
import { requireAuth } from '../../lib/requireAuth'
import { badRequest, forbidden, getId, json, notFound, type RouteContext } from '../../lib/route-utils'
import { supabaseAdmin } from '../../lib/supabase-server'

export async function PATCH(req: Request, context?: RouteContext): Promise<Response> {
  const user = await requireAuth(req, 'merchant')
  const id = getId(context)
  if (!id) return badRequest()

  const body = await req.json() as { status?: 'Accepted' | 'Rejected' }
  if (body.status !== 'Accepted' && body.status !== 'Rejected') return badRequest('status must be Accepted or Rejected')

  const { data: offerRow, error: offerError } = await supabaseAdmin
    .from('offers')
    .select('*')
    .eq('id', id)
    .single<OfferRow>()

  if (offerError) return offerError.code === 'PGRST116' ? notFound() : badRequest(offerError.message)

  const { data: merchantRow, error: merchantError } = await supabaseAdmin
    .from('merchants')
    .select('*')
    .eq('id', offerRow.merchant_id)
    .single<MerchantRow>()

  if (merchantError) return badRequest(merchantError.message)
  if (merchantRow.user_id !== user.id) return forbidden()

  const existingOffer: Offer = offerRow.payload
    ? { ...offerRow.payload, id: offerRow.id }
    : {
        id: offerRow.id,
        lenderId: offerRow.lender_id,
        lenderName: offerRow.lender_id,
        amount: String(offerRow.amount),
        rate: offerRow.factor_rate ? String(offerRow.factor_rate) : undefined,
        term: offerRow.term_months ? String(offerRow.term_months) : '',
        status: offerRow.status === 'accepted' ? 'Accepted' : offerRow.status === 'declined' ? 'Rejected' : 'Pending',
      }

  const updatedOffer: Offer = { ...existingOffer, status: body.status }
  const dbStatus = normalizeOfferStatus(updatedOffer.status)

  const { data: savedOffer, error: saveError } = await supabaseAdmin
    .from('offers')
    .update({
      status: dbStatus,
      accepted_at: updatedOffer.status === 'Accepted' ? new Date().toISOString() : null,
      payload: updatedOffer,
    })
    .eq('id', id)
    .select('*')
    .single<OfferRow>()

  if (saveError) return badRequest(saveError.message)

  const merchant = rowToMerchant(merchantRow)
  const offers = (merchant.offers ?? []).map(offer => (
    offer.id === id || offer.lenderId === updatedOffer.lenderId ? updatedOffer : offer
  ))

  let nextStatus = merchant.status
  if (updatedOffer.status === 'Accepted') {
    nextStatus = 'Merchant accepts offer'
  } else {
    const { data: allOffers, error: allOffersError } = await supabaseAdmin
      .from('offers')
      .select('status')
      .eq('merchant_id', offerRow.merchant_id)
      .returns<{ status: OfferRow['status'] }[]>()
    if (allOffersError) return badRequest(allOffersError.message)
    if ((allOffers ?? []).length > 0 && (allOffers ?? []).every(offer => offer.status === 'declined')) {
      nextStatus = "Merchant Declines Offer's"
    }
  }

  const updatedMerchant: FormData = { ...merchant, offers, status: nextStatus }
  const { error: merchantSaveError } = await supabaseAdmin
    .from('merchants')
    .update({ status: nextStatus, payload: updatedMerchant, updated_at: new Date().toISOString() })
    .eq('id', merchant.id)

  if (merchantSaveError) return badRequest(merchantSaveError.message)

  if (nextStatus !== merchantRow.status) {
    const { error: historyError } = await supabaseAdmin.from('status_history').insert({
      merchant_id: merchant.id,
      changed_by: user.id,
      previous_status: merchantRow.status,
      new_status: nextStatus,
      note: `Offer ${updatedOffer.status.toLowerCase()}`,
    })
    if (historyError) return badRequest(historyError.message)
  }

  if (updatedOffer.status === 'Accepted') {
    triggerOfferAccepted(savedOffer.id)
  }

  recordActivity({
    entity_type: 'offer',
    entity_id: merchant.id,
    user_id: user.id,
    activity_type: 'offer',
    body: `Offer ${dbStatus} by merchant`,
    metadata: { offer_id: id, status: dbStatus },
  })

  const result: Offer = savedOffer.payload ? { ...savedOffer.payload, id: savedOffer.id } : updatedOffer
  return json(result)
}
