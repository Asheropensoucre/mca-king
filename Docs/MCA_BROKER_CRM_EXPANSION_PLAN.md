# MCA King — Broker CRM Expansion Plan

_Last updated: 2026-05-13_

## Purpose

This document captures what is still missing for MCA King to become a complete database-backed CRM for brokers in the merchant cash advance industry.

MCA King already has the operating spine of the platform:

- Auth and role-based dashboards
- Merchant intake
- Lender/funder profiles
- Leads
- Documents and stipulations
- Lender/funder offers and approvals
- Server-side matching
- 12-step Kamba pipeline
- Email automation
- MCA King Assistant
- Supabase-backed routes and storage

The next stage is to turn the broker-centered workflow platform into a full daily operating CRM for MCA brokerage teams. That means adding activity history, tasks, funded deal records, broker revenue, internal sales rep commissions, merchant-file submission outcomes, search, renewals, reporting, and compliance controls.

---


## Correct Business Model and Role Definitions

MCA King is a **broker-shop CRM**, not a lender-originated deal marketplace.

| Role | Correct meaning |
|---|---|
| Admin | Broker shop owner or operator. Owns the brokerage workspace, manages reps, merchants, lender/funder relationships, matching, submissions, pipeline, reporting, broker revenue, and internal rep commissions. |
| Sales Rep | Internal broker-shop rep. Works leads and assigned merchant files on behalf of the broker shop. |
| Merchant | Funding customer/applicant. Submits applications, uploads documents, responds to stipulations, and reviews offers. |
| Lender/Funder | External or partner funding user. Reviews broker-submitted or broker-matched merchant files, approves/declines, requests stipulations, and sends offers. Lenders do **not** submit merchant deals into this CRM. |

Important terminology:

- **Merchant file / deal**: originated by the broker shop from a merchant application or converted lead.
- **Lender match**: a suggested or manually selected lender/funder for a merchant file.
- **Merchant-file submission**: an outbound broker-shop submission of a merchant file/package to a lender/funder for review. This may also be called broker-to-lender submission in UI copy, but it is never a lender-created deal.
- **Lender/funder response**: approval, decline, stipulation request, no response, or offer.
- **Lender relationship manager / lender-side account/relationship manager**: a contact at the lender/funder company who manages the broker relationship. This person is not a commission recipient in MCA King and does not submit deals into the CRM.

---

## Current Product Baseline

### Already implemented

| Area | Current status |
|---|---|
| Auth | Email/password login, user roles, session-cookie flow, Better Auth-compatible schema |
| Roles | Admin/broker owner, sales rep, merchant, lender/funder reviewer |
| Merchant intake | Multi-step application form, owners, agreements, signature, documents |
| Lender/funder setup | Lender/funder profile and criteria form |
| Leads | Lead list, notes, assignment, conversion to merchant |
| Pipeline | 12-step Kamba pipeline with drag-and-drop and fullscreen step/card views |
| Matching | Broker-controlled auto/manual lender matching with unique lender-match records |
| Documents | Supabase Storage uploads, signed URLs, doc panel |
| Stipulations | Lenders/funders or broker admins can request docs; merchant can upload fulfillment |
| Offers | Lenders/funders respond to broker-submitted files with approvals/offers; merchants accept/reject offers |
| Email | Resend triggers for major workflow events |
| AI | MCA King Assistant with user/page context |
| Theme | Corporate Tech light/dark theme |

### Core limitation

MCA King currently manages the **deal workflow** well. It does not yet fully manage the broker's daily CRM work, revenue, follow-ups, lender outcomes, renewal cycles, or compliance/audit requirements.

---

## Executive Summary: What Is Missing

The highest-value missing modules are:

1. Activity timeline across merchants, leads, lenders, offers, docs, and users
2. Tasks and follow-up reminders
3. Funding records as first-class entities
4. Funded-deal records, broker revenue receivable from lenders/funders, and internal sales rep commission tracking
5. Outbound merchant-file submission tracking beyond simple matches
6. Search, filters, and saved views
7. Renewal/refinance tracking
8. Rich offer and contract management
9. Document review/checklist workflows
10. Compliance, audit, and sensitive-data controls

