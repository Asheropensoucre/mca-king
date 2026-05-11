# Goose Agent Prompt — Phase 4: Real Auth UI
> Phases 1, 2, and 3 are complete. The backend has real routes, Supabase, Better Auth, RLS, documents, and stipulations. The one remaining fake piece is the login — it's still a profile selector mockup. That ends this phase.

---

## What You Are Doing This Phase

Replace the profile selector / demo-header bridge with real login and registration screens. After this phase, every user authenticates with email + password and gets a real Better Auth session. The correct dashboard loads based on their actual role from the session.

---

## Step 0 — Read These Files First

Before writing anything, read:

- `components/dashboards/DashboardController.tsx` — understand how the profile selector currently works and how dashboards are routed
- `src/lib/auth.ts` — the Better Auth config from Phase 1
- `src/lib/requireAuth.ts` — the session middleware
- `src/routes/auth/register.ts`, `login.ts`, `logout.ts`, `me.ts` — the auth routes already built
- `src/server/api.ts` — the Vite API bridge, to confirm auth routes are registered

Confirm the auth routes are registered in the Vite bridge. If they are not, add them now before continuing.

---

## Step 1 — Login Page

Create `src/components/auth/LoginPage.tsx`

A clean, centered login form. Match the existing app's color scheme and font — look at `index.html` and existing components to pick up the design tokens (Tailwind classes, colors).

Fields:
- Email (type="email", required)
- Password (type="password", required)
- Submit button labeled "Sign In"
- Error message display below the form for bad credentials
- Link to the register page: "Don't have an account? Register"

On submit:
```ts
const res = await fetch('/api/auth/login', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ email, password })
})

if (!res.ok) {
  setError('Invalid email or password')
  return
}

const { user } = await res.json()
// store user in app state, navigate to dashboard
```

After successful login, the app reads `user.role` and routes to the correct dashboard — same logic that `DashboardController` currently does with the profile selector, just now driven by the real session user.

---

## Step 2 — Register Page

Create `src/components/auth/RegisterPage.tsx`

Self-registration is for **merchants and lenders only**. Admin and sales_rep accounts are created by admin — not self-registered.

Fields:
- Full name (required)
- Email (type="email", required)
- Password (type="password", required, min 8 characters)
- Confirm password (required, must match)
- Role selector — dropdown with only two options: `Merchant` | `Lender`
- Submit button labeled "Create Account"
- Error message display
- Link back to login: "Already have an account? Sign in"

On submit:
```ts
const res = await fetch('/api/auth/register', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ email, password, role, full_name })
})

if (!res.ok) {
  setError('Registration failed. Email may already be in use.')
  return
}

// Auto-login after register — call login route immediately
// then navigate to dashboard
```

After successful registration, auto-login and route to the correct dashboard.

---

## Step 3 — Session Persistence on App Load

Update `App.tsx`:

On mount, call `GET /api/auth/me` to check if a session already exists:

```ts
useEffect(() => {
  const checkSession = async () => {
    const res = await fetch('/api/auth/me')
    if (res.ok) {
      const user = await res.json()
      setCurrentUser(user)
    } else {
      setCurrentUser(null)
    }
    setLoading(false)
  }
  checkSession()
}, [])
```

While loading, show a simple centered spinner or blank screen — not the login page, not a dashboard.

If `currentUser` is null after the check → show `LoginPage`
If `currentUser` exists → show the correct dashboard based on `user.role`

---

## Step 4 — Update DashboardController

`DashboardController` currently uses a profile selector dropdown. Replace it entirely.

New behavior:
- Receives `currentUser` (the real session user) as a prop
- Reads `currentUser.role` and renders the correct dashboard:
  - `admin` → `AdminDashboard`
  - `sales_rep` → `SalesRepDashboard`
  - `merchant` → `MerchantDashboard`
  - `lender` → `LenderDashboard`
- No profile selector, no role switcher, no demo bridge
- Remove the demo-header bridge and any `X-Demo-User` header injection

