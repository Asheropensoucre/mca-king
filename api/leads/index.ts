import type { VercelRequest, VercelResponse } from '@vercel/node'
import { GET, POST } from '../../src/routes/leads/index'
import { runRoute } from '../_utils'

export default async function handler(req: VercelRequest, res: VercelResponse) {
  await runRoute(req, res, { GET, POST })
}
