import { writeAuditLog, getRequestIp } from './audit'
import { supabaseAdmin } from './supabase-server'

const fallbackBuckets = new Map<string, number[]>()

const useDurableRateLimits = process.env.RATE_LIMIT_STORE !== 'memory'

type RateLimitOptions = {
  key: string
  limit: number
  windowMs: number
  req?: Request
  userId?: string | null
  action?: string
}

function fallbackCheck(key: string, limit: number, windowMs: number): boolean {
  const now = Date.now()
  const existing = fallbackBuckets.get(key) ?? []
  const recent = existing.filter(timestamp => now - timestamp < windowMs)
  if (recent.length >= limit) {
    fallbackBuckets.set(key, recent)
    return false
  }
  recent.push(now)
  fallbackBuckets.set(key, recent)
  return true
}

export async function checkRateLimit(options: RateLimitOptions): Promise<Response | null> {
  const now = new Date()
  const since = new Date(now.getTime() - options.windowMs).toISOString()
  let allowed = true

  if (useDurableRateLimits) {
    try {
      const { count, error: countError } = await supabaseAdmin
        .from('security_rate_limits')
        .select('id', { count: 'exact', head: true })
        .eq('rate_key', options.key)
        .gte('created_at', since)

      if (countError) throw new Error(countError.message)
      allowed = (count ?? 0) < options.limit
      if (allowed) {
        const { error: insertError } = await supabaseAdmin.from('security_rate_limits').insert({
          rate_key: options.key,
          action: options.action ?? null,
          ip_address: options.req ? getRequestIp(options.req) : null,
          user_id: options.userId ?? null,
        })
        if (insertError) throw new Error(insertError.message)
      }
    } catch (error) {
      console.error('[security] durable rate limit unavailable, falling back to memory', error)
      allowed = fallbackCheck(options.key, options.limit, options.windowMs)
    }
  } else {
    allowed = fallbackCheck(options.key, options.limit, options.windowMs)
  }

  if (!allowed) {
    await writeAuditLog({
      req: options.req,
      user_id: options.userId ?? null,
      action: 'security.rate_limited',
      entity_type: 'security',
      metadata: { key: options.key, limit: options.limit, window_ms: options.windowMs, action: options.action, store: useDurableRateLimits ? 'supabase' : 'memory' },
    })
    return new Response('Rate limit exceeded. Please try again later.', { status: 429 })
  }

  return null
}

export function rateLimitKey(req: Request, scope: string, identifier?: string | null): string {
  const ip = getRequestIp(req) || 'unknown-ip'
  return `${scope}:${identifier || 'anonymous'}:${ip}`
}

export async function getLoginDelayMs(key: string): Promise<number> {
  const { data } = await supabaseAdmin
    .from('security_login_failures')
    .select('failure_count,locked_until')
    .eq('failure_key', key)
    .maybeSingle<{ failure_count: number; locked_until: string | null }>()

  if (!data) return 0
  if (data.locked_until && new Date(data.locked_until).getTime() > Date.now()) {
    return Math.max(0, new Date(data.locked_until).getTime() - Date.now())
  }
  if (data.failure_count < 3) return 0
  return Math.min(30_000, 1000 * Math.pow(2, Math.min(5, data.failure_count - 3)))
}

export async function recordFailedLogin(key: string, email: string, req: Request): Promise<void> {
  const { data } = await supabaseAdmin
    .from('security_login_failures')
    .select('failure_count')
    .eq('failure_key', key)
    .maybeSingle<{ failure_count: number }>()

  const nextCount = (data?.failure_count ?? 0) + 1
  const lockedUntil = nextCount >= 8 ? new Date(Date.now() + 15 * 60 * 1000).toISOString() : null
  const now = new Date().toISOString()

  await supabaseAdmin.from('security_login_failures').upsert({
    failure_key: key,
    email,
    ip_address: getRequestIp(req),
    failure_count: nextCount,
    locked_until: lockedUntil,
    last_failed_at: now,
    updated_at: now,
  }, { onConflict: 'failure_key' })
}

export async function clearFailedLogin(key: string): Promise<void> {
  await supabaseAdmin.from('security_login_failures').delete().eq('failure_key', key)
}
