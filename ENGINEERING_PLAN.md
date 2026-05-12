# MCA King — Engineering Plan
> This is the forward-looking build plan. For the project audit and history, see `Project_Road_Map.md`.
>
> **Current master expansion plan:** see [`Docs/MCA_BROKER_CRM_EXPANSION_PLAN.md`](Docs/MCA_BROKER_CRM_EXPANSION_PLAN.md) for the detailed broker CRM gap analysis, database modules, and phased build roadmap covering activities, tasks, funding, commissions, lender submissions, renewals, reporting, compliance, and communications.
>
> **Deployment:** see [`Docs/VERCEL_DEPLOYMENT.md`](Docs/VERCEL_DEPLOYMENT.md) for the Vercel serverless API setup, environment variables, and deployment checklist.
>
> **Production security hardening:** see [`Docs/PRODUCTION_SECURITY_HARDENING_PLAN.md`](Docs/PRODUCTION_SECURITY_HARDENING_PLAN.md) for the dedicated security pass required before storing real customer/merchant data at scale.

---


## Product Role Model

MCA King is broker/ISO-shop centered.

| Role | Meaning |
|---|---|
| `admin` | Broker/ISO shop owner or operator. Admin controls users, reps, merchant files, lender/funder records, matching, submissions, and reporting. |
| `sales_rep` | Internal broker-shop rep who works leads and assigned merchant files. |
| `merchant` | Funding customer/applicant. Merchants submit applications, upload documents, respond to stipulations, and review offers. |
| `lender` | Lender/funder reviewer. Lenders do not submit merchant deals; they review broker-submitted/matched files, approve/decline, request stipulations, and send offers. |

Use “lender submission” to mean an outbound broker-shop submission of a merchant file to a lender/funder, not a lender-created deal.

---

## Locked-In Decisions

These are not open questions anymore. They are decided.

| Concern | Choice | Why |
|---|---|---|
| Deployment | Vercel (Hobby → Pro when live) | Already using it, free for demo |
| Database | Supabase (Postgres) | Free tier, real SQL, built-in dashboard |
| File Storage | Supabase Storage | Bank statements, contracts, PDFs — same ecosystem |
| Auth | Better Auth | Email + password, encrypted, token-based sessions, supports RBAC |
| Email | Resend | Modern API, generous free tier, dead simple |
| Package Manager | Bun | Faster installs, native TypeScript, replaces Node/npm locally |
| Frontend | React + Vite (keep what exists) | No reason to rewrite the frontend |
| Types | TypeScript (keep it) | Complex domain — 4 roles, 12 statuses, matching rules — types prevent drift |

---

## Stack Overview

```
Browser (React + Vite)
    ↓
Vercel (hosts frontend + API routes)
    ↓
Better Auth (session middleware on API routes)
    ↓
Supabase Postgres (all relational data)
Supabase Storage (documents: bank statements, contracts, stips)
    ↓
Resend (outbound email — lender packages, notifications)
```

---

## Database Schema

These are the tables that replace `localStorage`. Every entity the app currently fakes in the browser gets a real home here.

### `users`
The single auth table. Role lives here.

```sql
id              uuid primary key default gen_random_uuid()
email           text unique not null
password_hash   text not null
role            text not null  -- 'admin' | 'sales_rep' | 'merchant' | 'lender'
full_name       text
created_at      timestamptz default now()
```

### `merchants`
One row per merchant application.

```sql
id                  uuid primary key default gen_random_uuid()
user_id             uuid references users(id)
assigned_rep_id     uuid references users(id)   -- the sales rep
business_name       text not null
industry            text
state               text
monthly_revenue     numeric
time_in_business    int    -- months
credit_score        int
nsf_count           int
requested_amount    numeric
current_positions   int    -- how many advances they currently have
status              text not null default 'application & 3 months bank statements in'
created_at          timestamptz default now()
updated_at          timestamptz default now()
```

### `owners`
A merchant can have multiple owners (partners, co-signers).

```sql
id              uuid primary key default gen_random_uuid()
merchant_id     uuid references merchants(id) on delete cascade
full_name       text not null
ownership_pct   numeric
ssn_last4       text
date_of_birth   date
email           text
phone           text
is_primary      boolean default false
```

### `lenders`
The lender/funder network. Broker-admin managed. Lenders are reviewers/funders of broker-submitted merchant files; they do not originate merchant deals in this CRM.

```sql
id              uuid primary key default gen_random_uuid()
user_id         uuid references users(id)
company_name    text not null
contact_email   text not null
contact_name    text
min_revenue     numeric
max_revenue     numeric
min_credit      int
max_positions   int      -- e.g. only funds up to 3rd position
industries      text[]   -- e.g. ['trucking', 'restaurants']
states          text[]   -- states they lend in
min_amount      numeric
max_amount      numeric
is_active       boolean default true
```

