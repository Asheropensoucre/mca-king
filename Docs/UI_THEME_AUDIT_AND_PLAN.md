# MCA King UI Theme Audit + Brand Color Plan

_Last updated: 2026-05-15_

## Purpose

This document audits how MCA King currently handles colors, Tailwind theme tokens, light mode, and dark mode. It also proposes a cleaner brand-color system and an implementation plan before making visual code changes.

The goal is **not** to remove branding. The goal is to make MCA King feel branded everywhere while avoiding bad contrast, mismatched light/dark mode behavior, and one-off raw CSS styling.

Core design rule:

```txt
Brand colors should drive the whole app.
But every brand color needs a light-mode and dark-mode role with correct contrast.
Components should use Tailwind theme classes/tokens, not random raw CSS or one-off hardcoded colors.
```

---

# Current Theme Architecture

## Current theme files

The app currently has three separate places defining/using the brand theme:

```txt
tailwind.config.cjs
index.css
src/components/ui/corporateTechTheme.ts
```

### `tailwind.config.cjs`

Current Tailwind theme defines `corporateTechColors`, then maps those colors into:

```txt
theme.*
theme-yellow
theme-teal
theme-red
theme-maroon
theme-black
dark-bg
dark-card
slate/gray/zinc/neutral/stone custom scales
red/blue/green/yellow custom scales
```

### `index.css`

Current CSS defines CSS variables like:

```txt
--ct-surface
--ct-primary
--ct-secondary
--ct-tertiary-fixed
--ct-inverse-surface
```

It also applies global gradient backgrounds and shadow overrides.

### `src/components/ui/corporateTechTheme.ts`

This duplicates the color object in TypeScript so inline-style components can access brand colors.

This creates a problem:

```txt
The same colors are duplicated in Tailwind config, CSS variables, and TypeScript.
If we change branding, we must update multiple places.
```

---

# Current Brand Colors

Current main colors:

| Token | Current Hex | Current Role |
|---|---:|---|
| `primary` | `#00236f` | Deep blue |
| `primaryContainer` | `#1e3a8a` | Lighter blue / dark card |
| `secondary` | `#006a61` | Teal |
| `secondaryFixed` | `#89f5e7` | Bright teal |
| `tertiaryFixed` | `#ffe262` | Yellow/gold |
| `inverseSurface` / `theme-maroon` | `#560068` | Purple/maroon |
| `surface` | `#fff7fa` | Pink-white background |
| `surfaceContainer*` | pink/lavender range | Light cards/surfaces |
| `onSurface` | `#350040` | Dark purple text |

## Contrast audit of key pairs

The main color pairs are actually high contrast in isolation:

| Pair | Approx contrast |
|---|---:|
| dark purple text on light surface | `16.27:1` |
| dark purple text on light container | `13.98:1` |
| pale text on deep blue | `12.61:1` |
| pale text on purple/maroon | `11.62:1` |
| yellow on deep blue | `11.09:1` |
| yellow on purple/maroon | `10.22:1` |
| teal accent on deep blue | `11.07:1` |

So the issue is probably **not only the raw hex colors**. The bigger issue is **inconsistent application**.

The colors can work, but the app currently mixes:

```txt
brand tokens
custom remapped slate colors
raw Tailwind slate/gray/emerald/amber/red classes
inline styles
CSS variables
hardcoded email colors
light/dark class combinations that are not always paired
```

That creates the unpolished feeling.

---

# Main Problems Found in the Code Audit

## 1. Brand colors are spread across too many systems

Color definitions exist in:

```txt
tailwind.config.cjs
index.css
src/components/ui/corporateTechTheme.ts
src/lib/email-templates.ts
src/lib/communications/html.ts
inline style objects in UI components
```

This causes drift and makes a full rebrand hard.

## 2. Many UI components use inline style objects instead of Tailwind classes

Important UI components currently use raw inline style logic:

```txt
src/components/ui/PrimaryButton.tsx
src/components/ui/authTheme.ts
src/components/ui/DarkModeToggle.tsx
src/components/ui/RoleToggle.tsx
src/components/ui/MCAKingLoader.tsx
```

These components read `COLORS` directly and generate styles in JS.

Problem:

```txt
Tailwind dark mode cannot consistently control these styles.
The app has to manually detect dark mode with document.documentElement.classList.
This can desync from React state and makes styling harder to audit.
```

## 3. Too many components use direct `slate-*`, `gray-*`, `emerald-*`, `amber-*`, etc.

Examples of frequent direct color classes:

```txt
text-slate-500
text-slate-400
text-slate-700
text-slate-300
border-slate-200
border-slate-700
bg-slate-50
bg-slate-900
bg-red-50
bg-amber-100
bg-emerald-100
```

