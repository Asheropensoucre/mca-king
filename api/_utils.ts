import type { VercelRequest, VercelResponse } from '@vercel/node'
import type { RouteContext } from '../src/lib/route-utils'

type RouteHandler = (req: Request, context?: RouteContext) => Promise<Response> | Response

type MethodHandlers = Partial<Record<'GET' | 'POST' | 'PATCH' | 'DELETE' | 'PUT', RouteHandler>>

type QueryValue = string | string[] | undefined

export function getQueryParam(value: QueryValue): string | null {
  if (Array.isArray(value)) return value[0] ?? null
  return value ?? null
}

async function readRequestBody(req: VercelRequest): Promise<BodyInit | null> {
  if (req.method === 'GET' || req.method === 'HEAD') return null

  if (typeof req.body === 'string' || req.body instanceof Buffer) {
    return req.body
  }

  if (req.body && typeof req.body === 'object') {
    return JSON.stringify(req.body)
  }

  const chunks: Buffer[] = []
  for await (const chunk of req) {
    chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk))
  }

  return chunks.length > 0 ? Buffer.concat(chunks) : null
}

function getRequestUrl(req: VercelRequest): string {
  const protocol = req.headers['x-forwarded-proto'] ?? 'https'
  const host = req.headers.host ?? 'localhost:3000'
  const url = req.url ?? '/api'
  return `${Array.isArray(protocol) ? protocol[0] : protocol}://${host}${url}`
}

function getRequestHeaders(req: VercelRequest): Headers {
  const headers = new Headers()
  for (const [key, value] of Object.entries(req.headers)) {
    if (value === undefined) continue
    if (Array.isArray(value)) headers.set(key, value.join(', '))
    else headers.set(key, String(value))
  }

  if (req.body && typeof req.body === 'object' && !(req.body instanceof Buffer) && !headers.has('content-type')) {
    headers.set('content-type', 'application/json')
  }

  return headers
}

export async function toWebRequest(req: VercelRequest): Promise<Request> {
  const body = await readRequestBody(req)
  return new Request(getRequestUrl(req), {
    method: req.method,
    headers: getRequestHeaders(req),
    body,
  })
}

export async function sendWebResponse(res: VercelResponse, response: Response): Promise<void> {
  res.status(response.status)
  response.headers.forEach((value, key) => {
    res.setHeader(key, value)
  })

  const buffer = Buffer.from(await response.arrayBuffer())
  res.send(buffer)
}

export async function runRoute(
  req: VercelRequest,
  res: VercelResponse,
  handlers: MethodHandlers,
  context?: RouteContext,
): Promise<void> {
  const method = req.method as keyof MethodHandlers
  const handler = handlers[method]

  if (!handler) {
    res.status(405).json({ error: 'Method not allowed' })
    return
  }

  try {
    const request = await toWebRequest(req)
    const response = await handler(request, context)
    await sendWebResponse(res, response)
  } catch (error) {
    if (error instanceof Response) {
      await sendWebResponse(res, error)
      return
    }
    console.error(error)
    res.status(500).json({ error: 'Internal server error' })
  }
}
