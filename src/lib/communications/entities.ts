import type { Lead, FormData } from '../../../types'
import { rowToMerchant, type MerchantRow } from '../data-shapes'
import { canAccessLead, canAccessMerchant } from '../permissions'
import type { RouteUser } from '../route-utils'
import { supabaseAdmin } from '../supabase-server'
import type { CommunicationEntityType, RecipientCandidate } from './types'

function merchantPrimaryContact(merchant: FormData): { email: string | null; phone: string | null; name: string } {
  const owner = merchant.owners?.[0]
  return {
    email: owner?.email || null,
    phone: owner?.cellPhone || merchant.businessInfo.phone || null,
    name: owner?.name || merchant.businessInfo.legalName,
  }
}

export async function canAccessCommunicationEntity(user: RouteUser, entityType: CommunicationEntityType, entityId: string): Promise<boolean> {
  if (entityType === 'lead') return canAccessLead(user, entityId)
  if (entityType === 'merchant') return canAccessMerchant(user, entityId)
  if (entityType === 'user') return user.role === 'admin' || user.id === entityId
  return user.role === 'admin'
}

export async function resolveRecipient(entityType: CommunicationEntityType, entityId: string): Promise<RecipientCandidate | null> {
  if (entityType === 'lead') {
    const { data, error } = await supabaseAdmin.from('leads').select('*').eq('id', entityId).maybeSingle<Lead>()
    if (error) throw new Error(error.message)
    if (!data) return null
    return { entity_type: 'lead', entity_id: data.id, name: data.owner_name || data.business_name, email: data.email, phone: data.phone }
  }

  if (entityType === 'merchant') {
    const { data, error } = await supabaseAdmin.from('merchants').select('*').eq('id', entityId).maybeSingle<MerchantRow>()
    if (error) throw new Error(error.message)
    if (!data) return null
    const merchant = rowToMerchant(data)
    const contact = merchantPrimaryContact(merchant)
    return { entity_type: 'merchant', entity_id: merchant.id, name: contact.name, email: contact.email, phone: contact.phone }
  }

  if (entityType === 'user') {
    const { data, error } = await supabaseAdmin.from('users').select('id,email,full_name,name').eq('id', entityId).maybeSingle<{ id: string; email: string; full_name: string | null; name: string | null }>()
    if (error) throw new Error(error.message)
    if (!data) return null
    return { entity_type: 'user', entity_id: data.id, name: data.full_name || data.name || data.email, email: data.email, phone: null }
  }

  return null
}

export async function listRecipientCandidates(user: RouteUser, entityType: 'lead' | 'merchant', ids?: string[]): Promise<RecipientCandidate[]> {
  if (entityType === 'lead') {
    let query = supabaseAdmin.from('leads').select('*').limit(250)
    if (ids?.length) query = query.in('id', ids)
    if (user.role === 'sales_rep') query = query.or(`assigned_rep_id.eq.${user.id},created_by.eq.${user.id}`)
    const { data, error } = await query.returns<Lead[]>()
    if (error) throw new Error(error.message)
    return (data ?? []).map(lead => ({ entity_type: 'lead', entity_id: lead.id, name: lead.owner_name || lead.business_name, email: lead.email, phone: lead.phone }))
  }

  let query = supabaseAdmin.from('merchants').select('*').limit(250)
  if (ids?.length) query = query.in('id', ids)
  if (user.role === 'sales_rep') query = query.eq('assigned_rep_id', user.id)
  const { data, error } = await query.returns<MerchantRow[]>()
  if (error) throw new Error(error.message)
  return (data ?? []).map(row => {
    const merchant = rowToMerchant(row)
    const contact = merchantPrimaryContact(merchant)
    return { entity_type: 'merchant', entity_id: merchant.id, name: contact.name, email: contact.email, phone: contact.phone }
  })
}

export function renderTemplate(body: string, recipient: RecipientCandidate): string {
  return body
    .replaceAll('{{name}}', recipient.name)
    .replaceAll('{{email}}', recipient.email ?? '')
    .replaceAll('{{phone}}', recipient.phone ?? '')
}