Pass `currentUser` down to each dashboard as a prop so they know who is logged in (for filtering data, showing names, etc.).

---

## Step 5 — Logout Button

Every dashboard shell has a logout button. Look at `components/dashboards/shared/DashboardShell.tsx` — add a logout button to the top right of the shell.

On click:
```ts
await fetch('/api/auth/logout', { method: 'POST' })
setCurrentUser(null)
// App will re-render and show LoginPage since currentUser is null
```

No confirmation dialog needed — just log out immediately.

---

## Step 6 — Admin: Create Sales Rep Accounts

Admin needs to be able to create sales rep accounts since reps can't self-register.

In `AdminDashboard.tsx`, add a "Create Sales Rep" button — simple modal/drawer form with:
- Full name (required)
- Email (required)
- Password (required, min 8 chars)
- Role is hardcoded to `sales_rep` — not selectable

On submit, call `POST /api/auth/register` with `role: 'sales_rep'`. This works because the register route accepts any role — the restriction is only on the self-registration UI, not the route itself.

Show the new rep in the existing sales rep list after creation.

---

## Step 7 — Register Auth Routes in Vite Bridge (if not already done)

Check `src/server/api.ts`. The following routes must be registered:

```
POST /api/auth/register
POST /api/auth/login
POST /api/auth/logout
GET  /api/auth/me
```

If any are missing, add them following the same pattern as the other routes in that file.

---

## Step 8 — Seed One Admin Account via Supabase MCP

Use the Supabase MCP to insert one real admin account directly into the database so there is always a way in:

Call `POST /api/auth/register` with:
```json
{
  "email": "admin@mcaking.com",
  "password": "AdminPass123!",
  "role": "admin",
  "full_name": "MCA Admin"
}
```

If the route isn't reachable from the MCP, insert via SQL instead — but hash the password correctly using Better Auth's `hashPassword` utility first. Do not store a plaintext password.

Print the admin credentials clearly at the end of the summary so the human can log in immediately.

---

## Step 9 — Verify

```bash
bun run tsc --noEmit
bun run build
bun run dev
```

Manual smoke tests:
- [ ] App loads → shows login page (no session)
- [ ] Login with wrong password → shows error message
- [ ] Login with admin credentials → routes to admin dashboard
- [ ] Refresh page → stays logged in (session persists)
- [ ] Logout → returns to login page
- [ ] Register as merchant → auto-logs in → routes to merchant dashboard
- [ ] Register as lender → auto-logs in → routes to lender dashboard
- [ ] Profile selector / demo bridge is completely gone
- [ ] Admin can create a sales rep account
- [ ] New sales rep can log in and sees sales rep dashboard
- [ ] TypeScript clean, build passing

---

## Hard Rules

1. **Remove the profile selector and demo-header bridge completely** — no trace of it should remain
2. **Do not change any dashboard UI** beyond adding the logout button and passing `currentUser` as a prop
3. **Self-registration only allows `merchant` and `lender` roles** — enforce this in the UI only, the route accepts all roles for admin use
4. **Never store the password in state or log it anywhere**
5. **Session check on app load is required** — the app must not flash the login screen if a valid session exists
6. **Use Bun for any new installs**
7. **No `any` types**
8. **Use Supabase MCP** to inspect the users table or debug session issues if needed

---

## Done When

- [ ] Auth routes confirmed registered in Vite bridge
- [ ] `LoginPage.tsx` created and working
- [ ] `RegisterPage.tsx` created and working (merchant + lender only)
- [ ] `App.tsx` checks session on load, shows login or dashboard
- [ ] `DashboardController.tsx` profile selector removed, driven by real session
- [ ] Logout button in `DashboardShell.tsx`
- [ ] Admin can create sales rep accounts
- [ ] One seeded admin account exists and credentials are printed
- [ ] `bun run tsc --noEmit` passes clean
- [ ] `bun run build` passes clean
- [ ] All smoke tests pass

When done, print a summary of every file created or modified and the admin login credentials.
