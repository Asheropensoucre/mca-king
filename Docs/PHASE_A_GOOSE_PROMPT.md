# Goose Agent Prompt — Phase A: CRM Activity Timeline + Tasks
> MCA King is live at portal.mcaking.com. V1 is complete. This is the first V2 phase. The goal is to turn MCA King from a pipeline tool into a daily CRM where reps and admins know exactly what happened on every deal and what needs to happen next.

---

## Context

The app has:
- Real auth, Supabase database, all routes in `src/routes/`
- Vercel deployment using a single bundled function at `api/index.js`
- Build process: `bun run build` runs `scripts/build-api.ts` then Vite
- All new routes must be registered in `src/server/api.ts`
- After adding routes, run `bun run build` to rebuild `api/index.js` for Vercel

---

## What You Are Building

Two new systems:

1. **Activity Timeline** — an immutable, append-only event feed attached to every merchant and lead. Records what happened, who did it, and when. Reps never need to guess who last touched a deal.

2. **Tasks** — a follow-up and reminder system. Reps create tasks on merchants and leads with due dates, priorities, and assignees. Admin sees all tasks. Reps see their own.

---

## Step 0 — Read First

Before writing anything, read:
- `src/server/api.ts` — understand how routes are registered
- `src/routes/merchants/[id].ts` — where status changes happen (activity writes go here)
- `src/routes/leads/index.ts` and `src/routes/leads/[id].ts` — lead events
- `src/routes/documents/upload.ts` — document events
- `src/routes/offers/index.ts` and `[id].ts` — offer events
- `src/routes/stipulations/index.ts` — stipulation events
- `src/routes/matching/notify.ts` — match events
- `components/dashboards/shared/MerchantDetailView.tsx` — where activity timeline will be added
- `components/dashboards/shared/LeadManager.tsx` or lead detail component — where lead activity goes
- `src/lib/send-email.ts` — pattern to follow for fire-and-forget side effects

---

## Step 1 — Database Tables (use Supabase MCP)

Run this SQL via the Supabase MCP against the `mca-king` project:

```sql
-- ACTIVITIES
-- Immutable event feed. Never update or delete rows.
create table activities (
  id              uuid primary key default gen_random_uuid(),
  entity_type     text not null check (entity_type in ('lead', 'merchant', 'lender', 'offer', 'document', 'stipulation', 'user', 'funding')),
  entity_id       uuid not null,
  user_id         uuid references users(id),
  activity_type   text not null check (activity_type in ('note', 'call', 'email', 'status_change', 'upload', 'match', 'offer', 'task', 'system')),
  body            text,
  metadata        jsonb default '{}'::jsonb,
  created_at      timestamptz default now()
);

create index activities_entity_idx on activities(entity_type, entity_id, created_at desc);
create index activities_user_idx on activities(user_id, created_at desc);
create index activities_type_idx on activities(activity_type, created_at desc);

-- TASKS
-- Follow-up and reminder system.
create table tasks (
  id              uuid primary key default gen_random_uuid(),
  assigned_to     uuid references users(id),
  created_by      uuid references users(id),
  entity_type     text not null check (entity_type in ('lead', 'merchant', 'lender', 'funding')),
  entity_id       uuid not null,
  title           text not null,
  description     text,
  priority        text not null default 'normal' check (priority in ('low', 'normal', 'high', 'urgent')),
  status          text not null default 'open' check (status in ('open', 'completed', 'cancelled')),
  due_at          timestamptz,
  completed_at    timestamptz,
  created_at      timestamptz default now(),
  updated_at      timestamptz default now()
);

create index tasks_assigned_status_due_idx on tasks(assigned_to, status, due_at);
create index tasks_entity_idx on tasks(entity_type, entity_id);

-- RLS: block all public access (same pattern as all other tables)
alter table public.activities enable row level security;
alter table public.tasks enable row level security;
create policy "block_public_activities" on public.activities for all using (false);
create policy "block_public_tasks" on public.tasks for all using (false);
```

Verify both tables exist before continuing.

---

## Step 2 — Shared Activity Helper

Create `src/lib/activity.ts`

This is the single utility used by all routes to write activity events. Same fire-and-forget pattern as email — never let an activity write crash a route.

```ts
import { supabaseAdmin } from './supabase-server'

export type EntityType = 'lead' | 'merchant' | 'lender' | 'offer' | 'document' | 'stipulation' | 'user' | 'funding'
export type ActivityType = 'note' | 'call' | 'email' | 'status_change' | 'upload' | 'match' | 'offer' | 'task' | 'system'

interface WriteActivityParams {
  entity_type: EntityType
  entity_id: string
  user_id?: string
  activity_type: ActivityType
  body?: string
  metadata?: Record<string, unknown>
}

export async function writeActivity(params: WriteActivityParams): Promise<void> {
  try {
    await supabaseAdmin.from('activities').insert({
      entity_type: params.entity_type,
      entity_id: params.entity_id,
      user_id: params.user_id ?? null,
      activity_type: params.activity_type,
      body: params.body ?? null,
      metadata: params.metadata ?? {},
    })
  } catch (err) {
    // Never crash the caller — log and move on
    console.error('[activity] Failed to write activity:', params.activity_type, err)
  }
}
```

