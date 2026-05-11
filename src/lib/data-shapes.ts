import type { ApplicationStatus, FormData, LenderInfo, Offer } from '../../types'
import { DEFAULT_APPLICATION_STATUS } from '../../components/dashboards/shared/applicationStatus'

export type MerchantRow = {
  id: string
  user_id: string | null
  assigned_rep_id: string | null
  business_name: string
  industry: string | null
  state: string | null
  monthly_revenue: number | string | null
  time_in_business: number | null
  credit_score: number | null
  nsf_count: number | null
  requested_amount: number | string | null
  current_positions: number | null
  status: ApplicationStatus
  payload: FormData | null
  created_at?: string
  updated_at?: string
}

export type LenderRow = {
  id: string
  user_id: string | null
  company_name: string
  contact_email: string
  contact_name: string | null
  min_revenue: number | string | null
  max_revenue: number | string | null
  min_credit: number | null
  max_positions: number | null
  industries: string[] | null
  states: string[] | null
  min_amount: number | string | null
  max_amount: number | string | null
  is_active: boolean | null
  payload: LenderInfo | null
}

export type OfferRow = {
  id: string
  merchant_id: string
  lender_id: string
  amount: number | string
  factor_rate: number | string | null
  term_months: number | null
  payment_freq: string | null
  status: 'pending' | 'accepted' | 'declined'
  accepted_at: string | null
  payload: Offer | null
}

const numberOrNull = (value: string | undefined): number | null => {
  if (!value) return null
  const parsed = Number(String(value).replace(/[^0-9.-]/g, ''))
  return Number.isFinite(parsed) ? parsed : null
}

export const isUuid = (value: string | undefined | null): value is string => (
  typeof value === 'string' && /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value)
)

const getStateFromAddress = (address?: string): string | null => {
  if (!address) return null
  const match = address.toUpperCase().match(/\b[A-Z]{2}\b(?!.*\b[A-Z]{2}\b)/)
  return match?.[0] ?? null
}

export function merchantToInsert(merchant: FormData, userId?: string) {
  return {
    id: merchant.id,
    user_id: userId ?? null,
    assigned_rep_id: merchant.salesRepId ?? null,
    business_name: merchant.businessInfo.legalName || merchant.businessInfo.dbaName || 'Unnamed Business',
    industry: merchant.businessInfo.industryType || null,
    state: getStateFromAddress(merchant.businessInfo.address),
    monthly_revenue: numberOrNull(merchant.businessInfo.monthlyRevenue),
    time_in_business: null,
    credit_score: numberOrNull(merchant.owners[0]?.creditScore),
    nsf_count: numberOrNull(merchant.businessInfo.recentNSFs),
    requested_amount: numberOrNull(merchant.requestedAmount),
    current_positions: null,
    status: merchant.status || DEFAULT_APPLICATION_STATUS,
    payload: merchant,
  }
}

export function merchantToUpdate(merchant: Partial<FormData>) {
  return {
    assigned_rep_id: merchant.salesRepId ?? undefined,
    business_name: merchant.businessInfo?.legalName || merchant.businessInfo?.dbaName || undefined,
    industry: merchant.businessInfo?.industryType || undefined,
    state: getStateFromAddress(merchant.businessInfo?.address) ?? undefined,
    monthly_revenue: numberOrNull(merchant.businessInfo?.monthlyRevenue),
    credit_score: numberOrNull(merchant.owners?.[0]?.creditScore),
    nsf_count: numberOrNull(merchant.businessInfo?.recentNSFs),
    requested_amount: numberOrNull(merchant.requestedAmount),
    status: merchant.status,
    payload: merchant,
    updated_at: new Date().toISOString(),
  }
}

export function rowToMerchant(row: MerchantRow): FormData {
  const base = row.payload
  if (base) {
    return {
      ...base,
      id: row.id,
      status: row.status,
      salesRepId: row.assigned_rep_id ?? base.salesRepId,
    }
  }
  return {
    id: row.id,
    businessInfo: {
      legalName: row.business_name,
      dbaName: '',
      address: row.state ?? '',
      monthlyRevenue: row.monthly_revenue ? String(row.monthly_revenue) : '',
      phone: '',
      taxId: '',
      startDate: '',
      industryType: row.industry ?? '',
      entityType: '',
      recentNSFs: row.nsf_count ? String(row.nsf_count) : '',
    },
    owners: [],
    agreements: { creditAuth: false, signatureDataUrl: '', ipAddress: '', geolocation: null },
    documents: [],
    status: row.status,
    offers: [],
    requestedAmount: row.requested_amount ? String(row.requested_amount) : '',
    salesRepId: row.assigned_rep_id ?? undefined,
    matchedLenderIds: [],
  }
}

export function lenderToInsert(lender: LenderInfo, userId?: string) {
  return {
    id: lender.id,
    user_id: userId ?? null,
    company_name: lender.lenderName || 'Unnamed Lender',
    contact_email: lender.email || 'unknown@example.com',
    contact_name: lender.isoRep || null,
    min_revenue: numberOrNull(lender.minRevenue),
    max_revenue: null,
    min_credit: numberOrNull(lender.minCreditScore),
    max_positions: numberOrNull(lender.positions),
    industries: lender.industryRestrictions ? lender.industryRestrictions.split(',').map(v => v.trim()).filter(Boolean) : [],
    states: lender.stateRestrictions ? lender.stateRestrictions.split(',').map(v => v.trim()).filter(Boolean) : [],
    min_amount: null,
    max_amount: numberOrNull(lender.maxFundingAmount),
    is_active: true,
    payload: lender,
  }
}

export function lenderToUpdate(lender: Partial<LenderInfo>) {
  return {
    company_name: lender.lenderName || undefined,
    contact_email: lender.email || undefined,
    contact_name: lender.isoRep || undefined,
    min_revenue: numberOrNull(lender.minRevenue),
    min_credit: numberOrNull(lender.minCreditScore),
    max_positions: numberOrNull(lender.positions),
    states: lender.stateRestrictions ? lender.stateRestrictions.split(',').map(v => v.trim()).filter(Boolean) : undefined,
    max_amount: numberOrNull(lender.maxFundingAmount),
    payload: lender,
  }
}

export function rowToLender(row: LenderRow): LenderInfo {
  if (row.payload) return { ...row.payload, id: row.id }
  return {
    id: row.id,
    lenderName: row.company_name,
    positions: row.max_positions ? String(row.max_positions) : '',
    longestTerm: '',
    maxFundingAmount: row.max_amount ? String(row.max_amount) : '',
    minRevenue: row.min_revenue ? String(row.min_revenue) : '',
    minCreditScore: row.min_credit ? String(row.min_credit) : '',
    industryRestrictions: row.industries?.join(', ') ?? '',
    nsfs: '',
    timeInBusiness: '',
    stateRestrictions: row.states?.join(', ') ?? '',
    isoRep: row.contact_name ?? '',
    cell: '',
    email: row.contact_email,
    notes: '',
    buyRate: '',
    fees: '',
    trucking: '',
  }
}

export function normalizeOfferStatus(status: Offer['status']): OfferRow['status'] {
  if (status === 'Accepted') return 'accepted'
  if (status === 'Rejected') return 'declined'
  return 'pending'
}
