import type { FormData } from '../../../../types'
import { DEFAULT_APPLICATION_STATUS } from '../../../../components/dashboards/shared/applicationStatus'
import { merchantToInsert } from '../../../lib/data-shapes'
import { requireAuth } from '../../../lib/requireAuth'
import { assertRole, badRequest, forbidden, getId, json, notFound, type RouteContext } from '../../../lib/route-utils'
import { supabaseAdmin } from '../../../lib/supabase-server'

type LeadRow = {
  id: string
  created_by: string
  assigned_rep_id: string | null
  business_name: string
  owner_name: string | null
  phone: string | null
  email: string | null
  state: string | null
  status: string
  converted_to: string | null
}

export async function POST(req: Request, context?: RouteContext): Promise<Response> {
  const user = await requireAuth(req)
  const roleError = assertRole(user, ['admin', 'sales_rep'])
  if (roleError) return roleError
  const id = getId(context)
  if (!id) return badRequest()

  const { data: lead, error: leadError } = await supabaseAdmin.from('leads').select('*').eq('id', id).single<LeadRow>()
  if (leadError) return leadError.code === 'PGRST116' ? notFound() : badRequest(leadError.message)
  if (user.role === 'sales_rep' && lead.assigned_rep_id !== user.id && lead.created_by !== user.id) return forbidden()
  if (lead.converted_to) return json({ merchant_id: lead.converted_to })

  const merchantId = crypto.randomUUID()
  const merchant: FormData = {
    id: merchantId,
    businessInfo: {
      legalName: lead.business_name,
      dbaName: '',
      address: lead.state ?? '',
      monthlyRevenue: '',
      phone: lead.phone ?? '',
      taxId: '',
      startDate: '',
      industryType: '',
      entityType: '',
      recentNSFs: '',
    },
    owners: lead.owner_name || lead.email || lead.phone ? [{
      id: crypto.randomUUID(),
      name: lead.owner_name ?? '',
      homeAddress: '',
      signature: '',
      ownership: '100',
      title: '',
      cellPhone: lead.phone ?? '',
      dateOfBirth: '',
      ssn: '',
      email: lead.email ?? '',
      creditScore: '',
    }] : [],
    agreements: { creditAuth: false, signatureDataUrl: '', ipAddress: '', geolocation: null },
    documents: [],
    status: DEFAULT_APPLICATION_STATUS,
    offers: [],
    requestedAmount: '',
    salesRepId: lead.assigned_rep_id ?? undefined,
    matchedLenderIds: [],
  }

  const { error: merchantError } = await supabaseAdmin.from('merchants').insert(merchantToInsert(merchant))
  if (merchantError) return badRequest(merchantError.message)

  const { error: leadUpdateError } = await supabaseAdmin.from('leads').update({ converted_to: merchantId, status: 'converted', updated_at: new Date().toISOString() }).eq('id', id)
  if (leadUpdateError) return badRequest(leadUpdateError.message)

  const { error: historyError } = await supabaseAdmin.from('status_history').insert({
    merchant_id: merchantId,
    changed_by: user.id,
    previous_status: null,
    new_status: DEFAULT_APPLICATION_STATUS,
    note: `Converted from lead ${id}`,
  })
  if (historyError) return badRequest(historyError.message)

  return json({ merchant_id: merchantId }, { status: 201 })
}
