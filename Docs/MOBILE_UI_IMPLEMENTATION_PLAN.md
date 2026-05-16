# MCA King Mobile UI Implementation Plan

## Purpose

MCA King currently has a strong desktop CRM interface. The goal of this plan is to add clean mobile and tablet support **without changing the existing desktop experience**.

Mobile support should be additive:

- Keep the desktop layout, colors, navigation, and CRM workflows intact.
- Use responsive Tailwind classes and shared mobile-aware components.
- Avoid separate duplicate mobile pages unless a page truly needs a different interaction pattern.
- Preserve the semantic theme-token system already added to the app.
- Make admin, sales rep, merchant, and lender workflows usable on phones.

---

## Current UI Architecture Summary

### Main app entry

- `App.tsx` controls auth, setup forms, dashboard routing, print view, merchant application form, lender form, and role-based dashboard access.
- `components/dashboards/DashboardController.tsx` loads role-specific data and renders the correct dashboard.

### Role dashboards

- `components/dashboards/AdminDashboard.tsx`
- `components/dashboards/SalesRepDashboard.tsx`
- `components/dashboards/MerchantDashboard.tsx`
- `components/dashboards/LenderDashboard.tsx`

### Shared shell/navigation

- `components/dashboards/shared/DashboardShell.tsx`

This is already the most important responsive foundation:

- Desktop uses a left sidebar at `lg:` and above.
- Mobile/tablet uses a compact top header with a menu button that opens a hidden left drawer.
- Settings and logout actions live in the sidebar/drawer footer instead of appearing as regular mobile top tabs.

This pattern should be preserved for V1.

### Shared visual components

- `components/ui/Card.tsx`
- `components/ui/Input.tsx`
- `components/ui/Select.tsx`
- `components/ui/Textarea.tsx`
- `src/components/ui/PrimaryButton.tsx`
- `src/components/ui/DarkModeToggle.tsx`
- `src/components/ui/MCAKingLoader.tsx`

These components own much of the visual consistency and should be upgraded carefully for touch targets, spacing, wrapping, and mobile sizing.

### Current theme system

- `tailwind.config.cjs`
- `index.css`
- `src/components/ui/corporateTechTheme.ts`

The app now uses semantic Tailwind tokens such as:

```txt
bg-app
bg-surface
bg-surface-muted
bg-surface-strong
text-main
text-muted
border-line
border-line-strong
bg-primary
bg-secondary
bg-accent
bg-danger
bg-success
bg-warning
```

Mobile work should continue using these semantic tokens. Do not reintroduce random raw colors.

---

## Audit Findings

### What is already mobile-friendly

The app already has several responsive foundations:

1. `DashboardShell` has separate desktop and mobile navigation behavior.
2. Most detail cards use `grid grid-cols-1 md:grid-cols-2` or similar patterns.
3. Many page headers already switch from row to column on small screens.
4. Reports and analytics use `grid-cols-1` before expanding at larger breakpoints.
5. Tables are commonly wrapped in `overflow-x-auto`, preventing immediate page breakage.
6. Modals generally use `fixed inset-0`, `p-4`, `max-h-[90vh]`, and `overflow-y-auto` patterns.
7. Auth pages are already centered and constrained with `max-w-md`.
8. Mobile dashboard navigation now uses a hidden left drawer instead of a horizontally scrolling top tab bar.

### Main mobile risks

The following areas need structured cleanup before calling mobile support production-ready.

#### 1. Tables are usable but not truly mobile-friendly

Several pages rely on desktop-style tables:

- Admin lender directory
- Sales rep deals table
- Lender assigned merchants table
- Report drilldown tables
- Some document/file lists

Current behavior: horizontal scroll.

This prevents layout breakage, but on phones it is not ideal. For important CRM lists, mobile should show card/list rows instead of forcing users to pan sideways.

#### 2. Dense dashboard pages need mobile card/list views

Admin and sales rep dashboards contain dense list rows with many fields. Some rows already use grid layouts, but others are still table-first.

Mobile users should see:

- Business name/title first
- Important status badges second
- One or two high-value metrics
- Primary action button full-width or easy to tap
- Secondary fields collapsed or stacked

