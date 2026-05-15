import { createHmac, timingSafeEqual } from 'crypto'
import { getSessionToken, getSessionRecordByToken } from './session-auth'

export const CSRF_COOKIE_NAME = 'mca_csrf'
export const CSRF_HEADER_NAME = 'x-csrf-token'
const isProduction = process.env.NODE_ENV === 'production'

function cookieAttrs(maxAge = 60 * 60 * 24 * 7): string {
  return [
    'Path=/',
    `Max-Age=${maxAge}`,
    'SameSite=Lax',
    ...(isProduction ? ['Secure'] : []),
  ].join('; ')
}

export function serializeCsrfCookie(token: string): string {
  return `${CSRF_COOKIE_NAME}=${encodeURIComponent(token)}; ${cookieAttrs()}`
}

export function serializeExpiredCsrfCookie(): string {
  return `${CSRF_COOKIE_NAME}=; ${cookieAttrs(0)}`
}

export function newCsrfToken(): string {
  const bytes = new Uint8Array(32)
  crypto.getRandomValues(bytes)
  return Array.from(bytes, byte => byte.toString(16).padStart(2, '0')).join('')
}

function compare(a: string, b: string): boolean {
  const ab = Buffer.from(a)
  const bb = Buffer.from(b)
  return ab.length === bb.length && timingSafeEqual(ab, bb)
}

function requestCookie(req: Request, name: string): string | null {
  const header = req.headers.get('cookie')
  if (!header) return null
  for (const part of header.split(';')) {
    const [rawName, ...rawValue] = part.trim().split('=')
    if (rawName === name) return decodeURIComponent(rawValue.join('='))
  }
  return null
}

export function csrfResponseHeaders(token: string): HeadersInit {
  return { 'set-cookie': serializeCsrfCookie(token) }
}

export function isCsrfExempt(method: string, pathname: string): boolean {
  if (method === 'GET' || method === 'HEAD' || method === 'OPTIONS') return true
  if (pathname === '/api/auth/login' || pathname === '/api/auth/register' || pathname === '/api/auth/logout') return true
  if (pathname === '/api/webhooks/resend') return true
  if (pathname === '/api/communications/unsubscribe') return true
  return false
}

export async function verifyCsrf(req: Request, pathname: string): Promise<Response | null> {
  if (isCsrfExempt(req.method, pathname)) return null
  const sessionToken = getSessionToken(req)
  if (!sessionToken) return new Response('Unauthorized', { status: 401 })
  const session = await getSessionRecordByToken(sessionToken)
  if (!session?.csrf_token) return new Response('Missing CSRF session token', { status: 403 })
  const headerToken = req.headers.get(CSRF_HEADER_NAME)
  const cookieToken = requestCookie(req, CSRF_COOKIE_NAME)
  if (!headerToken || !cookieToken) return new Response('Missing CSRF token', { status: 403 })
  if (!compare(headerToken, cookieToken) || !compare(headerToken, session.csrf_token)) {
    return new Response('Invalid CSRF token', { status: 403 })
  }
  return null
}

export function signWebhookBody(body: string, secret: string): string {
  return createHmac('sha256', secret).update(body).digest('hex')
}
