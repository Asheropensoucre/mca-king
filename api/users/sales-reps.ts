import type { VercelRequest, VercelResponse } from '@vercel/node'
import { GET } from '../../src/routes/users/sales-reps'
import { runRoute } from '../_utils'

export default async function handler(req: VercelRequest, res: VercelResponse) {
  await runRoute(req, res, { GET })
}
