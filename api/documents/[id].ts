import type { VercelRequest, VercelResponse } from '@vercel/node'
import { DELETE } from '../../src/routes/documents/[id]'
import { getQueryParam, runRoute } from '../_utils'

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const id = getQueryParam(req.query.id)
  await runRoute(req, res, { DELETE }, { params: id ? { id } : undefined })
}
