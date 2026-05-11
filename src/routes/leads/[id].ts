import type { Lead, LeadNote, LeadStatus } from '../../../types'
import { requireAuth } from '../../lib/requireAuth'
import { assertRole, badRequest, forbidden, getId, json, notFound, type RouteContext } from '../../lib/route-utils'
import { supabaseAdmin } from '../../lib/supabase-server'

type LeadRow = Omit<Lead, 'latest_note' | 'notes'>
type LeadNoteRow = LeadNote & { users?: { full_name: string | null; email: string } | null }
type LeadPatchBody = Partial<Pick<Lead, 'business_name' | 'owner_name' | 'phone' | 'email' | 'state' | 'assigned_rep_id'>> & { status?: LeadStatus }

async function fetchLead(id: string): Promise<LeadRow | null | Response> {
  const { data, error } = await supabaseAdmin.from('leads').select('*').eq('id', id).single<LeadRow>()
  if (error) return error.code === 'PGRST116' ? null : badRequest(error.message)
  return data
}

function canAccess(userRole: string, userId: string, lead: LeadRow): boolean {
  if (userRole === 'admin') return true
  if (userRole === 'sales_rep') return lead.assigned_rep_id === userId || lead.created_by === userId
  return false
}

export async function GET(req: Request, context?: RouteContext): Promise<Response> {
  const user = await requireAuth(req)
  const id = getId(context)
  if (!id) return badRequest()

  const lead = await fetchLead(id)
  if (lead instanceof Response) return lead
  if (!lead) return notFound()
  if (!canAccess(user.role, user.id, lead)) return forbidden()

  const { data: notes, error } = await supabaseAdmin
    .from('lead_notes')
    .select('*, users:written_by(full_name,email)')
    .eq('lead_id', id)
    .order('created_at', { ascending: false })
    .returns<LeadNoteRow[]>()
  if (error) return badRequest(error.message)

  return json({
    ...lead,
    notes: (notes ?? []).map(note => ({ ...note, author_name: note.users?.full_name ?? note.users?.email })),
  })
}

export async function PATCH(req: Request, context?: RouteContext): Promise<Response> {
  const user = await requireAuth(req)
  const roleError = assertRole(user, ['admin', 'sales_rep'])
  if (roleError) return roleError

  const id = getId(context)
  if (!id) return badRequest()
  const lead = await fetchLead(id)
  if (lead instanceof Response) return lead
  if (!lead) return notFound()
  if (!canAccess(user.role, user.id, lead)) return forbidden()

  const body = await req.json() as LeadPatchBody
  if (user.role !== 'admin' && Object.prototype.hasOwnProperty.call(body, 'assigned_rep_id')) return forbidden('Only admins can assign leads')

  const update: LeadPatchBody & { updated_at: string } = { updated_at: new Date().toISOString() }
  if (body.business_name !== undefined) update.business_name = body.business_name
  if (body.owner_name !== undefined) update.owner_name = body.owner_name
  if (body.phone !== undefined) update.phone = body.phone
  if (body.email !== undefined) update.email = body.email
  if (body.state !== undefined) update.state = body.state
  if (body.status !== undefined) update.status = body.status
  if (user.role === 'admin' && body.assigned_rep_id !== undefined) update.assigned_rep_id = body.assigned_rep_id

  const { data, error } = await supabaseAdmin.from('leads').update(update).eq('id', id).select('*').single<LeadRow>()
  if (error) return badRequest(error.message)
  return json(data)
}

export async function DELETE(req: Request, context?: RouteContext): Promise<Response> {
  await requireAuth(req, 'admin')
  const id = getId(context)
  if (!id) return badRequest()
  const { error } = await supabaseAdmin.from('leads').delete().eq('id', id)
  if (error) return badRequest(error.message)
  return new Response(null, { status: 204 })
}
