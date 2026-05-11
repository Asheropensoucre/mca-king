import type { LenderMatch } from '../../../types'
import { requireAuth } from '../../lib/requireAuth'
import { badRequest, forbidden, json } from '../../lib/route-utils'
import { supabaseAdmin } from '../../lib/supabase-server'

export async function GET(req: Request): Promise<Response> {
  const user = await requireAuth(req)
  if (user.role === 'merchant') return forbidden()

  const url = new URL(req.url)
  const merchantId = url.searchParams.get('merchant_id')
  if (!merchantId) return badRequest('merchant_id is required')

  if (user.role === 'lender') {
    const { data: lender, error: lenderError } = await supabaseAdmin
      .from('lenders')
      .select('id')
      .eq('user_id', user.id)
      .maybeSingle<{ id: string }>()

    if (lenderError) return badRequest(lenderError.message)
    if (!lender) return forbidden()

    const { data: allowedMatch, error: allowedError } = await supabaseAdmin
      .from('lender_matches')
      .select('id')
      .eq('merchant_id', merchantId)
      .eq('lender_id', lender.id)
      .maybeSingle<{ id: string }>()

    if (allowedError) return badRequest(allowedError.message)
    if (!allowedMatch) return forbidden()
  }

  const { data, error } = await supabaseAdmin
    .from('lender_matches')
    .select('*, lender:lenders(id,company_name,contact_name,contact_email)')
    .eq('merchant_id', merchantId)
    .order('created_at', { ascending: false })
    .returns<LenderMatch[]>()

  if (error) return badRequest(error.message)
  return json(data ?? [])
}