Some of these are remapped in Tailwind to the current brand scale, but they still make the code confusing.

Problem:

```txt
A developer reading text-slate-500 expects Tailwind gray/slate.
But in this project slate is overridden to custom pink/purple brand colors.
That makes the UI harder to reason about.
```

## 4. Some light/dark pairs are incomplete

Many components correctly use:

```txt
text-slate-700 dark:text-slate-300
bg-slate-50 dark:bg-slate-900
border-slate-200 dark:border-slate-700
```

But some components have light-only states, or dark mode states that are technically present but visually inconsistent because the underlying `slate` palette has been redefined.

## 5. Status colors are inconsistent

Different areas use different status colors:

```txt
blue
amber
green
emerald
red
teal
purple
orange
```

This is not automatically bad, but the app lacks one central status palette.

Needed:

```txt
new
submitted
review
approved
declined
funded
more_docs
overdue
danger
success
warning
info
```

Each status should have a light and dark token.

## 6. Cards mostly work, but they are very heavy

Current card style:

```txt
rounded-xl
border-2
border-theme-maroon/80
bg-white/95
large hard shadow
backdrop blur
dark:border-theme-yellow/80
dark:bg-dark-card/95
```

This gives personality, but if used everywhere it can feel visually loud.

Potential problem:

```txt
Every card has a strong border/shadow.
Dense CRM screens can become noisy.
```

We do not need to remove the brand style, but we may need card variants:

```txt
card-primary
card-subtle
card-panel
card-danger
card-success
```

## 7. Tables and dense CRM areas need stricter rules

Dense sections like reports, finance, merchants, and pipeline use many text/background combinations. These should be standardized because they are where contrast issues are most noticeable.

High-risk files from the audit:

```txt
components/dashboards/shared/KanbanPipelineView.tsx
components/dashboards/MerchantDashboard.tsx
components/dashboards/LeadManager.tsx
components/dashboards/shared/TaskPanel.tsx
components/dashboards/AdminSettingsPage.tsx
components/dashboards/shared/MerchantDetailView.tsx
components/dashboards/shared/MerchantFileSubmissionsPanel.tsx
components/Chatbot.tsx
components/dashboards/shared/DashboardShell.tsx
components/dashboards/shared/FundingSummary.tsx
```

These files have the most mixed direct color usage and dark-mode usage.

---

# Recommended Brand Direction

You said brand colors should be for everything. That is fine. The fix should be:

```txt
Do not remove brand colors.
Replace random/weak brand colors with a complete brand scale.
Use brand tokens for every UI role.
```

The current colors feel like they came from a random Material-style palette. The contrast can work, but the pink/purple surface system may be causing the app to feel less polished and less finance/CRM-professional.

## Recommended brand mood

```txt
Premium finance CRM
High contrast
Deep navy / royal blue foundation
Teal for action/success
Gold for premium accents
Purple/maroon only as a supporting brand accent, not the main text for everything
Clean light surfaces
Strong but not noisy dark mode
```

---

# Proposed New Brand Palette

This keeps the MCA King feel but makes it cleaner and easier to use.

## Core brand colors

| Role | Proposed Hex | Notes |
|---|---:|---|
| `brand-navy` | `#071A3D` | Main dark foundation, more professional than current purple-black |
| `brand-blue` | `#123B8A` | Primary action / app structure |
| `brand-blue-soft` | `#DCE7FF` | Light blue container |
| `brand-teal` | `#007A70` | Secondary action / positive accent |
| `brand-teal-soft` | `#C9FFF4` | Light teal container |
| `brand-gold` | `#F4C430` | Premium accent / active state |
| `brand-gold-soft` | `#FFF2B8` | Light gold container |
| `brand-plum` | `#4B145F` | Optional legacy maroon/plum accent |
| `brand-red` | `#B42318` | Danger/errors |

## Light mode tokens

| Token | Hex | Use |
|---|---:|---|
| `app-bg` | `#F6F8FC` | Whole page background |
| `surface` | `#FFFFFF` | Cards, modals, tables |
| `surface-muted` | `#EEF3FA` | Subtle panels |
| `surface-strong` | `#DCE7FF` | Brand-tinted section headers |
| `text-main` | `#071A3D` | Main text |
| `text-muted` | `#50627A` | Secondary text |
| `border` | `#C9D5E6` | Normal border |
| `border-strong` | `#123B8A` | Active/important border |
| `primary` | `#123B8A` | Main button/nav active |
| `on-primary` | `#FFFFFF` | Text on primary |
| `accent` | `#F4C430` | Gold accent |
| `on-accent` | `#211700` | Text on gold |
| `secondary` | `#007A70` | Teal action/accent |
| `on-secondary` | `#FFFFFF` | Text on teal |

## Dark mode tokens

