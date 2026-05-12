import { createClient, type SupabaseClient } from '@supabase/supabase-js'

let cachedClient: SupabaseClient | null = null

export function getSupabaseAdmin(): SupabaseClient {
  if (cachedClient) return cachedClient

  const supabaseUrl = process.env.SUPABASE_URL
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY

  if (!supabaseUrl || !serviceRoleKey) {
    throw new Error('Missing Supabase server environment variables. Required: SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY')
  }

  cachedClient = createClient(supabaseUrl, serviceRoleKey)
  return cachedClient
}

export const supabaseAdmin = new Proxy({} as SupabaseClient, {
  get(_target, property, receiver) {
    const client = getSupabaseAdmin()
    const value = Reflect.get(client, property, receiver)
    return typeof value === 'function' ? value.bind(client) : value
  },
})
