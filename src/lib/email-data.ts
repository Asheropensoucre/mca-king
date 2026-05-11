import { supabaseAdmin } from './supabase-server'

export type EmailUser = {
  id: string
  email: string
  full_name: string | null
  name: string | null
  role?: string
}

export type EmailMerchant = {
  id: string
  user_id: string | null
  assigned_rep_id: string | null
  business_name: string
  industry: string | null
  state: string | null
  monthly_revenue: number | string | null
  requested_amount: number | string | null
  current_positions: number | null
}

export type EmailLender = {
  id: string
  company_name: string
  contact_name: string | null
  contact_email: string
}

export type EmailOffer = {
  id: string
  merchant_id: string
  lender_id: string
  amount: number | string
  factor_rate: number | string | null
  term_months: number | null
  payment_freq: string | null
  status: string
}

export const toNumber = (value: number | string | null | undefined): number => {
  if (value === null || value === undefined || value === '') return 0
  const parsed = typeof value === 'number' ? value : Number(String(value).replace(/[^0-9.-]/g, ''))
  return Number.isFinite(parsed) ? parsed : 0
}

export const displayName = (user: Pick<EmailUser, 'full_name' | 'name' | 'email'> | null | undefined, fallback = 'there'): string => (
  user?.full_name || user?.name || user?.email || fallback
)

export async function getUserById(id: string | null | undefined): Promise<EmailUser | null> {
  if (!id) return null
  const { data, error } = await supabaseAdmin
    .from('users')
    .select('id,email,full_name,name,role')
    .eq('id', id)
    .maybeSingle<EmailUser>()

  if (error) {
    console.error('[email] Failed to fetch user', id, error)
    return null
  }
  return data ?? null
}

export async function getAdminUsers(): Promise<EmailUser[]> {
  const { data, error } = await supabaseAdmin
    .from('users')
    .select('id,email,full_name,name,role')
    .eq('role', 'admin')
    .returns<EmailUser[]>()

  if (error) {
    console.error('[email] Failed to fetch admin users', error)
    return []
  }
  return data ?? []
}

export async function getMerchantEmailData(merchantId: string): Promise<EmailMerchant | null> {
  const { data, error } = await supabaseAdmin
    .from('merchants')
    .select('id,user_id,assigned_rep_id,business_name,industry,state,monthly_revenue,requested_amount,current_positions')
    .eq('id', merchantId)
    .maybeSingle<EmailMerchant>()

  if (error) {
    console.error('[email] Failed to fetch merchant', merchantId, error)
    return null
  }
  return data ?? null
}

export async function getLenderEmailData(lenderId: string): Promise<EmailLender | null> {
  const { data, error } = await supabaseAdmin
    .from('lenders')
    .select('id,company_name,contact_name,contact_email')
    .eq('id', lenderId)
    .maybeSingle<EmailLender>()

  if (error) {
    console.error('[email] Failed to fetch lender', lenderId, error)
    return null
  }
  return data ?? null
}

export async function getAcceptedOfferForMerchant(merchantId: string): Promise<EmailOffer | null> {
  const { data, error } = await supabaseAdmin
    .from('offers')
    .select('id,merchant_id,lender_id,amount,factor_rate,term_months,payment_freq,status')
    .eq('merchant_id', merchantId)
    .eq('status', 'accepted')
    .order('accepted_at', { ascending: false })
    .limit(1)
    .maybeSingle<EmailOffer>()

  if (error) {
    console.error('[email] Failed to fetch accepted offer', merchantId, error)
    return null
  }
  return data ?? null
}
