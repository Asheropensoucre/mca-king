# Goose Agent Prompt — Phase 2: Replace localStorage + Leads System
> Phase 1 is complete. All 11 tables exist in Supabase. Better Auth and auth routes are wired up. The frontend still uses localStorage — that ends this phase.

---

## What You Are Doing This Phase

Two things in parallel:

1. **Replace all localStorage** in the existing frontend with real Supabase reads/writes via the auth-protected server routes you built in Phase 1
2. **Build the Leads system** — new tables are already in Supabase, now build the routes and UI

Also do this first before anything else:

3. **Enable RLS** on all 11 tables with proper role-based policies

---

## Step 0 — Enable RLS (do this first via Supabase MCP)

Run the following SQL via the Supabase MCP against the `mca-king` project. This enables Row Level Security and adds policies so the service role key (used server-side) bypasses RLS, while direct client access is locked down.

```sql
-- Enable RLS on all tables
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.merchants ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.owners ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.lenders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.lender_matches ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.offers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.status_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.stipulations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.leads ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.lead_notes ENABLE ROW LEVEL SECURITY;

-- Service role bypasses RLS entirely (used by supabaseAdmin server-side client)
-- No policies needed for service role — it always has full access
-- The policies below only apply to anon/authenticated client-side access

-- Block all direct client access to sensitive tables
-- All reads/writes go through server routes using the service role key
CREATE POLICY "block_public_users" ON public.users FOR ALL USING (false);
CREATE POLICY "block_public_merchants" ON public.merchants FOR ALL USING (false);
CREATE POLICY "block_public_owners" ON public.owners FOR ALL USING (false);
CREATE POLICY "block_public_lenders" ON public.lenders FOR ALL USING (false);
CREATE POLICY "block_public_lender_matches" ON public.lender_matches FOR ALL USING (false);
CREATE POLICY "block_public_offers" ON public.offers FOR ALL USING (false);
CREATE POLICY "block_public_documents" ON public.documents FOR ALL USING (false);
CREATE POLICY "block_public_status_history" ON public.status_history FOR ALL USING (false);
CREATE POLICY "block_public_stipulations" ON public.stipulations FOR ALL USING (false);
CREATE POLICY "block_public_leads" ON public.leads FOR ALL USING (false);
CREATE POLICY "block_public_lead_notes" ON public.lead_notes FOR ALL USING (false);
```

This means: no data can be read or written directly from the browser using the anon key. Everything goes through your server routes which use the service role key. This is the correct security model.

---

## Step 1 — Create Server Routes for All Entities

All routes go in `src/routes/`. Use `requireAuth` from `src/lib/requireAuth.ts` at the top of every route. Use `supabaseAdmin` from `src/lib/supabase-server.ts` for all database queries.

### Merchants

**`src/routes/merchants/index.ts`**
- `GET` — fetch merchants based on role:
  - `admin`: all merchants
  - `sales_rep`: only where `assigned_rep_id = user.id`
  - `merchant`: only their own row (where `user_id = user.id`)
  - `lender`: forbidden (lenders use lender_matches)
- `POST` — create new merchant (admin + sales_rep only). On create, also insert first row into `status_history` with `new_status = 'application & 3 months bank statements in'`

**`src/routes/merchants/[id].ts`**
- `GET` — get single merchant (enforce same role rules as above)
- `PATCH` — update merchant fields (admin + sales_rep only). If `status` is being changed, also insert into `status_history` with `previous_status`, `new_status`, `changed_by = user.id`
- `DELETE` — admin only

### Lenders

**`src/routes/lenders/index.ts`**
- `GET` — all lenders (admin + sales_rep only)
- `POST` — create lender (admin only)

**`src/routes/lenders/[id].ts`**
- `GET` — single lender (admin + sales_rep)
- `PATCH` — update lender (admin only)
- `DELETE` — admin only

### Offers

**`src/routes/offers/index.ts`**
- `GET` — fetch offers filtered by role:
  - `admin`: all offers
  - `sales_rep`: offers for their assigned merchants
  - `merchant`: only offers for their own merchant record
  - `lender`: only offers they created
