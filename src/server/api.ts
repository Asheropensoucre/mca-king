import { GET as getMerchants, POST as postMerchants } from '../routes/merchants/index'
import { GET as getMerchant, PATCH as patchMerchant, DELETE as deleteMerchant } from '../routes/merchants/[id]'
import { GET as getLenders, POST as postLenders } from '../routes/lenders/index'
import { GET as getLender, PATCH as patchLender, DELETE as deleteLender } from '../routes/lenders/[id]'
import { GET as getOffers, POST as postOffers } from '../routes/offers/index'
import { PATCH as patchOffer } from '../routes/offers/[id]'
import { GET as getLeads, POST as postLeads } from '../routes/leads/index'
import { GET as getLead, PATCH as patchLead, DELETE as deleteLead } from '../routes/leads/[id]'
import { POST as postLeadNote } from '../routes/leads/[id]/notes'
import { POST as convertLead } from '../routes/leads/[id]/convert'
import { POST as uploadDocument } from '../routes/documents/upload'
import { GET as getDocuments } from '../routes/documents/index'
import { DELETE as deleteDocument } from '../routes/documents/[id]'
import { GET as getStipulations, POST as postStipulations } from '../routes/stipulations/index'
import { POST as registerAuth } from '../routes/auth/register'
import { POST as loginAuth } from '../routes/auth/login'
import { POST as logoutAuth } from '../routes/auth/logout'
import { GET as meAuth } from '../routes/auth/me'
import { GET as getSalesReps } from '../routes/users/sales-reps'
import type { RouteContext } from '../lib/route-utils'

type Handler = (req: Request, context?: RouteContext) => Promise<Response> | Response

type RouteMatch = {
  handler: Handler
  params?: Record<string, string>
}

function matchRoute(method: string, pathname: string): RouteMatch | null {
  if (pathname === '/api/auth/register') {
    if (method === 'POST') return { handler: registerAuth }
  }

  if (pathname === '/api/auth/login') {
    if (method === 'POST') return { handler: loginAuth }
  }

  if (pathname === '/api/auth/logout') {
    if (method === 'POST') return { handler: logoutAuth }
  }

  if (pathname === '/api/auth/me') {
    if (method === 'GET') return { handler: meAuth }
  }

  if (pathname === '/api/users/sales-reps') {
    if (method === 'GET') return { handler: getSalesReps }
  }

  if (pathname === '/api/merchants') {
    if (method === 'GET') return { handler: getMerchants }
    if (method === 'POST') return { handler: postMerchants }
  }

  const merchantMatch = pathname.match(/^\/api\/merchants\/([^/]+)$/)
  if (merchantMatch) {
    const params = { id: decodeURIComponent(merchantMatch[1]) }
    if (method === 'GET') return { handler: getMerchant, params }
    if (method === 'PATCH') return { handler: patchMerchant, params }
    if (method === 'DELETE') return { handler: deleteMerchant, params }
  }

  if (pathname === '/api/lenders') {
    if (method === 'GET') return { handler: getLenders }
    if (method === 'POST') return { handler: postLenders }
  }

  const lenderMatch = pathname.match(/^\/api\/lenders\/([^/]+)$/)
  if (lenderMatch) {
    const params = { id: decodeURIComponent(lenderMatch[1]) }
    if (method === 'GET') return { handler: getLender, params }
    if (method === 'PATCH') return { handler: patchLender, params }
    if (method === 'DELETE') return { handler: deleteLender, params }
  }

  if (pathname === '/api/offers') {
    if (method === 'GET') return { handler: getOffers }
    if (method === 'POST') return { handler: postOffers }
  }

  const offerMatch = pathname.match(/^\/api\/offers\/([^/]+)$/)
  if (offerMatch) {
    const params = { id: decodeURIComponent(offerMatch[1]) }
    if (method === 'PATCH') return { handler: patchOffer, params }
  }


  if (pathname === '/api/documents/upload') {
    if (method === 'POST') return { handler: uploadDocument }
  }

  if (pathname === '/api/documents') {
    if (method === 'GET') return { handler: getDocuments }
  }

  const documentMatch = pathname.match(/^\/api\/documents\/([^/]+)$/)
  if (documentMatch) {
    const params = { id: decodeURIComponent(documentMatch[1]) }
    if (method === 'DELETE') return { handler: deleteDocument, params }
  }

  if (pathname === '/api/stipulations') {
    if (method === 'GET') return { handler: getStipulations }
    if (method === 'POST') return { handler: postStipulations }
  }

  if (pathname === '/api/leads') {
    if (method === 'GET') return { handler: getLeads }
    if (method === 'POST') return { handler: postLeads }
  }

  const leadNotesMatch = pathname.match(/^\/api\/leads\/([^/]+)\/notes$/)
  if (leadNotesMatch) {
    const params = { id: decodeURIComponent(leadNotesMatch[1]) }
    if (method === 'POST') return { handler: postLeadNote, params }
  }

  const leadConvertMatch = pathname.match(/^\/api\/leads\/([^/]+)\/convert$/)
  if (leadConvertMatch) {
    const params = { id: decodeURIComponent(leadConvertMatch[1]) }
    if (method === 'POST') return { handler: convertLead, params }
  }

  const leadMatch = pathname.match(/^\/api\/leads\/([^/]+)$/)
  if (leadMatch) {
    const params = { id: decodeURIComponent(leadMatch[1]) }
    if (method === 'GET') return { handler: getLead, params }
    if (method === 'PATCH') return { handler: patchLead, params }
    if (method === 'DELETE') return { handler: deleteLead, params }
  }

  return null
}

export async function handleApiRequest(req: Request): Promise<Response> {
  const url = new URL(req.url)
  const match = matchRoute(req.method, url.pathname)
  if (!match) return new Response('Not found', { status: 404 })

  try {
    return await match.handler(req, { params: match.params })
  } catch (error) {
    if (error instanceof Response) return error
    console.error(error)
    return new Response('Internal server error', { status: 500 })
  }
}
