# MCA King — Broker CRM Expansion Plan

_Last updated: 2026-05-12_

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

The next stage is to turn the broker-centered workflow platform into a full daily operating CRM for MCA brokerage teams. That means adding activity history, tasks, funded deal records, commissions, lender submission outcomes, search, renewals, reporting, and compliance controls.

---


## Correct Business Model and Role Definitions

MCA King is a **broker/ISO CRM**, not a lender-originated deal marketplace.

| Role | Correct meaning |
|---|---|
| Admin | Broker/ISO shop owner or operator. Owns the brokerage workspace, manages reps, merchants, lender/funder relationships, matching, submissions, pipeline, reporting, and commissions. |
| Sales Rep | Internal broker-shop rep. Works leads and assigned merchant files on behalf of the broker shop. |
| Merchant | Funding customer/applicant. Submits applications, uploads documents, responds to stipulations, and reviews offers. |
| Lender/Funder | External or partner funding user. Reviews broker-submitted or broker-matched merchant files, approves/declines, requests stipulations, and sends offers. Lenders do **not** submit merchant deals into this CRM. |

Important terminology:

- **Merchant file / deal**: originated by the broker shop from a merchant application or converted lead.
- **Lender match**: a suggested or manually selected lender/funder for a merchant file.
- **Lender submission**: an outbound broker-shop submission of a merchant file/package to a lender/funder for review.
- **Lender response**: approval, decline, stipulation request, no response, or offer.

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
4. Broker-shop, sales-rep, and optional referral/ISO commission tracking
5. Outbound broker-to-lender submission tracking beyond simple matches
6. Search, filters, and saved views
7. Renewal/refinance tracking
8. Rich offer and contract management
9. Document review/checklist workflows
10. Compliance, audit, and sensitive-data controls

Recommended build order:

```txt
Phase A — Activity + Tasks
Phase B — Funding + Commissions
Phase C — Lender Submissions
Phase D — Search, Filters, Saved Views
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

## New database tables

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

## Backend/API work

Create routes:

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

# Phase B — Funding + Commission Tracking

## Goal

Track the money: funded deals, revenue, commissions, rep payouts, ISO payouts, and payment status.

## Why this matters

MCA brokers care about funded volume and commissions. Once a deal funds, the CRM must answer:

- How much funded?
- Which lender funded it?
- What was the factor rate?
- What is the payback amount?
- What commission is owed?
- Was the commission paid?
- Which rep or ISO gets credit?

## New database tables

### `fundings`

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

### `isos`

Optional, if outside brokers/referral partners exist.

```sql
id              uuid primary key default gen_random_uuid()
name            text not null
contact_name    text
email           text
phone           text
status          text default 'active' -- active | paused | terminated
notes           text
created_at      timestamptz default now()
```

### `commission_plans`

```sql
id                  uuid primary key default gen_random_uuid()
name                text not null
plan_type           text not null -- flat | percent_funded | percent_revenue
rate                numeric not null
applies_to_role     text -- sales_rep | iso | broker
created_at          timestamptz default now()
```

### `deal_commissions`

```sql
id                  uuid primary key default gen_random_uuid()
funding_id           uuid references fundings(id) on delete cascade
recipient_user_id    uuid references users(id)
recipient_iso_id     uuid references isos(id)
commission_plan_id   uuid references commission_plans(id)
amount               numeric not null
status               text default 'unpaid' -- unpaid | approved | paid | clawed_back
paid_at              timestamptz
notes                text
created_at           timestamptz default now()
updated_at           timestamptz default now()
```

## Backend/API work

Create routes:

```txt
GET    /api/fundings
POST   /api/fundings
GET    /api/fundings/:id
PATCH  /api/fundings/:id
GET    /api/commissions
POST   /api/commissions
PATCH  /api/commissions/:id
```

When creating funding:

1. Validate admin or authorized sales rep.
2. Create `fundings` record.
3. Set merchant status to `FUNDED`.
4. Create status history.
5. Create activity event.
6. Trigger funded email.
7. Optionally create commission records.

## Frontend work

Add:

```txt
components/dashboards/shared/FundingModal.tsx
components/dashboards/shared/FundingSummary.tsx
components/dashboards/AdminCommissionsView.tsx
```

Add admin section:

```txt
Commissions
Funded Deals
```

## Acceptance criteria

- Admin can mark a merchant funded with actual funding details.
- Funding is stored separately from merchant status.
- Funded deal appears in reporting base data.
- Commission records can be created and marked paid.
- Status becomes `FUNDED` only through funding workflow or admin-controlled status change.

---

# Phase C — Broker-to-Lender Submission Tracking

## Goal

Track every outbound broker-to-lender merchant-file submission outcome, not just whether a lender was matched.

## Why this matters

`lender_matches` answers: “Who fits this file?”

A brokerage CRM also needs to know what happened after the broker shop sent the merchant file to each lender/funder:

- Who received the file?
- Who opened/responded?
- Who declined?
- Who asked for stips?
- Which lender/funder responded with an approval or offer?
- Who has not responded?

## New database table

### `lender_submissions`

Despite the table name, this represents **broker-shop outbound submissions to lenders/funders**. It is not a lender-created deal.

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
create unique index lender_submissions_unique_active
on lender_submissions(merchant_id, lender_id, package_version);
```

