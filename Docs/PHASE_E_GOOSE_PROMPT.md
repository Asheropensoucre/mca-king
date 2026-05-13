# Goose Agent Prompt — Phase E: Account Settings + Admin User Management
> Phases A through D are complete. The CRM has activity, tasks, funded deals, commissions, merchant file submissions, search, filters, and saved views. Phase E creates a dedicated settings area and moves all user/account management into it. This phase affects dashboard structure and account security.

---

## Context

- App is live at portal.mcaking.com
- All routes live in `src/routes/` and registered in `src/server/api.ts`
- After adding routes, run `bun run build` to rebuild `api/index.js` for Vercel
- Auth uses `requireAuth` from `src/lib/requireAuth.ts`
- Password hashing uses `@better-auth/utils` (already installed from Phase 4)
- Session management is in `src/lib/session-auth.ts`
- Activity writes use `writeActivity` from `src/lib/activity.ts`
- All DB access uses `supabaseAdmin` from `src/lib/supabase-server.ts`

---

## Core Rules — Read Before Writing Anything

These rules are non-negotiable and must be enforced server-side, not just in the UI:

```
Users CANNOT change their own email address.
Users CANNOT change their own role.
Users CANNOT close or delete their own account.
Users CANNOT see other users' data.
Users CAN change only their own password.

Only admin CAN change user email.
Only admin CAN change user role.
Only admin CAN disable, reactivate, or close accounts.
Only admin CAN create sales rep accounts.
Only admin CAN view the full user list.

Passwords are NEVER visible to admin.
Admin can only trigger a password reset — not read the current password.

Closing/disabling an account NEVER deletes historical CRM data.
Disabled accounts cannot log in but all their records remain intact.
```

---

## Step 0 — Read First

Before writing anything, read:
- `src/lib/session-auth.ts` — how sessions are stored and how to revoke them
- `src/lib/auth.ts` — Better Auth config
- `src/routes/auth/register.ts` — how users are currently created (sales rep creation uses this)
- `components/dashboards/AdminDashboard.tsx` — find the floating "Create Sales Rep" button to remove it
- `components/dashboards/shared/DashboardShell.tsx` — where to add Settings nav link
- `src/lib/activity.ts` — writeActivity pattern
- `types.ts` — current User type

Understand the existing session and password flow before touching anything.

---

## Step 1 — Database Changes (use Supabase MCP)

Add two columns to the existing `users` table:

```sql
-- Add account status tracking to users table
ALTER TABLE public.users
ADD COLUMN IF NOT EXISTS is_disabled boolean not null default false,
ADD COLUMN IF NOT EXISTS disabled_at timestamptz,
ADD COLUMN IF NOT EXISTS closed_at timestamptz,
ADD COLUMN IF NOT EXISTS last_login_at timestamptz;

-- Index for admin user list queries
CREATE INDEX IF NOT EXISTS users_role_disabled_idx ON public.users(role, is_disabled);
```

Also update the session-auth flow: when a user logs in successfully, update `last_login_at = now()` on their user row.

Verify the columns exist before continuing.

---

## Step 2 — Update Login to Block Disabled Accounts

In `src/routes/auth/login.ts`, after fetching the user and verifying the password, add:

```ts
if (user.is_disabled) {
  return new Response('Account is disabled. Please contact your administrator.', { status: 403 })
}
if (user.closed_at) {
  return new Response('This account has been closed.', { status: 403 })
}
```

This must happen before creating a session. A disabled account cannot log in under any circumstances.

---

## Step 3 — User Settings Routes

### `src/routes/settings/me.ts`

**GET** — return current user's own safe profile (never password hash)

```ts
// requireAuth — any role
// fetch user row for session.user.id
// return: { id, email, role, full_name, created_at, last_login_at }
// NEVER return: password_hash, is_disabled, session tokens
```

**PATCH** — update own password only

Body: `{ current_password, new_password }`

```ts
// requireAuth — any role
// fetch user row including password_hash
// verify current_password matches stored hash using @better-auth/utils hashPassword/verifyPassword
// if current_password wrong: return 401 'Current password is incorrect'
// validate new_password: min 8 chars
// hash new_password
// update users table: set password_hash = newHash, updated_at = now()
// revoke ALL existing sessions for this user (force re-login after password change)
// write activity: entity_type='user', entity_id=user.id, activity_type='system', body='Password changed'
// return 200
```

