import type { PayoffRequest } from '../../../types'
import { recordActivity } from '../../lib/activity'
import { getLenderIdForUser } from '../../lib/merchant-file-submissions'
import { isPayoffRequestStatus, toPayoffRequest, type PayoffRequestRow } from '../../lib/renewals'
import { requireAuth } from '../../lib/requireAuth'
import { badRequest, forbidden, getId, json, notFound, type RouteContext } from '../../lib/route-utils'
import { supabaseAdmin } from '../../lib/supabase-server'

type PayoffRequestPatchBody = Partial<Pick<PayoffRequest, 'requested_from_lender_id' | 'requested_from_name' | 'payoff_amount' | 'requested_at' | 'received_at' | 'expires_at' | 'file_document_id' | 'status' | 'notes'>>

const payoffSelect = '*, merchant:merchants(business_name,assigned_rep_id,user_id), funding:fundings(lender_id,lender:lenders(company_name)), document:documents(file_name)'

function toNumber(value: unknown): number | null {
  if (value === null || value === undefined || value === '') return null
  const parsed = Number(String(value).replace(/[^0-9.-]/g, ''))
  return Number.isFinite(parsed) ? parsed : null
}

function safePayoffRequest(request: PayoffRequest): PayoffRequest {
  return { ...request, notes: null }
}

async function getCurrentLenderId(userId: string, role: string): Promise<string | null> {
  if (role !== 'lender') return null
  return await getLenderIdForUser(userId)
}

function canRead(userId: string, role: string, request: PayoffRequestRow, lenderId: string | null): boolean {
  if (role === 'admin') return true
  if (role === 'sales_rep') return request.merchant?.assigned_rep_id === userId
  if (role === 'merchant') return request.merchant?.user_id === userId
  if (role === 'lender') return Boolean(lenderId && request.funding?.lender_id === lenderId)
  return false
}

function canFulfill(role: string, request: PayoffRequestRow, lenderId: string | null): boolean {
  if (role === 'admin') return true
  if (role === 'lender') return Boolean(lenderId && request.funding?.lender_id === lenderId)
  return false
}

async function fetchPayoffRequest(id: string): Promise<PayoffRequestRow | Response | null> {
  const { data, error } = await supabaseAdmin
    .from('payoff_requests')
    .select(payoffSelect)
    .eq('id', id)
    .maybeSingle<PayoffRequestRow>()
  if (error) return badRequest(error.message)
  return data ?? null
}

async function validateDocument(merchantId: string, documentId: string | null | undefined): Promise<Response | null> {
  if (!documentId) return null
  const { data, error } = await supabaseAdmin
    .from('documents')
    .select('id,merchant_id')
    .eq('id', documentId)
    .maybeSingle<{ id: string; merchant_id: string }>()
  if (error) return badRequest(error.message)
  if (!data || data.merchant_id !== merchantId) return badRequest('document does not belong to merchant')
  return null
}

function containsFulfillmentFields(body: PayoffRequestPatchBody): boolean {
  return body.file_document_id !== undefined || body.payoff_amount !== undefined || body.received_at !== undefined || body.expires_at !== undefined || body.status === 'received' || body.status === 'used'
}

export async function GET(req: Request, context?: RouteContext): Promise<Response> {
  const user = await requireAuth(req)
  const id = getId(context)
  if (!id) return badRequest('id is required')

  const request = await fetchPayoffRequest(id)
  if (request instanceof Response) return request
  if (!request) return notFound()

  const lenderId = await getCurrentLenderId(user.id, user.role)
  if (!canRead(user.id, user.role, request, lenderId)) return forbidden()

  const mapped = toPayoffRequest(request)
  return json(user.role === 'merchant' || user.role === 'lender' ? safePayoffRequest(mapped) : mapped)
}

export async function PATCH(req: Request, context?: RouteContext): Promise<Response> {
  const user = await requireAuth(req)
  const id = getId(context)
  if (!id) return badRequest('id is required')

  const existing = await fetchPayoffRequest(id)
  if (existing instanceof Response) return existing
  if (!existing) return notFound()

  const lenderId = await getCurrentLenderId(user.id, user.role)
  if (!canRead(user.id, user.role, existing, lenderId)) return forbidden()

  const body = await req.json() as PayoffRequestPatchBody
  if (body.status && !isPayoffRequestStatus(body.status)) return badRequest('status is invalid')

  if (containsFulfillmentFields(body) && !canFulfill(user.role, existing, lenderId)) {
    return forbidden('Only the funding lender/funder or admin can upload/link the payoff letter')
  }

  if ((user.role === 'merchant' || user.role === 'lender') && body.notes !== undefined) {
    return forbidden('Internal notes are admin/sales rep only')
  }

  if (user.role === 'sales_rep') {
    const allowedSalesRepFields = ['notes', 'requested_at', 'status', 'requested_from_name'] as const
    const fieldKeys = Object.keys(body)
    const disallowed = fieldKeys.some(key => !allowedSalesRepFields.includes(key as typeof allowedSalesRepFields[number]) || body.status === 'received' || body.status === 'used')
    if (disallowed) return forbidden('Sales reps can update request tracking only; only admin or the funding lender can fulfill payoff requests')
  }

  const documentError = await validateDocument(existing.merchant_id, body.file_document_id)
  if (documentError) return documentError

  const update: Record<string, unknown> = { updated_at: new Date().toISOString() }
  if (body.requested_from_lender_id !== undefined && user.role === 'admin') update.requested_from_lender_id = body.requested_from_lender_id
  if (body.requested_from_name !== undefined && (user.role === 'admin' || user.role === 'sales_rep')) update.requested_from_name = body.requested_from_name?.trim() || null
  if (body.payoff_amount !== undefined) update.payoff_amount = toNumber(body.payoff_amount)
  if (body.requested_at !== undefined && user.role !== 'lender') update.requested_at = body.requested_at
  if (body.received_at !== undefined) update.received_at = body.received_at
  if (body.expires_at !== undefined) update.expires_at = body.expires_at
  if (body.file_document_id !== undefined) update.file_document_id = body.file_document_id
  if (body.status !== undefined) update.status = body.status
  if (body.notes !== undefined && user.role !== 'lender' && user.role !== 'merchant') update.notes = body.notes?.trim() || null

  const { data, error } = await supabaseAdmin
    .from('payoff_requests')
    .update(update)
    .eq('id', id)
    .select(payoffSelect)
    .single<PayoffRequestRow>()

  if (error) return badRequest(error.message)
  const request = toPayoffRequest(data)

  if (body.status && body.status !== existing.status) {
    recordActivity({
      entity_type: 'merchant',
      entity_id: existing.merchant_id,
      user_id: user.id,
      activity_type: 'system',
      body: `Payoff request status changed from ${existing.status} to ${body.status}`,
      metadata: { payoff_request_id: id, previous_status: existing.status, new_status: body.status },
    })
  }

  if (body.file_document_id || body.received_at || body.status === 'received') {
    recordActivity({
      entity_type: 'merchant',
      entity_id: existing.merchant_id,
      user_id: user.id,
      activity_type: 'upload',
      body: 'Lender/funder payoff letter received and linked',
      metadata: { payoff_request_id: id, file_document_id: body.file_document_id ?? existing.file_document_id },
    })
  }

  return json(user.role === 'merchant' || user.role === 'lender' ? safePayoffRequest(request) : request)
}
