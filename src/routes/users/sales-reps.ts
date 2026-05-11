import type { SalesRepresentative } from '../../../types'
import { requireAuth } from '../../lib/requireAuth'
import { assertRole, badRequest, json } from '../../lib/route-utils'
import { supabaseAdmin } from '../../lib/supabase-server'

type SalesRepRow = {
  id: string
  email: string
  full_name: string | null
  name: string | null
}

export async function GET(req: Request): Promise<Response> {
  const user = await requireAuth(req)
  const roleError = assertRole(user, ['admin', 'sales_rep'])
  if (roleError) return roleError

  const { data, error } = await supabaseAdmin
    .from('users')
    .select('id,email,full_name,name')
    .eq('role', 'sales_rep')
    .order('full_name', { ascending: true })
    .returns<SalesRepRow[]>()

  if (error) return badRequest(error.message)

  const reps: SalesRepresentative[] = (data ?? []).map(rep => ({
    id: rep.id,
    email: rep.email,
    name: rep.full_name ?? rep.name ?? rep.email,
  }))

  return json(reps)
}
