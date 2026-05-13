import { supabaseAdmin } from './supabase-server'

export async function revokeUserSessions(userId: string): Promise<void> {
  const { error } = await supabaseAdmin
    .from('session')
    .delete()
    .eq('userId', userId)

  if (error) {
    console.error('[revoke-sessions] Failed to revoke sessions for user:', userId, error)
    throw new Error(error.message)
  }
}