- `POST` — create offer (lender only). On create, update merchant status to `one or more lender's sent offer`

**`src/routes/offers/[id].ts`**
- `PATCH` — accept or decline offer (merchant only):
  - Accept: set `status = 'accepted'`, `accepted_at = now()`, update merchant status to `Merchant accepts offer`
  - Decline: set `status = 'declined'`. If ALL offers for this merchant are now declined, update merchant status to `Merchant Declines Offer's`

### Leads

**`src/routes/leads/index.ts`**
- `GET` — fetch leads by role:
  - `admin`: all leads including unassigned
  - `sales_rep`: only where `assigned_rep_id = user.id` OR `created_by = user.id`
  - `merchant` and `lender`: forbidden
- `POST` — create lead (admin + sales_rep only). Set `created_by = user.id`

**`src/routes/leads/[id].ts`**
- `GET` — single lead with its `lead_notes` joined (newest note first)
- `PATCH` — update lead fields:
  - Status change: admin + sales_rep
  - `assigned_rep_id` change: admin only — if a sales_rep tries to change assignment, return 403
- `DELETE` — admin only

**`src/routes/leads/[id]/notes.ts`**
- `POST` — append a note (admin + sales_rep). Insert into `lead_notes` with `written_by = user.id`, `created_at = now()`. Notes are never edited or deleted.

**`src/routes/leads/[id]/convert.ts`**
- `POST` — convert lead to merchant (admin + sales_rep):
  1. Create a new row in `merchants` using the lead's `business_name`, `state`, and any other overlapping fields
  2. Set `leads.converted_to = new merchant id`
  3. Set `leads.status = 'converted'`
  4. Insert first `status_history` row for the new merchant
  5. Return the new merchant's id so the frontend can redirect

---

## Step 2 — Replace localStorage in Existing Components

Read each existing component carefully before editing. Swap localStorage reads/writes for `fetch` calls to the routes you just built. Keep all existing UI logic, state, and rendering exactly the same — only the data layer changes.

### Pattern to follow everywhere

```ts
// BEFORE (localStorage)
const merchants = JSON.parse(localStorage.getItem('merchants') || '[]')

// AFTER (server route)
const res = await fetch('/api/merchants', {
  headers: { 'Content-Type': 'application/json' }
})
const merchants = await res.json()
```

For writes:
```ts
// BEFORE
localStorage.setItem('merchants', JSON.stringify([...merchants, newMerchant]))

// AFTER
await fetch('/api/merchants', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify(newMerchant)
})
```

### Components to update

Go through each of these and replace all localStorage usage:

- `AdminDashboard.tsx` — merchant list, lender list, rep assignment
- `SalesRepDashboard.tsx` — assigned merchant list
- `MerchantDashboard.tsx` — own merchant record, offers
- `LenderDashboard.tsx` — offers creation
- `KanbanPipelineView.tsx` — drag-and-drop status updates must now call `PATCH /api/merchants/[id]` with the new status
- `App.tsx` — any top-level localStorage reads

Do not change any JSX, styling, or component structure. Only the data fetching changes.

### Legacy status migration

The old code had a migration function for the 6 → 12 status upgrade. Once localStorage is removed this migration is no longer needed — remove it cleanly.

---

## Step 3 — Build the Leads UI

Add the Leads section to Admin and Sales Rep dashboards. Match the existing visual style of the app exactly — same card style, same colors, same font sizes as the merchant cards.

### Dashboard nav changes

Add "Leads" as the first item in the left nav for both Admin and Sales Rep views, above everything else:

```
Admin left nav:            Sales Rep left nav:
──────────────────         ──────────────────
Leads                      Leads
Merchant Directory         My Deals
Lender Directory           Kamba Pipeline
Kamba Pipeline
```

### Lead card (list view)