#### 3. Forms have desktop spacing in a few places

The merchant application form in `App.tsx` uses large desktop padding:

```tsx
p-8 sm:p-12
p-12
text-4xl
```

On mobile, this should scale down to avoid cramped screens and excessive scrolling.

#### 4. Step indicator is hidden on mobile

The merchant application form hides the desktop step indicator under `md`:

```tsx
hidden md:block
```

Mobile should have a compact progress UI so merchants know where they are in the application.

Recommended mobile replacement:

- Step `2 of 5`
- Current step title
- Horizontal progress bar
- Optional short step labels in a scrollable row

#### 5. Chatbot can collide with mobile UI

`components/Chatbot.tsx` uses a fixed panel:

```tsx
fixed bottom-24 right-4 sm:right-8 w-80 sm:w-96 h-[500px]
```

On small phones this can be too wide/tall and may overlap important dashboard controls.

Mobile should use:

- Full-width bottom sheet or nearly full-screen modal
- `w-[calc(100vw-1rem)]`
- `h-[min(75vh,560px)]`
- Safe-area bottom padding
- Smaller bottom offset

#### 6. Fixed action buttons need mobile safe-area spacing

Examples:

- Lender `Edit Profile` floating button in `App.tsx`
- Chatbot `Ask AI` button

These can overlap each other and can collide with mobile browser bars.

Need a mobile floating-action layout strategy.

#### 7. Kanban pipeline is desktop-oriented

`KanbanPipelineView` is intentionally horizontal and desktop-friendly:

```tsx
overflow-x-auto
w-[306px]
xl:flex-row
```

This should stay for desktop, but mobile needs either:

- A compact stage selector + vertical cards, or
- A mobile pipeline list grouped by current stage, or
- A scrollable snap carousel with better touch spacing.

The safest implementation is to keep desktop Kanban unchanged and add a mobile-specific rendering inside the same component using responsive visibility classes.

#### 8. Modals need consistent mobile sizing

Many modals already mostly work, but should be standardized through a shared component to avoid inconsistencies.

Examples:

- Lead modal
- Funding modal
- Renewal modal
- Payoff request modal
- Manual email modal
- Create task modal
- Lender offer/document request modals

Mobile modal rules:

- Full-screen or bottom-sheet on phones.
- Normal centered dialog on tablet/desktop.
- Header/footer sticky where useful.
- Content scrolls inside modal, not behind the overlay.

#### 9. Inputs/buttons need consistent touch target sizes

Most buttons are visually good, but mobile should guarantee at least ~44px high tap targets.

`PrimaryButton` small size currently uses:

```tsx
px-3 py-2 text-sm
```

This may be okay visually, but mobile-heavy screens would benefit from a `mobileFullWidth` or responsive class pattern when actions stack.

#### 10. Some copy still needs mobile correction unrelated to layout

`components/DocumentUpload.tsx` still says:

```txt
PNG, JPG, PDF up to 10MB.
```

The backend was changed to 100 MB. This text should be corrected during mobile polish so mobile users are not misled.

---

## Non-Negotiable Implementation Rules

1. **Do not redesign desktop.** Desktop is approved and should remain visually stable.
2. **Use responsive Tailwind utilities first.** Prefer `sm:`, `md:`, `lg:`, `xl:` classes over JS viewport checks.
3. **Use semantic color tokens only.** Continue using `bg-surface`, `text-main`, `border-line`, etc.
4. **Avoid duplicate logic.** If mobile needs different layout, share data rendering helpers.
5. **Mobile-first additions should be isolated.** Add mobile wrappers/views without rewriting working desktop flows.
6. **Preserve all security/auth/API behavior.** This is UI-only unless a bug is found.
7. **Keep accessibility intact.** Buttons need labels, modals need proper close behavior, inputs need labels.
8. **Test every role.** Admin, sales rep, merchant, and lender must each be checked on mobile.

---

## Proposed Mobile Breakpoints

Use Tailwind's default responsive model:

```txt
base      = phones
sm:       = large phones / small tablets
md:       = tablets
lg:       = desktop shell/sidebar begins
xl/2xl:   = wide desktop dashboards
```

