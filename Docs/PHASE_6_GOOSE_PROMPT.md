# Goose Agent Prompt — Phase 6: Email Automation
> Phases 1–5 are complete. Real auth, Supabase, all routes, documents, leads, and matching engine are all working. Now we wire up outbound email notifications using Resend.

---

## What You Are Doing This Phase

Add automated outbound email notifications for every key event in the platform. All emails send from the configured custom domain. No inbound email — send only.

---

## Environment Variable

The Resend API key is already in `.env.local`:

```env
RESEND_API_KEY=<already set by human>
```

Also add this to `.env.local` — the from address for all outbound emails:

```env
EMAIL_FROM=noreply@yourdomain.com
```

Ask the human what their domain is before writing this value, or read it from the existing env file if it's there. Do not hardcode a domain — read it from `process.env.EMAIL_FROM` everywhere.

---

## Step 1 — Install Resend

```bash
bun add resend
```

---

## Step 2 — Create Resend Client

Create `src/lib/email.ts`:

```ts
import { Resend } from 'resend'

const apiKey = process.env.RESEND_API_KEY
if (!apiKey) throw new Error('Missing RESEND_API_KEY')

export const resend = new Resend(apiKey)
export const FROM = process.env.EMAIL_FROM ?? 'noreply@mcaking.com'
```

---

## Step 3 — Email Templates

Create `src/lib/email-templates.ts`

All templates return a plain object with `subject` and `html`. Keep the HTML clean and simple — no external CSS frameworks, just inline styles. Match the app's color scheme: dark background feel, clean white text, accent color for buttons.

