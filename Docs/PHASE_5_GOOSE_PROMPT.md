# Goose Agent Prompt — Phase 5: Matching Engine
> Phases 1–4 are complete. Real auth, Supabase, all routes, documents, leads — all working. Now we build the lender matching engine server-side and wire it into the UI.

---

## What You Are Doing This Phase

The app currently has some client-side matching logic. This phase moves it entirely to the server, makes it run automatically when a merchant status moves to `sent to lender`, and adds manual override UI for admin and sales reps.

1. **Auto-match route** — evaluate a merchant against all active lenders and insert matches into `lender_matches`
2. **Auto-trigger** — when merchant status changes to `sent to lender`, auto-match fires automatically
3. **Manual match route** — admin/rep can manually add or remove a lender from a merchant's matches
4. **Match results UI** — admin/rep can see which lenders matched and why, notify lenders, and manually override
5. **Lender side** — matched lenders can see their assigned merchants

---

## Step 0 — Read First

Before writing anything, read:

- `src/routes/merchants/[id].ts` — understand how status changes are currently handled, specifically the `sent to lender` transition
- `components/dashboards/AdminDashboard.tsx` — find any existing client-side matching logic
- `components/dashboards/shared/MerchantDetailView.tsx` — where the matched lenders panel likely lives
- `components/dashboards/LenderDashboard.tsx` — how lenders currently see merchants
- `types.ts` — find existing lender and match types

Understand what exists before replacing anything.

---

## Step 1 — Auto-Match Route

Create `src/routes/matching/run.ts` — POST

Body: `{ merchant_id }`

This route evaluates a merchant against every active lender and inserts matches.

```ts
// Auth: admin + sales_rep only
const user = await requireAuth(req)
if (!['admin', 'sales_rep'].includes(user.role)) {
  return new Response('Forbidden', { status: 403 })
}

// 1. Fetch the merchant
const merchant = await supabaseAdmin
  .from('merchants')
  .select('*')
  .eq('id', merchant_id)
  .single()

// 2. Fetch all active lenders
const lenders = await supabaseAdmin
  .from('lenders')
  .select('*')
  .eq('is_active', true)

// 3. Run match logic for each lender
const matches = []
for (const lender of lenders.data) {
  if (isMatch(merchant.data, lender)) {
    matches.push({
      merchant_id,
      lender_id: lender.id,
      match_type: 'auto',
      matched_by: null
    })
  }
}

// 4. Insert matches — use upsert to avoid duplicates
// Only insert if a match for this merchant+lender doesn't already exist
await supabaseAdmin
  .from('lender_matches')
  .upsert(matches, { onConflict: 'merchant_id,lender_id', ignoreDuplicates: true })

// 5. Return the matches with lender names joined
return Response.json({ matched: matches.length, matches })
```

### The match logic function

```ts
function isMatch(merchant: Merchant, lender: Lender): boolean {
  // Revenue range — skip check if lender has no min/max set
  if (lender.min_revenue && merchant.monthly_revenue < lender.min_revenue) return false
  if (lender.max_revenue && merchant.monthly_revenue > lender.max_revenue) return false

  // Credit score
  if (lender.min_credit && merchant.credit_score < lender.min_credit) return false

  // Position limit — merchant's current advance positions
  if (lender.max_positions && merchant.current_positions > lender.max_positions) return false

  // Industry — empty array means lender accepts all industries
  if (lender.industries?.length > 0 && !lender.industries.includes(merchant.industry)) return false

  // State — empty array means lender operates in all states
  if (lender.states?.length > 0 && !lender.states.includes(merchant.state)) return false

  // Requested amount range
  if (lender.min_amount && merchant.requested_amount < lender.min_amount) return false
  if (lender.max_amount && merchant.requested_amount > lender.max_amount) return false

  return true
}
```

---

## Step 2 — Auto-Trigger on Status Change

In `src/routes/merchants/[id].ts`, find the PATCH handler where merchant status is updated.

Add this after the status is saved to the database:

```ts
// When status moves to 'sent to lender', auto-run matching
if (newStatus === 'sent to lender') {
  // Fire matching internally — same logic as the /api/matching/run route
  // Call the match function directly (import it), don't make an HTTP call to yourself
  await runAutoMatch(merchant_id, user.id)
}
```

Extract the match logic into a shared utility so both the route and the auto-trigger can use it without duplication:

Create `src/lib/matching.ts`:
```ts
export async function runAutoMatch(merchant_id: string, triggered_by: string) {
  // fetch merchant, fetch lenders, run isMatch, upsert lender_matches
  // same logic as the route above — put it here, import it in both places
}

export function isMatch(merchant: Merchant, lender: Lender): boolean {
  // match logic here
}
```

---

## Step 3 — Manual Match Route

Create `src/routes/matching/manual.ts`

**POST** — manually add a lender to a merchant's matches

Body: `{ merchant_id, lender_id }`

1. `requireAuth` — admin + sales_rep only
2. Check the match doesn't already exist
3. Insert into `lender_matches` with `match_type: 'manual'`, `matched_by: user.id`
4. Return the new match row

**DELETE** — remove a lender from a merchant's matches

Body: `{ merchant_id, lender_id }`

1. `requireAuth` — admin only (reps can add manually but only admin can remove)
2. Delete from `lender_matches` where `merchant_id` and `lender_id` match
3. Return 200

---

## Step 4 — Matched Lenders List Route

Create `src/routes/matching/index.ts` — GET

Query param: `?merchant_id=<uuid>`

