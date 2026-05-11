# Goose Agent Prompt — Phase 3: Documents & Storage
> Phase 1 and Phase 2 are complete. All 11 tables exist in Supabase with RLS enabled. Server routes are working. localStorage is gone. Leads system is built. Now we wire up real file uploads and document management.

---

## What You Are Doing This Phase

1. **Upload route** — accept files from the frontend, store them in Supabase Storage, write metadata to the `documents` table
2. **Documents route** — list documents for a merchant, generate signed URLs for secure viewing
3. **Delete route** — admin can remove a document from storage and the table
4. **Stipulations route** — lender requests a doc, merchant sees the request and uploads to fulfill it
5. **Frontend wiring** — connect the existing document upload UI to the real routes. Add a documents panel to the merchant detail view for admin/rep. Add stipulation request UI for lenders.

---

## Step 1 — Inspect Existing Upload UI (read first, code second)

Before writing anything, read these existing files to understand what's already there:

- `components/DocumentUploadStep.tsx` — the merchant-facing upload component
- `components/dashboards/MerchantDashboard.tsx` — where the upload step is used
- `components/dashboards/shared/MerchantDetailView.tsx` — the admin/rep view of a merchant

Understand exactly what they currently do with uploaded files (likely storing file names in state or localStorage). Then replace only the data layer — keep all existing UI intact.

---

## Step 2 — Upload Route

**`src/routes/documents/upload.ts`** — POST

Accepts a `multipart/form-data` request with:
- `file` — the actual file binary
- `merchant_id` — which merchant this belongs to
- `doc_type` — one of: `bank_statement | contract | stipulation | id | other`
- `stipulation_id` (optional) — if this upload fulfills a stipulation request

Logic:
1. Call `requireAuth(req)` — any authenticated role can upload (merchant uploads their own, admin/rep can upload on behalf)
2. Enforce ownership: if role is `merchant`, verify `merchant_id` matches their own merchant record (`user_id = session.user.id`)
3. Generate storage path: `/{merchant_id}/{doc_type}/{timestamp}-{original_filename}` — sanitize the filename (remove spaces, special chars)
4. Upload to Supabase Storage bucket `documents` using `supabaseAdmin.storage.from('documents').upload(path, file)`
5. Insert row into `documents` table with `merchant_id`, `uploaded_by`, `doc_type`, `file_name`, `storage_path`
6. If `stipulation_id` was provided, update `stipulations` table: set `is_fulfilled = true`, `fulfilled_at = now()`
7. Return the new document row

```ts
// Storage path pattern
const timestamp = Date.now()
const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, '_')
const storagePath = `${merchant_id}/${doc_type}/${timestamp}-${safeName}`
```

---

## Step 3 — Documents List Route

**`src/routes/documents/index.ts`** — GET

Query param: `?merchant_id=<uuid>`

Logic:
1. `requireAuth(req)`
2. Enforce access by role:
   - `admin` + `sales_rep`: can view documents for any merchant
   - `merchant`: only their own merchant's documents
   - `lender`: only merchants matched to them via `lender_matches`
3. Fetch all rows from `documents` where `merchant_id = query.merchant_id`
4. For each document, generate a **signed URL** from Supabase Storage (valid for 1 hour):
   ```ts
   const { data } = await supabaseAdmin.storage
     .from('documents')
     .createSignedUrl(doc.storage_path, 3600)
   ```
5. Return documents array with `signed_url` attached to each row

---

## Step 4 — Document Delete Route

**`src/routes/documents/[id].ts`** — DELETE

Admin only.

1. `requireAuth(req, 'admin')`
2. Fetch the document row to get `storage_path`
3. Delete from Supabase Storage: `supabaseAdmin.storage.from('documents').remove([storage_path])`
4. Delete the row from `documents` table
5. Return 200

---

## Step 5 — Stipulations Routes

### Request a stipulation (lender or admin)

**`src/routes/stipulations/index.ts`** — POST

Body: `{ merchant_id, lender_id, description }`

1. `requireAuth(req)` — lender or admin only (return 403 for merchant or sales_rep)
2. Insert into `stipulations` table
3. Update merchant status to `more docs requested`
4. Insert into `status_history`
5. Return the new stipulation row

### List stipulations for a merchant

**`src/routes/stipulations/index.ts`** — GET

Query param: `?merchant_id=<uuid>`

1. `requireAuth(req)`
2. Role rules:
   - `admin` + `sales_rep`: any merchant
   - `merchant`: only their own
   - `lender`: only merchants matched to them
3. Return all stipulations for that merchant including `is_fulfilled` status

---

## Step 6 — Frontend Wiring

### `DocumentUploadStep.tsx`

Replace whatever it currently does with files (state/localStorage) with a real upload to `POST /api/documents/upload`.