Important rule:

- Base classes should represent mobile.
- Existing desktop rules should remain at `lg:` and above where possible.

---

## Recommended Shared Components to Add

### 1. `ResponsivePageHeader`

Suggested path:

```txt
components/dashboards/shared/mobile/ResponsivePageHeader.tsx
```

Purpose:

- Standardize dashboard page title/subtitle/action layout.
- Stack title/actions on mobile.
- Keep row layout on desktop.

Mobile behavior:

- Title full width.
- Subtitle below title.
- Actions wrap or become full-width.

Desktop behavior:

- Preserve existing row layout.

---

### 2. `MobileActionBar`

Suggested path:

```txt
components/dashboards/shared/mobile/MobileActionBar.tsx
```

Purpose:

- Used for stacked mobile actions like Back/Edit/Download/Send.
- Avoid tiny action clusters on phones.

Mobile behavior:

- Buttons stack or wrap cleanly.
- Optional sticky bottom behavior for critical workflows.

Desktop behavior:

- Simple inline flex row.

---

### 3. `ResponsiveDataList`

Suggested path:

```txt
components/dashboards/shared/mobile/ResponsiveDataList.tsx
```

Purpose:

- Render table on desktop and cards on mobile.
- Keep the desktop table unchanged.

API concept:

```tsx
<ResponsiveDataList
  rows={rows}
  desktopTable={...}
  mobileCard={(row) => ...}
/>
```

Usage targets:

- Sales rep deals
- Lender assigned merchants
- Admin lender directory
- Report rows where practical

---

### 4. `MobileProgressStepper`

Suggested path:

```txt
components/dashboards/shared/mobile/MobileProgressStepper.tsx
```

Purpose:

- Mobile replacement for hidden merchant application `StepIndicator`.

Display:

- `Step X of Y`
- Current step title
- Progress bar
- Optional current step description

---

### 5. `ResponsiveModal`

Suggested path:

```txt
components/dashboards/shared/mobile/ResponsiveModal.tsx
```

Purpose:

- Standardize all modal overlays.

Phone behavior:

- `fixed inset-x-0 bottom-0 max-h-[92dvh] rounded-t-2xl`
- Internal scroll area
- Sticky header/footer if needed

Tablet/desktop behavior:

- Centered modal with `max-w-*`

---

### 6. `DashboardShell` mobile drawer nav

V1 status: implemented.

Current mobile navigation uses the shared `DashboardShell` pattern:

- Desktop keeps the persistent left sidebar at `lg:` and above.
- Mobile/tablet keeps a compact top header with a `Menu` button.
- The `Menu` button opens a hidden left drawer containing the same section list as desktop.
- Settings and logout actions live in the drawer footer, matching the desktop sidebar model.

Future optional improvements:

- Add focus trapping/escape-key handling to the drawer for stronger accessibility.
- Consider a compact current-section label in the mobile header if users need more context.
- Continue avoiding duplicated mobile-only pages unless a workflow truly needs different interaction.

---

## Page-by-Page Mobile Plan

## Phase M1 — Mobile foundation and no-desktop-regression guardrails

### Files to review/edit

```txt
index.html
index.css
tailwind.config.cjs
components/ui/Card.tsx
components/ui/Input.tsx
components/ui/Select.tsx
components/ui/Textarea.tsx
src/components/ui/PrimaryButton.tsx
components/dashboards/shared/DashboardShell.tsx
```

### Tasks

- Confirm `index.html` has a correct viewport meta tag.
- Add safe-area CSS utilities if needed:
  - bottom safe padding
  - fixed action safe spacing
- Ensure shared inputs/buttons meet mobile tap target expectations.
- Add optional responsive button helper classes without changing desktop default styles.
- Preserve all semantic theme tokens.
- Review `DashboardShell` mobile header/nav for horizontal overflow, logo sizing, logout button size, and sticky behavior.

### Expected outcome

- App shell is stable on mobile.
- Desktop shell remains unchanged.
- Shared components are ready for mobile screens.

---

## Phase M2 — Mobile dashboard list/card views