Register in `src/server/api.ts`:
```
GET   /api/settings/me
PATCH /api/settings/me/password
```

---

## Step 4 — Admin User Management Routes

All routes in this section require `requireAuth` with role check: `admin` only. Return 403 for any other role.

### `src/routes/admin/users/index.ts`

**GET** — list all users

Query params:
- `role` — filter by role (admin/sales_rep/merchant/lender)
- `is_disabled` — 'true' | 'false'
- `search` — search by full_name or email

```ts
// Admin only
// Return: id, email, role, full_name, is_disabled, disabled_at, closed_at, last_login_at, created_at
// NEVER return password_hash
// Order by created_at desc
// Limit 100
```

**POST** — create sales rep account

Body: `{ email, password, full_name }`

```ts
// Admin only
// Role is hardcoded to 'sales_rep' — never trust client-provided role here
// Hash password
// Insert into users table
// Write activity: body='Sales rep account created: ${full_name}'
// Return new user (without password_hash)
```

### `src/routes/admin/users/[id].ts`

**GET** — get single user detail (admin only)

**PATCH** — update user (admin only)

Allowed fields:
- `full_name`
- `email` — admin can change email. Write activity when changed.
- `role` — admin can change role. Write activity when changed. Revoke user sessions.

NOT allowed via PATCH:
- `password_hash` — use reset-password route instead
- `is_disabled` — use disable/reactivate routes
- `closed_at` — use close route

```ts
// Admin only
// For email change: check no other user has the same email
// For role change: revoke all sessions for the affected user
// Write activity for email and role changes
// Return updated user (without password_hash)
```

### `src/routes/admin/users/[id]/reset-password.ts`

**POST** — admin sets a temporary new password for a user

Body: `{ new_password }`

```ts
// Admin only
// Min 8 chars validation
// Hash new_password
// Update users table
// Revoke ALL sessions for the affected user (force them to log in with new password)
// Write activity: body='Password reset by admin'
// Return 200
// NEVER return or log the password value
```

### `src/routes/admin/users/[id]/disable.ts`

**POST** — disable a user account

Body: `{ reason? }`

```ts
// Admin only
// Cannot disable another admin account (safety rule — prevents lockout)
// Set is_disabled = true, disabled_at = now()
// Revoke ALL active sessions for this user immediately
// Write activity: body=`Account disabled${reason ? ': ' + reason : ''}`
// Return 200
```

### `src/routes/admin/users/[id]/reactivate.ts`

**POST** — reactivate a disabled account

```ts
// Admin only
// Set is_disabled = false, disabled_at = null
// Write activity: body='Account reactivated'
// Return 200
// User must log in fresh — do not auto-create a session
```

### `src/routes/admin/users/[id]/close.ts`

**POST** — close an account permanently

Body: `{ reason? }`

```ts
// Admin only
// Cannot close another admin account
// Set closed_at = now(), is_disabled = true
// Revoke ALL active sessions for this user
// DO NOT delete the user row
// DO NOT delete any associated records (merchants, leads, activities, offers, fundings, commissions)
// Write activity: body=`Account closed${reason ? ': ' + reason : ''}`
// Return 200
```

Register all in `src/server/api.ts`:
```
GET   /api/settings/me
PATCH /api/settings/me/password
GET   /api/admin/users
POST  /api/admin/users
GET   /api/admin/users/:id
PATCH /api/admin/users/:id
POST  /api/admin/users/:id/reset-password
POST  /api/admin/users/:id/disable
POST  /api/admin/users/:id/reactivate
POST  /api/admin/users/:id/close
```

---

## Step 5 — Session Revocation Helper

Create `src/lib/revoke-sessions.ts`

Used by password change, reset, disable, close, and role change routes:

```ts
import { supabaseAdmin } from './supabase-server'

export async function revokeUserSessions(userId: string): Promise<void> {
  try {
    // Delete all session rows for this user from the session table
    // The session table was created by Better Auth in Phase 4
    // Check what the session table is named in your schema — likely 'session' or 'sessions'
    await supabaseAdmin
      .from('session')
      .delete()
      .eq('userId', userId)
  } catch (err) {
    console.error('[revoke-sessions] Failed to revoke sessions for user:', userId, err)
  }
}
```

