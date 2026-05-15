export function allowedOrigins(): string[] {
  const configured = process.env.APP_ALLOWED_ORIGINS
    ?.split(',')
    .map(origin => origin.trim().replace(/\/$/, ''))
    .filter(Boolean) ?? []
  const authUrl = process.env.BETTER_AUTH_URL?.trim().replace(/\/$/, '')
  return Array.from(new Set([...(authUrl ? [authUrl] : []), ...configured]))
}

export function verifyRequestOrigin(req: Request, pathname: string): Response | null {
  if (req.method === 'GET' || req.method === 'HEAD' || req.method === 'OPTIONS') return null
  if (pathname === '/api/webhooks/resend') return null
  if (pathname === '/api/communications/unsubscribe') return null

  const origin = req.headers.get('origin')?.replace(/\/$/, '')
  if (!origin) return null

  const allowed = allowedOrigins()
  if (allowed.length === 0) return null
  if (!allowed.includes(origin)) return new Response('Forbidden origin', { status: 403 })
  return null
}