### `lender_matches`
Which lenders were matched to which merchants (auto or manual).

```sql
id              uuid primary key default gen_random_uuid()
merchant_id     uuid references merchants(id) on delete cascade
lender_id       uuid references lenders(id)
match_type      text    -- 'auto' | 'manual'
matched_by      uuid references users(id)   -- null if auto
notified_at     timestamptz                 -- when the package email was sent
created_at      timestamptz default now()
```

### `offers`
Lender offers submitted for a merchant.

```sql
id              uuid primary key default gen_random_uuid()
merchant_id     uuid references merchants(id) on delete cascade
lender_id       uuid references lenders(id)
amount          numeric not null
factor_rate     numeric            -- e.g. 1.35
term_months     int
payment_freq    text               -- 'daily' | 'weekly'
status          text default 'pending'  -- 'pending' | 'accepted' | 'declined'
accepted_at     timestamptz
created_at      timestamptz default now()
```

### `documents`
Every file uploaded — bank statements, contracts, stips, etc.

```sql
id              uuid primary key default gen_random_uuid()
merchant_id     uuid references merchants(id) on delete cascade
uploaded_by     uuid references users(id)
doc_type        text    -- 'bank_statement' | 'contract' | 'stipulation' | 'id' | 'other'
file_name       text not null
storage_path    text not null    -- Supabase Storage path
uploaded_at     timestamptz default now()
```

### `status_history`
The audit trail. Every time a merchant's status changes, a row goes here.

```sql
id              uuid primary key default gen_random_uuid()
merchant_id     uuid references merchants(id) on delete cascade
changed_by      uuid references users(id)
previous_status text
new_status      text not null
note            text
changed_at      timestamptz default now()
```

### `stipulations`
When a lender requests additional docs. Triggers the merchant-side upload UI.

```sql
id              uuid primary key default gen_random_uuid()
merchant_id     uuid references merchants(id) on delete cascade
lender_id       uuid references lenders(id)
requested_by    uuid references users(id)
description     text not null
is_fulfilled    boolean default false
fulfilled_at    timestamptz
created_at      timestamptz default now()
```

### `leads`
Lightweight prospect records that live before a full merchant application exists. Created by admins or sales reps. Admin assigns to reps. Stays in the system after conversion with a pointer to the merchant record it became.

```sql
id                uuid primary key default gen_random_uuid()
created_by        uuid references users(id)
assigned_rep_id   uuid references users(id)   -- null until admin assigns
business_name     text not null
owner_name        text
phone             text
email             text
state             text
status            text not null default 'new'  -- 'new' | 'contacted' | 'docs_requested' | 'converted' | 'dead'
converted_to      uuid references merchants(id) -- null until converted
created_at        timestamptz default now()
updated_at        timestamptz default now()
```

### `lead_notes`
Timestamped call log / activity feed per lead. Every entry records who wrote it and when. Never edited — only appended.

```sql
id            uuid primary key default gen_random_uuid()
lead_id       uuid references leads(id) on delete cascade
written_by    uuid references users(id)
body          text not null
created_at    timestamptz default now()
```

---

## Auth Design (Better Auth)

### How it works

1. Merchant/Lender registers → `users` row created, `password_hash` stored (argon2 via Better Auth)
2. Login → Better Auth issues a **database session** (stored in Supabase, not just a JWT cookie)
3. Every API route reads the session → gets `user.id` and `user.role`
4. Role check happens server-side before any data is returned

### Why database sessions over JWT-only

Database sessions can be revoked instantly. If a lender account gets compromised, an admin can kill the session immediately. JWTs keep working until expiry even if you "log out."

### Role enforcement pattern

```ts
// Example API route pattern
export async function GET(req: Request) {
  const session = await auth.getSession(req)
  if (!session) return new Response('Unauthorized', { status: 401 })
  if (session.user.role !== 'admin') return new Response('Forbidden', { status: 403 })

  // Now safe to query
  const merchants = await db.query('SELECT * FROM merchants')
  return Response.json(merchants)
}
```

### What each role can see

| Role | Data Access |
|---|---|
| `admin` | Everything — all merchants, all lenders, all offers, all leads (assigned and unassigned) |
| `sales_rep` | Only merchants where `assigned_rep_id = user.id` — only leads they created OR were assigned by admin. Cannot see or claim unassigned leads. |
| `merchant` | Only their own row + their own offers/docs |
| `lender` | Only merchants matched to them via `lender_matches` |

### Lead access rules in SQL terms

```sql
-- Admin: no filter, sees everything including unassigned
SELECT * FROM leads;

-- Sales rep: only leads they created or were assigned by admin
SELECT * FROM leads
WHERE assigned_rep_id = user.id OR created_by = user.id;

-- Unassigned leads (assigned_rep_id IS NULL) are admin-only
-- Reps cannot claim from the pool — admin hands them out
```