```ts
export const templates = {

  // 1. New merchant submitted → assigned sales rep
  newMerchant: (data: {
    rep_name: string
    business_name: string
    requested_amount: number
    app_url: string
  }) => ({
    subject: `New Application: ${data.business_name}`,
    html: `
      <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 24px;">
        <h2>New Merchant Application</h2>
        <p>Hi ${data.rep_name},</p>
        <p>A new merchant application has been submitted and assigned to you.</p>
        <table style="width: 100%; border-collapse: collapse; margin: 16px 0;">
          <tr><td style="padding: 8px; font-weight: bold;">Business</td><td style="padding: 8px;">${data.business_name}</td></tr>
          <tr><td style="padding: 8px; font-weight: bold;">Requested</td><td style="padding: 8px;">$${data.requested_amount.toLocaleString()}</td></tr>
        </table>
        <a href="${data.app_url}" style="display: inline-block; padding: 12px 24px; background: #2563eb; color: white; text-decoration: none; border-radius: 6px;">View Application</a>
      </div>
    `
  }),

  // 2. Lender notified of matched merchant
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
    html: `
      <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 24px;">
        <h2>New Merchant Match</h2>
        <p>Hi ${data.lender_name},</p>
        <p>A merchant has been matched to your funding criteria. Please log in to review and submit an offer.</p>
        <table style="width: 100%; border-collapse: collapse; margin: 16px 0;">
          <tr><td style="padding: 8px; font-weight: bold;">Business</td><td style="padding: 8px;">${data.business_name}</td></tr>
          <tr><td style="padding: 8px; font-weight: bold;">Industry</td><td style="padding: 8px;">${data.industry}</td></tr>
          <tr><td style="padding: 8px; font-weight: bold;">State</td><td style="padding: 8px;">${data.state}</td></tr>
          <tr><td style="padding: 8px; font-weight: bold;">Monthly Revenue</td><td style="padding: 8px;">$${data.monthly_revenue.toLocaleString()}</td></tr>
          <tr><td style="padding: 8px; font-weight: bold;">Requested Amount</td><td style="padding: 8px;">$${data.requested_amount.toLocaleString()}</td></tr>
          <tr><td style="padding: 8px; font-weight: bold;">Current Positions</td><td style="padding: 8px;">${data.current_positions}</td></tr>
        </table>
        <a href="${data.app_url}" style="display: inline-block; padding: 12px 24px; background: #2563eb; color: white; text-decoration: none; border-radius: 6px;">Log In to Review</a>
        <p style="font-size: 12px; color: #666; margin-top: 24px;">You are receiving this because you are part of the MCA King lender network.</p>
      </div>
    `
  }),

  // 3. Lender submits offer → merchant + sales rep
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
    html: `
      <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 24px;">
        <h2>New Offer Received</h2>
        <p>Hi ${data.recipient_name},</p>
        <p>${data.lender_name} has submitted a funding offer for ${data.business_name}.</p>
        <table style="width: 100%; border-collapse: collapse; margin: 16px 0;">
          <tr><td style="padding: 8px; font-weight: bold;">Offer Amount</td><td style="padding: 8px;">$${data.amount.toLocaleString()}</td></tr>
          <tr><td style="padding: 8px; font-weight: bold;">Factor Rate</td><td style="padding: 8px;">${data.factor_rate}</td></tr>
          <tr><td style="padding: 8px; font-weight: bold;">Term</td><td style="padding: 8px;">${data.term_months} months</td></tr>
          <tr><td style="padding: 8px; font-weight: bold;">Payment Frequency</td><td style="padding: 8px;">${data.payment_freq}</td></tr>
        </table>
        <a href="${data.app_url}" style="display: inline-block; padding: 12px 24px; background: #2563eb; color: white; text-decoration: none; border-radius: 6px;">Review Offer</a>
      </div>
    `
  }),

  // 4. Merchant accepts offer → lender + sales rep
  offerAccepted: (data: {
    recipient_name: string
    business_name: string
    amount: number
    app_url: string
  }) => ({
    subject: `Offer Accepted — ${data.business_name}`,
    html: `
      <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 24px;">
        <h2>Offer Accepted</h2>
        <p>Hi ${data.recipient_name},</p>
        <p>${data.business_name} has accepted the offer of <strong>$${data.amount.toLocaleString()}</strong>.</p>
        <p>Please log in to proceed with the next steps.</p>
        <a href="${data.app_url}" style="display: inline-block; padding: 12px 24px; background: #16a34a; color: white; text-decoration: none; border-radius: 6px;">View Deal</a>
      </div>
    `
  }),

  // 5. Stipulation requested → merchant
  stipulationRequested: (data: {
    merchant_name: string
    description: string
    lender_name: string
    app_url: string
  }) => ({
    subject: `Action Required: Additional Documents Needed`,
    html: `
      <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 24px;">
        <h2>Additional Documents Requested</h2>
        <p>Hi ${data.merchant_name},</p>
        <p>${data.lender_name} has requested additional documentation before proceeding with your application.</p>
        <div style="background: #f3f4f6; padding: 16px; border-radius: 6px; margin: 16px 0;">
          <strong>What's needed:</strong>
          <p style="margin: 8px 0 0;">${data.description}</p>
        </div>
        <a href="${data.app_url}" style="display: inline-block; padding: 12px 24px; background: #2563eb; color: white; text-decoration: none; border-radius: 6px;">Upload Documents</a>
      </div>
    `
  }),

  // 6. Contract sent → merchant
  contractSent: (data: {
    merchant_name: string
    business_name: string
    app_url: string
  }) => ({
    subject: `Your Contract is Ready — ${data.business_name}`,
    html: `
      <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 24px;">
        <h2>Contract Ready for Review</h2>
        <p>Hi ${data.merchant_name},</p>
        <p>Your funding contract for <strong>${data.business_name}</strong> is ready for your review and signature.</p>
        <p>Please log in to review the contract details.</p>
        <a href="${data.app_url}" style="display: inline-block; padding: 12px 24px; background: #2563eb; color: white; text-decoration: none; border-radius: 6px;">Review Contract</a>
      </div>
    `
  }),

  // 7. Deal funded → merchant + sales rep + admin
  dealFunded: (data: {
    recipient_name: string
    business_name: string
    amount: number
    app_url: string
  }) => ({
    subject: `🎉 Funded: ${data.business_name}`,
    html: `
      <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 24px;">
        <h2 style="color: #16a34a;">Deal Funded!</h2>
        <p>Hi ${data.recipient_name},</p>
        <p><strong>${data.business_name}</strong> has been successfully funded for <strong>$${data.amount.toLocaleString()}</strong>.</p>
        <a href="${data.app_url}" style="display: inline-block; padding: 12px 24px; background: #16a34a; color: white; text-decoration: none; border-radius: 6px;">View Deal</a>
      </div>
    `
  }),
}
```