Recommended build order:

```txt
Phase A — Activity + Tasks ✅ complete
Phase A.1 — Lender Offer Visibility + Data Isolation ✅ complete
Phase B — Funded Deals + Broker Revenue + Sales Rep Commissions ✅ complete
Phase C — Merchant-File Submissions ✅ complete
Phase D — Search, Filters, Saved Views ✅ complete
Phase E — Renewals / Refinance
Phase F — Reporting
Phase G — Compliance + Audit Hardening
Phase H — Advanced Communications
```

---

# Phase A — CRM Activity + Tasks

## Goal

Turn MCA King into a daily CRM where reps and admins know exactly what happened, what needs to happen next, and who owns each follow-up.

## Why this matters

A broker CRM without tasks and activity history is just a pipeline. Brokers need to see:

- Last call
- Last note
- Last status change
- Last email
- Last document upload
- Next follow-up
- Who owns the next action

## Implemented database tables

### `activities`

Universal immutable event feed.

```sql
id              uuid primary key default gen_random_uuid()
entity_type     text not null -- lead | merchant | lender | offer | document | stipulation | user | funding
entity_id       uuid not null
user_id         uuid references users(id)
activity_type   text not null -- note | call | email | status_change | upload | match | offer | task | system
body            text
metadata        jsonb default '{}'::jsonb
created_at      timestamptz default now()
```

Recommended indexes:

```sql
create index activities_entity_idx on activities(entity_type, entity_id, created_at desc);
create index activities_user_idx on activities(user_id, created_at desc);
create index activities_type_idx on activities(activity_type, created_at desc);
```

### `tasks`

Follow-up and reminder system.

```sql
id              uuid primary key default gen_random_uuid()
assigned_to     uuid references users(id)
created_by      uuid references users(id)
entity_type     text not null -- lead | merchant | lender | funding
entity_id       uuid not null
title           text not null
description     text
priority        text default 'normal' -- low | normal | high | urgent
status          text default 'open' -- open | completed | cancelled
due_at          timestamptz
completed_at    timestamptz
created_at      timestamptz default now()
updated_at      timestamptz default now()
```

Recommended indexes:

```sql
create index tasks_assigned_status_due_idx on tasks(assigned_to, status, due_at);
create index tasks_entity_idx on tasks(entity_type, entity_id);
```

## Backend/API work implemented

Created routes:

```txt
GET    /api/activities?entity_type=&entity_id=
POST   /api/activities
GET    /api/tasks
POST   /api/tasks
PATCH  /api/tasks/:id
DELETE /api/tasks/:id
```

Add activity writes when:

- Lead created
- Lead note added
- Lead converted
- Merchant created
- Merchant status changes
- Sales rep assigned/reassigned
- Document uploaded/deleted
- Stipulation requested/fulfilled
- Match added/removed
- Lender notified
- Offer created/accepted/rejected
- Contract sent/signed
- Deal funded

## Frontend work

Add shared components:

```txt
components/dashboards/shared/ActivityTimeline.tsx
components/dashboards/shared/TaskPanel.tsx
components/dashboards/shared/CreateTaskModal.tsx
```

Add to:

- Lead detail modal
- Merchant detail view
- Merchant dashboard
- Admin dashboard selected merchant view
- Sales rep selected deal view

## Acceptance criteria

- Every merchant has an activity feed.
- Every lead has an activity feed.
- Reps can create and complete tasks.
- Admin can view all tasks.
- Sales reps see only assigned/created tasks.
- Tasks appear in dashboard overview.
- Important workflow actions automatically write activities.

---

# Phase A.1 — Lender Offer Visibility + Data Isolation ✅ COMPLETE

## Goal

Harden offer visibility before building new money/revenue modules. Lenders/funders must be able to review merchant files submitted or matched to them and create their own offers, but they must **not** see competing lenders' offers, terms, names, notes, acceptance status, or contract details.

## Correct visibility rule