| Token | Hex | Use |
|---|---:|---|
| `app-bg` | `#061226` | Whole page background |
| `surface` | `#0B1E3A` | Cards, modals, tables |
| `surface-muted` | `#10294D` | Subtle panels |
| `surface-strong` | `#123B8A` | Strong brand panels |
| `text-main` | `#F7FAFF` | Main text |
| `text-muted` | `#AFC0D6` | Secondary text |
| `border` | `#29456D` | Normal border |
| `border-strong` | `#F4C430` | Active/important border |
| `primary` | `#F4C430` | Main dark-mode button/accent |
| `on-primary` | `#211700` | Text on gold |
| `accent` | `#7CF4E6` | Teal glow/accent |
| `on-accent` | `#002B27` | Text on teal |
| `secondary` | `#7CF4E6` | Teal action/accent |
| `on-secondary` | `#002B27` | Text on teal |

## Why this works better

- Still branded everywhere.
- Dark mode is truly dark.
- Light mode is truly light.
- Gold and teal remain strong brand elements.
- Navy/blue creates a more finance/trust feel.
- Plum/maroon can stay as a supporting legacy accent if desired.
- Tokens map to UI roles instead of random color names.

---

# Tailwind Token Plan

The app should stop relying on generic `slate-*`/`gray-*` for brand surfaces.

Instead define Tailwind tokens like:

```txt
bg-app
bg-surface
bg-surface-muted
bg-surface-strong
text-main
text-muted
border-default
border-strong
bg-primary
text-on-primary
bg-secondary
text-on-secondary
bg-accent
text-on-accent
bg-danger
text-on-danger
```

Because Tailwind class names cannot be magically dynamic for dark mode unless we define them carefully, use one of two approaches.

## Preferred approach: CSS variables + Tailwind color aliases

In `index.css`:

```css
:root {
  --color-app-bg: #F6F8FC;
  --color-surface: #FFFFFF;
  --color-text-main: #071A3D;
  ...
}

html.dark {
  --color-app-bg: #061226;
  --color-surface: #0B1E3A;
  --color-text-main: #F7FAFF;
  ...
}
```

In `tailwind.config.cjs`:

```js
colors: {
  app: 'rgb(var(--color-app-bg) / <alpha-value>)',
  surface: 'rgb(var(--color-surface) / <alpha-value>)',
  text: {
    main: 'rgb(var(--color-text-main) / <alpha-value>)',
    muted: 'rgb(var(--color-text-muted) / <alpha-value>)',
  },
  brand: { ... }
}
```

Then components use:

```txt
bg-app
bg-surface
text-text-main
text-text-muted
border-border
bg-primary
text-on-primary
```

This means the same component class automatically changes in dark mode because CSS variables change.

## Avoid this long-term

Avoid one-off combinations like:

```txt
bg-slate-50 dark:bg-slate-900
text-slate-700 dark:text-slate-300
border-slate-200 dark:border-slate-700
```

These are okay temporarily, but they are exactly what caused inconsistent pages.

---

# Component Refactor Plan

## Phase UI-1 — Theme token cleanup

Files:

```txt
tailwind.config.cjs
index.css
src/components/ui/corporateTechTheme.ts
```

Tasks:

- Replace current random/generated palette with intentional brand tokens.
- Make CSS variables the source of truth for light/dark role colors.
- Keep `corporateTechTheme.ts` only for email/inline fallback if absolutely needed.
- Prefer Tailwind classes for app UI.
- Keep font unchanged.

Acceptance criteria:

```txt
Theme roles exist for app bg, surface, text, borders, primary, secondary, accent, danger.
Light/dark mode works by token role, not by random component-specific colors.
```

## Phase UI-2 — Shared UI components first

Files:

```txt
components/ui/Card.tsx
components/ui/Input.tsx
components/ui/Select.tsx
components/ui/Textarea.tsx
src/components/ui/PrimaryButton.tsx
src/components/ui/DarkModeToggle.tsx
src/components/ui/RoleToggle.tsx
src/components/ui/authTheme.ts
src/components/ui/MCAKingLoader.tsx
components/dashboards/shared/DashboardShell.tsx
```

Tasks:

- Remove most inline styles.
- Replace JS color logic with Tailwind token classes.
- Add component variants where needed:
  - Card: `default`, `subtle`, `strong`, `danger`, `success`
  - Button: `primary`, `secondary`, `accent`, `danger`, `ghost`
  - Input: consistent label/input/help/error styles
- Keep branded geometric/shadow style, but make it consistent.

Acceptance criteria:

```txt
Most pages improve automatically because shared components control colors.
No raw inline theme colors in buttons/forms/cards.
```

## Phase UI-3 — Status/badge system

Create a central status style helper, probably replacing scattered status color objects in:

