import { requireAuth } from '../../lib/requireAuth'
import { badRequest, forbidden, json } from '../../lib/route-utils'
import { supabaseAdmin } from '../../lib/supabase-server'
import { cleanSearchTerm } from '../../lib/list-query'

type MerchantSearchRow = {
  id: string
  business_name: string
  status: string
  state: string | null
  assigned_rep_id: string | null
}

type LeadSearchRow = {
  id: string
  business_name: string
  owner_name: string | null
  status: string
  assigned_rep_id: string | null
}

type LenderSearchRow = {
  id: string
  company_name: string
  contact_name: string | null
  contact_email: string
}

export async function GET(req: Request): Promise<Response> {
  const user = await requireAuth(req)
  if (user.role === 'merchant' || user.role === 'lender') return forbidden()

  const url = new URL(req.url)
  const searchTerm = cleanSearchTerm(url.searchParams.get('q'))
  if (!searchTerm) return json({ merchants: [], leads: [], lenders: [], query: '' })
  if (searchTerm.length > 100) return badRequest('Search term is too long')

  const q = `%${searchTerm}%`

  let merchantsQuery = supabaseAdmin
    .from('merchants')
    .select('id,business_name,status,state,assigned_rep_id')
    .or(`business_name.ilike.${q},state.ilike.${q},industry.ilike.${q}`)

  let leadsQuery = supabaseAdmin
    .from('leads')
    .select('id,business_name,owner_name,status,assigned_rep_id')
    .or(`business_name.ilike.${q},owner_name.ilike.${q},email.ilike.${q}`)

  if (user.role === 'sales_rep') {
    merchantsQuery = merchantsQuery.eq('assigned_rep_id', user.id)
    leadsQuery = leadsQuery.or(`assigned_rep_id.eq.${user.id},created_by.eq.${user.id}`)
  }

  const merchantsRequest = merchantsQuery.limit(10).returns<MerchantSearchRow[]>()
  const leadsRequest = leadsQuery.limit(10).returns<LeadSearchRow[]>()
  const lendersQuery = supabaseAdmin
    .from('lenders')
    .select('id,company_name,contact_name,contact_email')
    .or(`company_name.ilike.${q},contact_name.ilike.${q},contact_email.ilike.${q}`)
    .limit(10)
    .returns<LenderSearchRow[]>()

  const [merchants, leads, lenders] = await Promise.all([merchantsRequest, leadsRequest, lendersQuery])

  if (merchants.error) return badRequest(merchants.error.message)
  if (leads.error) return badRequest(leads.error.message)
  if (lenders.error) return badRequest(lenders.error.message)

  return json({
    merchants: merchants.data ?? [],
    leads: leads.data ?? [],
    lenders: lenders.data ?? [],
    query: searchTerm,
  })
}