```txt
Admin: sees all offers for all merchant files.
Assigned sales rep: sees all offers for assigned merchant files.
Merchant: sees all offers on their own merchant file.
Lender/funder: sees only offers created by that same lender/funder profile.
```

If a merchant receives two offers from two lenders/funders, the merchant, admin, and assigned sales rep can compare both offers. Each lender/funder can only see their own offer and generic file status appropriate to their relationship with that merchant file.

## Why this matters

Competing lender/funder offers are confidential. A lender should not know another lender's:

- Offer amount
- Factor rate
- Term
- Payment frequency
- Notes
- Lender name/contact
- Accepted/declined outcome, except for generic not-selected/current-file-status messaging where appropriate
- Contract/signing/funding details unless it is that lender's accepted/funded deal

This is both a workflow requirement and a security requirement. UI hiding is not enough; the API must not return competing offer data to lender users.

## Backend/API work

Harden merchant and offer serialization for lender users:

```txt
GET /api/merchants
GET /api/merchants/:id, if lender detail access is enabled later
GET /api/offers
POST /api/offers
PATCH /api/offers/:id
/api/ai/chat context data
```

Required server-side behavior:

1. Resolve the current lender user's `lenders.id` from `lenders.user_id`.
2. Only return merchant files matched/submitted to that lender/funder.
3. When returning merchant records to a lender, sanitize `merchant.offers` so it only contains offers where `offer.lenderId === currentLender.id`.
4. Do not include competing offers inside `payload`, nested merchant data, activity metadata, AI context, or dashboard bootstrap data.
5. Keep `/api/offers` filtered by current lender for lender users.
6. Do not let a lender create or update an offer for another lender profile.
7. Do not let a lender infer another lender's offer details from accepted/declined status, contract documents, activity text, or generated summaries.

## Frontend work

Update lender-facing UI so offer presentation is role-aware:

```txt
Lender dashboard: show "Your Offer" instead of all merchant offers.
Merchant detail view: for lender users, display only that lender's own offer or no offer yet.
Chatbot context for lender users: include only sanitized lender-visible offer data.
```

Admin, sales rep, and merchant views may continue to show all offers they are authorized to see.

## Acceptance criteria

- Merchant sees all offers on their own file.
- Admin sees all offers.
- Assigned sales rep sees all offers for assigned files.
- Lender/funder sees only offers where the offer belongs to that lender/funder profile.
- A lender/funder cannot see another lender's offer amount, terms, lender name, notes, accepted/declined status, or contract/funding details.
- Lender merchant-list API responses do not include competing offers in `merchant.payload.offers` or returned `offers` arrays.
- Lender AI/chat context does not include competing offers.
- Manual test with two lenders on the same merchant proves each lender only sees their own offer.

---

# Phase B — Funded Deals + Broker Revenue + Sales Rep Commissions ✅ COMPLETE

## Goal

Track the money correctly for a broker-shop workflow: funded deals, the lender/funder that funded each deal, the revenue owed by the lender/funder to the brokerage, internal sales rep payouts, and payment status.

## Important business-model clarification

MCA King is for the broker shop. The broker shop sources or converts the merchant file, submits it to lenders/funders, and gets paid by the lender/funder when a deal funds.

Lender-side account managers or relationship reps are contacts at the lender/funder company. They may manage the broker relationship and files from the lender side, but they are **not** commission recipients in this CRM and they do **not** submit deals into MCA King.

The money flow this phase should model is:

```txt
Merchant file funds with lender/funder
        ↓
Lender/funder owes revenue/commission to the broker shop
        ↓
Broker shop may owe an internal payout to the assigned sales rep
```

This phase should **not** create payout logic for lender-side contacts or lender-originated deal submission logic.

## Why this matters

MCA brokers care about funded volume, collected revenue, and rep payouts. Once a deal funds, the CRM must answer:

- How much funded?
- Which lender/funder funded it?
- What was the factor rate?
- What is the payback amount?
- What revenue/commission is owed by the lender/funder to the broker shop?
- Has the broker shop received that payment?
- Which internal sales rep gets credit?
- What sales rep payout is owed, approved, paid, adjusted, or clawed back?

## Implemented database tables

### `fundings`

