import type { Lead, LeadNote, LeadStatus } from '../../../types'
import { recordActivity } from '../../lib/activity'
import { getPagination, paginatedJson, cleanSearchTerm, hasListParams } from '../../lib/list-query'
import { requireAuth } from '../../lib/requireAuth'
import { assertRole, badRequest, forbidden, json } from '../../lib/route-utils'
import { supabaseAdmin } from '../../lib/supabase-server'

type LeadRow = Omit<Lead, 'latest_note' | 'notes'>
type LeadNoteRow = LeadNote & { users?: { full_name: string | null; email: string } | null }

type LeadCreateBody = {
  business_name?: string
  owner_name?: string | null
  phone?: string | null
  email?: string | null
  state?: string | null
  assigned_rep_id?: string | null
  status?: LeadStatus
  initial_note?: string
}

async function withLatestNotes(leads: LeadRow[]): Promise<Response | Lead[]> {
  if (leads.length === 0) return []
  const leadIds = leads.map(lead => lead.id)
  const { data, error } = await supabaseAdmin
    .from('lead_notes')
    .select('*, users:written_by(full_name,email)')
    .in('lead_id', leadIds)
    .order('created_at', { ascending: false })
    .returns<LeadNoteRow[]>()

  if (error) return badRequest(error.message)

  return leads.map(lead => {
    const note = (data ?? []).find(item => item.lead_id === lead.id)
    const latest_note = note ? { ...note, author_name: note.users?.full_name ?? note.users?.email } : null
    return { ...lead, latest_note }
  })
}

export async function GET(req: Request): Promise<Response> {
  const user = await requireAuth(req)
  if (user.role === 'merchant' || user.role === 'lender') return forbidden()

  const url = new URL(req.url)
  const shouldPaginate = hasListParams(url)
  const pagination = getPagination(url)
  const search = cleanSearchTerm(url.searchParams.get('search'))
  const status = url.searchParams.get('status')
  const assignedRepId = url.searchParams.get('assigned_rep_id')

  let query = supabaseAdmin
    .from('leads')
    .select('*', { count: shouldPaginate ? 'exact' : undefined })

  if (user.role === 'sales_rep') {
    query = query.or(`assigned_rep_id.eq.${user.id},created_by.eq.${user.id}`)
  }

  if (search) query = query.or(`business_name.ilike.%${search}%,owner_name.ilike.%${search}%,email.ilike.%${search}%,phone.ilike.%${search}%`)
  if (status) query = query.eq('status', status)
  if (assignedRepId && user.role === 'admin') query = query.eq('assigned_rep_id', assignedRepId)

  query = query.order('updated_at', { ascending: false })
  if (shouldPaginate) query = query.range(pagination.from, pagination.to)

  const { data, error, count } = await query.returns<LeadRow[]>()
  if (error) return badRequest(error.message)

  const leads = await withLatestNotes(data ?? [])
  if (leads instanceof Response) return leads
  return shouldPaginate ? paginatedJson(leads, count, pagination.page, pagination.perPage) : json(leads)
}

export async function POST(req: Request): Promise<Response> {
  const user = await requireAuth(req)
  const roleError = assertRole(user, ['admin', 'sales_rep'])
  if (roleError) return roleError

  const body = await req.json() as LeadCreateBody
  if (!body.business_name) return badRequest('Business name is required')

  const assignedRepId = user.role === 'sales_rep' ? user.id : body.assigned_rep_id ?? null
  const { data, error } = await supabaseAdmin
    .from('leads')
    .insert({
      created_by: user.id,
      assigned_rep_id: assignedRepId,
      business_name: body.business_name,
      owner_name: body.owner_name ?? null,
      phone: body.phone ?? null,
      email: body.email ?? null,
      state: body.state ?? null,
      status: body.status ?? 'new',
    })
    .select('*')
    .single<LeadRow>()

  if (error) return badRequest(error.message)

  if (body.initial_note?.trim()) {
    const noteBody = body.initial_note.trim()
    const { error: noteError } = await supabaseAdmin.from('lead_notes').insert({
      lead_id: data.id,
      written_by: user.id,
      body: noteBody,
    })
    if (noteError) return badRequest(noteError.message)
    recordActivity({
      entity_type: 'lead',
      entity_id: data.id,
      user_id: user.id,
      activity_type: 'note',
      body: noteBody,
    })
  }

  recordActivity({
    entity_type: 'lead',
    entity_id: data.id,
    user_id: user.id,
    activity_type: 'system',
    body: `Lead created: ${data.business_name}`,
  })

  return json(data, { status: 201 })
}
