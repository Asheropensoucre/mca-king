import { runAutoMatch } from '../../lib/matching'
import { requireAuth } from '../../lib/requireAuth'
import { assertRole, badRequest, json } from '../../lib/route-utils'

type RunBody = {
  merchant_id?: string
}

export async function POST(req: Request): Promise<Response> {
  const user = await requireAuth(req)
  const roleError = assertRole(user, ['admin', 'sales_rep'])
  if (roleError) return roleError

  const body = await req.json() as RunBody
  if (!body.merchant_id) return badRequest('merchant_id is required')

  try {
    const matches = await runAutoMatch(body.merchant_id, user.id)
    return json({ matched: matches.length, matches })
  } catch (error) {
    return badRequest(error instanceof Error ? error.message : 'Could not run matching')
  }
}
