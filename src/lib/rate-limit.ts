import { writeAuditLog } from './audit'

const buckets = new Map<string, number[]>()

type RateLimitOptions = {
  key: string
  limit: number
  windowMs: number
  req?: Request
  userId?: string | null
  action?: string
}

export async function checkRateLimit(options: RateLimitOptions): Promise<Response | null> {
  const now = Date.now()
  const existing = buckets.get(options.key) ?? []
  const recent = existing.filter(timestamp => now - timestamp < options.windowMs)
  if (recent.length >= options.limit) {
    await writeAuditLog({
      req: options.req,
      user_id: options.userId ?? null,
      action: 'security.rate_limited',
      entity_type: 'security',
      metadata: { key: options.key, limit: options.limit, window_ms: options.windowMs, action: options.action },
    })
    return new Response('Rate limit exceeded. Please try again later.', { status: 429 })
  }
  recent.push(now)
  buckets.set(options.key, recent)
  return null
}

export function rateLimitKey(req: Request, scope: string, identifier?: string | null): string {
  const ip = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || req.headers.get('x-real-ip') || 'unknown-ip'
  return `${scope}:${identifier || 'anonymous'}:${ip}`
}