---

## Step 4 — Create Email Send Utility

Create `src/lib/send-email.ts`:

```ts
import { resend, FROM } from './email'
import { templates } from './email-templates'

// Wrapper that catches errors so a failed email never crashes the app
async function send(to: string | string[], subject: string, html: string) {
  try {
    await resend.emails.send({
      from: FROM,
      to: Array.isArray(to) ? to : [to],
      subject,
      html,
    })
  } catch (err) {
    // Log but never throw — email failure should not block the main operation
    console.error('[email] Failed to send:', subject, err)
  }
}

// One exported function per email trigger
// Each function builds the template and calls send()

export async function sendNewMerchantAlert(params: {
  rep_email: string
  rep_name: string
  business_name: string
  requested_amount: number
  app_url: string
}) {
  const t = templates.newMerchant(params)
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
  app_url: string
}) {
  const t = templates.lenderNotification({ ...params, lender_name: params.lender_name })
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
  app_url: string
}) {
  const t = templates.offerReceived(params)
  await send(params.recipient_email, t.subject, t.html)
}

export async function sendOfferAccepted(params: {
  recipient_email: string
  recipient_name: string
  business_name: string
  amount: number
  app_url: string
}) {
  const t = templates.offerAccepted(params)
  await send(params.recipient_email, t.subject, t.html)
}

export async function sendStipulationRequested(params: {
  merchant_email: string
  merchant_name: string
  description: string
  lender_name: string
  app_url: string
}) {
  const t = templates.stipulationRequested(params)
  await send(params.merchant_email, t.subject, t.html)
}

export async function sendContractSent(params: {
  merchant_email: string
  merchant_name: string
  business_name: string
  app_url: string
}) {
  const t = templates.contractSent(params)
  await send(params.merchant_email, t.subject, t.html)
}

export async function sendDealFunded(params: {
  recipients: { email: string; name: string }[]
  business_name: string
  amount: number
  app_url: string
}) {
  for (const r of params.recipients) {
    const t = templates.dealFunded({
      recipient_name: r.name,
      business_name: params.business_name,
      amount: params.amount,
      app_url: params.app_url,
    })
    await send(r.email, t.subject, t.html)
  }
}
```

---

## Step 5 — Wire Email Triggers Into Routes

Find and update each route where these events happen. Import the relevant send function and call it after the database operation succeeds. Never await email before returning the response — fire and forget is fine since send() already catches errors.

### Trigger 1 — New merchant submitted
File: `src/routes/merchants/index.ts` POST handler

After merchant is created and if `assigned_rep_id` is set:
```ts
// fetch the rep's email from users table
// then fire:
sendNewMerchantAlert({
  rep_email: rep.email,
  rep_name: rep.full_name,
  business_name: merchant.business_name,
  requested_amount: merchant.requested_amount,
  app_url: process.env.BETTER_AUTH_URL ?? 'http://localhost:3000'
})
```

### Trigger 2 — Lenders notified
File: `src/routes/matching/notify.ts` POST handler

After `notified_at` is updated for all matches, send one email per matched lender:
```ts
for (const match of matches) {
  sendLenderNotification({
    lender_email: match.lender.contact_email,
    lender_name: match.lender.contact_name ?? match.lender.company_name,
    business_name: merchant.business_name,
    industry: merchant.industry,
    state: merchant.state,
    monthly_revenue: merchant.monthly_revenue,
    requested_amount: merchant.requested_amount,
    current_positions: merchant.current_positions,
    app_url: process.env.BETTER_AUTH_URL ?? 'http://localhost:3000'
  })
}
```

### Trigger 3 — Lender submits offer
File: `src/routes/offers/index.ts` POST handler

After offer is created, send to merchant and to the assigned sales rep:
```ts
// fetch merchant, merchant's user email, rep email
// send to merchant:
sendOfferReceived({ recipient_email: merchant_user.email, recipient_name: ..., ... })
// send to rep:
sendOfferReceived({ recipient_email: rep.email, recipient_name: rep.full_name, ... })
```

