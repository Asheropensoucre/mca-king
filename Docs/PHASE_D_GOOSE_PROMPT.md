# Goose Agent Prompt — Phase D: Search, Filters, and Saved Views
> Phases A, B, and C are complete. The CRM now has activity timelines, tasks, funded deals, commissions, and merchant-file submissions. Phase D makes the CRM usable at scale — when there are hundreds of merchants, leads, and lenders, you need to find things fast.

---

## Context

- App is live at portal.mcaking.com
- All routes live in `src/routes/` and are registered in `src/server/api.ts`
- After adding routes, run `bun run build` to rebuild `api/index.js` for Vercel
- All DB access uses `supabaseAdmin` from `src/lib/supabase-server.ts`
- Auth uses `requireAuth` from `src/lib/requireAuth.ts`
- Follow the same patterns already established in existing routes

---

## What You Are Building

Three things:

1. **Search and filters** — add query params to existing list routes so admin/reps can filter merchants, leads, lenders, tasks, and fundings
2. **Global search** — a single search bar that searches across merchants, leads, and lenders at once
3. **Saved views** — let users save a filter combination as a named view they can return to

---

## Step 0 — Read First

Before writing anything, read:
- `src/routes/merchants/index.ts` — current merchant list route
- `src/routes/leads/index.ts` — current leads list route
- `src/routes/lenders/index.ts` — current lenders list route
- `src/routes/tasks/index.ts` — current tasks list route
- `src/server/api.ts` — how routes are registered
- `components/dashboards/AdminDashboard.tsx` — main admin list view
- `components/dashboards/SalesRepDashboard.tsx` — rep list view
- `components/dashboards/shared/LeadManager.tsx` — leads UI
- `src/lib/api-client.ts` — existing API client patterns

---

## Step 1 — Database (use Supabase MCP)

```sql
-- SAVED VIEWS
create table saved_views (
  id              uuid primary key default gen_random_uuid(),
  user_id         uuid references users(id) on delete cascade,
  name            text not null,
  entity_type     text not null check (entity_type in ('merchants', 'leads', 'lenders', 'tasks', 'fundings')),
  filters         jsonb not null default '{}'::jsonb,
  sort            jsonb not null default '{}'::jsonb,
  is_shared       boolean default false,
  created_at      timestamptz default now(),
  updated_at      timestamptz default now()
);

create index saved_views_user_idx on saved_views(user_id, entity_type);
create index saved_views_shared_idx on saved_views(is_shared, entity_type);

alter table public.saved_views enable row level security;
create policy "block_public_saved_views" on public.saved_views for all using (false);
```

Verify the table exists before continuing.

---

## Step 2 — Add Filters to Existing List Routes

Update each existing list route to accept and apply query params. Do not change any existing logic — only add filter/search handling on top.

### `src/routes/merchants/index.ts` GET

Add support for these query params:

```ts
search        // text search on business_name, owner name, email, phone
status        // filter by exact merchant status
rep_id        // filter by assigned_rep_id
state         // filter by state
industry      // filter by industry
min_revenue   // monthly_revenue >= value
max_revenue   // monthly_revenue <= value
stale         // 'true' = no activity in the last 3 days (use updated_at as proxy)
page          // pagination: page number (default 1)
per_page      // pagination: results per page (default 50, max 100)
```

Apply filters to the Supabase query:

```ts
let query = supabaseAdmin.from('merchants').select('*', { count: 'exact' })

// Role filtering stays the same as before
if (user.role === 'sales_rep') {
  query = query.eq('assigned_rep_id', user.id)
} else if (user.role === 'merchant') {
  query = query.eq('user_id', user.id)
}

// Search
if (search) {
  query = query.or(`business_name.ilike.%${search}%,email.ilike.%${search}%,phone.ilike.%${search}%`)
}

// Filters
if (status) query = query.eq('status', status)
if (rep_id) query = query.eq('assigned_rep_id', rep_id)
if (state) query = query.eq('state', state)
if (industry) query = query.eq('industry', industry)
if (min_revenue) query = query.gte('monthly_revenue', Number(min_revenue))
if (max_revenue) query = query.lte('monthly_revenue', Number(max_revenue))
if (stale === 'true') {
  const threeDaysAgo = new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString()
  query = query.lte('updated_at', threeDaysAgo)
}

// Pagination
const pageNum = Math.max(1, parseInt(page ?? '1'))
const perPage = Math.min(100, parseInt(per_page ?? '50'))
query = query
  .order('created_at', { ascending: false })
  .range((pageNum - 1) * perPage, pageNum * perPage - 1)

const { data, count } = await query

return Response.json({ data, total: count, page: pageNum, per_page: perPage })
```

