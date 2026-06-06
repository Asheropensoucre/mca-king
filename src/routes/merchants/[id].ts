import type { FormData } from '../../../types'
import { recordActivity } from '../../lib/activity'
import { merchantToUpdate, rowToMerchant, type MerchantRow } from '../../lib/data-shapes'
import { displayName, toNumber, type EmailUser } from '../../lib/email-data'
import { triggerMerchantStatusEmail } from '../../lib/email-triggers'
import { sendNewMerchantAlert } from '../../lib/send-email'
import { requireAuth } from '../../lib/requireAuth'
import { runAutoMatch } from '../../lib/matching'
import { canAccessMerchant } from '../../lib/permissions'
import { assertRole, badRequest, forbidden, getId, json, notFound, type RouteContext } from '../../lib/route-utils'
import { supabaseAdmin } from '../../lib/supabase-server'

async function fetchMerchant(id: string): Promise<MerchantRow | null | Response> {
  const { data, error } = await supabaseAdmin.from('merchants').select('*, assigned_rep:users!merchants_assigned_rep_id_fkey(id,full_name,name,email)').eq('id', id).single<MerchantRow>()
  if (error) return error.code === 'PGRST116' ? null : badRequest(error.message)
  return data
}

async function getCurrentLenderId(userId: string): Promise<string | null | Response> {
  const { data, error } = await supabaseAdmin
    .from('lenders')
    .select('id')
    .eq('user_id', userId)
    .maybeSingle<{ id: string }>()

  if (error) return badRequest(error.message)
  return data?.id ?? null
}

function sanitizeMerchantForLender(merchant: FormData, lenderId: string): FormData {
  return {
    ...merchant,
    offers: (merchant.offers ?? []).filter(offer => offer.lenderId === lenderId),
  }
}

function canRead(userRole: string, userId: string, row: MerchantRow): boolean {
  if (userRole === 'admin') return true
  if (userRole === 'sales_rep') return row.assigned_rep_id === userId
  if (userRole === 'merchant') return row.user_id === userId
  return false
}

function recordRepAssignmentActivity(merchantId: string, assignedRepId: string | null, userId: string): void {
  void (async () => {
    let repName = assignedRepId ?? 'Unassigned'
    if (assignedRepId) {
      const { data: rep } = await supabaseAdmin
        .from('users')
        .select('full_name,name,email')
        .eq('id', assignedRepId)
        .maybeSingle<{ full_name: string | null; name: string | null; email: string }>()
      repName = rep?.full_name ?? rep?.name ?? rep?.email ?? assignedRepId
    }

    recordActivity({
      entity_type: 'merchant',
      entity_id: merchantId,
      user_id: userId,
      activity_type: 'system',
      body: `Sales rep assigned: ${repName}`,
      metadata: { assigned_rep_id: assignedRepId },
    })
  })()
}

function sendRepAssignmentAlert(merchant: MerchantRow): void {
  if (!merchant.assigned_rep_id) return

  void (async () => {
    try {
      const { data: rep, error } = await supabaseAdmin
        .from('users')
        .select('id,email,full_name,name,role')
        .eq('id', merchant.assigned_rep_id)
        .maybeSingle<EmailUser>()

      if (error) {
        console.error('[email] Failed to fetch assigned rep', error)
        return
      }

      if (!rep?.email) return

      await sendNewMerchantAlert({
        rep_email: rep.email,
        rep_name: displayName(rep, 'Sales Rep'),
        business_name: merchant.business_name,
        requested_amount: toNumber(merchant.requested_amount),
      })
    } catch (error) {
      console.error('[email] Rep assignment alert trigger failed', error)
    }
  })()
}

export async function GET(req: Request, context?: RouteContext): Promise<Response> {
  const user = await requireAuth(req)
  const id = getId(context)
  if (!id) return badRequest()

  const row = await fetchMerchant(id)
  if (row instanceof Response) return row
  if (!row) return notFound()

  if (user.role === 'lender') {
    const lenderId = await getCurrentLenderId(user.id)
    if (lenderId instanceof Response) return lenderId
    if (!lenderId) return forbidden()

    if (!(await canAccessMerchant(user, id))) return forbidden()

    return json(sanitizeMerchantForLender(rowToMerchant(row), lenderId))
  }

  if (!canRead(user.role, user.id, row)) return forbidden()

  return json(rowToMerchant(row))
}