### Trigger 4 — Merchant accepts offer
File: `src/routes/offers/[id].ts` PATCH handler (accept branch)

After offer status set to accepted:
```ts
// fetch lender contact email, rep email
sendOfferAccepted({ recipient_email: lender.contact_email, ... })
sendOfferAccepted({ recipient_email: rep.email, ... })
```

### Trigger 5 — Stipulation requested
File: `src/routes/stipulations/index.ts` POST handler

After stipulation inserted:
```ts
// fetch merchant user email, merchant full_name, lender company_name
sendStipulationRequested({
  merchant_email: ...,
  merchant_name: ...,
  description: stipulation.description,
  lender_name: lender.company_name,
  app_url: ...
})
```

### Trigger 6 — Contract sent (status = 'contract sent')
File: `src/routes/merchants/[id].ts` PATCH handler

When new status is `contract sent`:
```ts
sendContractSent({
  merchant_email: merchant_user.email,
  merchant_name: merchant_user.full_name,
  business_name: merchant.business_name,
  app_url: ...
})
```

### Trigger 7 — Deal funded (status = 'FUNDED')
File: `src/routes/merchants/[id].ts` PATCH handler

When new status is `FUNDED`:
```ts
// fetch merchant user, rep, and admin emails
sendDealFunded({
  recipients: [
    { email: merchant_user.email, name: merchant_user.full_name },
    { email: rep.email, name: rep.full_name },
    { email: admin.email, name: admin.full_name },
  ],
  business_name: merchant.business_name,
  amount: accepted_offer.amount,
  app_url: ...
})
```

For the funded email, fetch the accepted offer amount from the `offers` table where `merchant_id = id` and `status = 'accepted'`.

To get the admin email, query `users` where `role = 'admin'` and take the first result.

---

## Step 6 — Add EMAIL_FROM to env

Add to `.env.local`:

```env
EMAIL_FROM=noreply@<human's domain>
```

Read the domain from what the human has already configured in Resend. If unsure, ask before writing this value.

Also add `EMAIL_FROM` to the list of required env vars checked at startup.

---

## Step 7 — Verify

```bash
bun add resend
bun run tsc --noEmit
bun run build
```

Manual smoke tests — use real email addresses you control:
- [ ] Submit a new merchant as admin → assigned rep receives email
- [ ] Move merchant to `sent to lender`, run matching, click Notify Lenders → matched lenders receive emails
- [ ] Create an offer as lender → merchant and rep receive offer email
- [ ] Accept offer as merchant → lender and rep receive acceptance email
- [ ] Request stipulation as lender → merchant receives email
- [ ] Move merchant to `contract sent` → merchant receives email
- [ ] Move merchant to `FUNDED` → merchant, rep, and admin all receive funded email
- [ ] TypeScript clean, build passing
- [ ] A failed email send does NOT crash the route — test by temporarily using a bad API key, confirm the route still returns 200

---

## Hard Rules

1. **Email failures never crash the app** — the `send()` wrapper catches all errors and logs them. Never let an email failure block a database operation or return an error to the frontend
2. **Never hardcode the from address** — always read from `process.env.EMAIL_FROM`
3. **Never hardcode the app URL** — always read from `process.env.BETTER_AUTH_URL`
4. **Fire and forget** — do not await email sends before returning the API response. Start the send, return the response, let it finish in the background
5. **No `any` types**
6. **Use Bun for installs**
7. **Do not change any UI** — this phase is backend only

---

## Done When

- [ ] `bun add resend` complete
- [ ] `src/lib/email.ts` created
- [ ] `src/lib/email-templates.ts` created
- [ ] `src/lib/send-email.ts` created
- [ ] `EMAIL_FROM` added to `.env.local`
- [ ] All 7 email triggers wired into their routes
- [ ] `bun run tsc --noEmit` passes clean
- [ ] `bun run build` passes clean
- [ ] All smoke tests pass
- [ ] Failed email does not crash the route

When done, print a summary of every file created or modified and which triggers are live.