---

## The 12-Step Status Machine

Status lives in `merchants.status`. Every change writes to `status_history`.

```
1.  application & 3 months bank statements in   ← starting point
2.  sent to lender
3.  all lenders decline                          ← dead end (red)
4.  one or more lender's sent offer
5.  Merchant accepts offer
6.  Merchant Declines Offer's                    ← dead end (red)
7.  more docs requested                          ← triggers stipulations UI
8.  contract sent
9.  contract signed
10. contract declined by the merchant            ← dead end (red)
11. Declined by funder                           ← dead end (red)
12. FUNDED                                       ← win (green)
```

Who can move status:
- `admin` → any status
- `sales_rep` → any status on their assigned deals
- `lender` → can trigger `more docs requested` and `one or more lender's sent offer`
- `merchant` → can trigger `Merchant accepts offer` and `Merchant Declines Offer's`

---

## Matching Engine (Server-Side)

Replaces the current client-side matching. Runs as an API route.

### Auto-match logic

```
For each lender marked is_active:
  - merchant.monthly_revenue between lender.min_revenue and lender.max_revenue
  - merchant.credit_score >= lender.min_credit
  - merchant.current_positions <= lender.max_positions
  - merchant.industry in lender.industries (or lender.industries is empty = accepts all)
  - merchant.state in lender.states (or lender.states is empty = accepts all)
  - merchant.requested_amount between lender.min_amount and lender.max_amount
→ if all pass: insert row into lender_matches (match_type = 'auto')
```

Manual override: Sales rep or admin can add any lender to `lender_matches` with `match_type = 'manual'`.

---

## Email Automation (Resend)

### Triggers and templates

| Event | Recipients | Content |
|---|---|---|
| New merchant submitted | Assigned sales rep | Merchant name, requested amount, link to deal |
| Lenders matched + notified | Each matched lender | Merchant package PDF attachment, bank statements |
| Lender submits offer | Merchant + sales rep | Offer amount, factor rate, term |
| Merchant accepts offer | Lender + sales rep | Acceptance confirmation |
| Stipulation requested | Merchant | What docs are needed, upload link |
| Contract sent | Merchant | Contract link |
| Deal funded | Merchant + sales rep + admin | Congratulations, funded amount |

---

## Document / PDF Flow

### Uploads (merchant → platform)
1. Merchant uploads file in the UI
2. Frontend sends to API route with auth header
3. API verifies session + role
4. File goes to Supabase Storage at path: `/{merchant_id}/{doc_type}/{filename}`
5. Row inserted into `documents` table
6. Signed URL generated for lender access (time-limited, not public)

### Lender Package (platform → lender email)
When admin/rep clicks "Notify Lenders":
1. Server pulls merchant data + owner data from Postgres
2. Generates PDF server-side
3. Fetches bank statement files from Supabase Storage
4. Attaches everything to Resend email
5. Fires to each matched lender's `contact_email`
6. Updates `lender_matches.notified_at`

---

## Build Phases

### Phase 0 — Cleanup (do this first, 1 day)
- [ ] Fix `index.css` build warning
- [ ] Remove `AdminView.tsx` and `LenderView.tsx` if unused
- [ ] Switch from `npm` to `bun` locally (`bun install`, `bun run dev`)
- [ ] Confirm all 4 dashboard views still work

### Phase 1 — Backend Foundation (3–5 days)
- [ ] Create Supabase project
- [ ] Run schema SQL — create all tables above
- [ ] Set up Better Auth with email + password
- [ ] Create `/api/auth/register` and `/api/auth/login` routes
- [ ] Protect all API routes with session middleware
- [ ] Test: register as each role, confirm session returns correct role

### Phase 2 — Replace localStorage (5–7 days)
- [ ] Replace merchant localStorage reads/writes with API calls
- [ ] Replace lender localStorage reads/writes with API calls
- [ ] Replace offer localStorage reads/writes with API calls
- [ ] Status changes write to both `merchants.status` and `status_history`
- [ ] Kamba drag-and-drop calls API instead of writing to localStorage

### Phase 2.5 — Leads System (3–4 days)
This slots in alongside Phase 2 since it's all new UI — nothing to migrate from localStorage.

**Dashboard nav after this phase:**

```
Admin left nav:          Sales Rep left nav:
─────────────────        ─────────────────
Leads (all + unassigned) Leads (mine only)
Merchant Directory       My Deals
Lender Directory         Kamba Pipeline
Kamba Pipeline
```

**Lead card preview shows:**
- Business name
- Owner name
- Phone + email (click-to-call / click-to-email)
- State
- Current status badge (New / Contacted / Docs Requested / Converted / Dead)
- Latest note snippet + who wrote it

