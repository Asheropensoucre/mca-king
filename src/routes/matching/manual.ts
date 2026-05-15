import type { LenderMatch } from '../../../types'
import { canUpdateMerchant } from '../../lib/permissions'
import { requireAuth } from '../../lib/requireAuth'
import { assertRole, badRequest, forbidden, json } from '../../lib/route-utils'
import { supabaseAdmin } from '../../lib/supabase-server'

type ManualBody = {
  merchant_id?: string
  lender_id?: string
}

async function fetchMatch(merchantId: string, lenderId: string): Promise<LenderMatch | null> {
  const { data, error } = await supabaseAdmin
    .from('lender_matches')
    .select('*, lender:lenders(id,company_name,contact_name,contact_email)')
    .eq('merchant_id', merchantId)
    .eq('lender_id', lenderId)
    .maybeSingle<LenderMatch>()

  if (error) throw new Error(error.message)
  return data ?? null
}

export async function POST(req: Request): Promise<Response> {
  const user = await requireAuth(req)
  const roleError = assertRole(user, ['admin', 'sales_rep'])
  if (roleError) return roleError

  const body = await req.json() as ManualBody
  if (!body.merchant_id || !body.lender_id) return badRequest('merchant_id and lender_id are required')
  if (!(await canUpdateMerchant(user, body.merchant_id))) return forbidden()

  try {
    const existing = await fetchMatch(body.merchant_id, body.lender_id)
    if (existing) return json(existing)

    const { data, error } = await supabaseAdmin
      .from('lender_matches')
      .insert({
        merchant_id: body.merchant_id,
        lender_id: body.lender_id,
        match_type: 'manual',
        matched_by: user.id,
      })
      .select('*, lender:lenders(id,company_name,contact_name,contact_email)')
      .single<LenderMatch>()

    if (error) return badRequest(error.message)
    return json(data, { status: 201 })
  } catch (error) {
    return badRequest(error instanceof Error ? error.message : 'Could not add match')
  }
}

export async function DELETE(req: Request): Promise<Response> {
  const user = await requireAuth(req)
  const roleError = assertRole(user, ['admin'])
  if (roleError) return roleError

  const body = await req.json() as ManualBody
  if (!body.merchant_id || !body.lender_id) return badRequest('merchant_id and lender_id are required')

  const { error } = await supabaseAdmin
    .from('lender_matches')
    .delete()
    .eq('merchant_id', body.merchant_id)
    .eq('lender_id', body.lender_id)

  if (error) return badRequest(error.message)
  return json({ success: true })
}