---

## Step 3 — Activity Routes

### `src/routes/activities/index.ts`

**GET** — fetch activity feed for an entity

Query params: `?entity_type=merchant&entity_id=<uuid>`

```ts
// requireAuth — all roles except merchant (merchants cannot see activity feed directly)
// fetch activities where entity_type + entity_id match
// join users table to get author full_name
// return newest first (order by created_at desc)
// limit 100
```

**POST** — manually write an activity (note or call log)

Body: `{ entity_type, entity_id, activity_type, body }`

```ts
// requireAuth — admin + sales_rep only
// only allow activity_type: 'note' | 'call' for manual writes
// system events are written by routes, not by users directly
// insert via writeActivity helper
// return the new row
```

Register in `src/server/api.ts`:
```
GET  /api/activities
POST /api/activities
```

---

## Step 4 — Task Routes

### `src/routes/tasks/index.ts`

**GET** — fetch tasks

Query params: `?entity_type=merchant&entity_id=<uuid>` (optional — if omitted return all tasks for the user)

```ts
// requireAuth
// admin: all tasks, or filtered by entity if params provided
// sales_rep: only tasks where assigned_to = user.id OR created_by = user.id
// merchant + lender: forbidden
// join assigned_to user for display name
// order by: open first, then by due_at asc, then created_at desc
```

**POST** — create a task

Body: `{ entity_type, entity_id, title, description?, priority?, assigned_to?, due_at? }`

```ts
// requireAuth — admin + sales_rep only
// set created_by = user.id
// if assigned_to not provided, default to user.id (self-assign)
// insert task
// write activity: activity_type='task', body=`Task created: ${title}`
// return new task
```

### `src/routes/tasks/[id].ts`

**PATCH** — update task

Body: `{ status?, title?, description?, priority?, assigned_to?, due_at? }`

```ts
// requireAuth — admin + sales_rep only
// if status is being set to 'completed': set completed_at = now()
// if status is being set to 'cancelled': allow
// update updated_at = now()
// write activity: body=`Task ${status}: ${title}`
// return updated task
```

**DELETE** — delete task (admin only)

Register in `src/server/api.ts`:
```
GET    /api/tasks
POST   /api/tasks
PATCH  /api/tasks/:id
DELETE /api/tasks/:id
```

---

## Step 5 — Wire Activity Writes Into Existing Routes

Import `writeActivity` and call it after successful DB operations in these routes. All calls are fire-and-forget — do not await before returning the response.

### `src/routes/merchants/index.ts` POST
```ts
writeActivity({
  entity_type: 'merchant',
  entity_id: newMerchant.id,
  user_id: user.id,
  activity_type: 'system',
  body: `Merchant application created: ${newMerchant.business_name}`,
})
```

### `src/routes/merchants/[id].ts` PATCH
When status changes:
```ts
writeActivity({
  entity_type: 'merchant',
  entity_id: id,
  user_id: user.id,
  activity_type: 'status_change',
  body: `Status changed from "${previousStatus}" to "${newStatus}"`,
  metadata: { previous_status: previousStatus, new_status: newStatus },
})
```

When assigned_rep_id changes:
```ts
writeActivity({
  entity_type: 'merchant',
  entity_id: id,
  user_id: user.id,
  activity_type: 'system',
  body: `Sales rep assigned: ${repName}`,
})
```

### `src/routes/leads/index.ts` POST
```ts
writeActivity({
  entity_type: 'lead',
  entity_id: newLead.id,
  user_id: user.id,
  activity_type: 'system',
  body: `Lead created: ${newLead.business_name}`,
})
```

### `src/routes/leads/[id]/notes.ts` POST
```ts
writeActivity({
  entity_type: 'lead',
  entity_id: leadId,
  user_id: user.id,
  activity_type: 'note',
  body: noteBody,
})
```

### `src/routes/leads/[id]/convert.ts` POST
```ts
writeActivity({
  entity_type: 'lead',
  entity_id: leadId,
  user_id: user.id,
  activity_type: 'system',
  body: `Lead converted to merchant: ${businessName}`,
  metadata: { merchant_id: newMerchantId },
})
```

### `src/routes/documents/upload.ts` POST
```ts
writeActivity({
  entity_type: 'document',
  entity_id: merchantId,
  user_id: user.id,
  activity_type: 'upload',
  body: `Document uploaded: ${fileName} (${docType})`,
  metadata: { doc_type: docType, file_name: fileName },
})
```

