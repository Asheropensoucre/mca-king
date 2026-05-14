import { canAccessCommunicationEntity, resolveRecipient } from '../../lib/communications/entities'
import { sendEmailWithCompliance, sendSmsDisabled } from '../../lib/communications/communication-service'
import type { CommunicationEntityType } from '../../lib/communications/types'
import { requireAuth } from '../../lib/requireAuth'
import { badRequest, forbidden, json } from '../../lib/route-utils'

function isEntityType(value: unknown): value is CommunicationEntityType {
  return value === 'lead' || value === 'merchant' || value === 'contact' || value === 'user'
}

function htmlFromText(value: string): string {
  return value.split('\n').map(line => `<p>${line.replace(/[&<>]/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' }[char] ?? char))}</p>`).join('')
}

export async function POST(req: Request): Promise<Response> {
  const user = await requireAuth(req)
  if (user.role === 'merchant' || user.role === 'lender') return forbidden()
  const body = await req.json() as Record<string, unknown>
  if (body.channel === 'sms' || body.channel === 'sms_future') return json(await sendSmsDisabled(), { status: 400 })
  if (!isEntityType(body.entity_type) || typeof body.entity_id !== 'string') return badRequest('entity_type and entity_id are required')
  if (typeof body.subject !== 'string' || typeof body.body !== 'string') return badRequest('subject and body are required')
  if (!await canAccessCommunicationEntity(user, body.entity_type, body.entity_id)) return forbidden()
  const recipient = await resolveRecipient(body.entity_type, body.entity_id)
  const to = typeof body.to === 'string' && body.to.trim() ? body.to.trim() : recipient?.email
  if (!recipient || !to) return badRequest('Recipient email not found')

  const result = await sendEmailWithCompliance({
    req,
    to,
    subject: body.subject,
    html: htmlFromText(body.body),
    category: body.category === 'campaign' ? 'campaign' : 'transactional',
    entity_type: body.entity_type,
    entity_id: body.entity_id,
    user,
  })

  return json(result, { status: result.ok ? 200 : 400 })
}
