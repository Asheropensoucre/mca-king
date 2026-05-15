import type { ApplicationStatus, Stipulation } from '../../../types'
import { recordActivity } from '../../lib/activity'
import { rowToMerchant, type MerchantRow } from '../../lib/data-shapes'
import { triggerStipulationRequested } from '../../lib/email-triggers'
import { getLenderMatch, markMerchantFileSubmissionResponse } from '../../lib/merchant-file-submissions'
import { requireAuth } from '../../lib/requireAuth'
import { badRequest, forbidden, json } from '../../lib/route-utils'
import { supabaseAdmin } from '../../lib/supabase-server'

type StipulationBody = { merchant_id?: string; lender_id?: string; description?: string }
type MerchantAccessRow = { id: string; user_id: string | null; assigned_rep_id: string | null; status: ApplicationStatus; payload: unknown }
const MORE_DOCS_STATUS: ApplicationStatus = 'more docs requested'

async function currentLenderId(userId: string): Promise<string | null | Response> {
  const { data, error } = await supabaseAdmin
    .from('lenders')
    .select('id')
    .eq('user_id', userId)
    .maybeSingle<{ id: string }>()
  if (error) return badRequest(error.message)
  return data?.id ?? null
}

async function lenderHasMerchantAccess(merchantId: string, lenderId: string): Promise<boolean> {
  const match = await getLenderMatch(merchantId, lenderId)
  if (match) return true
  const { data } = await supabaseAdmin
    .from('merchant_file_submissions')
    .select('id')
    .eq('merchant_id', merchantId)
    .eq('lender_id', lenderId)
    .maybeSingle<{ id: string }>()
  return Boolean(data)
}

async function canAccessMerchant(userId: string, role: string, merchantId: string): Promise<boolean | Response> {
  if (role === 'admin') return true
  const { data: merchant, error } = await supabaseAdmin.from('merchants').select('id,user_id,assigned_rep_id,status,payload').eq('id', merchantId).maybeSingle<MerchantAccessRow>()
  if (error) return badRequest(error.message)
  if (!merchant) return false
  if (role === 'sales_rep') return merchant.assigned_rep_id === userId
  if (role === 'merchant') return merchant.user_id === userId
  if (role === 'lender') {
    const lenderId = await currentLenderId(userId)
    if (lenderId instanceof Response) return lenderId
    if (!lenderId) return false
    return lenderHasMerchantAccess(merchantId, lenderId)
  }
  return false
}

export async function GET(req: Request): Promise<Response> {
  const user = await requireAuth(req)
  const merchantId = new URL(req.url).searchParams.get('merchant_id')
  if (!merchantId) return badRequest('merchant_id is required')

  const allowed = await canAccessMerchant(user.id, user.role, merchantId)
  if (allowed instanceof Response) return allowed
  if (!allowed) return forbidden()

  let query = supabaseAdmin
    .from('stipulations')
    .select('*')
    .eq('merchant_id', merchantId)
    .order('created_at', { ascending: false })

  if (user.role === 'lender') {
    const lenderId = await currentLenderId(user.id)
    if (lenderId instanceof Response) return lenderId
    if (!lenderId) return forbidden()
    query = query.eq('lender_id', lenderId)
  }

  const { data, error } = await query.returns<Stipulation[]>()
  if (error) return badRequest(error.message)
  return json(data ?? [])
}

export async function POST(req: Request): Promise<Response> {
  const user = await requireAuth(req)
  if (user.role !== 'admin' && user.role !== 'lender') return forbidden()
  const body = await req.json() as StipulationBody
  if (!body.merchant_id || !body.lender_id || !body.description?.trim()) return badRequest('merchant_id, lender_id, and description are required')

  if (user.role === 'lender') {
    const lenderId = await currentLenderId(user.id)
    if (lenderId instanceof Response) return lenderId
    if (!lenderId || lenderId !== body.lender_id) return forbidden()
    if (!(await lenderHasMerchantAccess(body.merchant_id, lenderId))) return forbidden('This merchant file has not been submitted or matched to your lender profile')
  }

  const { data: merchantRow, error: merchantError } = await supabaseAdmin.from('merchants').select('*').eq('id', body.merchant_id).single<MerchantRow>()
  if (merchantError) return badRequest(merchantError.message)

  const { data, error } = await supabaseAdmin
    .from('stipulations')
    .insert({ merchant_id: body.merchant_id, lender_id: body.lender_id, requested_by: user.id, description: body.description.trim() })
    .select('*')
    .single<Stipulation>()
  if (error) return badRequest(error.message)

  const merchant = rowToMerchant(merchantRow)
  const updatedMerchant = { ...merchant, status: MORE_DOCS_STATUS }
  const { error: updateError } = await supabaseAdmin
    .from('merchants')
    .update({ status: MORE_DOCS_STATUS, payload: updatedMerchant, updated_at: new Date().toISOString() })
    .eq('id', body.merchant_id)
  if (updateError) return badRequest(updateError.message)

  if (merchantRow.status !== MORE_DOCS_STATUS) {
    const { error: historyError } = await supabaseAdmin.from('status_history').insert({
      merchant_id: body.merchant_id,
      changed_by: user.id,
      previous_status: merchantRow.status,
      new_status: MORE_DOCS_STATUS,
      note: `Stipulation requested: ${body.description.trim()}`,
    })
    if (historyError) return badRequest(historyError.message)
  }

  try {
    await markMerchantFileSubmissionResponse({ merchant_id: body.merchant_id, lender_id: body.lender_id, status: 'stips_requested' })
  } catch (submissionError) {
    return badRequest(submissionError instanceof Error ? submissionError.message : 'Could not update merchant-file submission')
  }

  triggerStipulationRequested(data.id)
  recordActivity({
    entity_type: 'stipulation',
    entity_id: body.merchant_id,
    user_id: user.id,
    activity_type: 'system',
    body: `Stipulation requested: ${body.description.trim()}`,
    metadata: { stipulation_id: data.id, lender_id: body.lender_id },
  })

  return json(data, { status: 201 })
}