One row per funded merchant file. This makes `FUNDED` financially meaningful instead of being only a pipeline status.

```sql
id                  uuid primary key default gen_random_uuid()
merchant_id          uuid references merchants(id) on delete cascade
lender_id            uuid references lenders(id)
offer_id             uuid references offers(id)
funded_amount        numeric not null
payback_amount       numeric
factor_rate          numeric
buy_rate             numeric
sell_rate            numeric
payment_frequency    text -- daily | weekly | biweekly | monthly
term_days            int
funded_at            timestamptz not null default now()
created_by           uuid references users(id)
notes                text
created_at           timestamptz default now()
updated_at           timestamptz default now()
```

### `broker_revenue`

Tracks money owed **to the broker shop** by the lender/funder.

```sql
id                      uuid primary key default gen_random_uuid()
funding_id              uuid references fundings(id) on delete cascade
merchant_id             uuid references merchants(id) on delete cascade
lender_id               uuid references lenders(id)
revenue_type            text default 'commission' -- commission | points | origination_fee | bonus | other
basis_amount            numeric                  -- usually funded amount or gross revenue basis
rate                    numeric
amount                  numeric not null
status                  text default 'expected'  -- expected | invoiced | received | short_paid | disputed | waived
expected_payment_date   date
received_at             timestamptz
notes                   text
created_at              timestamptz default now()
updated_at              timestamptz default now()
```

### `sales_rep_commissions`

Tracks internal broker-shop payouts owed to sales reps. This is separate from broker revenue because the lender/funder pays the brokerage, and the brokerage may then pay its rep according to internal rules.

```sql
id                  uuid primary key default gen_random_uuid()
funding_id           uuid references fundings(id) on delete cascade
sales_rep_id         uuid references users(id)
basis_type           text default 'broker_revenue' -- broker_revenue | funded_amount | flat
basis_amount         numeric
rate                 numeric
amount               numeric not null
status               text default 'unpaid' -- unpaid | approved | paid | adjusted | clawed_back | void
paid_at              timestamptz
notes                text
created_at           timestamptz default now()
updated_at           timestamptz default now()
```

## Backend/API work implemented

Created routes:

```txt
GET    /api/fundings
POST   /api/fundings
GET    /api/fundings/:id
PATCH  /api/fundings/:id
GET    /api/broker-revenue
POST   /api/broker-revenue
PATCH  /api/broker-revenue/:id
GET    /api/sales-rep-commissions
POST   /api/sales-rep-commissions
PATCH  /api/sales-rep-commissions/:id
```

When creating funding:

1. Validate admin or authorized sales rep.
2. Create `fundings` record.
3. Set merchant status to `FUNDED`.
4. Create status history.
5. Create activity event.
6. Trigger funded email.
7. Optionally create broker revenue receivable.
8. Optionally create internal sales rep commission record.

## Frontend work implemented

Added:

```txt
components/dashboards/shared/FundingModal.tsx
components/dashboards/shared/FundingSummary.tsx
components/dashboards/AdminFinanceView.tsx
```

Add admin sections:

```txt
Funded Deals
Broker Revenue
Sales Rep Commissions
```

## Acceptance criteria

- Admin can mark a merchant funded with actual funding details.
- Funding is stored separately from merchant status.
- Funded deal appears in reporting base data.
- Broker revenue owed by the lender/funder can be created and marked received/disputed/short-paid.
- Internal sales rep commission records can be created and marked approved/paid/adjusted/clawed back.
- No payout is created for lender-side account/relationship managers.
- Status becomes `FUNDED` only through funding workflow or admin-controlled status change.

---

# Phase C — Merchant-File Submission Tracking ✅ COMPLETE

## Goal

Track every outbound broker-shop merchant-file submission to lenders/funders, not just whether a lender was matched.

## Why this matters

`lender_matches` answers: “Who fits this file?”

A brokerage CRM also needs to know what happened after the broker shop sent the merchant file/package to each lender/funder:

- Which lender/funder received the file?
- Who at the broker shop submitted it?
- Who opened/responded?
- Who declined?
- Who asked for stips?
- Which lender/funder responded with an approval or offer?
- Who has not responded?

