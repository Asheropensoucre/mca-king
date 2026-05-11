# Goose Agent Prompt — Phase 1: Backend Foundation
> You are Goose. You have the Supabase MCP available. Use it for all Supabase work — do not tell the human to do anything manually in the Supabase dashboard. Do it yourself via the MCP.

---

## Context
You are setting up the backend foundation for MCA King, a Merchant Cash Advance platform. The frontend already exists as a working React + Vite + TypeScript app in the `mca-application-form/` folder. Do not touch any existing frontend files. Your entire job in this phase is:

1. Create and configure a Supabase project via the Supabase MCP
2. Run the full database schema via the MCP
3. Set up Supabase Storage buckets via the MCP
4. Install backend dependencies with Bun
5. Create the auth and server route files in the codebase
6. Make sure everything builds clean

---

## Stack — Do Not Deviate
- **Package manager:** Bun (not npm, not yarn)
- **Database:** Supabase Postgres — use the Supabase MCP for all DB operations
- **Auth:** Better Auth (email + password only, no SSO, no OAuth)
- **Session type:** Database sessions stored in Supabase (not JWT-only)
- **Language:** TypeScript throughout, strict mode, no `any`

---

## Step 1 — Create the Supabase Project (use MCP)

Using the Supabase MCP:
1. List existing organizations and pick the right one
2. Create a new project named `mca-king`
3. Wait for the project to finish provisioning
4. Retrieve and save the following — you will need them for the `.env.local` file:
   - `SUPABASE_URL` (project URL)
   - `SUPABASE_ANON_KEY` (public anon key)
   - `SUPABASE_SERVICE_ROLE_KEY` (service role key — keep this secret, server-side only)

---

## Step 2 — Run the Database Schema (use MCP)

Using the Supabase MCP, execute the following SQL against the `mca-king` project. Run it as one batch:

```sql
-- MCA King — Full Database Schema

-- USERS
create table users (
  id              uuid primary key default gen_random_uuid(),
  email           text unique not null,
  password_hash   text not null,
  role            text not null check (role in ('admin', 'sales_rep', 'merchant', 'lender')),
  full_name       text,
  created_at      timestamptz default now()
);

-- MERCHANTS
create table merchants (
  id                  uuid primary key default gen_random_uuid(),
  user_id             uuid references users(id),
  assigned_rep_id     uuid references users(id),
  business_name       text not null,
  industry            text,
  state               text,
  monthly_revenue     numeric,
  time_in_business    int,
  credit_score        int,
  nsf_count           int,
  requested_amount    numeric,
  current_positions   int,
  status              text not null default 'application & 3 months bank statements in',
  created_at          timestamptz default now(),
  updated_at          timestamptz default now()
);

-- OWNERS
create table owners (
  id              uuid primary key default gen_random_uuid(),
  merchant_id     uuid references merchants(id) on delete cascade,
  full_name       text not null,
  ownership_pct   numeric,
  ssn_last4       text,
  date_of_birth   date,
  email           text,
  phone           text,
  is_primary      boolean default false
);

-- LENDERS
create table lenders (
  id              uuid primary key default gen_random_uuid(),
  user_id         uuid references users(id),
  company_name    text not null,
  contact_email   text not null,
  contact_name    text,
  min_revenue     numeric,
  max_revenue     numeric,
  min_credit      int,
  max_positions   int,
  industries      text[],
  states          text[],
  min_amount      numeric,
  max_amount      numeric,
  is_active       boolean default true
);

-- LENDER MATCHES
create table lender_matches (
  id              uuid primary key default gen_random_uuid(),
  merchant_id     uuid references merchants(id) on delete cascade,
  lender_id       uuid references lenders(id),
  match_type      text check (match_type in ('auto', 'manual')),
  matched_by      uuid references users(id),
  notified_at     timestamptz,
  created_at      timestamptz default now()
);

-- OFFERS
create table offers (
  id              uuid primary key default gen_random_uuid(),
  merchant_id     uuid references merchants(id) on delete cascade,
  lender_id       uuid references lenders(id),
  amount          numeric not null,
  factor_rate     numeric,
  term_months     int,
  payment_freq    text check (payment_freq in ('daily', 'weekly')),
  status          text default 'pending' check (status in ('pending', 'accepted', 'declined')),
  accepted_at     timestamptz,
  created_at      timestamptz default now()
);

-- DOCUMENTS
create table documents (
  id              uuid primary key default gen_random_uuid(),
  merchant_id     uuid references merchants(id) on delete cascade,
  uploaded_by     uuid references users(id),
  doc_type        text check (doc_type in ('bank_statement', 'contract', 'stipulation', 'id', 'other')),
  file_name       text not null,
  storage_path    text not null,
  uploaded_at     timestamptz default now()
);

-- STATUS HISTORY
create table status_history (
  id              uuid primary key default gen_random_uuid(),
  merchant_id     uuid references merchants(id) on delete cascade,
  changed_by      uuid references users(id),
  previous_status text,
  new_status      text not null,
  note            text,
  changed_at      timestamptz default now()
);

-- STIPULATIONS
create table stipulations (
  id              uuid primary key default gen_random_uuid(),
  merchant_id     uuid references merchants(id) on delete cascade,
  lender_id       uuid references lenders(id),
  requested_by    uuid references users(id),
  description     text not null,
  is_fulfilled    boolean default false,
  fulfilled_at    timestamptz,
  created_at      timestamptz default now()
);

-- LEADS
create table leads (
  id                uuid primary key default gen_random_uuid(),
  created_by        uuid references users(id),
  assigned_rep_id   uuid references users(id),
  business_name     text not null,
  owner_name        text,
  phone             text,
  email             text,
  state             text,
  status            text not null default 'new' check (status in ('new', 'contacted', 'docs_requested', 'converted', 'dead')),
  converted_to      uuid references merchants(id),
  created_at        timestamptz default now(),
  updated_at        timestamptz default now()
);

-- LEAD NOTES (append-only call log)
create table lead_notes (
  id            uuid primary key default gen_random_uuid(),
  lead_id       uuid references leads(id) on delete cascade,
  written_by    uuid references users(id),
  body          text not null,
  created_at    timestamptz default now()
);
```

