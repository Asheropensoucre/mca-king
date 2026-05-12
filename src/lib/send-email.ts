import { getAppUrl, getEmailConfig } from './email'
import { templates } from './email-templates'

const appUrl = (): string => getAppUrl()

async function send(to: string | string[], subject: string, html: string): Promise<void> {
  try {
    const config = getEmailConfig()
    if (!config) return

    const recipients = Array.isArray(to) ? to.filter(Boolean) : [to].filter(Boolean)
    if (recipients.length === 0) return

    await config.resend.emails.send({
      from: config.from,
      to: recipients,
      subject,
      html,
    })
  } catch (err) {
    console.error('[email] Failed to send:', subject, err)
  }
}

export async function sendNewMerchantAlert(params: {
  rep_email: string
  rep_name: string
  business_name: string
  requested_amount: number
  app_url?: string
}): Promise<void> {
  const t = templates.newMerchant({ ...params, app_url: params.app_url ?? appUrl() })
  await send(params.rep_email, t.subject, t.html)
}

export async function sendLenderNotification(params: {
  lender_email: string
  lender_name: string
  business_name: string
  industry: string
  state: string
  monthly_revenue: number
  requested_amount: number
  current_positions: number
  app_url?: string
}): Promise<void> {
  const t = templates.lenderNotification({ ...params, app_url: params.app_url ?? appUrl() })
  await send(params.lender_email, t.subject, t.html)
}

export async function sendOfferReceived(params: {
  recipient_email: string
  recipient_name: string
  business_name: string
  lender_name: string
  amount: number
  factor_rate: number
  term_months: number
  payment_freq: string
  app_url?: string
}): Promise<void> {
  const t = templates.offerReceived({ ...params, app_url: params.app_url ?? appUrl() })
  await send(params.recipient_email, t.subject, t.html)
}

export async function sendOfferAccepted(params: {
  recipient_email: string
  recipient_name: string
  business_name: string
  amount: number
  app_url?: string
}): Promise<void> {
  const t = templates.offerAccepted({ ...params, app_url: params.app_url ?? appUrl() })
  await send(params.recipient_email, t.subject, t.html)
}

export async function sendStipulationRequested(params: {
  merchant_email: string
  merchant_name: string
  description: string
  lender_name: string
  app_url?: string
}): Promise<void> {
  const t = templates.stipulationRequested({ ...params, app_url: params.app_url ?? appUrl() })
  await send(params.merchant_email, t.subject, t.html)
}

export async function sendContractSent(params: {
  merchant_email: string
  merchant_name: string
  business_name: string
  app_url?: string
}): Promise<void> {
  const t = templates.contractSent({ ...params, app_url: params.app_url ?? appUrl() })
  await send(params.merchant_email, t.subject, t.html)
}

export async function sendDealFunded(params: {
  recipients: { email: string; name: string }[]
  business_name: string
  amount: number
  app_url?: string
}): Promise<void> {
  for (const recipient of params.recipients) {
    const t = templates.dealFunded({
      recipient_name: recipient.name,
      business_name: params.business_name,
      amount: params.amount,
      app_url: params.app_url ?? appUrl(),
    })
    await send(recipient.email, t.subject, t.html)
  }
}
