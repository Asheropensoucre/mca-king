# Goose Agent Prompt — Phase 7a: UI Polish
> This phase is UI and logic fixes only. No new routes, no database changes, no new tables. Read every file carefully before touching anything.

---

## What You Are Doing This Phase

Three focused UI/logic improvements:

1. **Dark/light mode toggle** — replace whatever toggle exists with a specific design, on every page
2. **Merchant application form logic** — lock fields after submit, grace period resubmit logic
3. **Apply/Submit button redesign** — new button style, better placement, correct label states

---

## Step 0 — Read First

Before writing anything, read:

- `components/dashboards/shared/DashboardShell.tsx` — where the current toggle likely lives
- `src/components/auth/LoginPage.tsx` — auth page layout
- `src/components/auth/RegisterPage.tsx` — auth page layout
- `components/dashboards/MerchantDashboard.tsx` — merchant form and submit logic
- `components/dashboards/LenderDashboard.tsx` — lender apply/edit button
- `App.tsx` — how dark mode state is currently managed
- `types.ts` — merchant status types

Understand the current dark mode implementation before replacing it.

---

## Change 1 — Dark/Light Mode Toggle

### The toggle component

Create `src/components/ui/DarkModeToggle.tsx`

Use exactly this CSS and HTML structure, converted to React/Tailwind inline styles. The toggle uses a checkbox input with a custom slider:

```tsx
import React from 'react'

interface DarkModeToggleProps {
  isDark: boolean
  onToggle: () => void
}

export function DarkModeToggle({ isDark, onToggle }: DarkModeToggleProps) {
  return (
    <label className="switch" style={{
      position: 'relative',
      display: 'flex',
      flexDirection: 'column',
      justifyContent: 'center',
      alignItems: 'center',
      width: '50px',
      height: '20px',
      cursor: 'pointer',
    }}>
      <input
        type="checkbox"
        checked={isDark}
        onChange={onToggle}
        style={{ opacity: 0, width: 0, height: 0, position: 'absolute' }}
      />
      <span style={{
        boxSizing: 'border-box',
        borderRadius: '5px',
        border: isDark ? '2px solid #e5e7eb' : '2px solid #323232',
        boxShadow: isDark ? '4px 4px #e5e7eb' : '4px 4px #323232',
        position: 'absolute',
        cursor: 'pointer',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: isDark ? '#1f2937' : '#fff',
        transition: '0.3s',
      }}>
        <span style={{
          boxSizing: 'border-box',
          position: 'absolute',
          content: '""',
          height: '20px',
          width: '20px',
          border: isDark ? '2px solid #e5e7eb' : '2px solid #323232',
          borderRadius: '5px',
          left: isDark ? '28px' : '-2px',
          bottom: '2px',
          backgroundColor: isDark ? '#374151' : '#fff',
          boxShadow: isDark ? '0 3px 0 #e5e7eb' : '0 3px 0 #323232',
          transition: '0.3s',
        }} />
      </span>
    </label>
  )
}
```

### Where to place it

Add `<DarkModeToggle>` to ALL of these locations:

- `components/dashboards/shared/DashboardShell.tsx` — top right of the nav bar
- `src/components/auth/LoginPage.tsx` — top right corner, absolute positioned
- `src/components/auth/RegisterPage.tsx` — top right corner, absolute positioned

### Dark mode state

Dark mode preference is already saved to localStorage (theme preference — Goose noted this in Phase 2 as intentionally kept). Keep using localStorage for this. Make sure the toggle reads and writes the same key already in use.

If `App.tsx` manages dark mode state, pass `isDark` and `onToggle` down as props. If it's managed locally in each component, keep that pattern — just make sure all three locations stay in sync by reading from the same localStorage key on mount.

---

## Change 2 — Merchant Application Form Logic

### Current behavior
The merchant fills out and submits the application form. After submission the form should lock.

### Required behavior

**After first submission:**
- All form fields become read-only / grayed out visually
- A message appears: "Your application has been submitted and is under review."
- The submit button changes to an "Edit" button (using the new button style below)
- Clicking "Edit" allows editing fields but does NOT resubmit — changes save silently to the database via PATCH but do not change the application status or trigger any notifications
- There is NO resubmit button while the application is active

**Grace period resubmit — only after FUNDED or Declined status:**

The merchant can resubmit a new application only when:
- Current status is `FUNDED` OR `all lenders decline` OR `Declined by funder`
- AND it has been at least 5 months since the `updated_at` timestamp on that status change

To calculate this, store the date when the terminal status was reached. Use `merchants.updated_at` as a proxy — when status changes to a terminal status, `updated_at` is already being set. Check: `now() - updated_at >= 5 months`.

**When grace period is over:**
- Show a "Apply Again" button (new button style)
- Clicking it resets the merchant's application: clears status back to `application & 3 months bank statements in`, clears matched lenders, clears offers, sets `updated_at = now()`
- A fresh application flow begins

**When grace period is NOT over yet:**
- Show a countdown message: "You may reapply in X months." (calculate months remaining)
- No resubmit button

**Terminal statuses that start the grace period clock:**
```ts
const TERMINAL_STATUSES = [
  'FUNDED',
  'all lenders decline',
  'Declined by funder',
]
```

### Where this logic lives

In `components/dashboards/MerchantDashboard.tsx`, find the application form section. Add a helper function:

```ts
function getMerchantFormState(merchant: Merchant): 'not_submitted' | 'submitted' | 'grace_pending' | 'can_reapply' {
  if (!merchant || !merchant.status) return 'not_submitted'
  
  const isTerminal = TERMINAL_STATUSES.includes(merchant.status)
  if (!isTerminal) return 'submitted'
  
  const updatedAt = new Date(merchant.updated_at)
  const fiveMonthsLater = new Date(updatedAt)
  fiveMonthsLater.setMonth(fiveMonthsLater.getMonth() + 5)
  const now = new Date()
  
  if (now >= fiveMonthsLater) return 'can_reapply'
  return 'grace_pending'
}
```