### `src/routes/leads/index.ts` GET

Add:
```
search          // business_name, owner_name, email, phone
status          // lead status
assigned_rep_id // filter by rep
page / per_page
```

### `src/routes/lenders/index.ts` GET

Add:
```
search    // company_name, contact_name, contact_email
active    // 'true' | 'false' filter by is_active
industry  // filter by industry (array contains)
state     // filter by state (array contains)
page / per_page
```

### `src/routes/tasks/index.ts` GET

Add:
```
status       // open | completed | cancelled
assigned_to  // filter by user id
due_before   // due_at <= value (ISO date string)
overdue      // 'true' = due_at < now() AND status = 'open'
entity_type  // already supported — make sure it still works
entity_id    // already supported
page / per_page
```

### `src/routes/fundings/index.ts` GET (if exists from Phase B)

Add:
```
from       // funded_at >= date
to         // funded_at <= date
lender_id  // filter by lender
rep_id     // filter by sales rep
page / per_page
```

---

## Step 3 — Global Search Route

Create `src/routes/search/index.ts` — GET

Query param: `?q=<search term>`

Searches across merchants, leads, and lenders simultaneously. Returns grouped results.

```ts
// requireAuth — admin + sales_rep only
// merchant + lender: forbidden (they use their own filtered views)
const q = `%${searchTerm}%`

// Run three queries in parallel
const [merchants, leads, lenders] = await Promise.all([
  supabaseAdmin
    .from('merchants')
    .select('id, business_name, status, state, assigned_rep_id')
    .or(`business_name.ilike.${q},state.ilike.${q},industry.ilike.${q}`)
    // apply rep filter if sales_rep role
    .limit(10),

  supabaseAdmin
    .from('leads')
    .select('id, business_name, owner_name, status, assigned_rep_id')
    .or(`business_name.ilike.${q},owner_name.ilike.${q},email.ilike.${q}`)
    // apply rep filter if sales_rep role
    .limit(10),

  supabaseAdmin
    .from('lenders')
    .select('id, company_name, contact_name, contact_email')
    .or(`company_name.ilike.${q},contact_name.ilike.${q},contact_email.ilike.${q}`)
    .limit(10),
])

return Response.json({
  merchants: merchants.data ?? [],
  leads: leads.data ?? [],
  lenders: lenders.data ?? [],
  query: searchTerm,
})
```

Register in `src/server/api.ts`:
```
GET /api/search
```

---

## Step 4 — Saved Views Routes

Create `src/routes/saved-views/index.ts`

**GET** — list saved views for current user

```ts
// requireAuth — admin + sales_rep
// return views where user_id = user.id OR is_shared = true
// optionally filter by entity_type query param
```

**POST** — create a saved view

Body: `{ name, entity_type, filters, sort, is_shared? }`

```ts
// requireAuth — admin + sales_rep
// set user_id = user.id
// only admin can set is_shared = true
// insert and return
```

Create `src/routes/saved-views/[id].ts`

**PATCH** — update saved view (owner or admin only)

**DELETE** — delete saved view (owner or admin only)

Register in `src/server/api.ts`:
```
GET    /api/saved-views
POST   /api/saved-views
PATCH  /api/saved-views/:id
DELETE /api/saved-views/:id
```

---

## Step 5 — Frontend Components

### `components/dashboards/shared/SearchBar.tsx`

Global search input. Used in the top nav of admin and sales rep dashboards.

- Text input with search icon
- Debounce input by 300ms before firing
- On input: call `GET /api/search?q=<term>`
- Show results in a dropdown below the input grouped by type:
  - **Merchants** section — show business name, status badge, state
  - **Leads** section — show business name, owner name, status badge
  - **Lenders** section — show company name, contact name
- Clicking a result navigates to that record's detail view
- Press Escape to close
- Shows "No results" if all three arrays are empty
- Min 2 characters before searching

