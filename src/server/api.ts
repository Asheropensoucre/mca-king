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
import { GET as getMatching } from '../routes/matching/index'
import { POST as runMatching } from '../routes/matching/run'
import { POST as postManualMatching, DELETE as deleteManualMatching } from '../routes/matching/manual'
import { POST as notifyMatching } from '../routes/matching/notify'
import { GET as getActivities, POST as postActivity } from '../routes/activities/index'
import { GET as getTasks, POST as postTask } from '../routes/tasks/index'
import { PATCH as patchTask, DELETE as deleteTask } from '../routes/tasks/[id]'
import { GET as getFundings, POST as postFunding } from '../routes/fundings/index'
import { GET as getFunding, PATCH as patchFunding } from '../routes/fundings/[id]'
import { GET as getRenewals, POST as postRenewal } from '../routes/renewals/index'
import { GET as getRenewal, PATCH as patchRenewal } from '../routes/renewals/[id]'
import { POST as requestRenewalReview } from '../routes/renewals/[id]/request-review'
import { GET as getPayoffRequests, POST as postPayoffRequest } from '../routes/payoff-requests/index'
import { GET as getPayoffRequest, PATCH as patchPayoffRequest } from '../routes/payoff-requests/[id]'
import { GET as getBrokerRevenue, POST as postBrokerRevenue } from '../routes/broker-revenue/index'
import { PATCH as patchBrokerRevenue } from '../routes/broker-revenue/[id]'
import { GET as getSalesRepCommissions, POST as postSalesRepCommission } from '../routes/sales-rep-commissions/index'
import { PATCH as patchSalesRepCommission } from '../routes/sales-rep-commissions/[id]'
import { GET as getMerchantFileSubmissions, POST as postMerchantFileSubmission } from '../routes/merchant-file-submissions/index'
import { PATCH as patchMerchantFileSubmission } from '../routes/merchant-file-submissions/[id]'
import { GET as getSearch } from '../routes/search/index'
import { GET as getSavedViews, POST as postSavedView } from '../routes/saved-views/index'
import { PATCH as patchSavedView, DELETE as deleteSavedView } from '../routes/saved-views/[id]'
import { GET as getSettingsMe, PATCH as patchSettingsPassword } from '../routes/settings/me'
import { GET as getAdminUsers, POST as postAdminUser } from '../routes/admin/users/index'
import { GET as getAdminUser, PATCH as patchAdminUser } from '../routes/admin/users/[id]'
import { POST as resetAdminUserPassword } from '../routes/admin/users/[id]/reset-password'
import { POST as disableAdminUser } from '../routes/admin/users/[id]/disable'
import { POST as reactivateAdminUser } from '../routes/admin/users/[id]/reactivate'
import { POST as closeAdminUser } from '../routes/admin/users/[id]/close'
import { POST as aiChat } from '../routes/ai/chat'
import type { RouteContext } from '../lib/route-utils'

type Handler = (req: Request, context?: RouteContext) => Promise<Response> | Response

type RouteMatch = {
  handler: Handler
  params?: Record<string, string>
}

