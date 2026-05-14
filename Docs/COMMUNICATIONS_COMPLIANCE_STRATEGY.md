# MCA King Communications Compliance Strategy

_Last updated: 2026-05-14_

## Decision

MCA King should build communications in an **email-first, SMS-later** order.

```txt
Use Resend for app/campaign email.
Keep Zoho Mail for normal human mailbox hosting.
Do not use Zoho Mail SMTP for bulk/campaign sending.
Do not build live SMS sending until there is budget/client demand and A2P 10DLC/provider compliance is ready.
```

The implemented communications phase is:

```txt
Phase I — Email-First Communications Center + Compliant Campaign Foundation ✅ complete
```

This avoids expensive SMS setup too early while still building the correct consent, suppression, template, provider-abstraction, and webhook architecture needed for future SMS.

---

## Current Infrastructure

| Area | Current state | Direction |
|---|---|---|
| App hosting | Vercel | Continue |
| Database/storage | Supabase | Continue |
| Auth/session | Better Auth-compatible tables + custom HTTP-only session cookie | Continue |
| Mailbox/domain email | Zoho Mail | Human inboxes only |
| App outbound email | Resend | Transactional and controlled campaign email |
| SMS | Not selected | Wait; prepare database/consent foundation only |

---

## Core Rule

Do not build or describe campaign tools as "blasting."

Use safer product language:

```txt
campaign
selected recipients
nurture email
follow-up sequence
recipient preview
suppression check
send batch
```

Every send workflow should answer before sending:

```txt
Who are we sending to?
Do we have the right to contact them?
Are they unsubscribed/suppressed?
Is this transactional or marketing/campaign?
Does the message include required opt-out language?
Are we within provider/rate limits?
Will this damage domain/carrier reputation?
```

---

## Email Strategy

### Transactional Email

Transactional emails are expected service/workflow messages, such as:

```txt
password reset
account/security notifications
document request
merchant application status update
stipulation request
offer/approval notification
contract/funding workflow notification
```

Transactional email can continue through Resend.

### Campaign / Marketing Email

Campaign emails include:

```txt
lead follow-up campaigns
merchant nurture campaigns
renewal marketing
"funding available" outreach
bulk selected-recipient emails
```

Campaign email must enforce:

```txt
clear sender identity
honest subject line
physical mailing address/footer
unsubscribe link
suppression list check
bounce/complaint handling
reasonable rate limits/batching
```

### Zoho Mail Rule

Zoho Mail should remain for:

```txt
admin/sales rep inboxes
human-to-human business email
normal mailbox hosting
```

Zoho Mail should not be used for app bulk/campaign sends because that can risk mailbox/domain reputation and workspace restrictions.

### Resend Rule

Resend should be used through a provider abstraction, not scattered API calls.

Recommended later separation:

```txt
transactional sender/subdomain: app.example.com or notifications.example.com
campaign sender/subdomain: mail.example.com or go.example.com
```

This protects transactional deliverability if campaign traffic receives complaints or bounces.

---

## SMS Strategy

### Decision: Wait on Live SMS

Live SMS sending should wait.

Reasons:

```txt
SMS has recurring provider and carrier costs.
US business SMS usually requires A2P 10DLC registration.
A2P approval requires business identity, use case, sample messages, opt-in proof, privacy policy, and terms.
Marketing SMS requires documented consent.
Cold SMS to imported/purchased/scraped leads is high-risk and should not be allowed.
STOP/HELP handling must be automatic.
Quiet hours and rate limits must be enforced.
```

### What Phase I Can Build Now

Build SMS readiness without sending:

```txt
sms_opt_in default false
sms_opt_out
sms_consent_source
sms_consent_text
sms_consent_ip
sms_consent_at
sms_opt_out_at
preferred_contact_method
do_not_contact
SMS disabled UI notice
server-side rejection for SMS send attempts
future provider abstraction interface
```

### What Must Exist Before SMS Activation

Before enabling live SMS:

```txt
chosen SMS provider
approved A2P 10DLC brand/campaign or equivalent required registration
verified business identity/EIN or approved sole-proprietor path
published privacy policy and terms with SMS language
lead capture forms with explicit SMS consent language
STOP/HELP inbound webhook handling
delivery receipt handling
quiet-hours scheduler
rate limiting based on provider/carrier throughput
budget approval for monthly and per-message costs
```

