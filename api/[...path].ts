import type { VercelRequest, VercelResponse } from '@vercel/node'
import { handleApiRequest } from '../src/server/api'

export const config = {
  api: {
    bodyParser: false,
  },
}

async function readRequestBody(req: VercelRequest): Promise<BodyInit | null> {
  if (req.method === 'GET' || req.method === 'HEAD') return null

  const chunks: Buffer[] = []
  for await (const chunk of req) {
    chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk))
  }

  return chunks.length > 0 ? Buffer.concat(chunks) : null
}

function getRequestUrl(req: VercelRequest): string {
  const protocolHeader = req.headers['x-forwarded-proto']
  const protocol = Array.isArray(protocolHeader) ? protocolHeader[0] : protocolHeader ?? 'https'
  const host = req.headers.host ?? 'localhost:3000'
  const url = req.url ?? '/api'
  return `${protocol}://${host}${url}`
}

function getRequestHeaders(req: VercelRequest): Headers {
  const headers = new Headers()

  for (const [key, value] of Object.entries(req.headers)) {
    if (value === undefined) continue
    headers.set(key, Array.isArray(value) ? value.join(', ') : String(value))
  }

  return headers
}

async function sendWebResponse(res: VercelResponse, response: Response): Promise<void> {
  res.status(response.status)
  response.headers.forEach((value, key) => {
    res.setHeader(key, value)
  })

  res.send(Buffer.from(await response.arrayBuffer()))
}

export default async function handler(req: VercelRequest, res: VercelResponse): Promise<void> {
  try {
    const request = new Request(getRequestUrl(req), {
      method: req.method,
      headers: getRequestHeaders(req),
      body: await readRequestBody(req),
    })

    await sendWebResponse(res, await handleApiRequest(request))
  } catch (error) {
    if (error instanceof Response) {
      await sendWebResponse(res, error)
      return
    }

    console.error(error)
    res.status(500).json({ error: 'Internal server error' })
  }
}
