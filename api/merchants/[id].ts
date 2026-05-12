import type { VercelRequest, VercelResponse } from '@vercel/node'
import { GET, PATCH, DELETE } from '../../src/routes/merchants/[id]'
import { getQueryParam, runRoute } from '../_utils'

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const id = getQueryParam(req.query.id)
  await runRoute(req, res, { GET, PATCH, DELETE }, { params: id ? { id } : undefined })
}