1. `requireAuth`
2. Role rules:
   - `admin` + `sales_rep`: any merchant
   - `lender`: only merchants matched to them (where their `lender_id` is in `lender_matches`)
   - `merchant`: forbidden
3. Fetch `lender_matches` joined with `lenders` for the given merchant:
   ```ts
   const { data } = await supabaseAdmin
     .from('lender_matches')
     .select(`
       *,
       lender:lenders (
         id,
         company_name,
         contact_name,
         contact_email
       )
     `)
     .eq('merchant_id', merchant_id)
   ```
4. Return the matches with lender details

---

## Step 5 — Notify Lenders Route

Create `src/routes/matching/notify.ts` — POST

Body: `{ merchant_id }`

Admin + sales_rep only. This marks matched lenders as notified. Email delivery is Phase 6 — for now just update the timestamp.

1. `requireAuth` — admin + sales_rep only
2. Update all `lender_matches` rows for this merchant: set `notified_at = now()`
3. Return the count of lenders notified

---

## Step 6 — Register Routes in Vite Bridge

In `src/server/api.ts`, register:

```
POST   /api/matching/run
POST   /api/matching/manual
DELETE /api/matching/manual
GET    /api/matching
POST   /api/matching/notify
```

Follow the same pattern already used in that file.

---

## Step 7 — Update MerchantDetailView UI

In `components/dashboards/shared/MerchantDetailView.tsx`, find the matched lenders section (or add one if it doesn't exist).

Replace any client-side matching with calls to the real routes.

The matched lenders panel should show:
- List of matched lenders with company name, contact name, contact email
- Match type badge: `auto` (gray) or `manual` (blue)
- "Run Auto-Match" button — calls `POST /api/matching/run`, refreshes the list
- "Notify Lenders" button — calls `POST /api/matching/notify`, shows confirmation with count
  - Button shows "Notified" with timestamp if `notified_at` is already set
- Manual add: a dropdown of all lenders NOT already matched, with an "Add" button — calls `POST /api/matching/manual`
- Admin-only: a remove (×) button per match — calls `DELETE /api/matching/manual`

---

## Step 8 — Update Lender Dashboard

In `components/dashboards/LenderDashboard.tsx`:

Replace any existing merchant list logic with a call to `GET /api/matching?lender_id=<id>` — wait, the route uses `merchant_id`. 

Instead use: `GET /api/merchants` which already filters by role — lenders will only see their matched merchants because the merchants route enforces this via `lender_matches`.

Make sure the lender dashboard:
- Loads merchants from `GET /api/merchants` (already done in Phase 2 — verify it works correctly for lenders)
- Shows each matched merchant's business name, requested amount, state, status
- Allows the lender to create an offer on each merchant card (already built in Phase 2/3 — just verify it still works)

---

## Step 9 — Type Updates

Add to `src/types.ts`:

```ts
export interface LenderMatch {
  id: string
  merchant_id: string
  lender_id: string
  match_type: 'auto' | 'manual'
  matched_by: string | null
  notified_at: string | null
  created_at: string
  // joined:
  lender?: {
    id: string
    company_name: string
    contact_name: string | null
    contact_email: string
  }
}
```

---

## Step 10 — Add Unique Constraint via Supabase MCP

Use the Supabase MCP to add a unique constraint on `lender_matches` so the upsert works correctly:

```sql
ALTER TABLE public.lender_matches
ADD CONSTRAINT lender_matches_merchant_lender_unique
UNIQUE (merchant_id, lender_id);
```

---

## Step 11 — Verify

```bash
bun run tsc --noEmit
bun run build
```

Manual smoke tests:
- [ ] Move a merchant to `sent to lender` → auto-match fires → matched lenders appear in detail view
- [ ] "Run Auto-Match" button works manually
- [ ] Manually add a lender to a merchant's matches
- [ ] Admin can remove a lender from matches
- [ ] "Notify Lenders" button updates `notified_at` and shows confirmation
- [ ] Lender logs in and sees only their matched merchants
- [ ] No duplicate matches created when auto-match runs twice
- [ ] TypeScript clean, build passing

---

## Hard Rules

1. **Match logic lives in `src/lib/matching.ts`** — imported by both the route and the auto-trigger. Never duplicate it.
2. **Upsert with `ignoreDuplicates: true`** — running auto-match twice must never create duplicates
3. **Do not change any existing dashboard layout or styling**
4. **All routes use `requireAuth`**
5. **All DB access uses `supabaseAdmin`**
6. **Use Supabase MCP** to add the unique constraint and debug if needed
7. **Use Bun for any new installs**
8. **No `any` types**

---

## Done When

- [ ] Unique constraint added to `lender_matches` via MCP
- [ ] `src/lib/matching.ts` created with shared match logic
- [ ] `src/routes/matching/run.ts` created
- [ ] `src/routes/matching/manual.ts` created (POST + DELETE)
- [ ] `src/routes/matching/index.ts` created (GET)
- [ ] `src/routes/matching/notify.ts` created
- [ ] Auto-trigger wired into merchant status change for `sent to lender`
- [ ] All new routes registered in Vite bridge
- [ ] `MerchantDetailView.tsx` matched lenders panel updated
- [ ] `LenderDashboard.tsx` verified working with real matched merchants
- [ ] `LenderMatch` type added to `types.ts`
- [ ] `bun run tsc --noEmit` passes clean
- [ ] `bun run build` passes clean
- [ ] All smoke tests pass

When done, print a summary of every file created or modified.