Import and call this in every route that needs to force a user to log out.

---

## Step 6 — Type Updates

Add to `src/types.ts`:

```ts
export interface UserProfile {
  id: string
  email: string
  role: string
  full_name: string | null
  is_disabled: boolean
  disabled_at: string | null
  closed_at: string | null
  last_login_at: string | null
  created_at: string
}
```

---

## Step 7 — Frontend: User Settings Page

Create `components/dashboards/shared/UserSettingsPage.tsx`

Available to ALL logged-in roles. Accessible from a "Settings" link in the dashboard shell nav or user menu.

Sections:

**My Account (read-only)**
- Email address — displayed but not editable
- Role — displayed as a badge, not editable
- Member since — formatted created_at date
- Last login — formatted last_login_at

**Change Password**
- Current password input
- New password input (min 8 chars)
- Confirm new password input
- Submit button — calls `PATCH /api/settings/me/password`
- On success: show "Password updated. Please log in again." then call logout and redirect to login page
- On error: show the error message from the server

Style: match the existing dark card style. Use `PrimaryButton` for the submit button.

---

## Step 8 — Frontend: Admin Settings Page

Create `components/dashboards/AdminSettingsPage.tsx`

Admin only. Accessible from a "Settings" nav item in the admin dashboard shell.

### Tab 1: User Management

**User list table** — fetches `GET /api/admin/users`

Filter controls above the table:
- Role dropdown (All / Admin / Sales Rep / Merchant / Lender)
- Status dropdown (All / Active / Disabled / Closed)
- Search text input

Table columns:
- Full name
- Email
- Role badge
- Status badge (Active / Disabled / Closed)
- Last login (relative time)
- Created date
- Actions dropdown per row

Actions per user row (dropdown or button group):
- **Reset Password** — opens a modal with new_password input, calls POST `.../reset-password`
- **Change Email** — opens a modal with email input, calls PATCH `.../[id]` with email
- **Disable** — confirmation dialog, calls POST `.../disable`
- **Reactivate** — only shown if disabled, calls POST `.../reactivate`
- **Close Account** — confirmation dialog with reason input, calls POST `.../close`. Show warning: "This cannot be undone. All CRM history will be preserved."
- Do NOT show Disable or Close for other admin accounts

### Tab 2: Create Sales Rep

Move the existing "Create Sales Rep" form here from wherever it currently lives in AdminDashboard.tsx. Remove it from AdminDashboard.tsx entirely.

Form fields:
- Full name (required)
- Email (required)
- Password (required, min 8 chars)
- Submit — calls `POST /api/admin/users`
- On success: show confirmation and refresh the user list

---

## Step 9 — Wire Settings Into Dashboard Navigation

### `components/dashboards/shared/DashboardShell.tsx`

Add a "Settings" link to the nav for all roles:
- For admin: navigates to `AdminSettingsPage`
- For all other roles: navigates to `UserSettingsPage`

The settings link should appear at the bottom of the left nav, above the Logout button. Use a gear icon or "⚙ Settings" label.

### `components/dashboards/AdminDashboard.tsx`

- Remove the floating "Create Sales Rep" button from the main dashboard area
- Remove the Create Sales Rep modal from AdminDashboard if it lives there
- All sales rep creation now lives in AdminSettingsPage Tab 2

---

## Step 10 — API Client Updates

Add to `src/lib/api-client.ts`:

