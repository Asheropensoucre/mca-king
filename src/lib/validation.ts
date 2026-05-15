const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i

export function isUuid(value: unknown): value is string {
  return typeof value === 'string' && UUID_RE.test(value)
}

export function requireUuid(value: unknown, label = 'id'): string | Response {
  return isUuid(value) ? value : new Response(`${label} must be a valid UUID`, { status: 400 })
}

export function cleanString(value: unknown, max = 500): string | null {
  if (typeof value !== 'string') return null
  const trimmed = value.trim()
  if (!trimmed) return null
  return trimmed.slice(0, max)
}

export function cleanEmail(value: unknown): string | null {
  const email = cleanString(value, 320)?.toLowerCase() ?? null
  if (!email) return null
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) ? email : null
}

export function cleanPhone(value: unknown): string | null {
  const phone = cleanString(value, 40)
  if (!phone) return null
  return phone.replace(/[^0-9+().\-\s]/g, '').slice(0, 40)
}

export function cleanMoney(value: unknown): number | null {
  if (typeof value === 'number' && Number.isFinite(value)) return value
  if (typeof value !== 'string') return null
  const parsed = Number(value.replace(/[^0-9.-]/g, ''))
  return Number.isFinite(parsed) ? parsed : null
}

export function rejectUnknownFields(body: Record<string, unknown>, allowed: string[]): Response | null {
  const unknown = Object.keys(body).filter(key => !allowed.includes(key))
  return unknown.length > 0 ? new Response(`Unknown field(s): ${unknown.join(', ')}`, { status: 400 }) : null
}
