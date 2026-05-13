import type { ActivityType, EntityType } from '../../types'
import { supabaseAdmin } from './supabase-server'

interface WriteActivityParams {
  entity_type: EntityType
  entity_id: string
  user_id?: string | null
  activity_type: ActivityType
  body?: string | null
  metadata?: Record<string, unknown>
}

export async function writeActivity(params: WriteActivityParams): Promise<void> {
  try {
    const { error } = await supabaseAdmin.from('activities').insert({
      entity_type: params.entity_type,
      entity_id: params.entity_id,
      user_id: params.user_id ?? null,
      activity_type: params.activity_type,
      body: params.body ?? null,
      metadata: params.metadata ?? {},
    })

    if (error) {
      console.error('[activity] Failed to write activity:', params.activity_type, error)
    }
  } catch (err) {
    console.error('[activity] Failed to write activity:', params.activity_type, err)
  }
}

export function recordActivity(params: WriteActivityParams): void {
  void writeActivity(params)
}
