import type { MerchantFileSubmission, MerchantFileSubmissionStatus } from '../../types'
import { supabaseAdmin } from './supabase-server'

export type MerchantFileSubmissionRow = MerchantFileSubmission & {
  merchant?: { business_name: string; assigned_rep_id: string | null } | null
  lender?: { company_name: string; contact_name: string | null; contact_email: string } | null
}

export const SUBMISSION_STATUSES: MerchantFileSubmissionStatus[] = [
  'submitted',
  'viewed',
  'no_response',
  'declined',
  'offer_received',
  'stips_requested',
  'withdrawn',
]

export function isSubmissionStatus(value: string | null | undefined): value is MerchantFileSubmissionStatus {
  return typeof value === 'string' && SUBMISSION_STATUSES.includes(value as MerchantFileSubmissionStatus)
}

export function toMerchantFileSubmission(row: MerchantFileSubmissionRow): MerchantFileSubmission {
  return {
    id: row.id,
    merchant_id: row.merchant_id,
    lender_id: row.lender_id,
    match_id: row.match_id,
    submitted_by: row.submitted_by,
    submitted_at: row.submitted_at,
    status: row.status,
    response_at: row.response_at,
    decline_reason: row.decline_reason,
    package_version: row.package_version,
    notes: row.notes,
    created_at: row.created_at,
    updated_at: row.updated_at,
    merchant_name: row.merchant?.business_name,
    lender_name: row.lender?.company_name,
    lender_contact_name: row.lender?.contact_name,
    lender_contact_email: row.lender?.contact_email,
  }
}

export async function getLenderIdForUser(userId: string): Promise<string | null> {
  const { data, error } = await supabaseAdmin
    .from('lenders')
    .select('id')
    .eq('user_id', userId)
    .maybeSingle<{ id: string }>()

  if (error) throw error
  return data?.id ?? null
}

export async function getLenderMatch(merchantId: string, lenderId: string): Promise<{ id: string } | null> {
  const { data, error } = await supabaseAdmin
    .from('lender_matches')
    .select('id')
    .eq('merchant_id', merchantId)
    .eq('lender_id', lenderId)
    .maybeSingle<{ id: string }>()

  if (error) throw error
  return data ?? null
}

export async function upsertMerchantFileSubmission(params: {
  merchant_id: string
  lender_id: string
  match_id?: string | null
  submitted_by?: string | null
  submitted_at?: string
  status?: MerchantFileSubmissionStatus
  response_at?: string | null
  package_version?: number
  notes?: string | null
  decline_reason?: string | null
}): Promise<MerchantFileSubmissionRow> {
  const packageVersion = params.package_version ?? 1
  const { data, error } = await supabaseAdmin
    .from('merchant_file_submissions')
    .upsert({
      merchant_id: params.merchant_id,
      lender_id: params.lender_id,
      match_id: params.match_id ?? null,
      submitted_by: params.submitted_by ?? null,
      submitted_at: params.submitted_at ?? new Date().toISOString(),
      status: params.status ?? 'submitted',
      response_at: params.response_at ?? null,
      decline_reason: params.decline_reason ?? null,
      package_version: packageVersion,
      notes: params.notes ?? null,
      updated_at: new Date().toISOString(),
    }, { onConflict: 'merchant_id,lender_id,package_version' })
    .select('*, merchant:merchants(business_name,assigned_rep_id), lender:lenders(company_name,contact_name,contact_email)')
    .single<MerchantFileSubmissionRow>()

  if (error) throw error
  return data
}

export async function markMerchantFileSubmissionResponse(params: {
  merchant_id: string
  lender_id: string
  status: Extract<MerchantFileSubmissionStatus, 'offer_received' | 'stips_requested'>
  match_id?: string | null
}): Promise<void> {
  const now = new Date().toISOString()
  const { data: existing, error: existingError } = await supabaseAdmin
    .from('merchant_file_submissions')
    .select('id')
    .eq('merchant_id', params.merchant_id)
    .eq('lender_id', params.lender_id)
    .eq('package_version', 1)
    .maybeSingle<{ id: string }>()

  if (existingError) throw existingError

  if (existing) {
    const { error } = await supabaseAdmin
      .from('merchant_file_submissions')
      .update({ status: params.status, response_at: now, updated_at: now })
      .eq('id', existing.id)
    if (error) throw error
    return
  }

  const match = params.match_id !== undefined ? { id: params.match_id } : await getLenderMatch(params.merchant_id, params.lender_id)
  await upsertMerchantFileSubmission({
    merchant_id: params.merchant_id,
    lender_id: params.lender_id,
    match_id: match?.id ?? null,
    status: params.status,
    response_at: now,
    submitted_at: now,
  })
}
