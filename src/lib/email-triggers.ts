import type { ApplicationStatus } from '../../types'
import { supabaseAdmin } from './supabase-server'
import {
  displayName,
  getAcceptedOfferForMerchant,
  getAdminUsers,
  getLenderEmailData,
  getMerchantEmailData,
  getUserById,
  toNumber,
  type EmailLender,
  type EmailOffer,
} from './email-data'
import {
  sendContractSent,
  sendDealFunded,
  sendLenderNotification,
  sendNewMerchantAlert,
  sendOfferAccepted,
  sendOfferReceived,
  sendStipulationRequested,
} from './send-email'

type MatchWithLender = {
  id: string
  lender_id: string
  lender: EmailLender | null
}

type StipulationEmailRow = {
  id: string
  merchant_id: string
  lender_id: string
  description: string
}

async function getOffer(offerId: string): Promise<EmailOffer | null> {
  const { data, error } = await supabaseAdmin
    .from('offers')
    .select('id,merchant_id,lender_id,amount,factor_rate,term_months,payment_freq,status')
    .eq('id', offerId)
    .maybeSingle<EmailOffer>()

  if (error) {
    console.error('[email] Failed to fetch offer', offerId, error)
    return null
  }
  return data ?? null
}

export function triggerNewMerchantAlert(merchantId: string): void {
  void (async () => {
    try {
      const merchant = await getMerchantEmailData(merchantId)
      if (!merchant?.assigned_rep_id) return

      const rep = await getUserById(merchant.assigned_rep_id)
      if (!rep?.email) return

      await sendNewMerchantAlert({
        rep_email: rep.email,
        rep_name: displayName(rep, 'Sales Rep'),
        business_name: merchant.business_name,
        requested_amount: toNumber(merchant.requested_amount),
      })
    } catch (error) {
      console.error('[email] New merchant alert trigger failed', error)
    }
  })()
}

export function triggerLenderNotifications(merchantId: string): void {
  void (async () => {
    try {
      const merchant = await getMerchantEmailData(merchantId)
      if (!merchant) return

      const { data, error } = await supabaseAdmin
        .from('lender_matches')
        .select('id,lender_id,lender:lenders(id,company_name,contact_name,contact_email)')
        .eq('merchant_id', merchantId)
        .returns<MatchWithLender[]>()

      if (error) {
        console.error('[email] Failed to fetch lender matches', error)
        return
      }

      for (const match of data ?? []) {
        const lender = match.lender
        if (!lender?.contact_email) continue
        await sendLenderNotification({
          lender_email: lender.contact_email,
          lender_name: lender.contact_name ?? lender.company_name,
          business_name: merchant.business_name,
          industry: merchant.industry ?? 'N/A',
          state: merchant.state ?? 'N/A',
          monthly_revenue: toNumber(merchant.monthly_revenue),
          requested_amount: toNumber(merchant.requested_amount),
          current_positions: merchant.current_positions ?? 0,
        })
      }
    } catch (error) {
      console.error('[email] Lender notification trigger failed', error)
    }
  })()
}

export function triggerOfferReceived(offerId: string): void {
  void (async () => {
    try {
      const offer = await getOffer(offerId)
      if (!offer) return

      const merchant = await getMerchantEmailData(offer.merchant_id)
      const lender = await getLenderEmailData(offer.lender_id)
      if (!merchant || !lender) return

      const merchantUser = await getUserById(merchant.user_id)
      const rep = await getUserById(merchant.assigned_rep_id)
      const common = {
        business_name: merchant.business_name,
        lender_name: lender.company_name,
        amount: toNumber(offer.amount),
        factor_rate: toNumber(offer.factor_rate),
        term_months: offer.term_months ?? 0,
        payment_freq: offer.payment_freq ?? 'N/A',
      }

      if (merchantUser?.email) {
        await sendOfferReceived({
          recipient_email: merchantUser.email,
          recipient_name: displayName(merchantUser, 'Merchant'),
          ...common,
        })
      }

      if (rep?.email) {
        await sendOfferReceived({
          recipient_email: rep.email,
          recipient_name: displayName(rep, 'Sales Rep'),
          ...common,
        })
      }
    } catch (error) {
      console.error('[email] Offer received trigger failed', error)
    }
  })()
}

export function triggerOfferAccepted(offerId: string): void {
  void (async () => {
    try {
      const offer = await getOffer(offerId)
      if (!offer) return

      const merchant = await getMerchantEmailData(offer.merchant_id)
      const lender = await getLenderEmailData(offer.lender_id)
      if (!merchant || !lender) return

      const rep = await getUserById(merchant.assigned_rep_id)
      const common = {
        business_name: merchant.business_name,
        amount: toNumber(offer.amount),
      }

      if (lender.contact_email) {
        await sendOfferAccepted({
          recipient_email: lender.contact_email,
          recipient_name: lender.contact_name ?? lender.company_name,
          ...common,
        })
      }

      if (rep?.email) {
        await sendOfferAccepted({
          recipient_email: rep.email,
          recipient_name: displayName(rep, 'Sales Rep'),
          ...common,
        })
      }
    } catch (error) {
      console.error('[email] Offer accepted trigger failed', error)
    }
  })()
}

export function triggerStipulationRequested(stipulationId: string): void {
  void (async () => {
    try {
      const { data: stipulation, error } = await supabaseAdmin
        .from('stipulations')
        .select('id,merchant_id,lender_id,description')
        .eq('id', stipulationId)
        .maybeSingle<StipulationEmailRow>()

      if (error) {
        console.error('[email] Failed to fetch stipulation', stipulationId, error)
        return
      }
      if (!stipulation) return

      const merchant = await getMerchantEmailData(stipulation.merchant_id)
      const lender = await getLenderEmailData(stipulation.lender_id)
      if (!merchant || !lender) return

      const merchantUser = await getUserById(merchant.user_id)
      if (!merchantUser?.email) return

      await sendStipulationRequested({
        merchant_email: merchantUser.email,
        merchant_name: displayName(merchantUser, 'Merchant'),
        description: stipulation.description,
        lender_name: lender.company_name,
      })
    } catch (error) {
      console.error('[email] Stipulation requested trigger failed', error)
    }
  })()
}

export function triggerMerchantStatusEmail(merchantId: string, status: ApplicationStatus): void {
  void (async () => {
    try {
      const merchant = await getMerchantEmailData(merchantId)
      if (!merchant) return

      if (status === 'contract sent') {
        const merchantUser = await getUserById(merchant.user_id)
        if (!merchantUser?.email) return

        await sendContractSent({
          merchant_email: merchantUser.email,
          merchant_name: displayName(merchantUser, 'Merchant'),
          business_name: merchant.business_name,
        })
        return
      }

      if (status === 'FUNDED') {
        const merchantUser = await getUserById(merchant.user_id)
        const rep = await getUserById(merchant.assigned_rep_id)
        const admins = await getAdminUsers()
        const acceptedOffer = await getAcceptedOfferForMerchant(merchantId)
        const recipients = [merchantUser, rep, ...admins]
          .filter((user): user is NonNullable<typeof user> => Boolean(user?.email))
          .map(user => ({ email: user.email, name: displayName(user) }))

        if (recipients.length === 0) return

        await sendDealFunded({
          recipients,
          business_name: merchant.business_name,
          amount: toNumber(acceptedOffer?.amount),
        })
      }
    } catch (error) {
      console.error('[email] Merchant status trigger failed', error)
    }
  })()
}