Use `FormData`:
```ts
const formData = new FormData()
formData.append('file', file)
formData.append('merchant_id', merchantId)
formData.append('doc_type', docType)
// if fulfilling a stipulation:
// formData.append('stipulation_id', stipulationId)

const res = await fetch('/api/documents/upload', {
  method: 'POST',
  body: formData
  // do NOT set Content-Type header — browser sets it automatically with boundary for multipart
})
```

Show upload progress if the existing UI supports it. Show success/error state after upload. After a successful upload, refresh the document list for this merchant.

### `MerchantDetailView.tsx` (admin/rep view)

Add a **Documents panel** to the merchant detail view. It should:
- Fetch `GET /api/documents?merchant_id=<id>` on load
- Display each document as a row: file name, doc type, uploaded by, upload date, and a "View" link using the `signed_url`
- Admin gets a "Delete" button per document that calls `DELETE /api/documents/[id]`
- Show a simple upload form inline (file picker + doc type dropdown) that posts to the upload route

### `MerchantDashboard.tsx` (merchant's own view)

Add a **My Documents** section showing the merchant's own uploaded files. Same signed URL view links. No delete for merchants.

Also add a **Stipulations** section:
- Fetch `GET /api/stipulations?merchant_id=<id>` on load
- For each unfulfilled stipulation, show:
  - The description of what's needed
  - An upload button that opens a file picker and posts to `/api/documents/upload` with `stipulation_id` included
  - Once fulfilled, show as checked/complete with the uploaded file name

### `LenderDashboard.tsx`

Add a **Request Document** button on matched merchant cards. Opens a small form:
- Description field (what do you need?)
- Submit posts to `POST /api/stipulations`
- On success, show confirmation that the request was sent

---

## Step 7 — Add Routes to Vite API Bridge

In `src/server/api.ts` (the Vite middleware bridge Goose built in Phase 2), register the new routes:

```
POST   /api/documents/upload
GET    /api/documents
DELETE /api/documents/:id
POST   /api/stipulations
GET    /api/stipulations
```

Follow the exact same pattern already used for merchants, lenders, and leads in that file.

---

## Step 8 — Type Updates

Add to `src/types.ts` — do not remove anything existing:

```ts
export type DocType = 'bank_statement' | 'contract' | 'stipulation' | 'id' | 'other'

export interface Document {
  id: string
  merchant_id: string
  uploaded_by: string
  doc_type: DocType
  file_name: string
  storage_path: string
  uploaded_at: string
  signed_url?: string  // attached by server, not stored in DB
}

export interface Stipulation {
  id: string
  merchant_id: string
  lender_id: string
  requested_by: string
  description: string
  is_fulfilled: boolean
  fulfilled_at: string | null
  created_at: string
}
```

---

## Step 9 — Verify

```bash
bun run tsc --noEmit
bun run build
```

Manual smoke tests to run:

- [ ] Merchant can upload a bank statement — appears in their documents list
- [ ] Admin can view the document via signed URL
- [ ] Signed URL works (opens the file in browser)
- [ ] Admin can delete a document — disappears from list and storage
- [ ] Lender can request a stipulation — merchant sees it in their dashboard
- [ ] Merchant can upload to fulfill the stipulation — stipulation shows as fulfilled
- [ ] Merchant status moves to `more docs requested` when stipulation is created
- [ ] TypeScript clean, build passing

---

## Hard Rules

1. **Do not change any existing UI layout or styling** — only wire up the data
2. **All uploads go to Supabase Storage bucket `documents`** — never store file binaries in the database
3. **Always generate signed URLs server-side** — never expose the storage path directly to the browser
4. **Signed URLs expire in 1 hour** — do not increase this
5. **Enforce ownership on upload** — a merchant can only upload to their own merchant record
6. **Stipulation requests move merchant status to `more docs requested`** and write to `status_history`
7. **Use Bun for any new installs**
8. **No `any` types**
9. **Use Supabase MCP** to inspect storage and table data if you need to debug

---

## Done When

- [ ] `src/routes/documents/upload.ts` created
- [ ] `src/routes/documents/index.ts` created
- [ ] `src/routes/documents/[id].ts` created
- [ ] `src/routes/stipulations/index.ts` created (GET + POST)
- [ ] New routes registered in Vite API bridge
- [ ] `DocumentUploadStep.tsx` wired to real upload route
- [ ] `MerchantDetailView.tsx` has documents panel with signed URL view + admin delete
- [ ] `MerchantDashboard.tsx` has my documents section + stipulations section with upload-to-fulfill
- [ ] `LenderDashboard.tsx` has request document button
- [ ] `Document` and `Stipulation` types added to `types.ts`
- [ ] `bun run tsc --noEmit` passes clean
- [ ] `bun run build` passes clean
- [ ] All smoke tests pass

When done, print a summary of every file created or modified.