**Lead detail view (on click) shows:**
- All card fields
- Full timestamped note log (call log style — newest first)
- Add note input
- Status change dropdown
- Convert to Merchant button (admin + rep) — disabled if already converted
- Assign to Rep dropdown (admin only)

**Build checklist:**
- [ ] Create `leads` and `lead_notes` tables in Supabase
- [ ] `/api/leads` GET — admin gets all, rep gets assigned + own
- [ ] `/api/leads` POST — create lead (admin + rep)
- [ ] `/api/leads/[id]` PATCH — update status, assign rep (admin only for assign)
- [ ] `/api/leads/[id]/notes` POST — append a note
- [ ] `/api/leads/[id]/convert` POST — creates merchant record, sets `converted_to`, flips status to `converted`
- [ ] Lead list UI with card previews
- [ ] Lead detail drawer/modal with note log
- [ ] Admin assign-to-rep dropdown
- [ ] Convert button → confirms → creates merchant → redirects to new merchant record

### Phase 3 — Documents & Storage ✅ COMPLETE
- [x] Wire document upload UI to Supabase Storage
- [x] Store metadata in `documents` table
- [x] Generate signed URLs for secure lender viewing
- [x] Build stipulations flow (lender requests → merchant sees upload prompt)

### Phase 4 — Real Auth UI (2–3 days)
Replace the profile selector mockup with real login and registration screens backed by Better Auth. Every role gets a real session after this phase.

- [ ] Login page — email + password form, calls `POST /api/auth/login`, stores session cookie
- [ ] Register page — for merchants and lenders to self-register. Admin and sales_rep accounts created by admin only
- [ ] Session persistence — on app load, call `GET /api/auth/me` to restore session. If no session, redirect to login
- [ ] Logout button in all dashboard shells — calls `POST /api/auth/logout`, clears session, redirects to login
- [ ] Remove profile selector mockup and demo-header bridge from `DashboardController.tsx`
- [ ] `DashboardController` routes to correct dashboard based on `user.role` from real session
- [ ] Protected route wrapper — any dashboard route without a valid session redirects to login
- [ ] Admin-only user management — admin can create sales_rep accounts from the admin dashboard

### Phase 5 — Matching Engine (2–3 days)
- [ ] Move matching logic to server route
- [ ] Auto-match runs when merchant hits status `sent to lender`
- [ ] Manual override UI for sales rep / admin
- [ ] Results write to `lender_matches`

### Phase 6 — Email Automation (2–3 days)
- [ ] Set up Resend account + domain
- [ ] Build email templates for each trigger (see table above)
- [ ] Wire lender notification to send merchant package PDF
- [ ] Wire all other status-change triggers

### Phase 7 — Demo Polish + Deploy (2–3 days)
- [ ] Fix `index.css` build warning (carried over from Phase 0)
- [ ] Seed database with realistic demo data
- [ ] Create demo accounts for each role (admin, rep, merchant, lender)
- [ ] Convert Vite API bridge routes to Vercel serverless functions
- [ ] Deploy to Vercel, set all env vars in Vercel dashboard
- [ ] Smoke test every role end-to-end on the live URL
- [ ] Write a short demo walkthrough script

### Phase 8 — Production Security Hardening / Customer Data Readiness
Before onboarding real merchant/customer data, complete the dedicated security pass in [`Docs/PRODUCTION_SECURITY_HARDENING_PLAN.md`](Docs/PRODUCTION_SECURITY_HARDENING_PLAN.md).

- [ ] Endpoint-by-endpoint authorization and ownership audit
- [ ] CSRF protection for cookie-authenticated mutations
- [ ] Rate limiting for auth, AI, and document upload routes
- [ ] Strict input validation schemas for all API routes
- [ ] Private document access hardening and signed URL audit logs
- [ ] Audit logging for sensitive actions and status changes
- [ ] Sensitive data masking/minimization
- [ ] Disabled-user/session revocation flow
- [ ] Security headers and CORS review
- [ ] Supabase RLS/storage policy verification
- [ ] Security regression tests and incident-response checklist

---

## Environment Variables Needed

```env
# Supabase
SUPABASE_URL=
SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=

# Better Auth
BETTER_AUTH_SECRET=
BETTER_AUTH_URL=

# Resend
RESEND_API_KEY=

# App
NEXT_PUBLIC_APP_URL=
```

---

## Dev Commands (Bun)

```bash
# Install
bun install

# Dev server
bun run dev

# Type check
bun run tsc --noEmit

# Add a package
bun add <package-name>
```

---

## What This Doc Is Not

This is not a UI spec. The frontend React components already exist and are working. This plan is only about the backend layer that makes the frontend real. Frontend changes (if any) are downstream of the API being built — the components just need their `localStorage` calls swapped for `fetch` calls to the routes defined here.