```ts
settings: {
  me: () => fetch('/api/settings/me').then(r => r.json()),
  changePassword: (data: { current_password: string; new_password: string }) =>
    fetch('/api/settings/me/password', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data) }).then(r => r),
},
adminUsers: {
  list: (params?: { role?: string; is_disabled?: string; search?: string }) => {
    const qs = params ? new URLSearchParams(params as Record<string, string>).toString() : ''
    return fetch(`/api/admin/users${qs ? '?' + qs : ''}`).then(r => r.json())
  },
  get: (id: string) => fetch(`/api/admin/users/${id}`).then(r => r.json()),
  createSalesRep: (data: { email: string; password: string; full_name: string }) =>
    fetch('/api/admin/users', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data) }).then(r => r.json()),
  update: (id: string, data: { email?: string; role?: string; full_name?: string }) =>
    fetch(`/api/admin/users/${id}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data) }).then(r => r.json()),
  resetPassword: (id: string, new_password: string) =>
    fetch(`/api/admin/users/${id}/reset-password`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ new_password }) }).then(r => r),
  disable: (id: string, reason?: string) =>
    fetch(`/api/admin/users/${id}/disable`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ reason }) }).then(r => r),
  reactivate: (id: string) =>
    fetch(`/api/admin/users/${id}/reactivate`, { method: 'POST' }).then(r => r),
  close: (id: string, reason?: string) =>
    fetch(`/api/admin/users/${id}/close`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ reason }) }).then(r => r),
},
```

---

## Step 11 — Rebuild and Verify

```bash
bun run build
bun run tsc --noEmit
```

Manual smoke tests:
- [ ] `is_disabled`, `disabled_at`, `closed_at`, `last_login_at` columns exist in users table
- [ ] Login as a disabled account returns 403 with clear message
- [ ] Login as a closed account returns 403 with clear message
- [ ] Change own password — must log in again after success
- [ ] Cannot change own email via settings — field is read-only
- [ ] Cannot change own role via settings — field is read-only
- [ ] Admin user list loads with role and status filters
- [ ] Admin can create a sales rep from Settings → Create Sales Rep tab
- [ ] "Create Sales Rep" button is GONE from AdminDashboard main area
- [ ] Admin can reset another user's password — that user's sessions are revoked
- [ ] Admin can change another user's email — activity is written
- [ ] Admin can disable a user — that user cannot log in
- [ ] Admin can reactivate a disabled user — that user can log in again
- [ ] Admin cannot disable another admin account
- [ ] Admin can close an account — user cannot log in, all CRM records still exist
- [ ] Settings link appears in all dashboard nav bars
- [ ] Admin sees AdminSettingsPage, all others see UserSettingsPage
- [ ] TypeScript clean
- [ ] Build passing

---

## Hard Rules

1. **Never return password_hash** in any route response — ever
2. **Never trust client-provided role** in user creation — always hardcode `sales_rep` for the admin user creation route
3. **Revoke sessions immediately** on password change, reset, disable, role change, and close
4. **Disabled and closed accounts cannot log in** — enforced in the login route
5. **Admin cannot disable or close another admin** — safety rule to prevent lockout
6. **Account closure never deletes data** — only sets flags, never cascades deletes
7. **All sensitive admin actions write activity records** via `writeActivity`
8. **Rebuild `api/index.js`** — run `bun run build` after all route changes
9. **No `any` types**
10. **Use Bun for installs**
11. **Use Supabase MCP** to add columns and verify schema

---

## Done When

- [ ] `is_disabled`, `disabled_at`, `closed_at`, `last_login_at` added to users table via MCP
- [ ] Login route blocks disabled and closed accounts
- [ ] `src/lib/revoke-sessions.ts` created
- [ ] `src/routes/settings/me.ts` created (GET + PATCH password)
- [ ] `src/routes/admin/users/index.ts` created (GET + POST)
- [ ] `src/routes/admin/users/[id].ts` created (GET + PATCH)
- [ ] `src/routes/admin/users/[id]/reset-password.ts` created
- [ ] `src/routes/admin/users/[id]/disable.ts` created
- [ ] `src/routes/admin/users/[id]/reactivate.ts` created
- [ ] `src/routes/admin/users/[id]/close.ts` created
- [ ] All routes registered in `src/server/api.ts`
- [ ] `UserProfile` type added to `types.ts`
- [ ] `UserSettingsPage.tsx` created and wired into all dashboard shells
- [ ] `AdminSettingsPage.tsx` created with User Management + Create Sales Rep tabs
- [ ] Settings link added to `DashboardShell.tsx` nav for all roles
- [ ] "Create Sales Rep" removed from `AdminDashboard.tsx` main area
- [ ] API client updated with settings and adminUsers methods
- [ ] `bun run build` passes clean
- [ ] `bun run tsc --noEmit` passes clean
- [ ] All smoke tests pass

When done, print a summary of every file created or modified.
