import { writeAuditLog } from '../../lib/audit'
import { requireAuth } from '../../lib/requireAuth'
import { badRequest, forbidden, json } from '../../lib/route-utils'

type ReportExportBody = {
  report_type?: string
  row_count?: number
}

export async function POST(req: Request): Promise<Response> {
  const user = await requireAuth(req)
  if (user.role === 'merchant' || user.role === 'lender') return forbidden()

  const body = await req.json().catch(() => ({})) as ReportExportBody
  const reportType = typeof body.report_type === 'string' && body.report_type.trim() ? body.report_type.trim() : null
  if (!reportType) return badRequest('report_type is required')

  await writeAuditLog({
    req,
    user_id: user.id,
    action: 'report.csv_exported',
    entity_type: 'report',
    metadata: {
      report_type: reportType,
      row_count: Number(body.row_count ?? 0),
      role: user.role,
    },
  })

  return json({ success: true })
}
