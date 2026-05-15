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
7. Account settings and admin user management
8. Renewal/renewal tracking
9. Rich offer and contract management
10. Document review/checklist workflows
11. Compliance, audit, and sensitive-data controls

Recommended build order:

```txt
Phase A — Activity + Tasks ✅ complete
Phase A.1 — Lender Offer Visibility + Data Isolation ✅ complete
Phase B — Funded Deals + Broker Revenue + Sales Rep Commissions ✅ complete
Phase C — Merchant-File Submissions ✅ complete
Phase D — Search, Filters, Saved Views ✅ complete
Phase E — Account Settings + Admin User Management ✅ complete
Phase F — Renewals ✅ complete
Phase G — Reporting and Analytics ✅ complete
Phase H — Compliance + Audit Hardening ✅ complete
Phase I — Email-First Communications Center + Compliant Campaign Foundation ✅ complete
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
funding_type         text not null default 'first_funding'
-- first_funding | renewal | additional_funding
renewal_number       int not null default 0
funding_position     int not null default 1
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

# Phase E — Account Settings + Admin User Management ✅ COMPLETE

## Goal

Create a clean settings area so account and user-management actions are not floating on every dashboard tab. ✅ Complete. Admin settings and regular user settings must be separate because they have different permissions and risk levels.

## Why this matters

The admin dashboard currently has operational actions such as creating sales reps in the main dashboard area. Account management belongs in a dedicated settings section so the CRM stays clean and so sensitive actions are controlled, audited, and permissioned correctly.

## Core rule

Regular users can manage only their own password and safe personal preferences. Admins manage user accounts for the broker shop.

```txt
Users must not be able to change their own email address.
Users must not be able to change their own role.
Users must not be able to close/delete their own account in a way that breaks CRM history.
Only admins can change account email, role, status, or close/disable accounts.
Passwords are never visible to admins; admins can only trigger or set a reset flow.
```

## User Settings

Available to logged-in users where appropriate:

- Change own password.
- View own email address, but not edit it.
- View own role, but not edit it.
- Basic display preferences such as theme/default dashboard later if needed.
- For lender/funder users, lender profile edits remain separate from account identity and must still respect lender ownership.
- For merchant users, merchant application/profile edits remain governed by application status and existing merchant rules.

Not allowed for normal users:

- Change email address.
- Change role.
- Create users.
- Disable/close accounts.
- Reassign records.
- View other users.

## Admin Settings

Admin-only account and system controls:

- Create sales rep accounts.
- Move the current floating `Create Sales Rep` action into Admin Settings.
- View user list by role: admin, sales rep, merchant, lender/funder.
- Change user email when needed.
- Trigger password reset or set temporary password/reset link flow.
- Disable/reactivate user accounts.
- Close account safely without deleting required CRM/audit history.
- Change role only when explicitly allowed and audited.
- Link/unlink lender user accounts to lender/funder profiles where appropriate.
- Review account status and last login/session state.

## Close/disable account rules

Account closure should be designed as a safe disable/deactivate flow, not a destructive delete by default.

- Disable login/session access.
- Preserve historical records, activities, submissions, offers, fundings, commissions, and audit logs.
- Do not orphan merchant files, lender submissions, or funded-deal finance records.
- Allow admin reactivation only when safe.
- Hard delete, if ever added, should be restricted, audited, and not available for accounts tied to financial/history records.

## Backend/API work implemented

Created routes:

```txt
GET    /api/settings/me
PATCH  /api/settings/me/password
GET    /api/admin/users
POST   /api/admin/users
PATCH  /api/admin/users/:id
POST   /api/admin/users/:id/reset-password
POST   /api/admin/users/:id/disable
POST   /api/admin/users/:id/reactivate
POST   /api/admin/users/:id/close
```

Required server-side rules:

- All account-management routes require `requireAuth`.
- `/api/settings/me/password` is allowed for the logged-in user only.
- `/api/admin/users/*` is admin-only.
- Never trust client-provided role/email changes without admin authorization.
- Do not expose password hashes or secrets.
- Invalidate/revoke sessions on password reset, disable, close, or suspicious admin action.

## Frontend work implemented

Added dashboard sections and panels:

```txt
Admin Settings
User Settings
```

Admin Settings includes:

- User Management tab.
- Create Sales Rep form/button.
- User list with role/status.
- Reset password action.
- Change email action.
- Disable/reactivate/close account actions.

User Settings includes:

- Change password form.
- Read-only email.
- Read-only role.
- Safe personal preferences later.

## Audit and compliance requirements

These actions must write audit/activity records, and can connect into the later compliance phase:

- User created.
- Email changed.
- Role changed.
- Password reset triggered.
- Account disabled/reactivated/closed.
- Session revoked.

## Acceptance criteria

- Admin has a dedicated Settings section. ✅
- `Create Sales Rep` no longer floats globally in all admin tabs. ✅
- All logged-in users have a User Settings area for password changes. ✅
- Normal users cannot change their own email or role. ✅
- Only admin can change user email, role, or account status. ✅
- Disabled/closed accounts cannot log in. ✅
- Historical CRM records are preserved when accounts are disabled/closed. ✅
- Sensitive account-management actions are written to activity records. ✅

---

# Phase F — Renewals Module ✅ COMPLETE

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

### `payoff_requests`

```sql
id                         uuid primary key default gen_random_uuid()
merchant_id                 uuid references merchants(id) on delete cascade
funding_id                  uuid references fundings(id) on delete set null
renewal_id                  uuid references renewals(id) on delete set null
requested_from_lender_id    uuid references lenders(id) on delete set null
requested_from_name         text
payoff_amount               numeric
requested_at                timestamptz default now()
received_at                 timestamptz
expires_at                  timestamptz
file_document_id            uuid references documents(id)
status                      text default 'requested' -- requested | received | expired | used | cancelled
notes                       text
created_by                  uuid references users(id) on delete set null
created_at                  timestamptz default now()
updated_at                  timestamptz default now()
```

## Backend/API work implemented

Created routes:

```txt
GET    /api/renewals
POST   /api/renewals
PATCH  /api/renewals/:id
GET    /api/payoff-requests
POST   /api/payoff-requests
GET    /api/payoff-requests/:id
PATCH  /api/payoff-requests/:id
```

Implemented renewal logic:

- Renewal records are created automatically from the funding workflow with default eligibility at funded_at + 90 days.
- Admins/sales reps can manually adjust renewal status, eligibility date, estimated balance, payoff amount, contact dates, follow-up date, assignment, and notes.
- Funding records distinguish first funding, renewals, and additional/split funding positions so renewal history is tied to actual funded records.
- Merchant-facing renewal review CTA is safe and does not expose internal payoff strategy or broker notes.

## Frontend work implemented

Added dashboard sections and panels:

```txt
Renewals
Payoff Requests
```

Add merchant view:

- Admin/sales rep renewal queue
- Merchant detail renewal panel
- Merchant detail payoff request panel
- Merchant-safe renewal eligibility card and review CTA

## Acceptance criteria

- Admin/sales rep can view renewal-eligible merchants. ✅
- Funded merchants can be contacted for renewals. ✅
- Funding history supports first funding, renewal funding, and additional/split positions dynamically. ✅
- Payoff requests can be tracked and linked to received lender/funder-provided payoff documents. ✅
- Funded merchants can request an early-payoff letter from their current funding lender/funder. ✅
- Admins and assigned sales reps can request payoff letters for funded deals. ✅
- Only the funding lender/funder for that deal or an admin can upload/link the official payoff letter. ✅
- MCA King does not generate official payoff letters on behalf of lenders/funders. ✅
- Lenders/funders cannot access renewal queues or payoff request strategy. ✅

---

# Phase G — Reporting and Analytics ✅ COMPLETE

## Goal

Give brokerage owners visibility into volume, performance, bottlenecks, lender/funder outcomes, revenue, commissions, renewals, and follow-up execution.

## Implemented backend/API work

Created server-backed reporting routes:

```txt
GET /api/reports/overview
GET /api/reports/pipeline
GET /api/reports/funding
GET /api/reports/leads
GET /api/reports/lenders
GET /api/reports/revenue
GET /api/reports/commissions
GET /api/reports/renewals
GET /api/reports/tasks
```

Created lender/funder dashboard analytics route:

```txt
GET /api/lender-dashboard/analytics
```

Added shared reporting helpers:

```txt
src/lib/reporting.ts
src/routes/reports/common.ts
src/lib/csv.ts
```

## Implemented frontend work

Added admin/sales rep reports UI:

```txt
components/dashboards/ReportsView.tsx
components/dashboards/shared/reports/ReportFilters.tsx
components/dashboards/shared/reports/ReportMetricCard.tsx
components/dashboards/shared/reports/ReportSection.tsx
components/dashboards/shared/reports/SimpleBarChart.tsx
components/dashboards/shared/reports/SimpleLineChart.tsx
components/dashboards/shared/reports/ReportTable.tsx
```

Added lender/funder relationship analytics dashboard cards:

```txt
components/dashboards/shared/LenderAnalyticsPanel.tsx
components/dashboards/LenderDashboard.tsx
```

Admin dashboard now includes:

```txt
Reports
```

Sales rep dashboard now includes:

```txt
My Reports
```

Lender/funder dashboard now includes relationship analytics cards and safe recent lists.

## Reports implemented

### Overview

- Funded volume
- Funded deal count
- Average funded amount
- Lead conversion rate
- Offer-to-funded rate
- Broker revenue expected/received
- Unpaid commission liability
- Overdue tasks
- Eligible renewals
- Funding trend
- Pipeline breakdown
- Top reps
- Top lenders/funders

### Pipeline

- Deals by status
- Deals by rep
- Stale deals
- Average age
- Average days since update
- Funded/declined counts

### Funding

- Funded volume by period
- Funded volume by rep
- Funded volume by lender/funder
- First funding / renewal funding / additional funding breakdown
- Funding position breakdown
- Average funded amount
- Average factor rate
- Average term days
- Funding drilldown rows

Funding reports count actual funding records dynamically. They do **not** collapse a merchant to only the latest funding.

### Leads

- Lead count
- Converted lead count
- Conversion rate
- Dead lead count
- Unassigned lead count
- Average days to conversion
- Leads by status/rep

### Lenders/Funders

Internal broker-shop lender/funder performance reports:

- Submission count
- Offer count
- Decline count
- Offer rate
- Decline rate
- Funded count
- Funded volume
- Average funded amount
- Average response time
- Payoff request count

These reports are internal broker-shop reports and are not visible to lender/funder users.

### Broker Revenue

Admin-only:

- Expected
- Invoiced
- Received
- Short-paid
- Disputed
- Waived
- Revenue by status
- Revenue by lender/funder
- Receivable aging

### Sales Rep Commissions

- Admin can see all commission reporting.
- Sales reps can see only their own commission reporting.
- Reports include unpaid, approved, paid, adjusted, clawed back, void, aging, and rows.

### Renewals

- Eligible renewals
- Renewal status counts
- Renewal conversion rate
- Renewal funded volume
- Overdue follow-ups
- Renewals by rep

### Tasks

- Open/completed/cancelled tasks
- Overdue tasks
- Due today/week
- Completion rate
- Average completion days
- Tasks by status/rep/priority

## Lender/Funder Dashboard Analytics

Lender/funder users do not get broker reports. They get scoped relationship analytics on their own dashboard only.

Lender/funder dashboard cards include:

```txt
Files Sent To Us
Pending Review
Offers/Approvals Sent
Funded Deals Together
Total Funded Together
Average Funded Amount
This Month Funded
Payoff Requests Pending
```

Lender/funder recent lists include:

```txt
Recent Submissions
Recent Funded Deals
Pending Payoff Requests
```

Important lender/funder visibility rules:

```txt
Lender/funder analytics are scoped only to that lender/funder profile.
Lenders/funders never see competing lender/funder performance.
Lenders/funders never see broker revenue.
Lenders/funders never see sales rep commissions.
Lenders/funders never see broker strategy.
```

## CSV Export

Report tables support client-side CSV export for currently loaded rows.

## Acceptance criteria

- Admin has a Reports section in the left nav. ✅
- Sales reps have a scoped My Reports section. ✅
- Reports include Overview, Pipeline, Funding, Leads, Lenders/Funders, Revenue, Commissions, Renewals, and Tasks. ✅
- Reports support date range filters. ✅
- Reports support admin rep/lender filters where relevant. ✅
- Funding reports correctly support first funding, renewal funding, and additional/split funding positions. ✅
- Lender/funder performance reports are internal broker-shop reports only. ✅
- Lender/funder dashboards show only their own relationship analytics, including funded deals count and total funded volume together with the broker shop. ✅
- Broker revenue reports are admin-only. ✅
- Sales rep commission reports do not expose other reps' commissions to sales reps. ✅
- Merchants cannot access report APIs. ✅
- Lenders/funders cannot access broker report APIs and can access only their own scoped dashboard analytics endpoint. ✅
- Report tables can export currently loaded rows to CSV. ✅
- TypeScript passes. ✅
- Production build passes. ✅

---

# Phase H — Compliance, Audit, and Sensitive Data Hardening ✅ COMPLETE
> Detailed customer-data readiness checklist: see [`PRODUCTION_SECURITY_HARDENING_PLAN.md`](PRODUCTION_SECURITY_HARDENING_PLAN.md).

## Goal

Protect sensitive merchant data, add auditability, harden document/file handling, improve production browser security, and remove the Tailwind CDN production warning.

## Database work implemented

Created `public.audit_logs`:

```sql
id uuid primary key default gen_random_uuid()
user_id uuid references public.users(id) on delete set null
action text not null
entity_type text
entity_id uuid
ip_address text
user_agent text
metadata jsonb not null default '{}'::jsonb
created_at timestamptz not null default now()
```

Indexes added:

```txt
audit_logs_user_created_idx
audit_logs_entity_idx
audit_logs_action_created_idx
audit_logs_created_idx
status_history_merchant_changed_idx
status_history_changed_by_idx
```

Security:

```txt
RLS enabled on audit_logs.
Deny-all public policy added.
Audit logs are accessed only through server-side service-role routes.
```

## Backend work implemented

Created:

```txt
src/lib/audit.ts
src/lib/permissions.ts
src/lib/sensitive-data.ts
src/lib/rate-limit.ts
src/routes/audit-logs/index.ts
src/routes/audit/report-export.ts
```

Registered routes:

```txt
GET  /api/audit-logs
POST /api/audit/report-export
```

Access rules:

```txt
GET /api/audit-logs = admin only
POST /api/audit/report-export = admin or sales_rep only
```

## Audit logging implemented

Audit logs are now written for key sensitive actions including:

```txt
auth.login.success
auth.login.failure
auth.logout
auth.register
settings.password_changed
admin.user.created
admin.user.updated
admin.user.password_reset
admin.user.disabled
admin.user.reactivated
admin.user.closed
document.listed
document.signed_url_generated
document.uploaded
document.deleted
payoff_request.official_document_uploaded
funding.created
report.csv_exported
ai.chat.request
ai.chat.blocked
ai.chat.error
security.rate_limited
```

Audit metadata is redacted before insert. Passwords, tokens, cookies, API keys, service-role keys, SSNs, DOBs, tax IDs, and signatures are not stored in audit metadata.

## Admin UI implemented

Added:

```txt
components/dashboards/AdminAuditLogPage.tsx
```

Admin Settings now includes:

```txt
Audit Logs
```

The audit log viewer supports:

```txt
Action filter
Entity type filter
User ID filter
Date range filters
Pagination
Metadata preview
Read-only viewing
```

## Document/file security implemented

Document uploads now enforce:

```txt
Allowed MIME types
File extension checks
100 MB max file size
Server-generated storage paths
Private bucket usage through server-side Supabase service role
Short signed URL expiration: 15 minutes
Audit logs for listing/signed URL generation/upload/delete
```

Allowed files:

```txt
PDF
PNG
JPG/JPEG
CSV
XLS
XLSX
```

Payoff letter uploads remain restricted to:

```txt
Admin
Funding lender/funder for that specific funded deal
```

## Authorization hardening helpers

Created reusable helpers for:

```txt
canAccessMerchant
canUpdateMerchant
canAccessLead
canAccessDocument
canAccessOffer
canAccessLenderProfile
assertCanAccessMerchant
```

Important lender/funder safety rule preserved:

```txt
Lender-related rows use lender profile IDs.
The app resolves lenders.user_id → lenders.id before checking lender access.
```

## Sensitive-data masking/minimization

Added helper:

```txt
src/lib/sensitive-data.ts
```

Normal merchant detail dashboard display now masks:

```txt
Tax ID
Owner SSN
Owner DOB
Signatures are not displayed in normal dashboard detail views
```

AI chat context/audit metadata is redacted to avoid sending or storing obvious sensitive fields.

## Rate limiting first pass

Added in-memory first-pass rate limiting for:

```txt
POST /api/auth/login
POST /api/auth/register
POST /api/ai/chat
POST /api/documents/upload
```

Important production note:

```txt
The current rate limiter is an in-memory safety fallback. For multi-instance Vercel production, replace/augment it with durable storage such as Upstash Redis, Vercel KV, or a Supabase-backed rate-limit table.
```

## Security headers/browser hardening

Added production headers in `vercel.json`:

```txt
X-Content-Type-Options: nosniff
Referrer-Policy: strict-origin-when-cross-origin
Permissions-Policy
X-Frame-Options: DENY
Strict-Transport-Security
Content-Security-Policy
```

## Tailwind production hardening

Removed Tailwind CDN usage from `index.html`.

Added build-time Tailwind pipeline:

```txt
tailwind.config.cjs
postcss.config.cjs
index.css with @tailwind directives
```

Added dev dependencies:

```txt
tailwindcss
postcss
autoprefixer
```

The production warning is resolved:

```txt
cdn.tailwindcss.com should not be used in production
```

## Deferred / future security work

Phase H completed the first production hardening pass. The following should still be tracked for later hardening:

```txt
CSRF token protection for cookie-authenticated mutation routes
Durable production rate-limit store
Broader input schema validation across every API route
Formal automated security regression suite
MFA/session management enhancements
Malware scanning pipeline for uploads
```

## Verification

Passed:

```bash
bun run --bun tsc -p ./tsconfig.json --noEmit
bun run build
```

Supabase advisors:

```txt
Security advisor: no lints.
Performance advisor: INFO-only notices for existing unindexed FKs and unused/new indexes; no blocking issues.
```

## Acceptance criteria

- `audit_logs` table exists with RLS enabled and public access blocked. ✅
- Sensitive auth/admin/document/deal/report events write audit logs. ✅
- Admin can review audit logs in the app. ✅
- Audit metadata is redacted and does not contain secrets/passwords/full PII. ✅
- Reusable permission helpers exist. ✅
- Lender/funder isolation is preserved across merchant details, offers, reports, documents, AI context, and dashboard analytics. ✅
- Document upload has MIME/type/size validation. ✅
- Signed document URLs are generated only after authorization checks and are audit logged. ✅
- Sensitive fields are masked or removed from normal display/AI/log contexts where practical. ✅
- Production security headers are added. ✅
- Tailwind CDN production warning is removed. ✅
- TypeScript passes. ✅
- Production build passes. ✅
- Supabase security advisor has no unresolved security findings after schema changes. ✅

---

# Phase I — Email-First Communications Center + Compliant Campaign Foundation ✅ COMPLETE

## Implementation status

Phase I is implemented as an email-first communications center. It adds communication preferences, global suppressions, email templates, campaign drafts, recipient preview, controlled Resend email sending, unsubscribe handling, communication history, Resend webhook ingestion, and SMS-disabled future readiness. Live SMS sending remains intentionally disabled.

## Strategic decision

Phase I should be **email-first** and **SMS-future-ready**, not a full live SMS rollout.

Current communications stack:

```txt
Zoho Mail = mailbox/domain email hosting for normal human inboxes.
Resend = outbound app email and future controlled campaign email.
SMS provider = not selected yet.
```

Recommended decision:

```txt
Use Resend for Phase I email communications.
Do not use Zoho Mail SMTP for bulk/campaign email.
Do not build live SMS sending until budget/client demand and compliance setup justify it.
Build the consent/suppression/provider foundation now so SMS can be added safely later.
```

Why SMS waits:

- US business SMS commonly requires A2P 10DLC brand/campaign registration.
- SMS has setup, monthly campaign, phone number, per-segment, and carrier surcharge costs.
- Marketing SMS requires documented opt-in proof.
- Cold/imported lead SMS is high-risk and should not be allowed.
- STOP/HELP, delivery receipts, quiet hours, and provider webhooks must exist before activation.

Supporting strategy doc:

```txt
Docs/COMMUNICATIONS_COMPLIANCE_STRATEGY.md
```

## Goal

Build a safe communication center for broker admins and internal sales reps while protecting deliverability, consent records, and future SMS readiness.

Phase I should deliver:

- Communication preferences and consent tracking.
- Global suppression list.
- Email template management.
- Manual email from CRM through Resend.
- Email campaign drafts and selected-recipient sends.
- Recipient preview with skipped/suppressed counts.
- Required unsubscribe links for campaign email.
- Communication history per merchant/lead.
- Campaign recipient status tracking.
- Resend webhook route for delivery/bounce/complaint/unsubscribe events where supported.
- Provider abstraction for email now and SMS later.
- SMS consent fields and disabled/future-ready UI, but no live SMS sending.

## Explicit non-goals

Do not build in Phase I:

```txt
Live Twilio/Telnyx/Plivo/Zoho Voice SMS sending
Bulk SMS campaigns
SMS blast UI
Automatic texting to leads
A2P 10DLC registration workflow inside the app
Zoho Mail SMTP campaign sending
Unsubscribe-less campaign email
Campaign sending to suppressed recipients
```

## Recommended tables

### `communication_preferences`

```sql
id                      uuid primary key default gen_random_uuid()
entity_type             text not null -- lead | merchant | contact | user
entity_id               uuid not null
email                   text
phone                   text
email_opt_in            boolean not null default true
email_opt_out           boolean not null default false
email_opt_out_at        timestamptz
sms_opt_in              boolean not null default false
sms_opt_out             boolean not null default false
sms_opt_out_at          timestamptz
sms_consent_source      text
sms_consent_text        text
sms_consent_ip          text
sms_consent_at          timestamptz
do_not_contact          boolean not null default false
preferred_contact_method text
created_at              timestamptz default now()
updated_at              timestamptz default now()
```

Important defaults:

```txt
sms_opt_in must default false.
Imported/cold leads must not be treated as SMS-consented.
do_not_contact overrides non-critical outreach.
```

### `global_suppressions`

```sql
id              uuid primary key default gen_random_uuid()
channel         text not null -- email | sms
identifier      text not null -- normalized email or phone
reason          text not null -- unsubscribe | bounce | complaint | STOP | admin | do_not_contact
source          text not null default 'system' -- webhook | user | admin | import | system
entity_type     text
entity_id       uuid
metadata        jsonb default '{}'::jsonb
created_at      timestamptz default now()
created_by      uuid references users(id)
```

### `message_templates`

```sql
id              uuid primary key default gen_random_uuid()
name            text not null
channel         text not null -- email | sms_future
category        text not null -- transactional | campaign
subject         text
body            text not null
variables       text[] default '{}'
is_active       boolean default true
created_by      uuid references users(id)
updated_by      uuid references users(id)
created_at      timestamptz default now()
updated_at      timestamptz default now()
```

### `campaigns`

```sql
id              uuid primary key default gen_random_uuid()
name            text not null
channel         text not null -- email now; sms_future disabled
category        text not null default 'campaign'
template_id     uuid references message_templates(id)
subject         text
body            text
status          text default 'draft' -- draft | scheduled | sending | completed | cancelled | failed
created_by      uuid references users(id)
scheduled_at    timestamptz
started_at      timestamptz
completed_at    timestamptz
metadata        jsonb default '{}'::jsonb
created_at      timestamptz default now()
updated_at      timestamptz default now()
```

### `campaign_recipients`

```sql
id                    uuid primary key default gen_random_uuid()
campaign_id           uuid references campaigns(id) on delete cascade
entity_type           text not null -- lead | merchant | contact later
entity_id             uuid not null
email                 text
phone                 text
status                text default 'pending' -- pending | skipped | queued | sent | delivered | bounced | complained | unsubscribed | failed
skip_reason           text
provider              text
provider_message_id   text
sent_at               timestamptz
delivered_at          timestamptz
failed_at             timestamptz
metadata              jsonb default '{}'::jsonb
created_at            timestamptz default now()
updated_at            timestamptz default now()
```

### `communications` or `communication_events`

```sql
id                    uuid primary key default gen_random_uuid()
entity_type           text not null
entity_id             uuid not null
channel               text not null -- email | sms_future | call | system
communication_type    text not null -- manual | campaign | transactional | delivery_event | call
from_user_id          uuid references users(id)
to_contact            text
subject               text
body_preview          text
status                text default 'logged'
provider              text
provider_message_id   text
campaign_id           uuid references campaigns(id)
campaign_recipient_id uuid references campaign_recipients(id)
metadata              jsonb default '{}'::jsonb
created_at            timestamptz default now()
```

New public tables should have RLS enabled with public access blocked because MCA King uses server-side service-role routes.

## Provider and pricing guidance

Treat SMS pricing as planning estimates only. Verify directly before purchase.

| Provider | Best fit | Approximate research cost profile | Notes |
|---|---|---:|---|
| Resend | Email transactional/campaign API | Free tier has limits; paid plans needed for production volume | Recommended for Phase I email. Keep campaign sending controlled. |
| Telnyx | Lower-cost programmable SMS | About `$0.0040`/SMS segment base plus carrier fees; numbers around `$1/mo` | Strong later SMS candidate if cost/scale matter. |
| Plivo | Balanced SMS developer experience/cost | About `$0.0050-$0.0077`/SMS segment; numbers around `$0.80/mo` | Good middle-ground later SMS candidate. |
| Twilio | Most established SMS ecosystem | About `$0.0083`/SMS segment base plus carrier fees; numbers around `$1.15/mo` | Best docs/ecosystem, usually more expensive. |
| Zoho Voice | Human business phone/UCaaS | Research showed about `$0.009` outbound SMS style pricing; verify | Better for sales phone system than automated campaign engine unless webhooks/API prove sufficient. |

A2P 10DLC planning costs may include brand registration, standard vetting, campaign vetting, monthly campaign fees, number rental, per-message provider fees, and carrier surcharges. Research suggests initial registration/vetting can be around `$60+` and monthly campaign fees may range around `$1.50-$10+` per use case before per-message costs.

## Backend/API acceptance direction

Suggested routes:

```txt
GET/PATCH /api/communications/preferences
GET       /api/communications/history
GET/POST/PATCH /api/communications/templates
POST      /api/communications/send-email
GET/POST/PATCH /api/communications/campaigns
POST      /api/communications/campaigns/:id/preview-recipients
POST      /api/communications/campaigns/:id/send
GET/POST  /api/communications/unsubscribe
POST      /api/webhooks/resend
```

Rules:

- Admins can manage global templates and campaigns.
- Sales reps can communicate only with assigned/permitted leads/merchants.
- Merchants/lenders cannot access broker campaign tools.
- Lenders/funders cannot see broker communication lists or unrelated merchant data.
- Campaign email must check suppressions server-side.
- SMS send attempts must be rejected server-side until a future SMS activation phase.
- Send/template/campaign/suppression actions should write audit logs and communication history.

## UI requirements

- Add Communications navigation for admins.
- Add communication history/preferences panels to lead/merchant views where practical.
- Avoid the word "blast" in UI.
- Show recipient preview before sending:
  - selected
  - sendable
  - skipped
  - suppressed
  - missing email
  - do-not-contact
- Disable campaign send until unsubscribe compliance is satisfied.
- Show SMS as disabled/future-ready with clear compliance explanation.

## Acceptance criteria

- Communication preferences and suppression tables exist with RLS enabled and public access blocked.
- Email templates support transactional vs campaign classification.
- Campaign emails require unsubscribe/suppression compliance.
- Resend is used for Phase I email through a provider abstraction.
- Communication history is visible for leads/merchants.
- Campaign recipient preview shows sendable/skipped/suppressed counts.
- Unsubscribe flow is idempotent and updates suppression/preference records.
- Resend webhook route exists and updates delivery/suppression records where supported.
- SMS consent fields exist, but live SMS sending is disabled.
- Server rejects SMS send attempts with a clear disabled/provider-not-configured response.
- Zoho Mail is documented as mailbox/human email only, not campaign sending infrastructure.
- TypeScript and production build pass.
- Supabase security advisor has no unresolved Phase I security findings.

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
Account Settings + Admin User Management ✅ complete
Renewals ✅ complete
Reporting and Analytics ✅ complete
Compliance + Audit Hardening ✅ complete
Email-First Communications Center + Compliant Campaign Foundation ✅ complete
```

That is the path from a strong workflow platform to a serious MCA brokerage CRM.
