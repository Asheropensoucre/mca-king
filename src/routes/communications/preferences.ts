import { getOrCreatePreference } from '../../lib/communications/suppression'
import type { CommunicationEntityType } from '../../lib/communications/types'
import { canAccessCommunicationEntity } from '../../lib/communications/entities'
import { writeAuditLog } from '../../lib/audit'
import { requireAuth } from '../../lib/requireAuth'
import { badRequest, forbidden, json } from '../../lib/route-utils'
import { supabaseAdmin } from '../../lib/supabase-server'

function isEntityType(value: string | null): value is CommunicationEntityType {
  return value === 'lead' || value === 'merchant' || value === 'contact' || value === 'user'
}

export async function GET(req: Request): Promise<Response> {
  const user = await requireAuth(req)
  if (user.role === 'merchant' || user.role === 'lender') return forbidden()
  const url = new URL(req.url)
  const entityType = url.searchParams.get('entity_type')
  const entityId = url.searchParams.get('entity_id')
  if (!isEntityType(entityType) || !entityId) return badRequest('entity_type and entity_id are required')
  if (!await canAccessCommunicationEntity(user, entityType, entityId)) return forbidden()

  const { data, error } = await supabaseAdmin
    .from('communication_preferences')
    .select('*')
    .eq('entity_type', entityType)
    .eq('entity_id', entityId)
    .maybeSingle()
  if (error) return badRequest(error.message)
  return json(data ?? await getOrCreatePreference({ entity_type: entityType, entity_id: entityId }))
}

export async function PATCH(req: Request): Promise<Response> {
  const user = await requireAuth(req)
  if (user.role === 'merchant' || user.role === 'lender') return forbidden()
  const body = await req.json() as Record<string, unknown>
  const entityType = typeof body.entity_type === 'string' ? body.entity_type : null
  const entityId = typeof body.entity_id === 'string' ? body.entity_id : null
  if (!isEntityType(entityType) || !entityId) return badRequest('entity_type and entity_id are required')
  if (!await canAccessCommunicationEntity(user, entityType, entityId)) return forbidden()

  await getOrCreatePreference({ entity_type: entityType, entity_id: entityId, email: body.email as string | undefined, phone: body.phone as string | undefined })
  const allowed = ['email', 'phone', 'email_opt_in', 'email_opt_out', 'sms_opt_in', 'sms_opt_out', 'sms_consent_source', 'sms_consent_text', 'sms_consent_ip', 'sms_consent_at', 'do_not_contact', 'preferred_contact_method']
  const patch: Record<string, unknown> = { updated_at: new Date().toISOString() }
  for (const key of allowed) if (Object.prototype.hasOwnProperty.call(body, key)) patch[key] = body[key]
  if (patch.email_opt_out === true) {
    patch.email_opt_in = false
    patch.email_opt_out_at = new Date().toISOString()
  }
  if (patch.sms_opt_out === true) {
    patch.sms_opt_in = false
    patch.sms_opt_out_at = new Date().toISOString()
  }

  const { data, error } = await supabaseAdmin
    .from('communication_preferences')
    .update(patch)
    .eq('entity_type', entityType)
    .eq('entity_id', entityId)
    .select('*')
    .single()
  if (error) return badRequest(error.message)
  await writeAuditLog({ req, user_id: user.id, action: 'communications.preferences.updated', entity_type: entityType, entity_id: entityId, metadata: patch })
  return json(data)
}