After running, verify all 11 tables exist by listing tables via the MCP.

---

## Step 3 — Create Storage Buckets (use MCP)

Using the Supabase MCP, create the following storage bucket on the `mca-king` project:

| Bucket name | Public? | Purpose |
|---|---|---|
| `documents` | No (private) | Bank statements, contracts, IDs, stips |

Private — files only accessible via signed URLs generated server-side. Never public.

---

## Step 4 — Create `.env.local`

Create `mca-application-form/.env.local` with the keys retrieved from the MCP in Step 1:

```env
# Supabase
SUPABASE_URL=<from MCP>
SUPABASE_ANON_KEY=<from MCP>
SUPABASE_SERVICE_ROLE_KEY=<from MCP>

# Better Auth
BETTER_AUTH_SECRET=<generate a random 32-char string>
BETTER_AUTH_URL=http://localhost:3000

# Vite (frontend-safe keys only — never put SERVICE_ROLE_KEY here)
VITE_SUPABASE_URL=<same as SUPABASE_URL>
VITE_SUPABASE_ANON_KEY=<same as SUPABASE_ANON_KEY>
```

Then check `.gitignore` — if `.env.local` is not listed, add it. Also confirm `node_modules/` and `dist/` are listed.

---

## Step 5 — Install Dependencies

From inside `mca-application-form/`:

```bash
bun add @supabase/supabase-js better-auth
```

---

## Step 6 — Create Backend Files

Create the following files. Do not modify any existing files.

### `src/lib/supabase.ts`
```ts
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing Supabase environment variables')
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey)
```

### `src/lib/supabase-server.ts`
Server-side only — never import this in frontend components:
```ts
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.SUPABASE_URL
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !serviceRoleKey) {
  throw new Error('Missing Supabase server environment variables')
}

export const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey)
```