## Implemented database table

### `merchant_file_submissions`

This represents **broker-shop outbound submissions of merchant files to lenders/funders**. It is not a lender-created deal and it is not a deal submitted by a lender to the broker.

```sql
id                  uuid primary key default gen_random_uuid()
merchant_id          uuid references merchants(id) on delete cascade
lender_id            uuid references lenders(id)
match_id             uuid references lender_matches(id)
submitted_by         uuid references users(id)
submitted_at         timestamptz default now()
status               text default 'submitted'
-- submitted | viewed | no_response | declined | offer_received | stips_requested | withdrawn
response_at          timestamptz
decline_reason       text
package_version      int default 1
notes                text
created_at           timestamptz default now()
updated_at           timestamptz default now()
```

Recommended unique index:

```sql
create unique index merchant_file_submissions_unique_active
on merchant_file_submissions(merchant_id, lender_id, package_version);
```

## Backend/API work implemented

Created routes:

```txt
GET    /api/merchant-file-submissions?merchant_id=
POST   /api/merchant-file-submissions
PATCH  /api/merchant-file-submissions/:id
```

Updated `/api/matching/notify`:

- When the broker shop notifies/submits to lenders, create or update `merchant_file_submissions` rows.
- Set `status = submitted`.
- Store `submitted_at`.

Updated offer route:

- When a lender/funder responds with an offer or approval, set the corresponding merchant-file submission to `offer_received`.

Updated stipulation route:

- When a lender/funder requests stips, set the corresponding merchant-file submission to `stips_requested`.

## Frontend work implemented

Added to merchant detail:

```txt
Merchant-File Submissions panel
```

Show:

- Lender/funder name
- Submission status
- Submitted date
- Response date
- Decline reason
- Offer link
- Notes

## Acceptance criteria

- Broker/admin can see every lender/funder this merchant file was submitted to.
- Broker can mark a lender/funder as declined/no response.
- Offer and stip requests update merchant-file submission status.
- Lender/funder response history remains even after status changes.
- UI copy makes clear that the broker shop submits the file to the lender/funder, not the other way around.

---

# Phase D — Search, Filters, and Saved Views ✅ COMPLETE

## Goal

Make the CRM usable when there are hundreds or thousands of records.

## Implemented

The app now has query-param filtering, pagination, global search, and reusable saved work queues for broker admins and internal sales reps.

## Implemented database tables

### `saved_views`

```sql
id              uuid primary key default gen_random_uuid()
user_id         uuid references users(id)
name            text not null
entity_type     text not null -- merchants | leads | lenders | tasks | fundings
filters         jsonb not null default '{}'::jsonb
sort            jsonb not null default '{}'::jsonb
is_shared       boolean default false
created_at      timestamptz default now()
updated_at      timestamptz default now()
```

## Backend/API work implemented

Added query params and pagination to list routes:

```txt
/api/merchants?search=&status=&rep_id=&state=&industry=&min_revenue=&max_revenue=&stale=
/api/leads?search=&status=&assigned_rep_id=
/api/lenders?search=&active=&industry=&state=
/api/tasks?status=&priority=&assigned_to=&due_before=&overdue=&entity_type=&entity_id=
/api/fundings?from=&to=&lender_id=&rep_id=
```

Created routes:

```txt
GET    /api/search?q=
GET    /api/saved-views
POST   /api/saved-views
PATCH  /api/saved-views/:id
DELETE /api/saved-views/:id
```

## Frontend work implemented

Added:

```txt
SearchBar.tsx
FilterBar.tsx
SavedViewsMenu.tsx
```

Wired into admin and sales rep dashboards, merchant/deal lists, lender list, and lead manager. Search result clicks open merchant/lender details or the lead manager, and pagination controls are present on filtered lists.

Seeded shared saved views:

- Needs Docs
- Offers Out
- Contract Sent
- Stale Deals
- Funded This Month
- Unassigned Leads
- Urgent Tasks
- Overdue Tasks

## Acceptance criteria

