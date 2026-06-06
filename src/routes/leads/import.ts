import type { LeadImportResult, LeadImportRow, LeadStatus } from '../../../types'
import { writeAuditLog } from '../../lib/audit'
import { recordActivity } from '../../lib/activity'
import { requireAuth } from '../../lib/requireAuth'
import { assertRole, badRequest, json } from '../../lib/route-utils'
import { supabaseAdmin } from '../../lib/supabase-server'

type LeadImportBody = {
  rows?: LeadImportRow[]
}

type ExistingLead = {
  id: string
  business_name: string
  email: string | null
  phone: string | null
  state: string | null
}

type SalesRepRef = {
  id: string
  email: string
}

const MAX_IMPORT_ROWS = 5000
const IMPORT_STATUSES: LeadStatus[] = ['new', 'contacted', 'docs_requested', 'dead']

const clean = (value: unknown): string => String(value ?? '').trim()
const cleanNullable = (value: unknown): string | null => {
  const text = clean(value)
  return text.length > 0 ? text : null
}
const normalizeEmail = (value: unknown): string => clean(value).toLowerCase()
const normalizePhone = (value: unknown): string => clean(value).replace(/\D/g, '')
const normalizeKey = (value: unknown): string => clean(value).toLowerCase()
const businessStateKey = (businessName: string, state: string | null): string => `${normalizeKey(businessName)}|${normalizeKey(state)}`

function normalizeStatus(value: unknown): LeadStatus | null {
  const status = clean(value).toLowerCase().replace(/[\s-]+/g, '_') as LeadStatus
  if (!status) return 'new'
  return IMPORT_STATUSES.includes(status) ? status : null
}

async function loadExistingLeads(rows: LeadImportRow[]): Promise<ExistingLead[]> {
  const emails = Array.from(new Set(rows.map(row => normalizeEmail(row.email)).filter(Boolean)))
  const phones = Array.from(new Set(rows.map(row => clean(row.phone)).filter(Boolean)))
  const names = Array.from(new Set(rows.map(row => clean(row.business_name)).filter(Boolean)))

  const queries = []
  if (emails.length > 0) queries.push(supabaseAdmin.from('leads').select('id,business_name,email,phone,state').in('email', emails).returns<ExistingLead[]>())
  if (phones.length > 0) queries.push(supabaseAdmin.from('leads').select('id,business_name,email,phone,state').in('phone', phones).returns<ExistingLead[]>())
  if (names.length > 0) queries.push(supabaseAdmin.from('leads').select('id,business_name,email,phone,state').in('business_name', names).returns<ExistingLead[]>())

  const results = await Promise.all(queries)
  const rowsById = new Map<string, ExistingLead>()
  for (const result of results) {
    if (result.error) throw new Error(result.error.message)
    for (const lead of result.data ?? []) rowsById.set(lead.id, lead)
  }
  return Array.from(rowsById.values())
}

async function loadSalesRepsByEmail(rows: LeadImportRow[]): Promise<Map<string, SalesRepRef>> {
  const emails = Array.from(new Set(rows.map(row => normalizeEmail(row.assigned_rep_email)).filter(Boolean)))
  if (emails.length === 0) return new Map()

  const { data, error } = await supabaseAdmin
    .from('users')
    .select('id,email')
    .eq('role', 'sales_rep')
    .in('email', emails)
    .returns<SalesRepRef[]>()

  if (error) throw new Error(error.message)
  return new Map((data ?? []).map(rep => [normalizeEmail(rep.email), rep]))
}

function isDuplicate(row: LeadImportRow, existing: ExistingLead[], seen: Set<string>): boolean {
  const email = normalizeEmail(row.email)
  const phoneDigits = normalizePhone(row.phone)
  const businessName = clean(row.business_name)
  const state = cleanNullable(row.state)
  const rowKeys = [
    email ? `email:${email}` : '',
    phoneDigits ? `phone:${phoneDigits}` : '',
    businessName && state ? `business_state:${businessStateKey(businessName, state)}` : '',
  ].filter(Boolean)

  if (rowKeys.some(key => seen.has(key))) return true

  const duplicate = existing.some(lead => (
    (email && normalizeEmail(lead.email) === email) ||
    (phoneDigits && normalizePhone(lead.phone) === phoneDigits) ||
    (businessName && state && businessStateKey(lead.business_name, lead.state) === businessStateKey(businessName, state))
  ))

  if (!duplicate) rowKeys.forEach(key => seen.add(key))
  return duplicate
}

