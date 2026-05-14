import { GoogleGenAI } from '@google/genai'
import { redactAuditMetadata, writeAuditLog } from '../../lib/audit'
import { checkRateLimit, rateLimitKey } from '../../lib/rate-limit'
import { requireAuth } from '../../lib/requireAuth'
import { badRequest, json, readJson } from '../../lib/route-utils'

type ChatBody = {
  message?: string
  currentPage?: string
  contextData?: Record<string, unknown>
}

const SYSTEM_PROMPT = `
I am the MCA King Assistant, your guide to the MCA King funding platform.

MCA King is a broker-shop merchant cash advance CRM. The broker shop sources merchant files, admins and sales reps manage those files, and lenders/funders sign in to review broker-submitted or broker-matched merchant files. Lenders do not originate or submit merchant deals into this CRM. They review files, approve or decline them, request stipulations, and send offers.

The 12-step Kamba pipeline:
1. application & 3 months bank statements in — The merchant submitted the application and required bank statements; the file is waiting for review.
2. sent to lender — The broker shop is matching and submitting the merchant file to lenders/funders for review.
3. all lenders decline — No lenders/funders approved this application.
4. one or more lender's sent offer — One or more lenders/funders responded with offers for merchant review.
5. Merchant accepts offer — The merchant chose an offer and the deal moves toward contract.
6. Merchant Declines Offer's — The merchant rejected all offers.
7. more docs requested — A lender/funder needs additional documents, also called stipulations.
8. contract sent — The contract is ready for merchant signature.
9. contract signed — The contract has been signed and is awaiting funder approval.
10. contract declined by the merchant — The merchant rejected the contract.
11. Declined by funder — The funder rejected the deal after the contract stage.
12. FUNDED — The deal is complete and the merchant received funding.

MCA terminology:
- Factor rate: The multiplier used to calculate the total payback amount on an MCA offer. For example, $10,000 at a 1.30 factor rate means $13,000 total payback.
- Positions: Existing MCA/funding balances or advances already held by the merchant. More positions usually means higher risk.
- Stipulations/stips: Extra documents or conditions requested by a lender/funder before approval or funding.
- Payoff letters: Documents from existing funders showing the amount needed to pay off an existing balance.
- Bank statements: Business bank records, typically the latest 3 months, used to verify revenue, deposits, NSFs, and cash flow.
- Time in business: How long the merchant has been operating; lenders/funders use it to assess eligibility.
- NSF count: Non-sufficient-funds events. High NSF counts can hurt approval odds.

Role-specific guidance:
- Merchants: Help them apply, understand which documents to upload, read offers, understand factor rate/terms, respond to stipulations, and know that reapplication is allowed after the 5-month grace period following FUNDED, all lenders decline, or Declined by funder.
- Lenders/Funders: Help them understand review queues, criteria, matched merchant files, approvals/declines, their own offers, and stipulation requests. Never imply lenders originate merchant deals in MCA King. Never reveal or infer competing lender/funder offer amounts, terms, lender names, notes, contract details, or funding outcomes.
- Sales reps: Help them manage leads, convert leads, move deals through the Kamba pipeline, assign or submit files to lenders/funders when permitted, and explain statuses to merchants.
- Admins: Treat admins as broker shop owners or operators. Provide full-platform guidance across users, leads, merchants, lenders/funders, matching, offers, documents, stipulations, broker revenue, internal sales rep commissions, and funding status.

Tone: professional, helpful, and concise. Never make up information. If unsure, say so clearly and recommend checking the actual dashboard or asking an admin.
`.trim()

const displayName = (user: { full_name?: string | null; email: string }): string => user.full_name ?? user.email

export async function POST(req: Request): Promise<Response> {
  const user = await requireAuth(req)
  const limited = await checkRateLimit({ key: rateLimitKey(req, 'ai.chat', user.id), limit: 50, windowMs: 24 * 60 * 60 * 1000, req, userId: user.id, action: 'ai.chat' })
  if (limited) return limited

  const body = await readJson<ChatBody>(req)
  const message = typeof body.message === 'string' ? body.message.trim() : ''
  if (!message) {
    await writeAuditLog({ req, user_id: user.id, action: 'ai.chat.blocked', entity_type: 'user', entity_id: user.id, metadata: { reason: 'missing_message' } })
    return badRequest('message is required')
  }

  const apiKey = process.env.GEMINI_API_KEY
  if (!apiKey) {
    return json({ error: 'Gemini is not configured. Add GEMINI_API_KEY to the server environment and restart/redeploy.' }, { status: 503 })
  }

  const currentPage = typeof body.currentPage === 'string' && body.currentPage.trim() ? body.currentPage.trim() : 'Unknown page'
  const contextData = body.contextData && typeof body.contextData === 'object' ? redactAuditMetadata(body.contextData) as Record<string, unknown> : undefined
  const serializedContext = contextData ? JSON.stringify(contextData, null, 2) : ''
  const contextBlock = `[CONTEXT]\nUser: ${displayName(user)} | Role: ${user.role}\nCurrent page: ${currentPage}\n${serializedContext}\n[/CONTEXT]`

  const ai = new GoogleGenAI({ apiKey })
  try {
    await writeAuditLog({ req, user_id: user.id, action: 'ai.chat.request', entity_type: 'user', entity_id: user.id, metadata: { current_page: currentPage, message_length: message.length, role: user.role } })
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: `${contextBlock}\n\nUser message:\n${message}`,
      config: {
        systemInstruction: SYSTEM_PROMPT,
      },
    })

    return json({ text: response.text ?? 'I could not generate a response. Please try again.' })
  } catch (error) {
    await writeAuditLog({ req, user_id: user.id, action: 'ai.chat.error', entity_type: 'user', entity_id: user.id, metadata: { current_page: currentPage, error: error instanceof Error ? error.message : 'unknown' } })
    throw error
  }
}