- Admin can search all merchants/leads/lenders. ✅
- Sales reps can search only allowed records. ✅
- Filters can be saved as reusable saved views. ✅
- Shared saved views can be created by admins and reused by reps. ✅
- Paginated list routes prevent unbounded list queries. ✅

---

# Phase E — Renewal / Refinance Module

## Goal

Capture post-funding revenue by tracking renewal eligibility and payoff/consolidation workflows.

## Why this matters

Renewals are one of the largest revenue sources in MCA. Brokers need a queue of merchants ready for renewal.

## Implemented database tables

### `renewals`

```sql
id                  uuid primary key default gen_random_uuid()
merchant_id          uuid references merchants(id) on delete cascade
funding_id           uuid references fundings(id)
eligibility_date     date
status               text default 'not_ready'
-- not_ready | eligible | contacted | application_started | submitted | renewed | declined
estimated_balance    numeric
payoff_amount        numeric
notes                text
assigned_rep_id      uuid references users(id)
created_at           timestamptz default now()
updated_at           timestamptz default now()
```

### `payoff_letters`

```sql
id                  uuid primary key default gen_random_uuid()
merchant_id          uuid references merchants(id) on delete cascade
funding_id           uuid references fundings(id)
funder_name          text
payoff_amount        numeric
expires_at           timestamptz
file_document_id     uuid references documents(id)
status               text default 'requested' -- requested | received | expired | used
created_at           timestamptz default now()
```

## Backend/API work implemented

Created routes:

```txt
GET    /api/renewals
POST   /api/renewals
PATCH  /api/renewals/:id
GET    /api/payoff-letters
POST   /api/payoff-letters
PATCH  /api/payoff-letters/:id
```

Add scheduled or computed renewal logic:

- Renewal eligible after configured days/months from funding.
- Merchant reapply grace logic should align with renewal/refi rules.

## Frontend work

Add dashboard sections:

```txt
Renewals
Payoff Letters
```

Add merchant view:

- Renewal eligibility card
- Payoff letter request/upload
- Renewal application CTA when eligible

## Acceptance criteria

- Admin/sales rep can view renewal-eligible merchants.
- Funded merchants can be contacted for renewals.
- Payoff letters can be tracked and linked to documents.

---

# Phase F — Reporting and Analytics

## Goal

Give brokerage owners visibility into volume, performance, bottlenecks, and revenue.

## Reports to build

### Pipeline reports

- Deals by current status
- Deals by rep
- Average time in each status
- Stale deals
- Conversion rate by status

### Sales reports

- Funded volume by date
- Funded volume by rep
- Funded volume by lender
- Average funded amount
- Close rate by rep
- Offer-to-funded rate

### Lead reports

- Lead count by source
- Lead conversion rate
- Time from lead to application
- Rep lead performance

### Lender reports

- Merchant-file submission count by lender/funder
- Approval/offer rate
- Decline rate
- Average response time
- Funded volume by lender

### Broker revenue and sales rep commission reports

- Broker revenue expected from lenders/funders
- Broker revenue received
- Short-paid/disputed receivables
- Internal sales rep commissions payable
- Internal sales rep commissions paid
- Unpaid sales rep commission aging
- Sales rep clawbacks/adjustments

## Backend/API work implemented

Created routes:

```txt
GET /api/reports/pipeline
GET /api/reports/funding
GET /api/reports/leads
GET /api/reports/lenders
GET /api/reports/broker-revenue
GET /api/reports/sales-rep-commissions
```

## Frontend work

Add admin section:

```txt
Reports
```

Add chart/table components:

```txt
ReportCard.tsx
PipelineAgingReport.tsx
FundingVolumeReport.tsx
RepPerformanceReport.tsx
LenderPerformanceReport.tsx
BrokerRevenueReport.tsx
SalesRepCommissionReport.tsx
```

## Acceptance criteria

- Admin can see funded volume.
- Admin can see close rates.
- Admin can see stale pipeline deals.
- Admin can see broker revenue receivables and internal sales rep commission liability.

---

