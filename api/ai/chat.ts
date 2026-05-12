import type { VercelRequest, VercelResponse } from '@vercel/node'
import { POST } from '../../src/routes/ai/chat'
import { runRoute } from '../_utils'

export default async function handler(req: VercelRequest, res: VercelResponse) {
  await runRoute(req, res, { POST })
}