type MerchantPatchBody = Partial<FormData> & {
  assigned_rep_id?: string | null
}

export async function PATCH(req: Request, context?: RouteContext): Promise<Response> {
  const user = await requireAuth(req)
  const roleError = assertRole(user, ['admin', 'sales_rep'])
  if (roleError) return roleError

  const id = getId(context)
  if (!id) return badRequest()

  const existing = await fetchMerchant(id)
  if (existing instanceof Response) return existing
  if (!existing) return notFound()
  if (user.role === 'sales_rep' && existing.assigned_rep_id !== user.id) return forbidden()

  const patch = await req.json() as MerchantPatchBody
  const hasAssignedRepId = Object.prototype.hasOwnProperty.call(patch, 'assigned_rep_id')
  const hasSalesRepId = Object.prototype.hasOwnProperty.call(patch, 'salesRepId')
  const nextAssignedRepId = hasAssignedRepId ? patch.assigned_rep_id ?? null : hasSalesRepId ? patch.salesRepId ?? null : existing.assigned_rep_id
  if (user.role !== 'admin' && (hasAssignedRepId || hasSalesRepId)) return forbidden('Only admins can change sales rep assignment')
  if (user.role !== 'admin' && (Object.prototype.hasOwnProperty.call(patch, 'offers') || Object.prototype.hasOwnProperty.call(patch, 'matchedLenderIds') || Object.prototype.hasOwnProperty.call(patch, 'documents'))) return forbidden('This field cannot be updated from this route')
  const assignmentChanged = (hasAssignedRepId || hasSalesRepId) && nextAssignedRepId !== existing.assigned_rep_id

  const currentPayload = rowToMerchant(existing)
  const merged: FormData = { ...currentPayload, ...patch, id }
  if (patch.businessInfo) merged.businessInfo = { ...currentPayload.businessInfo, ...patch.businessInfo }
  if (patch.owners) merged.owners = patch.owners
  if (patch.agreements) merged.agreements = { ...currentPayload.agreements, ...patch.agreements }
  if (patch.documents) merged.documents = patch.documents
  if (patch.offers) merged.offers = patch.offers
  if (patch.matchedLenderIds) merged.matchedLenderIds = patch.matchedLenderIds
  if (hasAssignedRepId || hasSalesRepId) merged.salesRepId = nextAssignedRepId ?? undefined

  const update: ReturnType<typeof merchantToUpdate> & { assigned_rep_id?: string | null } = merchantToUpdate(merged)
  if (hasAssignedRepId || hasSalesRepId) update.assigned_rep_id = nextAssignedRepId

  const { data, error } = await supabaseAdmin
    .from('merchants')
    .update(update)
    .eq('id', id)
    .select('*, assigned_rep:users!merchants_assigned_rep_id_fkey(id,full_name,name,email)')
    .single<MerchantRow>()

  if (error) return badRequest(error.message)

  if (assignmentChanged) {
    if (data.assigned_rep_id) sendRepAssignmentAlert(data)
    recordRepAssignmentActivity(id, data.assigned_rep_id, user.id)
  }

  if (patch.status && patch.status !== existing.status) {
    const history = await supabaseAdmin.from('status_history').insert({
      merchant_id: id,
      changed_by: user.id,
      previous_status: existing.status,
      new_status: patch.status,
    })
    if (history.error) return badRequest(history.error.message)

    recordActivity({
      entity_type: 'merchant',
      entity_id: id,
      user_id: user.id,
      activity_type: 'status_change',
      body: `Status changed from "${existing.status}" to "${patch.status}"`,
      metadata: { previous_status: existing.status, new_status: patch.status },
    })

    if (patch.status === 'sent to lender') {
      try {
        await runAutoMatch(id, user.id)
      } catch (matchError) {
        return badRequest(matchError instanceof Error ? matchError.message : 'Could not run auto-match')
      }
    }

    if (patch.status === 'contract sent' || patch.status === 'FUNDED') {
      triggerMerchantStatusEmail(id, patch.status)
    }
  }

  return json(rowToMerchant(data))
}

export async function DELETE(req: Request, context?: RouteContext): Promise<Response> {
  const user = await requireAuth(req, 'admin')
  const id = getId(context)
  if (!user || !id) return badRequest()

  const { error } = await supabaseAdmin.from('merchants').delete().eq('id', id)
  if (error) return badRequest(error.message)

  return new Response(null, { status: 204 })
}