# Phase G — Compliance, Audit, and Sensitive Data Hardening
> Detailed customer-data readiness checklist: see [`PRODUCTION_SECURITY_HARDENING_PLAN.md`](PRODUCTION_SECURITY_HARDENING_PLAN.md).


## Goal

Protect sensitive merchant data and provide auditability.

## Why this matters

MCA applications contain sensitive data:

- SSNs
- DOBs
- Tax IDs
- Signatures
- Bank statements
- Business financials
- Owner personal data

## New/expanded tables

### `audit_logs`

```sql
id              uuid primary key default gen_random_uuid()
user_id         uuid references users(id)
action          text not null
entity_type     text
entity_id       uuid
ip_address      text
user_agent      text
metadata        jsonb default '{}'::jsonb
created_at      timestamptz default now()
```

## Events to audit

- Login
- Failed login
- Logout
- Role change
- User created/disabled
- Merchant viewed
- Document downloaded
- Document deleted
- SSN/PII viewed
- Offer edited
- Funding edited
- Commission edited

## Security improvements

- Mask SSN by default.
- Store only last4 where possible.
- Restrict full PII to admin or explicitly permitted users.
- Log document signed URL generation.
- Log document delete/download actions.
- Add disabled users/session revocation.
- Add rate limits on auth routes.

## Acceptance criteria

- Sensitive actions produce audit logs.
- PII is masked in normal views.
- Admin can review user/document access history.

---

# Phase H — Advanced Communications

## Goal

Move beyond automated emails into a true communication center.

## Features

- Manual email from CRM
- SMS integration
- Call logging
- Email templates editable by admins
- Inbound reply capture
- Conversation history per merchant/lead
- Bulk email/SMS for selected records

## New tables

### `message_templates`

```sql
id              uuid primary key default gen_random_uuid()
name            text not null
channel         text not null -- email | sms
subject         text
body            text not null
variables       text[] default '{}'
created_by      uuid references users(id)
created_at      timestamptz default now()
updated_at      timestamptz default now()
```

### `communications`

```sql
id              uuid primary key default gen_random_uuid()
entity_type     text not null
entity_id       uuid not null
channel         text not null -- email | sms | call
from_user_id    uuid references users(id)
to_contact      text
subject         text
body            text
status          text default 'sent'
provider_id     text
metadata        jsonb default '{}'::jsonb
created_at      timestamptz default now()
```

## Acceptance criteria

- Users can send manual emails from merchant/lead views.
- Admins can edit templates without code changes.
- Communications show in the activity timeline.

---

# Additional Product Gaps

## Contact model

Current contacts are embedded in merchant owners and lender profile fields. A CRM should eventually have first-class contacts.

```txt
contacts
contact_links
```

Supports:

- Multiple lender contacts
- Multiple merchant contacts
- Preferred contact method
- Do-not-contact flags
- Contact-level notes

## Lead source and marketing attribution

Add to leads:

- Source
- Campaign
- UTM fields
- Referral partner
- Lead cost
- Lead quality

This enables ROI reporting.

## Duplicate detection

Detect duplicates by:

- Business legal name
- DBA
- Tax ID
- Owner email
- Owner phone
- Business phone
- Address

Duplicate warnings should appear on lead creation and merchant submission.

## Rich offer model

Expand offers with:

- Factor rate
- Buy rate
- Sell rate
- RTR/payback
- Daily/weekly payment
- Payment frequency
- Position
- Fees
- Expiration date
- Offer PDF/document
- Stips required

## Contract management

Add true contract records:

```txt
contracts
contract_events
```

Track:

- Contract document
- Sent timestamp
- Signed timestamp
- Signer IP
- Version
- Declined reason

## Document review workflow

Add:

- Document status
- Reviewed by
- Reviewed at
- Rejection reason
- Month/year for bank statements
- Required checklist

## User management

Admin should be able to:

- Create any user role
- Disable users
- Reset passwords
- Change role
- Revoke sessions
- View user activity

## Organization model

Only needed if MCA King becomes multi-tenant.

```txt
organizations
organization_members
```

Supports multiple broker shops in one app.

---

# Recommended Implementation Order

## Phase A status: complete

