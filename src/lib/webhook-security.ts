import { createHmac, timingSafeEqual } from 'crypto'

function safeEqual(a: string, b: string): boolean {
  const ab = Buffer.from(a)
  const bb = Buffer.from(b)
  return ab.length === bb.length && timingSafeEqual(ab, bb)
}

function svixSecretBytes(secret: string): Buffer {
  const normalized = secret.startsWith('whsec_') ? secret.slice('whsec_'.length) : secret
  try {
    return Buffer.from(normalized, 'base64')
  } catch {
    return Buffer.from(secret, 'utf8')
  }
}

export function verifyResendWebhookSignature(req: Request, rawBody: string): boolean {
  const secret = process.env.RESEND_WEBHOOK_SECRET
  if (!secret) return true

  const svixId = req.headers.get('svix-id')
  const svixTimestamp = req.headers.get('svix-timestamp')
  const svixSignature = req.headers.get('svix-signature')
  if (svixId && svixTimestamp && svixSignature) {
    const signedContent = `${svixId}.${svixTimestamp}.${rawBody}`
    const expected = createHmac('sha256', svixSecretBytes(secret)).update(signedContent).digest('base64')
    return svixSignature
      .split(' ')
      .some(part => {
        const signature = part.includes(',') ? part.split(',').pop() ?? '' : part.replace(/^v\d+,/, '')
        return safeEqual(signature, expected)
      })
  }

  const genericSignature = req.headers.get('x-resend-signature') || req.headers.get('x-webhook-signature')
  if (!genericSignature) return false
  const expectedHex = createHmac('sha256', secret).update(rawBody).digest('hex')
  const expectedBase64 = createHmac('sha256', secret).update(rawBody).digest('base64')
  return safeEqual(genericSignature, expectedHex) || safeEqual(genericSignature, expectedBase64)
}
