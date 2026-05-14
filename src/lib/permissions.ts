import type { RouteUser } from './route-utils'
import { forbidden, notFound } from './route-utils'
import { getLenderIdForUser } from './merchant-file-submissions'
import { supabaseAdmin } from './supabase-server'

type MerchantAccessRow = { id: string; user_id: string | null; assigned_rep_id: string | null }

type DocumentAccessRow = { id: string; merchant_id: string | null }

type OfferAccessRow = { id: string; merchant_id: string | null; lender_id: string | null }

export async function canAccessMerchant(user: RouteUser, merchantId: string): Promise<boolean> {
  if (user.role === 'admin') return true
  const { data, error } = await supabaseAdmin
    .from('merchants')
    .select('id,user_id,assigned_rep_id')
    .eq('id', merchantId)
    .maybeSingle<MerchantAccessRow>()
  if (error || !data) return false
  if (user.role === 'sales_rep') return data.assigned_rep_id === user.id
  if (user.role === 'merchant') return data.user_id === user.id
  if (user.role === 'lender') {
    const lenderId = await getLenderIdForUser(user.id)
    if (!lenderId) return false
    const { data: match } = await supabaseAdmin
      .from('lender_matches')
      .select('id')
      .eq('merchant_id', merchantId)
      .eq('lender_id', lenderId)
      .maybeSingle<{ id: string }>()
    if (match) return true
    const { data: submission } = await supabaseAdmin
      .from('merchant_file_submissions')
      .select('id')
      .eq('merchant_id', merchantId)
      .eq('lender_id', lenderId)
      .maybeSingle<{ id: string }>()
    return Boolean(submission)
  }
  return false
}

export async function canUpdateMerchant(user: RouteUser, merchantId: string): Promise<boolean> {
  if (user.role === 'admin') return true
  if (user.role !== 'sales_rep') return false
  return canAccessMerchant(user, merchantId)
}

export async function canAccessLead(user: RouteUser, leadId: string): Promise<boolean> {
  if (user.role === 'admin') return true
  if (user.role !== 'sales_rep') return false
  const { data } = await supabaseAdmin
    .from('leads')
    .select('id')
    .eq('id', leadId)
    .or(`assigned_rep_id.eq.${user.id},created_by.eq.${user.id}`)
    .maybeSingle<{ id: string }>()
  return Boolean(data)
}

export async function canAccessDocument(user: RouteUser, documentId: string): Promise<boolean> {
  const { data } = await supabaseAdmin
    .from('documents')
    .select('id,merchant_id')
    .eq('id', documentId)
    .maybeSingle<DocumentAccessRow>()
  if (!data?.merchant_id) return false
  return canAccessMerchant(user, data.merchant_id)
}

export async function canAccessOffer(user: RouteUser, offerId: string): Promise<boolean> {
  const { data } = await supabaseAdmin
    .from('offers')
    .select('id,merchant_id,lender_id')
    .eq('id', offerId)
    .maybeSingle<OfferAccessRow>()
  if (!data) return false
  if (user.role === 'lender') {
    const lenderId = await getLenderIdForUser(user.id)
    return Boolean(lenderId && data.lender_id === lenderId)
  }
  return data.merchant_id ? canAccessMerchant(user, data.merchant_id) : false
}

export async function canAccessLenderProfile(user: RouteUser, lenderId: string): Promise<boolean> {
  if (user.role === 'admin') return true
  if (user.role !== 'lender') return false
  const currentLenderId = await getLenderIdForUser(user.id)
  return currentLenderId === lenderId
}

export async function assertCanAccessMerchant(user: RouteUser, merchantId: string): Promise<Response | null> {
  const allowed = await canAccessMerchant(user, merchantId)
  return allowed ? null : forbidden()
}

export async function assertRecordExists(table: string, id: string): Promise<Response | null> {
  const { data } = await supabaseAdmin.from(table).select('id').eq('id', id).maybeSingle<{ id: string }>()
  return data ? null : notFound()
}