## Backend/API work

Create routes:

```txt
GET    /api/lender-submissions?merchant_id=
POST   /api/lender-submissions
PATCH  /api/lender-submissions/:id
```

Update `/api/matching/notify`:

- When the broker shop notifies/submits to lenders, create or update `lender_submissions` rows.
- Set `status = submitted`.
- Store `submitted_at`.

Update offer route:

- When a lender/funder responds with an offer or approval, set the corresponding broker-to-lender submission to `offer_received`.

Update stipulation route:

- When a lender/funder requests stips, set the corresponding broker-to-lender submission to `stips_requested`.

## Frontend work

Add to merchant detail:

```txt
Lender Submissions panel
```

Show:

- Lender name
- Submission status
- Submitted date
- Response date
- Decline reason
- Offer link
- Notes

## Acceptance criteria

- Broker/admin can see every lender/funder this merchant file was submitted to.
- Broker can mark a lender as declined/no response.
- Offer and stip requests update lender submission status.
- Lender response history remains even after status changes.

---

# Phase D — Search, Filters, and Saved Views

## Goal

Make the CRM usable when there are hundreds or thousands of records.

## Missing today

The app has lists and pipeline views, but not enough filtering or saved work queues.

## New database tables

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

## Backend/API work

Add query params to list routes:

```txt
/api/merchants?search=&status=&rep_id=&state=&industry=&min_revenue=&max_revenue=&stale=
/api/leads?search=&status=&assigned_rep_id=&source=
/api/lenders?search=&active=&industry=&state=
/api/tasks?status=&assigned_to=&due_before=
/api/fundings?from=&to=&lender_id=&rep_id=
```

Create routes:

```txt
GET    /api/saved-views
POST   /api/saved-views
PATCH  /api/saved-views/:id
DELETE /api/saved-views/:id
```

## Frontend work

Add:

```txt
GlobalSearch.tsx
FilterBar.tsx
SavedViewsMenu.tsx
```

Suggested saved views:

- My hot deals
- Needs docs
- Lender/funder offers and approvals out
- Contract sent unsigned
- No activity in 3 days
- Funded this month
- Renewal eligible
- Unassigned leads

## Acceptance criteria

- Admin can search all merchants/leads/lenders.
- Sales reps can search only allowed records.
- Filters persist in URL or saved views.
- Saved views can be created and reused.

---

# Phase E — Renewal / Refinance Module

## Goal

Capture post-funding revenue by tracking renewal eligibility and payoff/consolidation workflows.

## Why this matters

Renewals are one of the largest revenue sources in MCA. Brokers need a queue of merchants ready for renewal.

## New database tables

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

## Backend/API work

Create routes:

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

- Submission count by lender
- Approval/offer rate
- Decline rate
- Average response time
- Funded volume by lender

### Commission reports

- Commission payable
- Commission paid
- Unpaid commission aging
- Clawbacks/adjustments

## Backend/API work

Create routes:

```txt
GET /api/reports/pipeline
GET /api/reports/funding
GET /api/reports/leads
GET /api/reports/lenders
GET /api/reports/commissions
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
CommissionReport.tsx
```

## Acceptance criteria

- Admin can see funded volume.
- Admin can see close rates.
- Admin can see stale pipeline deals.
- Admin can see commission liability.

---

# Phase G — Compliance, Audit, and Sensitive Data Hardening

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

## Next immediate phase: Phase A

Build activity and tasks first because they unlock daily CRM usage.

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

## Phase B after that

Build funding and commissions.

Why:

- Makes `FUNDED` financially meaningful
- Enables owner reporting
- Tracks commission payouts

---

## Phase C after that

Build lender submissions.

Why:

- Makes lender matching operationally complete
- Allows broker shops to track lender/funder responses, approvals, declines, stip requests, offers, and no-response outcomes

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
8. How much commission is owed and to whom?
9. Which funded merchants are renewal eligible?
10. Which reps, lenders, and lead sources are performing best?

---

# Summary

MCA King has the workflow foundation. The next product layer should focus on CRM operations and revenue tracking:

```txt
Activity + Tasks
Funding + Commissions
Lender Submissions
Search + Saved Views
Renewals
Reports
Compliance/Audit
Communications
```

That is the path from a strong workflow platform to a serious MCA brokerage CRM.