```txt
components/dashboards/shared/applicationStatus.ts
components/dashboards/shared/KanbanPipelineView.tsx
components/dashboards/LeadManager.tsx
components/dashboards/MerchantDashboard.tsx
components/dashboards/shared/MerchantFileSubmissionsPanel.tsx
components/dashboards/shared/TaskPanel.tsx
```

Recommended semantic tokens:

| Status role | Light | Dark |
|---|---|---|
| `info` | blue container / navy text | blue strong / light text |
| `warning` | gold soft / dark gold text | gold / dark text |
| `success` | teal soft / dark teal text | teal / dark text |
| `danger` | red soft / red text | red strong / light text |
| `neutral` | muted surface / text-muted | muted surface / text-muted |

Acceptance criteria:

```txt
All badges/status chips use one source of truth.
No random amber/emerald/blue/purple status combinations across pages.
```

## Phase UI-4 — High-risk dashboard pages

Refactor highest color-mix files first:

```txt
components/dashboards/shared/KanbanPipelineView.tsx
components/dashboards/MerchantDashboard.tsx
components/dashboards/LeadManager.tsx
components/dashboards/shared/TaskPanel.tsx
components/dashboards/AdminSettingsPage.tsx
components/dashboards/shared/MerchantDetailView.tsx
components/dashboards/shared/MerchantFileSubmissionsPanel.tsx
components/Chatbot.tsx
components/dashboards/shared/FundingSummary.tsx
components/dashboards/AdminFinanceView.tsx
```

Tasks:

- Replace direct `slate`, `gray`, `amber`, `emerald`, etc. with semantic tokens.
- Fix table headers, modals, panels, empty states, error states.
- Confirm light mode and dark mode contrast screen-by-screen.

## Phase UI-5 — Email templates separately

Email HTML cannot use Tailwind reliably because email clients strip/limit CSS.

Files:

```txt
src/lib/email-templates.ts
src/lib/communications/html.ts
src/lib/communications/unsubscribe.ts
```

Plan:

- Keep inline email styles, but source colors from the same proposed brand palette.
- Email styling is allowed to be inline because email clients require it.
- Do not mix app CSS assumptions into email templates.

---

# Specific Code Smells to Fix

## Inline theme JS

Current examples:

```txt
PrimaryButton.tsx uses style objects and document.documentElement.classList.
DarkModeToggle.tsx uses inline styles.
RoleToggle.tsx uses inline styles.
authTheme.ts manually returns CSSProperties.
```

Replace with:

```txt
Tailwind classes based on variants.
dark: handled by Tailwind/CSS variables.
```

## Generic slate/gray classes

Current examples:

```txt
text-slate-500
bg-slate-50
border-slate-200
dark:bg-slate-900
```

Replace with:

```txt
text-muted
bg-surface-muted
border-default
bg-surface
text-main
```

## Too many component-local status maps

Replace scattered local maps with one helper:

```txt
src/lib/ui/status-styles.ts
```

or:

```txt
components/dashboards/shared/statusStyles.ts
```

---

# Proposed Naming Convention

Use semantic classes, not visual guesses.

Good:

```txt
bg-app
bg-surface
bg-surface-muted
text-main
text-muted
border-default
bg-primary
text-on-primary
bg-accent
text-on-accent
```

Avoid:

```txt
bg-slate-50
text-gray-700
bg-purple-100
text-amber-800
```

The developer should not need to remember which shade works in dark mode. The token should encode that rule.

---

# Recommended Implementation Order

1. Update Tailwind/CSS variables only.
2. Update shared UI components.
3. Update dashboard shell/navigation.
4. Update status badges and pipeline.
5. Update dense pages/tables/modals.
6. Update emails with matching brand palette.
7. Run full typecheck/build.
8. Review major screens in both light and dark mode.

---

# Acceptance Criteria for the UI Polish Pass

- Light mode uses light branded surfaces with dark readable text.
- Dark mode uses dark branded surfaces with light readable text.
- Brand colors are used everywhere through tokens, not random raw values.
- Most UI components use Tailwind classes, not inline style objects.
- Buttons/cards/inputs/tables/modals have consistent variants.
- Status badges use one centralized semantic style map.
- No major screen has dark text on dark background or light text on light background.
- The app still feels branded, but more polished and intentional.
- `bun run tsc --noEmit` passes.
- `bun run build` passes.

---

# Recommendation

Do not do a random color tweak.

Do a deliberate UI polish phase:

```txt
Phase J — Design System + Brand Theme Polish
```

Scope:

```txt
Tailwind theme tokens
CSS variables
shared UI components
status badges
dashboard color cleanup
light/dark consistency
email brand color alignment
```

This should be reviewed before implementation, just like the prior phases.