### `src/routes/stipulations/index.ts` POST
```ts
writeActivity({
  entity_type: 'stipulation',
  entity_id: merchantId,
  user_id: user.id,
  activity_type: 'system',
  body: `Stipulation requested: ${description}`,
})
```

### `src/routes/matching/notify.ts` POST
```ts
writeActivity({
  entity_type: 'merchant',
  entity_id: merchantId,
  user_id: user.id,
  activity_type: 'match',
  body: `${matchCount} lender(s) notified`,
})
```

### `src/routes/offers/index.ts` POST
```ts
writeActivity({
  entity_type: 'offer',
  entity_id: merchantId,
  user_id: user.id,
  activity_type: 'offer',
  body: `Offer received from ${lenderName}: $${amount}`,
  metadata: { amount, factor_rate: factorRate },
})
```

### `src/routes/offers/[id].ts` PATCH (accept/decline)
```ts
writeActivity({
  entity_type: 'offer',
  entity_id: merchantId,
  user_id: user.id,
  activity_type: 'offer',
  body: `Offer ${newStatus} by merchant`, // 'accepted' or 'declined'
  metadata: { offer_id: offerId, status: newStatus },
})
```

---

## Step 6 — Type Updates

Add to `src/types.ts`:

```ts
export type EntityType = 'lead' | 'merchant' | 'lender' | 'offer' | 'document' | 'stipulation' | 'user' | 'funding'
export type ActivityType = 'note' | 'call' | 'email' | 'status_change' | 'upload' | 'match' | 'offer' | 'task' | 'system'
export type TaskPriority = 'low' | 'normal' | 'high' | 'urgent'
export type TaskStatus = 'open' | 'completed' | 'cancelled'

export interface Activity {
  id: string
  entity_type: EntityType
  entity_id: string
  user_id: string | null
  activity_type: ActivityType
  body: string | null
  metadata: Record<string, unknown>
  created_at: string
  // joined:
  author_name?: string
}

export interface Task {
  id: string
  assigned_to: string | null
  created_by: string
  entity_type: EntityType
  entity_id: string
  title: string
  description: string | null
  priority: TaskPriority
  status: TaskStatus
  due_at: string | null
  completed_at: string | null
  created_at: string
  updated_at: string
  // joined:
  assignee_name?: string
}
```

---

## Step 7 — Frontend Components

### `components/dashboards/shared/ActivityTimeline.tsx`

Props: `{ entityType: EntityType, entityId: string }`

Fetches `GET /api/activities?entity_type=...&entity_id=...` on mount.

Display each activity as a timeline row:
- Icon based on `activity_type`:
  - `status_change` → arrow icon
  - `note` → document icon
  - `call` → phone icon
  - `upload` → upload icon
  - `offer` → money icon
  - `match` → link icon
  - `task` → checkbox icon
  - `system` → gear icon
  - `email` → envelope icon
- Activity body text
- Author name (from joined user)
- Relative timestamp ("2 hours ago", "yesterday", "3 days ago")
- Newest first

At the bottom of the timeline, show a "Add Note" text area + submit button that posts to `POST /api/activities` with `activity_type: 'note'`. Admin and sales rep only — hide for merchant and lender.

Match the app's dark card style — same panel treatment as DocumentsPanel.

### `components/dashboards/shared/TaskPanel.tsx`

Props: `{ entityType: EntityType, entityId: string, currentUser: User }`

Fetches `GET /api/tasks?entity_type=...&entity_id=...` on mount.

Displays tasks grouped by status:
- **Open** tasks first — show title, priority badge, assignee, due date
- **Completed** tasks collapsed/grayed at bottom

Priority badge colors:
- `urgent` → red
- `high` → orange/yellow
- `normal` → teal
- `low` → gray

Each open task has:
- Complete button (checkmark) — calls PATCH with `status: 'completed'`
- Due date shown in red if overdue

"Create Task" button opens `CreateTaskModal`.

### `components/dashboards/shared/CreateTaskModal.tsx`

Props: `{ entityType: EntityType, entityId: string, currentUser: User, onCreated: () => void }`

Simple modal form:
- Title (required)
- Description (optional)
- Priority dropdown (Low / Normal / High / Urgent)
- Assign to (dropdown of sales reps — fetch from `/api/users/sales-reps`, default to self)
- Due date (date picker input)
- Submit button → POST /api/tasks → calls onCreated() to refresh task panel

---

## Step 8 — Wire Components Into Dashboards

### `components/dashboards/shared/MerchantDetailView.tsx`

Add two new tabs or sections below the existing content:
- **Activity** tab → `<ActivityTimeline entityType="merchant" entityId={merchant.id} />`
- **Tasks** tab → `<TaskPanel entityType="merchant" entityId={merchant.id} currentUser={currentUser} />`

