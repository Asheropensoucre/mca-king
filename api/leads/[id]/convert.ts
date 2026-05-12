import type { VercelRequest, VercelResponse } from '@vercel/node'
import { POST } from '../../../src/routes/leads/[id]/convert'
import { getQueryParam, runRoute } from '../../_utils'

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const id = getQueryParam(req.query.id)
  await runRoute(req, res, { POST }, { params: id ? { id } : undefined })
}
