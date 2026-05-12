import type { VercelRequest, VercelResponse } from '@vercel/node'
import { POST } from '../../src/routes/documents/upload'
import { runRoute } from '../_utils'

export const config = {
  api: {
    bodyParser: false,
  },
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  await runRoute(req, res, { POST })
}