### Lead detail modal/drawer (wherever leads are shown in detail)

Add same two tabs:
- **Activity** → `<ActivityTimeline entityType="lead" entityId={lead.id} />`
- **Tasks** → `<TaskPanel entityType="lead" entityId={lead.id} currentUser={currentUser} />`

### `components/dashboards/AdminDashboard.tsx`

Add a **Tasks overview** section visible at the top of the admin dashboard (not inside a merchant detail — a global view):
- Fetch `GET /api/tasks` with no entity filters — gets all open tasks
- Show count of: urgent tasks, overdue tasks, tasks due today
- List the 5 most urgent/overdue open tasks with merchant/lead name, title, assignee, due date
- "View All" link that expands the full list

### `components/dashboards/SalesRepDashboard.tsx`

Add a **My Tasks** section at the top of the sales rep dashboard:
- Fetch `GET /api/tasks` — returns only their tasks (route already filters by role)
- Show open tasks grouped by: Overdue, Due Today, Upcoming
- Each task shows: title, merchant/lead name, priority badge, due date
- Complete button per task

---

## Step 9 — API Client Updates

Add to `src/lib/api-client.ts`:

```ts
activities: {
  list: (entityType: string, entityId: string) =>
    fetch(`/api/activities?entity_type=${entityType}&entity_id=${entityId}`).then(r => r.json()),
  create: (data: { entity_type: string, entity_id: string, activity_type: string, body: string }) =>
    fetch('/api/activities', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data) }).then(r => r.json()),
},
tasks: {
  list: (params?: { entity_type?: string, entity_id?: string }) => {
    const qs = params ? new URLSearchParams(params as Record<string, string>).toString() : ''
    return fetch(`/api/tasks${qs ? '?' + qs : ''}`).then(r => r.json())
  },
  create: (data: Partial<Task>) =>
    fetch('/api/tasks', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data) }).then(r => r.json()),
  update: (id: string, data: Partial<Task>) =>
    fetch(`/api/tasks/${id}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data) }).then(r => r.json()),
  delete: (id: string) =>
    fetch(`/api/tasks/${id}`, { method: 'DELETE' }).then(r => r.json()),
},
```

---

## Step 10 — Rebuild API Bundle

After all route changes:

```bash
bun run build
```

This rebuilds `api/index.js` with the new routes bundled in. Verify it passes clean.

---

## Step 11 — Verify

```bash
bun run tsc --noEmit
bun run build
```

Manual smoke tests:
- [ ] Activities table exists in Supabase
- [ ] Tasks table exists in Supabase
- [ ] Create a merchant → activity appears in timeline
- [ ] Change merchant status → activity appears
- [ ] Upload a document → activity appears
- [ ] Manually add a note → appears in timeline
- [ ] Create a task on a merchant → appears in task panel
- [ ] Complete a task → moves to completed
- [ ] Admin sees all tasks in dashboard overview
- [ ] Sales rep sees only their tasks
- [ ] Lead detail shows activity timeline
- [ ] Lead detail shows task panel
- [ ] TypeScript clean
- [ ] Build passing

---

## Hard Rules

1. **Activities are append-only** — no UPDATE or DELETE on the `activities` table ever
2. **writeActivity never crashes a route** — always fire-and-forget, always wrapped in try/catch
3. **All routes use requireAuth** — no unprotected endpoints
4. **All DB access uses supabaseAdmin** — never the anon client in routes
5. **Rebuild `api/index.js` after route changes** — run `bun run build`, not just `bun run build:web`
6. **Do not change any existing route logic** — only add activity writes alongside existing operations
7. **No `any` types**
8. **Use Bun for installs**
9. **Use Supabase MCP** to create tables and verify data

---

## Done When

- [ ] `activities` table created with indexes and RLS via MCP
- [ ] `tasks` table created with indexes and RLS via MCP
- [ ] `src/lib/activity.ts` created
- [ ] `src/routes/activities/index.ts` created
- [ ] `src/routes/tasks/index.ts` created
- [ ] `src/routes/tasks/[id].ts` created
- [ ] All routes registered in `src/server/api.ts`
- [ ] Activity writes added to all 9 existing routes listed above
- [ ] `Activity` and `Task` types added to `types.ts`
- [ ] `ActivityTimeline.tsx` created
- [ ] `TaskPanel.tsx` created
- [ ] `CreateTaskModal.tsx` created
- [ ] Components wired into `MerchantDetailView.tsx`
- [ ] Components wired into lead detail view
- [ ] Tasks overview added to `AdminDashboard.tsx`
- [ ] My Tasks section added to `SalesRepDashboard.tsx`
- [ ] API client updated
- [ ] `bun run build` passes clean
- [ ] `bun run tsc --noEmit` passes clean
- [ ] All smoke tests pass

When done, print a summary of every file created or modified.