export async function POST(req: Request): Promise<Response> {
  const user = await requireAuth(req)
  const roleError = assertRole(user, ['admin', 'sales_rep'])
  if (roleError) return roleError

  const body = await req.json() as LeadImportBody
  const rows = Array.isArray(body.rows) ? body.rows : []
  if (rows.length === 0) return badRequest('No rows to import')
  if (rows.length > MAX_IMPORT_ROWS) return badRequest(`Import is limited to ${MAX_IMPORT_ROWS} rows`)

  try {
    const [existingLeads, salesRepsByEmail] = await Promise.all([
      loadExistingLeads(rows),
      user.role === 'admin' ? loadSalesRepsByEmail(rows) : Promise.resolve(new Map<string, SalesRepRef>()),
    ])

    const seen = new Set<string>()
    const result: LeadImportResult = { total_rows: rows.length, imported: 0, skipped_duplicates: 0, skipped_invalid: 0, errors: [] }

    for (const [index, row] of rows.entries()) {
      const rowNumber = index + 1
      const businessName = clean(row.business_name)
      if (!businessName) {
        result.skipped_invalid += 1
        result.errors.push({ row: rowNumber, reason: 'Missing business name' })
        continue
      }

      const status = normalizeStatus(row.status)
      if (!status) {
        result.skipped_invalid += 1
        result.errors.push({ row: rowNumber, reason: 'Invalid status' })
        continue
      }

      if (isDuplicate(row, existingLeads, seen)) {
        result.skipped_duplicates += 1
        continue
      }

      const assignedRepEmail = normalizeEmail(row.assigned_rep_email)
      const assignedRepId = user.role === 'sales_rep'
        ? user.id
        : assignedRepEmail
          ? salesRepsByEmail.get(assignedRepEmail)?.id ?? null
          : null

      if (user.role === 'admin' && assignedRepEmail && !assignedRepId) {
        result.skipped_invalid += 1
        result.errors.push({ row: rowNumber, reason: `Assigned rep email not found: ${assignedRepEmail}` })
        continue
      }

      const { data: lead, error } = await supabaseAdmin
        .from('leads')
        .insert({
          created_by: user.id,
          assigned_rep_id: assignedRepId,
          business_name: businessName,
          owner_name: cleanNullable(row.owner_name),
          phone: cleanNullable(row.phone),
          email: cleanNullable(row.email)?.toLowerCase() ?? null,
          state: cleanNullable(row.state)?.toUpperCase() ?? null,
          status,
        })
        .select('id,business_name')
        .single<{ id: string; business_name: string }>()

      if (error) {
        result.skipped_invalid += 1
        result.errors.push({ row: rowNumber, reason: error.message })
        continue
      }

      result.imported += 1
      existingLeads.push({ id: lead.id, business_name: businessName, email: cleanNullable(row.email)?.toLowerCase() ?? null, phone: cleanNullable(row.phone), state: cleanNullable(row.state)?.toUpperCase() ?? null })

      const noteBody = clean(row.initial_note)
      if (noteBody) {
        const { error: noteError } = await supabaseAdmin.from('lead_notes').insert({ lead_id: lead.id, written_by: user.id, body: noteBody })
        if (!noteError) recordActivity({ entity_type: 'lead', entity_id: lead.id, user_id: user.id, activity_type: 'note', body: noteBody })
      }
    }

    recordActivity({
      entity_type: 'lead',
      entity_id: user.id,
      user_id: user.id,
      activity_type: 'system',
      body: `Lead CSV import completed: ${result.imported} imported, ${result.skipped_duplicates} duplicates skipped, ${result.skipped_invalid} invalid skipped`,
      metadata: { result },
    })

    await writeAuditLog({ req, user_id: user.id, action: 'leads.import', entity_type: 'lead', metadata: { result } })
    return json(result)
  } catch (error) {
    return badRequest(error instanceof Error ? error.message : 'Could not import leads')
  }
}
