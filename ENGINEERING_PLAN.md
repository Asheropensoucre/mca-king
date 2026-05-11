# MCA King — Engineering Plan
> This is the forward-looking build plan. For the project audit and history, see `Project_Road_Map.md`.

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
The lender network. Admin-managed.

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
| `admin` | Everything — all merchants, all lenders, all offers |
| `sales_rep` | Only merchants where `assigned_rep_id = user.id` |
| `merchant` | Only their own row + their own offers/docs |
| `lender` | Only merchants matched to them via `lender_matches` |

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

### Phase 3 — Documents & Storage (3–4 days)
- [ ] Wire document upload UI to Supabase Storage
- [ ] Store metadata in `documents` table
- [ ] Generate signed URLs for secure lender viewing
- [ ] Build stipulations flow (lender requests → merchant sees upload prompt)

### Phase 4 — Matching Engine (2–3 days)
- [ ] Move matching logic to API route
- [ ] Auto-match runs when merchant hits status `sent to lender`
- [ ] Manual override UI for sales rep / admin
- [ ] Results write to `lender_matches`

### Phase 5 — Email Automation (2–3 days)
- [ ] Set up Resend account + domain
- [ ] Build email templates for each trigger (see table above)
- [ ] Wire lender notification to send merchant package PDF
- [ ] Wire all other status-change triggers

### Phase 6 — Demo Polish (2–3 days)
- [ ] Seed database with realistic demo data
- [ ] Create demo accounts for each role (admin, rep, merchant, lender)
- [ ] Write a short demo walkthrough script
- [ ] Deploy to Vercel, confirm all env vars set

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
