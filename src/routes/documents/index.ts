import type { Document } from '../../../types'
import { requireAuth } from '../../lib/requireAuth'
import { badRequest, forbidden, json } from '../../lib/route-utils'
import { supabaseAdmin } from '../../lib/supabase-server'

type MerchantAccessRow = { id: string; user_id: string | null; assigned_rep_id: string | null }

type DocumentRow = Document

async function canAccessMerchant(userId: string, role: string, merchantId: string): Promise<boolean | Response> {
  if (role === 'admin') return true
  const { data: merchant, error } = await supabaseAdmin.from('merchants').select('id,user_id,assigned_rep_id').eq('id', merchantId).maybeSingle<MerchantAccessRow>()
  if (error) return badRequest(error.message)
  if (!merchant) return false
  if (role === 'sales_rep') return merchant.assigned_rep_id === userId
  if (role === 'merchant') return merchant.user_id === userId
  if (role === 'lender') {
    const { data, error: matchError } = await supabaseAdmin.from('lender_matches').select('id').eq('merchant_id', merchantId).eq('lender_id', userId).maybeSingle<{ id: string }>()
    if (matchError) return badRequest(matchError.message)
    return Boolean(data)
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

  const { data, error } = await supabaseAdmin
    .from('documents')
    .select('*')
    .eq('merchant_id', merchantId)
    .order('uploaded_at', { ascending: false })
    .returns<DocumentRow[]>()
  if (error) return badRequest(error.message)

  const docs = await Promise.all((data ?? []).map(async doc => {
    const { data: signedData } = await supabaseAdmin.storage.from('documents').createSignedUrl(doc.storage_path, 3600)
    return { ...doc, signed_url: signedData?.signedUrl }
  }))

  return json(docs)
}
