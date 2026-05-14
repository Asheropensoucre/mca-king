import { supabaseAdmin } from '../supabase-server'
import type { CommunicationEntityType, CommunicationPreference } from './types'

export function normalizeEmail(email: string | null | undefined): string | null {
  const value = email?.trim().toLowerCase()
  return value || null
}

export function normalizePhone(phone: string | null | undefined): string | null {
  const value = phone?.replace(/[^0-9+]/g, '').trim()
  return value || null
}

export async function getOrCreatePreference(params: {
  entity_type: CommunicationEntityType
  entity_id: string
  email?: string | null
  phone?: string | null
}): Promise<CommunicationPreference | null> {
  const { data, error } = await supabaseAdmin
    .from('communication_preferences')
    .select('*')
    .eq('entity_type', params.entity_type)
    .eq('entity_id', params.entity_id)
    .maybeSingle<CommunicationPreference>()

  if (error) throw new Error(error.message)
  if (data) {
    const update: Record<string, unknown> = {}
    if (params.email && params.email !== data.email) update.email = params.email
    if (params.phone && params.phone !== data.phone) update.phone = params.phone
    if (Object.keys(update).length > 0) {
      update.updated_at = new Date().toISOString()
      const { data: updated, error: updateError } = await supabaseAdmin
        .from('communication_preferences')
        .update(update)
        .eq('id', data.id)
        .select('*')
        .single<CommunicationPreference>()
      if (updateError) throw new Error(updateError.message)
      return updated
    }
    return data
  }

  const { data: created, error: createError } = await supabaseAdmin
    .from('communication_preferences')
    .insert({
      entity_type: params.entity_type,
      entity_id: params.entity_id,
      email: params.email ?? null,
      phone: params.phone ?? null,
      email_opt_in: true,
      email_opt_out: false,
      sms_opt_in: false,
      sms_opt_out: false,
      do_not_contact: false,
    })
    .select('*')
    .single<CommunicationPreference>()

  if (createError) throw new Error(createError.message)
  return created
}

export async function isSuppressed(channel: 'email' | 'sms', identifier: string | null | undefined): Promise<{ suppressed: boolean; reason: string | null }> {
  const normalized = channel === 'email' ? normalizeEmail(identifier) : normalizePhone(identifier)
  if (!normalized) return { suppressed: false, reason: null }

  const { data, error } = await supabaseAdmin
    .from('global_suppressions')
    .select('reason')
    .eq('channel', channel)
    .ilike('identifier', normalized)
    .maybeSingle<{ reason: string }>()

  if (error) throw new Error(error.message)
  return { suppressed: Boolean(data), reason: data?.reason ?? null }
}

export async function addSuppression(params: {
  channel: 'email' | 'sms'
  identifier: string
  reason: string
  source: string
  entity_type?: string | null
  entity_id?: string | null
  created_by?: string | null
  metadata?: Record<string, unknown>
}): Promise<void> {
  const identifier = params.channel === 'email' ? normalizeEmail(params.identifier) : normalizePhone(params.identifier)
  if (!identifier) return

  const { error } = await supabaseAdmin
    .from('global_suppressions')
    .upsert({
      channel: params.channel,
      identifier,
      reason: params.reason,
      source: params.source,
      entity_type: params.entity_type ?? null,
      entity_id: params.entity_id ?? null,
      created_by: params.created_by ?? null,
      metadata: params.metadata ?? {},
    }, { onConflict: 'channel,identifier' })

  if (error) throw new Error(error.message)
}

export async function evaluateEmailEligibility(params: {
  entity_type: CommunicationEntityType
  entity_id: string
  email: string | null
  phone?: string | null
}): Promise<{ sendable: boolean; skip_reason: string | null; preference: CommunicationPreference | null }> {
  if (!params.email) return { sendable: false, skip_reason: 'missing_email', preference: null }
  const preference = await getOrCreatePreference(params)
  if (preference?.do_not_contact) return { sendable: false, skip_reason: 'do_not_contact', preference }
  if (preference?.email_opt_out || preference?.email_opt_in === false) return { sendable: false, skip_reason: 'email_opt_out', preference }
  const suppressed = await isSuppressed('email', params.email)
  if (suppressed.suppressed) return { sendable: false, skip_reason: suppressed.reason ?? 'suppressed', preference }
  return { sendable: true, skip_reason: null, preference }
}

export async function markEmailUnsubscribed(params: {
  email: string
  entity_type?: CommunicationEntityType | null
  entity_id?: string | null
  source: string
  metadata?: Record<string, unknown>
}): Promise<void> {
  const email = normalizeEmail(params.email)
  if (!email) return

  if (params.entity_type && params.entity_id) {
    await getOrCreatePreference({ entity_type: params.entity_type, entity_id: params.entity_id, email })
    const { error } = await supabaseAdmin
      .from('communication_preferences')
      .update({ email_opt_in: false, email_opt_out: true, email_opt_out_at: new Date().toISOString(), updated_at: new Date().toISOString() })
      .eq('entity_type', params.entity_type)
      .eq('entity_id', params.entity_id)
    if (error) throw new Error(error.message)
  }

  await addSuppression({
    channel: 'email',
    identifier: email,
    reason: 'unsubscribe',
    source: params.source,
    entity_type: params.entity_type ?? null,
    entity_id: params.entity_id ?? null,
    metadata: params.metadata,
  })
}