Activity timelines and tasks have been built. The next immediate phase should be a security/workflow hardening pass for lender offer visibility before adding funded-deal revenue modules.

### Step A1 — Database

Create:

```txt
activities
tasks
```

### Step A2 — Routes

Create:

```txt
src/routes/activities/index.ts
src/routes/tasks/index.ts
src/routes/tasks/[id].ts
```

Register routes in:

```txt
src/server/api.ts
```

### Step A3 — Shared helpers

Create:

```txt
src/lib/activity.ts
src/lib/tasks.ts
```

### Step A4 — UI

Create:

```txt
components/dashboards/shared/ActivityTimeline.tsx
components/dashboards/shared/TaskPanel.tsx
components/dashboards/shared/CreateTaskModal.tsx
```

### Step A5 — Integrations

Write activity events from current routes:

- merchant create/update
- lead create/update/convert/note
- document upload/delete
- stipulation create/fulfill
- matching run/manual/notify
- offer create/update
- funding status changes

### Step A6 — Dashboards

Add:

- My Tasks panel for sales reps
- All Tasks panel for admins
- Merchant activity tab/panel
- Lead activity tab/panel

---

## Phase A.1 status: complete

Lender offer privacy hardening has been built before Phase B.

Why this was required:

- Lenders/funders are competitors on the same merchant file.
- Merchant/admin/assigned rep can compare offers, but each lender/funder must only see its own offer.
- This prevents leaking competing offer amounts, terms, statuses, notes, contract details, or funding outcomes.
- It closes a record-level authorization gap before more revenue/funding features are added.

---

## Phase B status: complete

Funded deals, broker revenue, and internal sales rep commissions have been built.

Completed:

- Created `fundings`, `broker_revenue`, and `sales_rep_commissions` tables with RLS enabled and public-block policies.
- Added funding, broker revenue, and sales rep commission API routes.
- Added Mark Funded workflow from merchant detail.
- Added funding summary cards on merchant detail for admin/sales rep users.
- Added admin Finance section for funded deals, broker revenue, and sales rep commission tracking.
- Kept merchants and lenders blocked from broker finance routes.
- Kept sales reps limited to assigned funded deals and their own commission records.
- Did not create referral partner, ISO payout, outside broker payout, or lender-side manager payout logic.

---

## Phase C status: complete

Merchant-file submissions have been built.

Completed:

- Created `merchant_file_submissions` with RLS enabled and public-block policy.
- Added `GET /api/merchant-file-submissions`, `POST /api/merchant-file-submissions`, and `PATCH /api/merchant-file-submissions/:id`.
- Updated Notify Lenders to create/update merchant-file submission rows.
- Updated offer creation to mark that lender/funder submission as `offer_received`.
- Updated stipulation requests to mark that lender/funder submission as `stips_requested`.
- Added Merchant-File Submissions panel to merchant detail for admin/sales rep users.
- Enforced lender/funder privacy so lenders can only see their own submission row if the API is called directly.
- Did not create lender-originated deal submission, referral partner, outside broker, or ISO payout concepts.

---

# Success Definition

MCA King becomes a complete MCA broker CRM when it can answer these questions without manual spreadsheets:

1. What deals need follow-up today?
2. Who touched this merchant last?
3. Which lenders received this file?
4. Which lenders declined, did not respond, or sent offers?
5. Which merchants need documents?
6. Which contracts are unsigned?
7. Which deals funded this month?
8. How much broker revenue is owed by lenders/funders, and what internal sales rep commissions are owed?
9. Which funded merchants are renewal eligible?
10. Which reps, lenders, and merchant files are performing best?

---

# Summary

MCA King has the workflow foundation. The next product layer should focus on CRM operations and revenue tracking:

```txt
Activity + Tasks ✅ complete
Lender Offer Visibility + Data Isolation ✅ complete
Funded Deals + Broker Revenue + Sales Rep Commissions ✅ complete
Merchant-File Submissions ✅ complete
Search + Saved Views ✅ complete
Renewals
Reports
Compliance/Audit
Communications
```

That is the path from a strong workflow platform to a serious MCA brokerage CRM.