### Files to review/edit

```txt
components/dashboards/AdminDashboard.tsx
components/dashboards/SalesRepDashboard.tsx
components/dashboards/LenderDashboard.tsx
components/dashboards/shared/reports/ReportTable.tsx
components/dashboards/shared/DocumentsPanel.tsx
components/dashboards/shared/FilterBar.tsx
components/dashboards/shared/SearchBar.tsx
```

### Tasks

- Keep desktop tables at `md:` or `lg:` and above.
- Add mobile card views below that breakpoint.
- Add better mobile stacking for filters.
- Make search results fit narrow screens.
- Ensure pagination controls wrap cleanly.

### Recommended first targets

1. Sales rep `My Deals` table.
2. Lender `Assigned Merchants` table.
3. Admin `Lender Directory` table.
4. `ReportTable` rows.

### Expected outcome

- Mobile users can read and act on lists without horizontal scrolling for core workflows.
- Desktop tables remain exactly the same or visually equivalent.

---

## Phase M3 — Mobile merchant application and lender form

### Files to review/edit

```txt
App.tsx
components/BusinessInfoForm.tsx
components/OwnersForm.tsx
components/AgreementsForm.tsx
components/Summary.tsx
components/DocumentUpload.tsx
components/DocumentUploadStep.tsx
components/StepIndicator.tsx
components/LenderForm.tsx
components/SignaturePad.tsx
```

### Tasks

- Add `MobileProgressStepper` for merchant application flow.
- Reduce mobile padding in application form cards.
- Reduce mobile heading sizes while preserving desktop `text-4xl` at larger breakpoints.
- Make Back/Next/Submit buttons stack or fit cleanly.
- Ensure owner add/remove actions are easy to tap.
- Ensure signature pad fits mobile viewport.
- Correct upload helper text to reflect 100 MB.
- Make lender criteria form title/header wrap cleanly on phones.

### Expected outcome

- Merchant application flow feels native on phones.
- Lender criteria form is usable on phones.
- Desktop form layout remains unchanged.

---

## Phase M4 — Mobile detail pages and CRM panels

### Files to review/edit

```txt
components/dashboards/shared/MerchantDetailView.tsx
components/dashboards/shared/LenderDetailView.tsx
components/dashboards/shared/ActivityTimeline.tsx
components/dashboards/shared/TaskPanel.tsx
components/dashboards/shared/FundingSummary.tsx
components/dashboards/shared/DocumentsPanel.tsx
components/dashboards/shared/MerchantFileSubmissionsPanel.tsx
components/dashboards/shared/PayoffRequestsPanel.tsx
components/dashboards/shared/RenewalPanel.tsx
components/dashboards/shared/communications/CommunicationHistoryPanel.tsx
components/dashboards/shared/communications/CommunicationPreferencesPanel.tsx
```

### Tasks

- Make all action rows wrap or stack on mobile.
- Add card-like grouping where dense details become hard to scan.
- Ensure detail values do not overflow horizontally.
- Ensure document rows handle long filenames.
- Ensure task/activity/communication panels are readable with small screen widths.

### Expected outcome

- Merchant/lender detail views are comfortable on mobile.
- Admin and sales reps can perform common follow-up actions from phones.

---

## Phase M5 — Mobile modals and communication center

### Files to review/edit

```txt
components/dashboards/shared/CreateTaskModal.tsx
components/dashboards/shared/FundingModal.tsx
components/dashboards/shared/RenewalModal.tsx
components/dashboards/shared/PayoffRequestModal.tsx
components/dashboards/shared/communications/ManualEmailModal.tsx
components/dashboards/shared/communications/CampaignBuilder.tsx
components/dashboards/shared/communications/MessageTemplateEditor.tsx
components/dashboards/LeadManager.tsx
components/dashboards/LenderDashboard.tsx
```

### Tasks

- Introduce shared `ResponsiveModal`.
- Convert high-use modals first:
  - Lead detail/new lead modal
  - Manual email modal
  - Create task modal
  - Funding modal
- Make campaign builder editor/preview stack better on phones.
- Consider hiding large email iframe preview behind a toggle on very small screens.

