const escapeHtml = (value: string | number | null | undefined): string => String(value ?? '')
  .replace(/&/g, '&amp;')
  .replace(/</g, '&lt;')
  .replace(/>/g, '&gt;')
  .replace(/"/g, '&quot;')
  .replace(/'/g, '&#39;')

const money = (value: number): string => `$${value.toLocaleString()}`

const colors = {
  surfaceContainerLowest: '#ffffff',
  surfaceContainerLow: '#ffeffb',
  inverseSurface: '#560068',
  inverseOnSurface: '#ffebfc',
  outlineVariant: '#c5c5d3',
  primary: '#00236f',
  onPrimary: '#ffffff',
  primaryContainer: '#1e3a8a',
  secondary: '#006a61',
  onSecondary: '#ffffff',
  secondaryFixed: '#89f5e7',
  tertiaryFixed: '#ffe262',
  onTertiaryFixed: '#221b00',
} as const

const shell = (title: string, body: string): string => `
  <div style="margin:0;background:${colors.inverseSurface};padding:24px;font-family:'FiraCode Nerd Font Mono','Fira Code',monospace;color:${colors.inverseOnSurface};">
    <div style="max-width:600px;margin:0 auto;background:${colors.primary};border:1px solid ${colors.outlineVariant};border-radius:14px;overflow:hidden;">
      <div style="padding:22px 24px;background:${colors.primaryContainer};">
        <h1 style="margin:0;font-size:22px;line-height:1.3;color:${colors.tertiaryFixed};">${escapeHtml(title)}</h1>
      </div>
      <div style="padding:24px;color:${colors.inverseOnSurface};font-size:15px;line-height:1.6;">
        ${body}
      </div>
    </div>
  </div>
`

const table = (rows: { label: string; value: string | number }[]): string => `
  <table style="width:100%;border-collapse:collapse;margin:18px 0;background:${colors.inverseSurface};border-radius:10px;overflow:hidden;">
    ${rows.map(row => `
      <tr>
        <td style="padding:10px 12px;border-bottom:1px solid ${colors.outlineVariant};font-weight:bold;color:${colors.tertiaryFixed};width:42%;">${escapeHtml(row.label)}</td>
        <td style="padding:10px 12px;border-bottom:1px solid ${colors.outlineVariant};color:${colors.inverseOnSurface};">${escapeHtml(row.value)}</td>
      </tr>
    `).join('')}
  </table>
`

const button = (href: string, label: string, color: string = colors.secondaryFixed, textColor: string = colors.onTertiaryFixed): string => `
  <a href="${escapeHtml(href)}" style="display:inline-block;padding:12px 20px;background:${color};color:${textColor};text-decoration:none;border-radius:8px;font-weight:bold;">${escapeHtml(label)}</a>
`

export const templates = {
  newMerchant: (data: {
    rep_name: string
    business_name: string
    requested_amount: number
    app_url: string
  }) => ({
    subject: `New Application: ${data.business_name}`,
    html: shell('New Merchant Application', `
      <p>Hi ${escapeHtml(data.rep_name)},</p>
      <p>A new merchant application has been submitted and assigned to you.</p>
      ${table([
        { label: 'Business', value: data.business_name },
        { label: 'Requested', value: money(data.requested_amount) },
      ])}
      ${button(data.app_url, 'View Application', colors.tertiaryFixed)}
    `),
  }),

  lenderNotification: (data: {
    lender_name: string
    business_name: string
    industry: string
    state: string
    monthly_revenue: number
    requested_amount: number
    current_positions: number
    app_url: string
  }) => ({
    subject: `New Funding Opportunity: ${data.business_name}`,
    html: shell('New Merchant Match', `
      <p>Hi ${escapeHtml(data.lender_name)},</p>
      <p>A merchant has been matched to your funding criteria. Please log in to review and submit an offer.</p>
      ${table([
        { label: 'Business', value: data.business_name },
        { label: 'Industry', value: data.industry },
        { label: 'State', value: data.state },
        { label: 'Monthly Revenue', value: money(data.monthly_revenue) },
        { label: 'Requested Amount', value: money(data.requested_amount) },
        { label: 'Current Positions', value: data.current_positions },
      ])}
      ${button(data.app_url, 'Log In to Review')}
      <p style="font-size:12px;color:${colors.outlineVariant};margin-top:24px;">You are receiving this because you are part of the MCA King lender network.</p>
    `),
  }),

  offerReceived: (data: {
    recipient_name: string
    business_name: string
    lender_name: string
    amount: number
    factor_rate: number
    term_months: number
    payment_freq: string
    app_url: string
  }) => ({
    subject: `New Offer Received for ${data.business_name}`,
    html: shell('New Offer Received', `
      <p>Hi ${escapeHtml(data.recipient_name)},</p>
      <p>${escapeHtml(data.lender_name)} has submitted a funding offer for ${escapeHtml(data.business_name)}.</p>
      ${table([
        { label: 'Offer Amount', value: money(data.amount) },
        { label: 'Factor Rate', value: data.factor_rate },
        { label: 'Term', value: `${data.term_months} months` },
        { label: 'Payment Frequency', value: data.payment_freq },
      ])}
      ${button(data.app_url, 'Review Offer', colors.tertiaryFixed)}
    `),
  }),

  offerAccepted: (data: {
    recipient_name: string
    business_name: string
    amount: number
    app_url: string
  }) => ({
    subject: `Offer Accepted — ${data.business_name}`,
    html: shell('Offer Accepted', `
      <p>Hi ${escapeHtml(data.recipient_name)},</p>
      <p>${escapeHtml(data.business_name)} has accepted the offer of <strong>${money(data.amount)}</strong>.</p>
      <p>Please log in to proceed with the next steps.</p>
      ${button(data.app_url, 'View Deal')}
    `),
  }),

  stipulationRequested: (data: {
    merchant_name: string
    description: string
    lender_name: string
    app_url: string
  }) => ({
    subject: 'Action Required: Additional Documents Needed',
    html: shell('Additional Documents Requested', `
      <p>Hi ${escapeHtml(data.merchant_name)},</p>
      <p>${escapeHtml(data.lender_name)} has requested additional documentation before proceeding with your application.</p>
      <div style="background:${colors.inverseSurface};padding:16px;border-radius:8px;margin:16px 0;border:1px solid ${colors.outlineVariant};">
        <strong style="color:${colors.tertiaryFixed};">What's needed:</strong>
        <p style="margin:8px 0 0;color:${colors.inverseOnSurface};">${escapeHtml(data.description)}</p>
      </div>
      ${button(data.app_url, 'Upload Documents')}
    `),
  }),

  contractSent: (data: {
    merchant_name: string
    business_name: string
    app_url: string
  }) => ({
    subject: `Your Contract is Ready — ${data.business_name}`,
    html: shell('Contract Ready for Review', `
      <p>Hi ${escapeHtml(data.merchant_name)},</p>
      <p>Your funding contract for <strong>${escapeHtml(data.business_name)}</strong> is ready for your review and signature.</p>
      <p>Please log in to review the contract details.</p>
      ${button(data.app_url, 'Review Contract', colors.tertiaryFixed)}
    `),
  }),

  dealFunded: (data: {
    recipient_name: string
    business_name: string
    amount: number
    app_url: string
  }) => ({
    subject: `🎉 Funded: ${data.business_name}`,
    html: shell('Deal Funded!', `
      <p>Hi ${escapeHtml(data.recipient_name)},</p>
      <p><strong>${escapeHtml(data.business_name)}</strong> has been successfully funded for <strong>${money(data.amount)}</strong>.</p>
      ${button(data.app_url, 'View Deal')}
    `),
  }),
}