### `components/dashboards/shared/FilterBar.tsx`

A horizontal filter bar shown above list views. Accepts different filter configs per entity type.

Props:
```ts
interface FilterBarProps {
  entityType: 'merchants' | 'leads' | 'lenders' | 'tasks'
  filters: Record<string, string>
  onFilterChange: (filters: Record<string, string>) => void
  onReset: () => void
  savedViews?: SavedView[]
  onSaveView?: (name: string) => void
  onLoadView?: (view: SavedView) => void
}
```

For **merchants**, show these filter controls:
- Search text input
- Status dropdown (all 12 statuses + "All")
- State dropdown (US states + "All")
- Rep dropdown (list of sales reps + "All") — admin only
- "Stale (3+ days)" toggle checkbox
- Reset button

For **leads**, show:
- Search text input
- Status dropdown (new/contacted/docs_requested/converted/dead + "All")
- Rep dropdown — admin only
- Reset button

For **lenders**, show:
- Search text input
- Active toggle (All / Active / Inactive)
- Reset button

For **tasks**, show:
- Status dropdown (open/completed/cancelled + "All")
- Priority dropdown (All / urgent / high / normal / low)
- Overdue toggle
- Reset button

### `components/dashboards/shared/SavedViewsMenu.tsx`

A small dropdown menu that appears next to the FilterBar.

Shows:
- List of saved views for the current entity type
- Clicking a view loads its filters into the FilterBar
- "Save current view" button — opens a small modal asking for a name, then calls POST /api/saved-views with current filters
- Shared views (is_shared = true) shown with a different icon
- Admin can see all shared views
- Delete button per view (owner or admin)

---

## Step 6 — Wire Into Dashboards

### `AdminDashboard.tsx`

- Add `SearchBar` to the top of the dashboard shell header
- Add `FilterBar` above the merchant directory list
- Add `SavedViewsMenu` next to the FilterBar
- When filters change, re-fetch merchants with filter params appended to the API call
- Add pagination controls below the merchant list (Previous / Page X of Y / Next)
- Add `FilterBar` above the lender directory list too

### `SalesRepDashboard.tsx`

- Add `FilterBar` above My Deals list (search + status + stale toggle)
- Add `SavedViewsMenu` next to the FilterBar
- Pagination controls below the list

### Lead list (wherever `LeadManager.tsx` or lead list renders)

- Add `FilterBar` for leads above the lead cards
- Add `SavedViewsMenu`
- Re-fetch leads when filters change

---

## Step 7 — Pre-built Shared Saved Views

After the saved views route works, seed these shared views via the Supabase MCP. Insert them with `user_id` set to the admin user's id and `is_shared = true`:

```sql
-- Get admin user id first, then insert:
INSERT INTO saved_views (user_id, name, entity_type, filters, sort, is_shared) VALUES
('<admin_id>', 'Needs Docs', 'merchants', '{"status": "more docs requested"}', '{"field": "updated_at", "direction": "asc"}', true),
('<admin_id>', 'Offers Out', 'merchants', '{"status": "one or more lender''s sent offer"}', '{"field": "updated_at", "direction": "asc"}', true),
('<admin_id>', 'Contract Sent', 'merchants', '{"status": "contract sent"}', '{"field": "updated_at", "direction": "asc"}', true),
('<admin_id>', 'Stale Deals', 'merchants', '{"stale": "true"}', '{"field": "updated_at", "direction": "asc"}', true),
('<admin_id>', 'Funded This Month', 'merchants', '{"status": "FUNDED"}', '{"field": "updated_at", "direction": "desc"}', true),
('<admin_id>', 'Unassigned Leads', 'leads', '{"status": "new"}', '{"field": "created_at", "direction": "desc"}', true),
('<admin_id>', 'Urgent Tasks', 'tasks', '{"priority": "urgent", "status": "open"}', '{"field": "due_at", "direction": "asc"}', true),
('<admin_id>', 'Overdue Tasks', 'tasks', '{"overdue": "true", "status": "open"}', '{"field": "due_at", "direction": "asc"}', true);
```

---

## Step 8 — Type Updates

Add to `src/types.ts`:

```ts
export interface SavedView {
  id: string
  user_id: string
  name: string
  entity_type: 'merchants' | 'leads' | 'lenders' | 'tasks' | 'fundings'
  filters: Record<string, string>
  sort: { field: string; direction: 'asc' | 'desc' }
  is_shared: boolean
  created_at: string
  updated_at: string
}

export interface SearchResults {
  merchants: Array<{ id: string; business_name: string; status: string; state: string }>
  leads: Array<{ id: string; business_name: string; owner_name: string; status: string }>
  lenders: Array<{ id: string; company_name: string; contact_name: string; contact_email: string }>
  query: string
}

export interface PaginatedResponse<T> {
  data: T[]
  total: number
  page: number
  per_page: number
}
```

---

## Step 9 — API Client Updates

Add to `src/lib/api-client.ts`:

```ts
search: {
  global: (q: string) =>
    fetch(`/api/search?q=${encodeURIComponent(q)}`).then(r => r.json()),
},
savedViews: {
  list: (entityType?: string) =>
    fetch(`/api/saved-views${entityType ? `?entity_type=${entityType}` : ''}`).then(r => r.json()),
  create: (data: Partial<SavedView>) =>
    fetch('/api/saved-views', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data) }).then(r => r.json()),
  update: (id: string, data: Partial<SavedView>) =>
    fetch(`/api/saved-views/${id}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data) }).then(r => r.json()),
  delete: (id: string) =>
    fetch(`/api/saved-views/${id}`, { method: 'DELETE' }).then(r => r.json()),
},
```

---

## Step 10 — Rebuild + Verify

```bash
bun run build
bun run tsc --noEmit
```

Manual smoke tests:
- [ ] `saved_views` table exists in Supabase with RLS
- [ ] Search bar in admin dashboard returns results across merchants, leads, lenders
- [ ] Clicking a search result navigates to the correct record
- [ ] Merchant list filters by status, state, rep, search text
- [ ] Stale filter returns merchants not updated in 3+ days
- [ ] Lead list filters by status and search
- [ ] Task list filters by status, priority, overdue
- [ ] Pagination works — page 2 returns different results
- [ ] Can save current merchant filters as a named view
- [ ] Saved view reloads filters when clicked
- [ ] Shared views visible to all admin/rep users
- [ ] Sales rep cannot see another rep's private saved views
- [ ] Pre-built shared views appear in the menu
- [ ] TypeScript clean
- [ ] Build passing

---

## Hard Rules

1. **Never return data the user's role shouldn't see** — apply the same role filters that already exist in each route, then add filter params on top
2. **Search is additive** — never remove existing route logic, only add filter handling
3. **Pagination is required on all filtered list routes** — unbounded queries will kill performance at scale
4. **Saved views with `is_shared = true` can only be created by admin** — enforce in the route
5. **Global search minimum 2 characters** — enforce in the frontend, not the route
6. **Rebuild `api/index.js`** — run `bun run build` after all route changes
7. **No `any` types**
8. **Use Bun for installs**
9. **Use Supabase MCP** to create tables, seed shared views, and verify data

---

## Done When

- [ ] `saved_views` table created with indexes and RLS via MCP
- [ ] Pre-built shared saved views seeded via MCP
- [ ] Merchant list route updated with all filter params + pagination
- [ ] Leads list route updated with filter params + pagination
- [ ] Lenders list route updated with filter params + pagination
- [ ] Tasks list route updated with filter params + pagination
- [ ] Fundings list route updated with filter params + pagination (if exists)
- [ ] `src/routes/search/index.ts` created
- [ ] `src/routes/saved-views/index.ts` created
- [ ] `src/routes/saved-views/[id].ts` created
- [ ] All new routes registered in `src/server/api.ts`
- [ ] `SearchBar.tsx` created and wired into admin + rep dashboard header
- [ ] `FilterBar.tsx` created and wired into merchant list, lead list
- [ ] `SavedViewsMenu.tsx` created and wired alongside FilterBar
- [ ] Pagination controls added to merchant and lead lists
- [ ] `SavedView`, `SearchResults`, `PaginatedResponse` types added to `types.ts`
- [ ] API client updated
- [ ] `bun run build` passes clean
- [ ] `bun run tsc --noEmit` passes clean
- [ ] All smoke tests pass

When done, print a summary of every file created or modified.
