import { canAccessCommunicationEntity } from '../../lib/communications/entities'
import type { CommunicationEntityType } from '../../lib/communications/types'
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
    .from('communications')
    .select('*')
    .eq('entity_type', entityType)
    .eq('entity_id', entityId)
    .order('created_at', { ascending: false })
    .limit(100)
  if (error) return badRequest(error.message)
  return json(data ?? [])
}