function matchRoute(method: string, pathname: string): RouteMatch | null {
  if (pathname === '/api/ai/chat') {
    if (method === 'POST') return { handler: aiChat }
  }

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

  if (pathname === '/api/activities') {
    if (method === 'GET') return { handler: getActivities }
    if (method === 'POST') return { handler: postActivity }
  }

  if (pathname === '/api/search') {
    if (method === 'GET') return { handler: getSearch }
  }

  if (pathname === '/api/settings/me') {
    if (method === 'GET') return { handler: getSettingsMe }
  }

  if (pathname === '/api/settings/me/password') {
    if (method === 'PATCH') return { handler: patchSettingsPassword }
  }

  if (pathname === '/api/admin/users') {
    if (method === 'GET') return { handler: getAdminUsers }
    if (method === 'POST') return { handler: postAdminUser }
  }

  const adminUserActionMatch = pathname.match(/^\/api\/admin\/users\/([^/]+)\/(reset-password|disable|reactivate|close)$/)
  if (adminUserActionMatch) {
    const params = { id: decodeURIComponent(adminUserActionMatch[1]) }
    if (method === 'POST' && adminUserActionMatch[2] === 'reset-password') return { handler: resetAdminUserPassword, params }
    if (method === 'POST' && adminUserActionMatch[2] === 'disable') return { handler: disableAdminUser, params }
    if (method === 'POST' && adminUserActionMatch[2] === 'reactivate') return { handler: reactivateAdminUser, params }
    if (method === 'POST' && adminUserActionMatch[2] === 'close') return { handler: closeAdminUser, params }
  }

  const adminUserMatch = pathname.match(/^\/api\/admin\/users\/([^/]+)$/)
  if (adminUserMatch) {
    const params = { id: decodeURIComponent(adminUserMatch[1]) }
    if (method === 'GET') return { handler: getAdminUser, params }
    if (method === 'PATCH') return { handler: patchAdminUser, params }
  }

  if (pathname === '/api/saved-views') {
    if (method === 'GET') return { handler: getSavedViews }
    if (method === 'POST') return { handler: postSavedView }
  }

  const savedViewMatch = pathname.match(/^\/api\/saved-views\/([^/]+)$/)
  if (savedViewMatch) {
    const params = { id: decodeURIComponent(savedViewMatch[1]) }
    if (method === 'PATCH') return { handler: patchSavedView, params }
    if (method === 'DELETE') return { handler: deleteSavedView, params }
  }

  if (pathname === '/api/tasks') {
    if (method === 'GET') return { handler: getTasks }
    if (method === 'POST') return { handler: postTask }
  }

  const taskMatch = pathname.match(/^\/api\/tasks\/([^/]+)$/)
  if (taskMatch) {
    const params = { id: decodeURIComponent(taskMatch[1]) }
    if (method === 'PATCH') return { handler: patchTask, params }
    if (method === 'DELETE') return { handler: deleteTask, params }
  }

  if (pathname === '/api/fundings') {
    if (method === 'GET') return { handler: getFundings }
    if (method === 'POST') return { handler: postFunding }
  }

  const fundingMatch = pathname.match(/^\/api\/fundings\/([^/]+)$/)
  if (fundingMatch) {
    const params = { id: decodeURIComponent(fundingMatch[1]) }
    if (method === 'GET') return { handler: getFunding, params }
    if (method === 'PATCH') return { handler: patchFunding, params }
  }

  if (pathname === '/api/renewals') {
    if (method === 'GET') return { handler: getRenewals }
    if (method === 'POST') return { handler: postRenewal }
  }

  const renewalReviewMatch = pathname.match(/^\/api\/renewals\/([^/]+)\/request-review$/)
  if (renewalReviewMatch) {
    const params = { id: decodeURIComponent(renewalReviewMatch[1]) }
    if (method === 'POST') return { handler: requestRenewalReview, params }
  }

  const renewalMatch = pathname.match(/^\/api\/renewals\/([^/]+)$/)
  if (renewalMatch) {
    const params = { id: decodeURIComponent(renewalMatch[1]) }
    if (method === 'GET') return { handler: getRenewal, params }
    if (method === 'PATCH') return { handler: patchRenewal, params }
  }

  if (pathname === '/api/payoff-requests') {
    if (method === 'GET') return { handler: getPayoffRequests }
    if (method === 'POST') return { handler: postPayoffRequest }
  }

  const payoffRequestMatch = pathname.match(/^\/api\/payoff-requests\/([^/]+)$/)
  if (payoffRequestMatch) {
    const params = { id: decodeURIComponent(payoffRequestMatch[1]) }
    if (method === 'GET') return { handler: getPayoffRequest, params }
    if (method === 'PATCH') return { handler: patchPayoffRequest, params }
  }

  if (pathname === '/api/broker-revenue') {
    if (method === 'GET') return { handler: getBrokerRevenue }
    if (method === 'POST') return { handler: postBrokerRevenue }
  }

  const brokerRevenueMatch = pathname.match(/^\/api\/broker-revenue\/([^/]+)$/)
  if (brokerRevenueMatch) {
    const params = { id: decodeURIComponent(brokerRevenueMatch[1]) }
    if (method === 'PATCH') return { handler: patchBrokerRevenue, params }
  }

  if (pathname === '/api/sales-rep-commissions') {
    if (method === 'GET') return { handler: getSalesRepCommissions }
    if (method === 'POST') return { handler: postSalesRepCommission }
  }

  const salesRepCommissionMatch = pathname.match(/^\/api\/sales-rep-commissions\/([^/]+)$/)
  if (salesRepCommissionMatch) {
    const params = { id: decodeURIComponent(salesRepCommissionMatch[1]) }
    if (method === 'PATCH') return { handler: patchSalesRepCommission, params }
  }

  if (pathname === '/api/merchant-file-submissions') {
    if (method === 'GET') return { handler: getMerchantFileSubmissions }
    if (method === 'POST') return { handler: postMerchantFileSubmission }
  }

  const merchantFileSubmissionMatch = pathname.match(/^\/api\/merchant-file-submissions\/([^/]+)$/)
  if (merchantFileSubmissionMatch) {
    const params = { id: decodeURIComponent(merchantFileSubmissionMatch[1]) }
    if (method === 'PATCH') return { handler: patchMerchantFileSubmission, params }
  }

  if (pathname === '/api/matching') {
    if (method === 'GET') return { handler: getMatching }
  }

  if (pathname === '/api/matching/run') {
    if (method === 'POST') return { handler: runMatching }
  }

  if (pathname === '/api/matching/manual') {
    if (method === 'POST') return { handler: postManualMatching }
    if (method === 'DELETE') return { handler: deleteManualMatching }
  }

  if (pathname === '/api/matching/notify') {
    if (method === 'POST') return { handler: notifyMatching }
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