### Expected outcome

- Modals no longer feel cramped or desktop-only on phones.
- Communications center remains powerful on desktop and usable on mobile.

---

## Phase M6 — Mobile Kanban pipeline

### Files to review/edit

```txt
components/dashboards/shared/KanbanPipelineView.tsx
```

### Current issue

The Kamba pipeline is a horizontal desktop workflow. That is correct for desktop, but mobile users need a focused view.

### Recommended approach

Keep the existing desktop Kanban for `lg:` and above.

Add mobile view for below `lg:`:

- Stage selector at top.
- Stage summary count.
- Vertical list of cards for selected stage.
- Card tap opens the existing detail/fullscreen behavior.
- Optional quick stage navigation buttons.

### Expected outcome

- Desktop Kanban unchanged.
- Mobile pipeline becomes usable without sideways dragging through 12 columns.

---

## Phase M7 — Mobile chatbot and floating actions

### Files to review/edit

```txt
components/Chatbot.tsx
App.tsx
```

### Tasks

- Make chatbot panel use full-width bottom sheet on phones.
- Add safe-area bottom padding.
- Make `Ask AI` and lender `Edit Profile` floating buttons avoid overlap.
- Consider using one shared floating action stack.

### Expected outcome

- AI assistant is usable on phones.
- Floating buttons do not cover important content or each other.

---

## Phase M8 — QA and verification

### Required device widths

Test in browser dev tools at:

```txt
320px  small iPhone width
375px  common iPhone width
390px  modern iPhone width
414px  large phone width
768px  tablet portrait
1024px tablet landscape / small desktop
1440px desktop regression check
```

### Required role paths

#### Admin

- Login
- Mobile nav through all dashboard sections
- Leads list and lead modal
- Merchant directory
- Lender directory
- Kamba pipeline
- Tasks
- Finance
- Renewals
- Reports
- Communications
- Settings

#### Sales rep

- Login
- Leads
- My deals
- Kamba pipeline
- Tasks
- Renewals
- Reports
- Communications
- Settings

#### Merchant

- Register/login
- Start application
- Complete all application steps
- Upload documents
- View dashboard
- View status
- View/upload stipulations
- Request renewal/payoff if eligible
- Settings/logout

#### Lender

- Register/login
- Complete lender criteria profile
- View assigned merchants
- Open merchant file
- Request document
- Create offer
- View analytics
- Settings/logout

### Required commands

Run after implementation:

```bash
bun run tsc --noEmit
bun run build
```

Optional but recommended:

```bash
bunx playwright test
```

Only add Playwright if the user approves adding automated browser tests.

---

## Implementation Order Recommendation

Best order to minimize risk:

1. Shared mobile foundations and safe-area utilities.
2. Mobile card views for tables/lists.
3. Merchant application mobile improvements.
4. Detail page and panel improvements.
5. Responsive modal component and modal migration.
6. Mobile Kamba pipeline view.
7. Chatbot/floating action cleanup.
8. Full role-by-role QA.

This order avoids breaking the approved desktop UI and improves the highest-impact mobile areas first.

---

## Acceptance Criteria

Mobile support is complete when:

- No core page requires awkward sideways scrolling except intentionally scrollable charts or desktop-only fallback tables.
- Desktop layout at `lg` and above remains visually stable.
- Mobile navigation is clear and usable.
- Tables with key CRM data have mobile card/list alternatives.
- Merchant application can be completed comfortably on a phone.
- Lender profile and offer workflows work on a phone.
- Modals fit phone screens and scroll correctly.
- Chatbot works as a mobile bottom sheet or mobile-safe panel.
- Buttons and controls are large enough to tap reliably.
- Theme colors remain semantic and consistent in light/dark mode.
- TypeScript and production build pass.

---

## Notes for Future Implementation

- This plan intentionally avoids a full redesign.
- Use responsive CSS, not device detection, unless absolutely necessary.
- Prefer improving shared components so many screens benefit at once.
- Preserve the current brand-heavy visual style.
- Avoid changing backend routes, auth, CSRF, Supabase policies, or communications logic during mobile UI work unless a real bug is discovered.
