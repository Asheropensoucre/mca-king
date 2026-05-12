import type { VercelRequest, VercelResponse } from '@vercel/node'
import { POST, DELETE } from '../../src/routes/matching/manual'
import { runRoute } from '../_utils'

export default async function handler(req: VercelRequest, res: VercelResponse) {
  await runRoute(req, res, { POST, DELETE })
}
