import { supabaseAdmin } from './supabase-server'

const SENSITIVE_KEY_PATTERNS = [
  /password/i,
  /new_password/i,
  /current_password/i,
  /token/i,
  /session/i,
  /secret/i,
  /api[_-]?key/i,
  /service[_-]?role/i,
  /authorization/i,
  /cookie/i,
  /^ssn$/i,
  /dateofbirth/i,
  /^dob$/i,
  /taxid/i,
  /signature/i,
]

export type AuditAction = string

export function getRequestIp(req: Request): string | null {
  const forwarded = req.headers.get('x-forwarded-for')
  if (forwarded) return forwarded.split(',')[0]?.trim() || null
  return req.headers.get('x-real-ip') ?? null
}

export function getUserAgent(req: Request): string | null {
  return req.headers.get('user-agent')
}

function isSensitiveKey(key: string): boolean {
  return SENSITIVE_KEY_PATTERNS.some(pattern => pattern.test(key))
}

export function redactAuditMetadata(value: unknown): unknown {
  if (value === null || value === undefined) return value
  if (Array.isArray(value)) return value.map(item => redactAuditMetadata(item))
  if (typeof value === 'object') {
    return Object.fromEntries(Object.entries(value as Record<string, unknown>).map(([key, entry]) => [
      key,
      isSensitiveKey(key) ? '[REDACTED]' : redactAuditMetadata(entry),
    ]))
  }
  if (typeof value === 'string' && value.length > 500) return `${value.slice(0, 500)}…`
  return value
}

export async function writeAuditLog(params: {
  req?: Request
  user_id?: string | null
  action: AuditAction
  entity_type?: string | null
  entity_id?: string | null
  metadata?: Record<string, unknown>
}): Promise<void> {
  try {
    const { error } = await supabaseAdmin.from('audit_logs').insert({
      user_id: params.user_id ?? null,
      action: params.action,
      entity_type: params.entity_type ?? null,
      entity_id: params.entity_id ?? null,
      ip_address: params.req ? getRequestIp(params.req) : null,
      user_agent: params.req ? getUserAgent(params.req) : null,
      metadata: redactAuditMetadata(params.metadata ?? {}) as Record<string, unknown>,
    })
    if (error) console.error('[audit] write failed:', error.message)
  } catch (error) {
    console.error('[audit] write failed:', error instanceof Error ? error.message : 'unknown error')
  }
}
