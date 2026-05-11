# MCA King: Merchant Cash Advance Application Platform

MCA King is a React/TypeScript platform for managing Merchant Cash Advance applications from intake through lender matching, offers, contracts, and funding. The former standalone Kamba/Kanban mockup has been merged into this main app as the official internal pipeline view.

## Current Status

The app now uses the **12-step Kamba Pipeline** as the single source of truth for application status. The old 6-status system has been replaced.

### Official 12-Step Application Flow

1. `application & 3 months bank statements in`
2. `sent to lender`
3. `all lenders decline`
4. `one or more lender's sent offer`
5. `Merchant accepts offer`
6. `Merchant Declines Offer's`
7. `more docs requested`
8. `contract sent`
9. `contract signed`
10. `contract declined by the merchant`
11. `Declined by funder`
12. `FUNDED`

These values are defined in `types.ts` and configured in:

```txt
components/dashboards/shared/applicationStatus.ts
```

## Key Features

### Merchant Application Intake

- Multi-step merchant application form
- Business information
- Owner information
- Credit authorization and signature
- Document upload step
- Final review before submission
- New applications start at:

```txt
application & 3 months bank statements in
```

### Role-Based Dashboards

The app includes separate dashboard experiences for:

- **Admin**
- **Sales Rep**
- **Lender**
- **Merchant**

### Admin View

Admin users can:

- View all merchant submissions
- View all lender submissions
- Assign sales reps
- Edit merchant/lender records
- Find matching lenders
- Notify lenders
- Print merchant applications to PDF
- Use the Kamba Pipeline board to move deals through all 12 statuses

Admin left-side sections:

```txt
Merchant Directory
Lender Directory
Kamba Pipeline
```

### Sales Rep View

Sales reps can:

- View only their assigned deals
- See merchant contact details
- Use click-to-call and click-to-email links
- View matched lenders and offers
- Use the Kamba Pipeline board for their assigned deals only

Sales rep left-side sections:

```txt
My Deals
Kamba Pipeline
```

### Kamba Pipeline Board

The Kamba board is now integrated into the main app at:

```txt
components/dashboards/shared/KanbanPipelineView.tsx
```

It provides:

- 12 horizontal pipeline columns
- Real merchant cards instead of placeholders
- Drag-and-drop status updates
- Matched lender count
- Offer count
- Accepted offer visibility
- Contract signed indicator
- Color-coded status columns:
  - Red for declined/dead statuses
  - Yellow for more-docs/request statuses
  - Green for funded
  - Neutral for active pipeline steps

Dragging a card updates the real merchant record:

```ts
merchant.status
```

### Lender Offer Flow

When a lender creates an offer, the merchant status becomes:

```txt
one or more lender's sent offer
```

### Merchant Offer Flow

When a merchant accepts an offer, the merchant status becomes:

```txt
Merchant accepts offer
```

Accepting an offer no longer marks the deal as funded. Funding now happens later in the pipeline after contract steps.

If all offers are rejected, the merchant status becomes:

```txt
Merchant Declines Offer's
```

### Legacy Status Migration

Older localStorage records using the old 6 statuses are migrated automatically when dashboards load:

```txt
Submitted        -> application & 3 months bank statements in
Under Review     -> sent to lender
Needs More Info  -> more docs requested
Offers Received  -> one or more lender's sent offer
Funded           -> FUNDED
Declined         -> all lenders decline
```

## Tech Stack

- React
- TypeScript
- Vite
- Tailwind CSS via CDN in `index.html`
- `@dnd-kit/core`, `@dnd-kit/sortable`, and `@dnd-kit/utilities` for drag-and-drop
- Google Gemini API via `@google/genai` for the chatbot
- Browser `localStorage` for prototype persistence

## Project Structure

```txt
mca-application-form/
├── App.tsx
├── index.html
├── index.tsx
├── package.json
├── types.ts
├── vite.config.ts
├── components/
│   ├── dashboards/
│   │   ├── AdminDashboard.tsx
│   │   ├── DashboardController.tsx
│   │   ├── LenderDashboard.tsx
│   │   ├── MerchantDashboard.tsx
│   │   ├── SalesRepDashboard.tsx
│   │   └── shared/
│   │       ├── DashboardShell.tsx
│   │       ├── KanbanPipelineView.tsx
│   │       ├── applicationStatus.ts
│   │       ├── EditLenderForm.tsx
│   │       ├── EditMerchantForm.tsx
│   │       ├── LenderDetailView.tsx
│   │       ├── MerchantDetailView.tsx
│   │       └── SummaryItem.tsx
│   ├── ui/
│   ├── BusinessInfoForm.tsx
│   ├── OwnersForm.tsx
│   ├── AgreementsForm.tsx
│   ├── DocumentUploadStep.tsx
│   ├── LenderForm.tsx
│   ├── PrintView.tsx
│   └── Chatbot.tsx
└── public/
    └── logo.png
```

The old standalone `mind-map-kanban/` folder has been removed. The Kamba functionality now lives inside `mca-application-form/`.

## Running Locally

Do **not** double-click `index.html`. This is a Vite/React app and needs a local server.

From the project root:

```bash
cd mca-application-form
npm install
npm run dev
```

Then open the local URL printed by Vite, usually:

```txt
http://localhost:3000
```

For a production preview:

```bash
npm run build
npm run preview
```

## Environment Variables

The chatbot uses the Gemini API. Configure:

```txt
GEMINI_API_KEY
```

`vite.config.ts` maps this into:

```txt
process.env.API_KEY
process.env.GEMINI_API_KEY
```

## Known Prototype Limitations

- Data is stored in browser `localStorage`; this is not secure for production.
- There is no real authentication yet.
- Sales rep login is still a profile selector mockup.
- Lender matching currently runs client-side.
- Uploaded documents are represented in browser state/localStorage, not secure cloud storage.
- Email automation and PDF package delivery to lenders are not implemented yet.
- `index.html` references `/index.css`, but the app is currently styled through Tailwind CDN. This should be cleaned up before production by either adding the CSS file or removing the unused link.
