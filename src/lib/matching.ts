import type { LenderMatch } from '../../types'
import { supabaseAdmin } from './supabase-server'

export type MatchMerchant = {
  id: string
  monthly_revenue: number | string | null
  credit_score: number | null
  current_positions: number | null
  industry: string | null
  state: string | null
  requested_amount: number | string | null
}

export type MatchLender = {
  id: string
  min_revenue: number | string | null
  max_revenue: number | string | null
  min_credit: number | null
  max_positions: number | null
  industries: string[] | null
  states: string[] | null
  min_amount: number | string | null
  max_amount: number | string | null
  is_active: boolean | null
}

type LenderMatchInsert = {
  merchant_id: string
  lender_id: string
  match_type: 'auto'
  matched_by: null
}

const toNumber = (value: number | string | null | undefined): number | null => {
  if (value === null || value === undefined || value === '') return null
  const parsed = typeof value === 'number' ? value : Number(String(value).replace(/[^0-9.-]/g, ''))
  return Number.isFinite(parsed) ? parsed : null
}

const normalizedList = (values: string[] | null | undefined): string[] => (
  (values ?? []).map(value => value.trim().toLowerCase()).filter(Boolean)
)

export function isMatch(merchant: MatchMerchant, lender: MatchLender): boolean {
  const merchantRevenue = toNumber(merchant.monthly_revenue)
  const lenderMinRevenue = toNumber(lender.min_revenue)
  const lenderMaxRevenue = toNumber(lender.max_revenue)
  if (lenderMinRevenue !== null && (merchantRevenue === null || merchantRevenue < lenderMinRevenue)) return false
  if (lenderMaxRevenue !== null && (merchantRevenue === null || merchantRevenue > lenderMaxRevenue)) return false

  if (lender.min_credit !== null && lender.min_credit !== undefined) {
    if (merchant.credit_score === null || merchant.credit_score === undefined || merchant.credit_score < lender.min_credit) return false
  }

  if (lender.max_positions !== null && lender.max_positions !== undefined) {
    if (merchant.current_positions !== null && merchant.current_positions !== undefined && merchant.current_positions > lender.max_positions) return false
  }

  const lenderIndustries = normalizedList(lender.industries)
  if (lenderIndustries.length > 0) {
    const merchantIndustry = merchant.industry?.trim().toLowerCase()
    if (!merchantIndustry || !lenderIndustries.includes(merchantIndustry)) return false
  }

  const lenderStates = normalizedList(lender.states)
  if (lenderStates.length > 0) {
    const merchantState = merchant.state?.trim().toLowerCase()
    if (!merchantState || !lenderStates.includes(merchantState)) return false
  }

  const requestedAmount = toNumber(merchant.requested_amount)
  const lenderMinAmount = toNumber(lender.min_amount)
  const lenderMaxAmount = toNumber(lender.max_amount)
  if (lenderMinAmount !== null && (requestedAmount === null || requestedAmount < lenderMinAmount)) return false
  if (lenderMaxAmount !== null && (requestedAmount === null || requestedAmount > lenderMaxAmount)) return false

  return true
}

export async function runAutoMatch(merchantId: string, triggeredBy: string): Promise<LenderMatch[]> {
  const { data: merchant, error: merchantError } = await supabaseAdmin
    .from('merchants')
    .select('id,monthly_revenue,credit_score,current_positions,industry,state,requested_amount')
    .eq('id', merchantId)
    .single<MatchMerchant>()

  if (merchantError) throw new Error(merchantError.message)

  const { data: lenders, error: lendersError } = await supabaseAdmin
    .from('lenders')
    .select('id,min_revenue,max_revenue,min_credit,max_positions,industries,states,min_amount,max_amount,is_active')
    .eq('is_active', true)
    .returns<MatchLender[]>()

  if (lendersError) throw new Error(lendersError.message)

  const matches: LenderMatchInsert[] = (lenders ?? [])
    .filter(lender => isMatch(merchant, lender))
    .map(lender => ({
      merchant_id: merchantId,
      lender_id: lender.id,
      match_type: 'auto',
      matched_by: null,
    }))

  if (matches.length === 0) return []

  const { error: upsertError } = await supabaseAdmin
    .from('lender_matches')
    .upsert(matches, { onConflict: 'merchant_id,lender_id', ignoreDuplicates: true })

  if (upsertError) throw new Error(upsertError.message)

  const { data: joined, error: joinedError } = await supabaseAdmin
    .from('lender_matches')
    .select('*, lender:lenders(id,company_name,contact_name,contact_email)')
    .eq('merchant_id', merchantId)
    .in('lender_id', matches.map(match => match.lender_id))
    .returns<LenderMatch[]>()

  if (joinedError) throw new Error(joinedError.message)

  void triggeredBy

  return joined ?? []
}