---

## SMS Provider Comparison

> Pricing changes often. Treat these as planning estimates from research, not final procurement quotes. Verify directly with each provider before buying numbers, registering campaigns, or enabling production SMS.

| Provider | Best fit | Approximate cost profile from research | Pros | Cons / cautions |
|---|---|---:|---|---|
| Telnyx | Cost-sensitive programmable SMS with strong network control | Around `$0.0040`/SMS segment base plus carrier fees; local numbers around `$1/mo` | Lower unit cost, direct carrier/network strength, STOP handling/webhooks, good for scale | More telecom concepts; may be less beginner-friendly than Twilio |
| Plivo | Balanced developer experience and cost | Around `$0.0050-$0.0077`/SMS segment; numbers around `$0.80/mo`; inbound often favorable | Good middle ground, developer-friendly, compliance dashboard, DND/STOP support | Smaller ecosystem than Twilio |
| Twilio | Industry-standard, fastest docs/ecosystem | Around `$0.0083`/SMS segment base plus carrier fees; local numbers around `$1.15/mo` | Best-known docs, broad ecosystem, strong compliance/webhooks, advanced opt-out | Usually more expensive; platform complexity |
| Zoho Voice | Human sales phone system / UCaaS | Research showed about `$0.009` outbound SMS inclusive-style credit pricing, but verify | Useful if reps need business calling/phone UI | Not ideal as first choice for automated campaign engine; webhook/STOP/API depth must be verified |

### A2P 10DLC Planning Costs

Research indicates common US A2P 10DLC costs may include:

```txt
brand registration / identity verification
standard vetting
campaign vetting
monthly campaign fee
phone number monthly fee
per-message provider fee
carrier surcharge per segment
```

Rough planning example from research:

```txt
initial registration/vetting can be around $60+ before meaningful sending
monthly campaign fees may range around $1.50 to $10+ per campaign/use case
carrier surcharges can nearly double advertised per-message cost depending on carrier and segment count
```

Do not commit to SMS until exact current provider fees are checked.

---

## Consent and Suppression Data Model

Phase I created/prepared tables for:

```txt
communication_preferences
global_suppressions
message_templates
campaigns
campaign_recipients
communications / communication_events
```

Minimum preference fields:

```txt
email_opt_in
email_opt_out
email_opt_out_at
sms_opt_in
sms_opt_out
sms_opt_out_at
sms_consent_source
sms_consent_text
sms_consent_ip
sms_consent_at
do_not_contact
preferred_contact_method
```

Suppression reasons should include:

```txt
unsubscribe
bounce
complaint
STOP
admin
do_not_contact
```

Important default:

```txt
Imported leads must default to sms_opt_in = false.
```

---

## Phase Path

### Phase I.1 — Foundation

```txt
communication preferences
consent fields
suppression list
message templates
provider abstraction
communication history
SMS disabled provider/interface
```

### Phase I.2 — Resend Email Campaigns

```txt
manual email
email templates
campaign drafts
recipient preview
unsubscribe links
suppression enforcement
small-batch sending/rate caps
Resend delivery/bounce/complaint webhooks
```

### Phase I.3 — SMS Readiness Only

```txt
SMS provider comparison
A2P checklist
SMS consent UI state
quiet-hours design
STOP/HELP webhook design
SMS disabled UI/server response
```

### Future Phase — SMS Activation

Only after budget/provider/compliance approval:

```txt
choose Telnyx, Plivo, Twilio, or another provider
complete A2P 10DLC registration
configure phone number/messaging profile
implement inbound SMS webhook
enable one-to-one SMS first
later consider limited SMS campaigns for explicitly opted-in contacts only
```

---

## Product Safety Requirements

The UI should:

```txt
show recipient preview before sending
show skipped/suppressed/missing-email counts
block campaign email without unsubscribe compliance
disable SMS buttons until provider/compliance is complete
avoid "blast" language
show clear compliance warnings for imported leads
```

The backend should:

```txt
check permissions server-side
check suppression server-side
record communication history
record campaign recipient status
write audit logs for sensitive campaign/template/suppression actions
reject SMS sending until enabled in a future phase
```