Use this function to drive what the merchant sees:
- `not_submitted` → normal form, submit button
- `submitted` → locked fields, Edit button, status message
- `grace_pending` → locked fields, countdown message, no submit button
- `can_reapply` → locked fields, "Apply Again" button

---

## Change 3 — Button Redesign

### The new button style

This neumorphic style applies to the primary action buttons across the app. Create a reusable component:

Create `src/components/ui/PrimaryButton.tsx`:

```tsx
import React from 'react'

interface PrimaryButtonProps {
  label: string
  onClick: () => void
  disabled?: boolean
  variant?: 'default' | 'funded' | 'danger'
}

export function PrimaryButton({ label, onClick, disabled, variant = 'default' }: PrimaryButtonProps) {
  // Adapt colors for dark mode — read from document class or pass as prop
  const isDark = document.documentElement.classList.contains('dark')
  
  const baseStyle: React.CSSProperties = {
    color: isDark ? '#e5e7eb' : '#090909',
    padding: '0.7em 1.7em',
    fontSize: '18px',
    borderRadius: '0.5em',
    background: isDark ? '#1f2937' : '#e8e8e8',
    cursor: disabled ? 'not-allowed' : 'pointer',
    border: isDark ? '1px solid #374151' : '1px solid #e8e8e8',
    transition: 'all 0.3s',
    boxShadow: isDark
      ? '6px 6px 12px #111827, -6px -6px 12px #374151'
      : '6px 6px 12px #c5c5c5, -6px -6px 12px #ffffff',
    opacity: disabled ? 0.5 : 1,
  }

  return (
    <button
      style={baseStyle}
      onClick={disabled ? undefined : onClick}
      disabled={disabled}
      onMouseDown={e => {
        if (!disabled) {
          const el = e.currentTarget
          el.style.boxShadow = isDark
            ? 'inset 4px 4px 12px #111827, inset -4px -4px 12px #374151'
            : 'inset 4px 4px 12px #c5c5c5, inset -4px -4px 12px #ffffff'
          el.style.color = isDark ? '#9ca3af' : '#666'
        }
      }}
      onMouseUp={e => {
        const el = e.currentTarget
        el.style.boxShadow = isDark
          ? '6px 6px 12px #111827, -6px -6px 12px #374151'
          : '6px 6px 12px #c5c5c5, -6px -6px 12px #ffffff'
        el.style.color = isDark ? '#e5e7eb' : '#090909'
      }}
    >
      {label}
    </button>
  )
}
```

### Where to apply the new button

Replace the primary action button in these specific locations only — do not change every button in the app, only the main apply/submit/edit action buttons:

**MerchantDashboard.tsx:**
- The submit application button → use `PrimaryButton`
- The edit button (after submission) → use `PrimaryButton` with label "Edit Application"
- The "Apply Again" button (after grace period) → use `PrimaryButton` with label "Apply Again"
- Center this button in the middle of the form/page — not left-aligned, not in a corner

**LenderDashboard.tsx:**
- The apply / submit offer button → use `PrimaryButton`
- After lender has submitted their profile: button label changes to "Edit Profile" — lenders can always edit, no lock

### AI Chat button
The chatbot trigger button that currently sits in the corner — make it larger and more prominent, centered or moved so it doesn't overlap important UI. Use `PrimaryButton` for it with a label like "Ask AI" or whatever label currently exists. Make it at minimum 20% larger than other buttons.

---

## Step 4 — Verify

```bash
bun run tsc --noEmit
bun run build
```

Visual checks:
- [ ] Dark/light toggle appears on login page (top right)
- [ ] Dark/light toggle appears on register page (top right)
- [ ] Dark/light toggle appears in dashboard shell nav
- [ ] Toggle animates correctly in both light and dark mode
- [ ] Toggle preference persists on page refresh
- [ ] Merchant form is locked after submission with correct message
- [ ] Edit button appears and allows field editing without resubmitting
- [ ] Grace period countdown shows correct months remaining
- [ ] "Apply Again" appears after 5 months on terminal status
- [ ] New button style appears on primary action buttons
- [ ] Button has correct press/active animation
- [ ] Button adapts correctly to dark and light mode
- [ ] AI chat button is larger and not covering important UI
- [ ] TypeScript clean, build passing

---

## Hard Rules

1. **Do not change any route or backend code** — UI only this phase
2. **Do not change any non-primary buttons** — only the specific buttons listed above get the new style
3. **Dark mode localStorage key must stay the same** as whatever is currently in use — do not change the key name
4. **Grace period logic is frontend-only** — calculated from `merchant.updated_at` and `merchant.status`. No new database columns needed.
5. **Merchant edit saves silently** — PATCH to update fields but no status change, no email trigger
6. **No `any` types**
7. **Use Bun for any new installs**

---

## Done When

- [ ] `src/components/ui/DarkModeToggle.tsx` created
- [ ] `src/components/ui/PrimaryButton.tsx` created
- [ ] Toggle on login, register, and dashboard shell
- [ ] Merchant form state machine implemented (`not_submitted` / `submitted` / `grace_pending` / `can_reapply`)
- [ ] Primary action buttons replaced with new style in merchant and lender dashboards
- [ ] AI chat button larger and repositioned
- [ ] `bun run tsc --noEmit` passes clean
- [ ] `bun run build` passes clean
- [ ] All visual checks pass

When done, print a summary of every file created or modified.
