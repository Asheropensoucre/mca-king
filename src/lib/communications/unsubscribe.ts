import { createHmac, timingSafeEqual } from 'crypto'
import { getAppUrl } from '../email'
import type { CommunicationEntityType } from './types'

const TOKEN_VERSION = 'v1'

function secret(): string {
  return process.env.BETTER_AUTH_SECRET || process.env.SUPABASE_SERVICE_ROLE_KEY || 'dev-communications-secret'
}

function base64url(value: string): string {
  return Buffer.from(value, 'utf8').toString('base64url')
}

function unbase64url(value: string): string {
  return Buffer.from(value, 'base64url').toString('utf8')
}

function sign(payload: string): string {
  return createHmac('sha256', secret()).update(payload).digest('base64url')
}

export type UnsubscribeTokenPayload = {
  email: string
  entity_type: CommunicationEntityType
  entity_id: string
  campaign_id?: string | null
  campaign_recipient_id?: string | null
  exp: number
}

export function createUnsubscribeToken(payload: Omit<UnsubscribeTokenPayload, 'exp'>, ttlDays = 365): string {
  const withExpiry: UnsubscribeTokenPayload = {
    ...payload,
    exp: Date.now() + ttlDays * 24 * 60 * 60 * 1000,
  }
  const encoded = base64url(JSON.stringify(withExpiry))
  return `${TOKEN_VERSION}.${encoded}.${sign(`${TOKEN_VERSION}.${encoded}`)}`
}

export function verifyUnsubscribeToken(token: string | null | undefined): UnsubscribeTokenPayload | null {
  if (!token) return null
  const parts = token.split('.')
  if (parts.length !== 3 || parts[0] !== TOKEN_VERSION) return null
  const signedPart = `${parts[0]}.${parts[1]}`
  const expected = sign(signedPart)
  const expectedBuffer = Buffer.from(expected)
  const actualBuffer = Buffer.from(parts[2])
  if (expectedBuffer.length !== actualBuffer.length || !timingSafeEqual(expectedBuffer, actualBuffer)) return null
  try {
    const parsed = JSON.parse(unbase64url(parts[1])) as UnsubscribeTokenPayload
    if (!parsed.email || !parsed.entity_type || !parsed.entity_id || Date.now() > parsed.exp) return null
    return parsed
  } catch {
    return null
  }
}

export function unsubscribeUrl(payload: Omit<UnsubscribeTokenPayload, 'exp'>): string {
  const token = createUnsubscribeToken(payload)
  const base = getAppUrl().replace(/\/$/, '')
  return `${base}/api/communications/unsubscribe?token=${encodeURIComponent(token)}`
}

export function injectUnsubscribeFooter(html: string, url: string, physicalAddress?: string | null): string {
  const address = physicalAddress?.trim() || process.env.BROKER_PHYSICAL_ADDRESS || 'Broker physical mailing address must be configured before production campaigns.'
  const footer = `
    <hr style="border:none;border-top:1px solid #e2e8f0;margin:24px 0" />
    <p style="font-size:12px;color:#64748b;line-height:1.5">
      You are receiving this email because you are connected with this broker shop or requested funding information.
      <br />
      <a href="${url}" style="color:#0f766e">Unsubscribe from campaign emails</a>
      <br />
      ${address}
    </p>
  `
  return `${html}\n${footer}`
}