Each lead shows as a card with:
- Business name (bold, large)
- Owner name
- Phone (click-to-call: `tel:` link)
- Email (click-to-email: `mailto:` link)
- State
- Status badge — color coded:
  - `new` → gray
  - `contacted` → blue
  - `docs_requested` → yellow
  - `converted` → green
  - `dead` → red
- Latest note snippet (first 80 chars) + who wrote it + how long ago

"New Lead" button in the top right of the leads view. Admin sees all leads. Sales rep sees only theirs.

### Lead detail (drawer or modal — match whatever pattern the app already uses)

Opens when a card is clicked. Shows:

- All fields from the card (editable inline or via form)
- Status dropdown (New / Contacted / Docs Requested / Dead) — Converted is set automatically, not manually
- Assign to Rep dropdown — **admin only**, shows list of sales reps from users table
- Full note log (newest first) — each entry shows: body, written by (full_name), timestamp
- "Add Note" text area + submit button at the bottom
- "Convert to Merchant" button:
  - Disabled and labeled "Already Converted" if `status === 'converted'`
  - Shows a confirmation before firing
  - On success: closes the detail view and navigates to the new merchant record

### New Lead form

Simple modal/drawer form with fields:
- Business name (required)
- Owner name
- Phone
- Email
- State (dropdown of US states)
- Initial note (optional — if provided, creates first `lead_notes` entry on save)

Admin creating a lead can also assign it to a rep immediately from this form. Sales rep creating a lead — `assigned_rep_id` is set to themselves automatically.

---

## Step 4 — Type Updates

Update `src/types.ts` to add the Lead and LeadNote types. Do not remove any existing types.

```ts
export type LeadStatus = 'new' | 'contacted' | 'docs_requested' | 'converted' | 'dead'

export interface Lead {
  id: string
  created_by: string
  assigned_rep_id: string | null
  business_name: string
  owner_name: string | null
  phone: string | null
  email: string | null
  state: string | null
  status: LeadStatus
  converted_to: string | null
  created_at: string
  updated_at: string
}

export interface LeadNote {
  id: string
  lead_id: string
  written_by: string
  body: string
  created_at: string
  // Joined from users table:
  author_name?: string
}
```

---

## Step 5 — Verify Clean Build

```bash
bun run tsc --noEmit
bun run dev
```

Manually verify:
- [ ] All 4 dashboard views load without errors
- [ ] Merchant list loads from Supabase (not localStorage)
- [ ] Kamba drag-and-drop updates status in Supabase
- [ ] Leads section appears in Admin and Sales Rep nav
- [ ] Can create a lead
- [ ] Can add a note to a lead
- [ ] Can change lead status
- [ ] Admin can assign a lead to a rep
- [ ] Can convert a lead to a merchant
- [ ] No TypeScript errors

---

## Hard Rules

1. **Do not change any UI styling, layout, or JSX structure** in existing components — only swap the data layer
2. **All routes use `requireAuth`** — no unprotected routes
3. **All database access uses `supabaseAdmin`** (service role) — never the anon client in server routes
4. **Status changes always write to `status_history`** — never update `merchants.status` without also inserting a history row
5. **Lead notes are append-only** — no edit or delete on `lead_notes`
6. **`assigned_rep_id` on leads can only be changed by admin** — enforce this in the route, not just the UI
7. **Use Bun for any new installs**
8. **No `any` types**
9. **Use the Supabase MCP** if you need to inspect tables, run queries, or debug data

---

## Done When

- [ ] RLS enabled on all 11 tables via MCP
- [ ] All merchant routes created and working
- [ ] All lender routes created and working
- [ ] All offer routes created and working
- [ ] All lead routes created and working (including notes and convert)
- [ ] localStorage removed from all existing components
- [ ] Legacy 6-status migration code removed
- [ ] Lead types added to `types.ts`
- [ ] Leads section in Admin and Sales Rep nav
- [ ] Lead card list view working
- [ ] Lead detail view working (notes, status, assign, convert)
- [ ] New Lead form working
- [ ] `bun run tsc --noEmit` passes with zero errors
- [ ] All 4 dashboards load and function correctly

When done, print a summary of every file created or modified.