### `src/lib/auth.ts`
```ts
import { betterAuth } from 'better-auth'

export const auth = betterAuth({
  database: {
    provider: 'pg',
    url: process.env.SUPABASE_URL!,
  },
  emailAndPassword: {
    enabled: true,
  },
  session: {
    strategy: 'database',
    expiresIn: 60 * 60 * 24 * 7, // 7 days
  },
  user: {
    additionalFields: {
      role: {
        type: 'string',
        required: true,
        defaultValue: 'merchant',
        input: true,
      },
      full_name: {
        type: 'string',
        required: false,
        input: true,
      },
    },
  },
})
```

### `src/lib/requireAuth.ts`
```ts
import { auth } from './auth'

export async function requireAuth(req: Request, role?: string) {
  const session = await auth.getSession(req)
  if (!session) {
    throw new Response('Unauthorized', { status: 401 })
  }
  if (role && session.user.role !== role) {
    throw new Response('Forbidden', { status: 403 })
  }
  return session.user
}
```

### `src/routes/auth/register.ts`
```ts
import { auth } from '../../lib/auth'

export async function POST(req: Request): Promise<Response> {
  try {
    const { email, password, role, full_name } = await req.json()
    const result = await auth.api.signUpEmail({
      body: { email, password, role, full_name }
    })
    return Response.json(result)
  } catch (err) {
    return new Response('Registration failed', { status: 400 })
  }
}
```

### `src/routes/auth/login.ts`
```ts
import { auth } from '../../lib/auth'

export async function POST(req: Request): Promise<Response> {
  try {
    const { email, password } = await req.json()
    const result = await auth.api.signInEmail({
      body: { email, password }
    })
    return Response.json(result)
  } catch (err) {
    return new Response('Invalid credentials', { status: 401 })
  }
}
```

### `src/routes/auth/logout.ts`
```ts
import { auth } from '../../lib/auth'

export async function POST(req: Request): Promise<Response> {
  try {
    await auth.api.signOut({ headers: req.headers })
    return new Response('Logged out', { status: 200 })
  } catch (err) {
    return new Response('Logout failed', { status: 400 })
  }
}
```

### `src/routes/auth/me.ts`
```ts
import { auth } from '../../lib/auth'

export async function GET(req: Request): Promise<Response> {
  const session = await auth.getSession(req)
  if (!session) return new Response('Unauthorized', { status: 401 })
  const { id, email, role, full_name } = session.user
  return Response.json({ id, email, role, full_name })
}
```

---

## Step 7 — Verify Clean Build

```bash
bun run tsc --noEmit
```

Fix every TypeScript error before stopping. Zero errors required.

---

## Hard Rules

1. **Do not touch any existing component files** — `AdminDashboard.tsx`, `MerchantDashboard.tsx`, `LenderDashboard.tsx`, `SalesRepDashboard.tsx`, `KanbanPipelineView.tsx`, `types.ts`, `App.tsx` — none of them.
2. **Do not touch localStorage** — that is Phase 2.
3. **All new files go in `src/lib/` or `src/routes/`** only.
4. **Use Bun for all installs** — never run `npm install`.
5. **No `any` types** — TypeScript strict mode throughout.
6. **Never hardcode secrets** — everything from `process.env` or `import.meta.env`.
7. **Use the Supabase MCP for all Supabase operations** — never tell the human to do something manually in the dashboard.

---

## Done When

- [ ] Supabase project `mca-king` created via MCP
- [ ] All 11 tables verified in database via MCP
- [ ] Private `documents` storage bucket created via MCP
- [ ] `.env.local` created with all keys populated
- [ ] `.env.local` is in `.gitignore`
- [ ] `bun add` ran clean
- [ ] `src/lib/supabase.ts` created
- [ ] `src/lib/supabase-server.ts` created
- [ ] `src/lib/auth.ts` created
- [ ] `src/lib/requireAuth.ts` created
- [ ] `src/routes/auth/register.ts` created
- [ ] `src/routes/auth/login.ts` created
- [ ] `src/routes/auth/logout.ts` created
- [ ] `src/routes/auth/me.ts` created
- [ ] `bun run tsc --noEmit` passes with zero errors

When finished, print a summary of every file created and every MCP action taken.
