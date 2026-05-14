import type { Activity, ActivityType, EntityType, LenderInfo, FormData, Lead, LeadNote, SalesRepresentative, Document, DocType, Stipulation, LenderMatch, Task, Funding, BrokerRevenue, SalesRepCommission, MerchantFileSubmission, SavedView, SearchResults, PaginatedResponse, SavedViewEntityType, UserProfile, UserRole, Renewal, PayoffRequest, OverviewReport, PipelineReport, FundingReport, LeadReport, LenderReport, RevenueReport, CommissionReport, RenewalReport, TaskReport, LenderDashboardAnalytics, AuditLog, CommunicationPreference, MessageTemplate, Campaign, CommunicationEvent, RecipientPreview, CommunicationEntityType } from '../../types'

function headers(extra?: HeadersInit): HeadersInit {
  return {
    'Content-Type': 'application/json',
    ...extra,
  }
}

async function uploadRequest<T>(url: string, body: globalThis.FormData): Promise<T> {
  const res = await fetch(url, { method: 'POST', body })
  if (!res.ok) throw new Error(await res.text())
  return await res.json() as T
}

async function request<T>(url: string, init?: RequestInit): Promise<T> {
  const res = await fetch(url, { ...init, headers: headers(init?.headers) })
  if (!res.ok) throw new Error(await res.text())
  if (res.status === 204) return undefined as T
  return await res.json() as T
}

function toQuery(params?: Record<string, string | number | boolean | null | undefined>): string {
  if (!params) return ''
  return new URLSearchParams(
    Object.entries(params)
      .filter((entry): entry is [string, string | number | boolean] => entry[1] !== undefined && entry[1] !== null && String(entry[1]).length > 0)
      .map(([key, value]) => [key, String(value)])
  ).toString()
}

export const api = {

  communications: {
    preferences: (entityType: CommunicationEntityType, entityId: string) => request<CommunicationPreference>(`/api/communications/preferences?entity_type=${encodeURIComponent(entityType)}&entity_id=${encodeURIComponent(entityId)}`),
    updatePreferences: (data: Partial<CommunicationPreference> & { entity_type: CommunicationEntityType; entity_id: string }) => request<CommunicationPreference>('/api/communications/preferences', { method: 'PATCH', body: JSON.stringify(data) }),
    history: (entityType: CommunicationEntityType, entityId: string) => request<CommunicationEvent[]>(`/api/communications/history?entity_type=${encodeURIComponent(entityType)}&entity_id=${encodeURIComponent(entityId)}`),
    sendEmail: (data: { entity_type: CommunicationEntityType; entity_id: string; subject: string; body: string; category?: 'transactional' | 'campaign'; to?: string }) => request<{ ok: boolean; provider: string; provider_message_id?: string | null; error?: string }>('/api/communications/send-email', { method: 'POST', body: JSON.stringify(data) }),
    templates: {
      list: () => request<MessageTemplate[]>('/api/communications/templates'),
      create: (data: Pick<MessageTemplate, 'name' | 'channel' | 'category' | 'body'> & Partial<Pick<MessageTemplate, 'subject' | 'variables' | 'is_active'>>) => request<MessageTemplate>('/api/communications/templates', { method: 'POST', body: JSON.stringify(data) }),
      update: (id: string, data: Partial<Pick<MessageTemplate, 'name' | 'channel' | 'category' | 'subject' | 'body' | 'variables' | 'is_active'>>) => request<MessageTemplate>(`/api/communications/templates/${id}`, { method: 'PATCH', body: JSON.stringify(data) }),
      disable: (id: string) => request<{ success: boolean }>(`/api/communications/templates/${id}`, { method: 'DELETE' }),
    },
    campaigns: {
      list: () => request<Campaign[]>('/api/communications/campaigns'),
      create: (data: { name: string; subject?: string | null; body?: string | null; template_id?: string | null; metadata?: Record<string, unknown> }) => request<Campaign>('/api/communications/campaigns', { method: 'POST', body: JSON.stringify({ ...data, channel: 'email' }) }),
      get: (id: string) => request<Campaign>(`/api/communications/campaigns/${id}`),
      update: (id: string, data: Partial<Campaign>) => request<Campaign>(`/api/communications/campaigns/${id}`, { method: 'PATCH', body: JSON.stringify(data) }),
      previewRecipients: (id: string, data: { entity_type: 'lead' | 'merchant'; entity_ids?: string[] }) => request<RecipientPreview>(`/api/communications/campaigns/${id}/preview-recipients`, { method: 'POST', body: JSON.stringify(data) }),
      send: (id: string, data: { entity_type: 'lead' | 'merchant'; entity_ids?: string[] }) => request<{ sent: number; failed: number; skipped: number; total: number; details: Array<{ entity_id: string; status: string; reason?: string }> }>(`/api/communications/campaigns/${id}/send`, { method: 'POST', body: JSON.stringify(data) }),
    },
  },
  settings: {
    me: () => request<UserProfile>('/api/settings/me'),
    changePassword: (data: { current_password: string; new_password: string }) => request<{ success: boolean }>('/api/settings/me/password', { method: 'PATCH', body: JSON.stringify(data) }),
  },
  reports: {
    overview: (params?: Record<string, string | number | boolean | null | undefined>) => request<OverviewReport>(`/api/reports/overview${toQuery(params) ? `?${toQuery(params)}` : ''}`),
    pipeline: (params?: Record<string, string | number | boolean | null | undefined>) => request<PipelineReport>(`/api/reports/pipeline${toQuery(params) ? `?${toQuery(params)}` : ''}`),
    funding: (params?: Record<string, string | number | boolean | null | undefined>) => request<FundingReport>(`/api/reports/funding${toQuery(params) ? `?${toQuery(params)}` : ''}`),
    leads: (params?: Record<string, string | number | boolean | null | undefined>) => request<LeadReport>(`/api/reports/leads${toQuery(params) ? `?${toQuery(params)}` : ''}`),
    lenders: (params?: Record<string, string | number | boolean | null | undefined>) => request<LenderReport>(`/api/reports/lenders${toQuery(params) ? `?${toQuery(params)}` : ''}`),
    revenue: (params?: Record<string, string | number | boolean | null | undefined>) => request<RevenueReport>(`/api/reports/revenue${toQuery(params) ? `?${toQuery(params)}` : ''}`),
    commissions: (params?: Record<string, string | number | boolean | null | undefined>) => request<CommissionReport>(`/api/reports/commissions${toQuery(params) ? `?${toQuery(params)}` : ''}`),
    renewals: (params?: Record<string, string | number | boolean | null | undefined>) => request<RenewalReport>(`/api/reports/renewals${toQuery(params) ? `?${toQuery(params)}` : ''}`),
    tasks: (params?: Record<string, string | number | boolean | null | undefined>) => request<TaskReport>(`/api/reports/tasks${toQuery(params) ? `?${toQuery(params)}` : ''}`),
  },
  lenderDashboard: {
    analytics: () => request<LenderDashboardAnalytics>('/api/lender-dashboard/analytics'),
  },
  auditLogs: {
    list: (params?: Record<string, string | number | boolean | null | undefined>) => request<PaginatedResponse<AuditLog>>(`/api/audit-logs${toQuery(params) ? `?${toQuery(params)}` : ''}`),
    reportExport: (data: { report_type: string; row_count: number }) => request<{ success: boolean }>('/api/audit/report-export', { method: 'POST', body: JSON.stringify(data) }),
  },
  adminUsers: {
    list: (params?: { role?: UserRole | ''; is_disabled?: string; status?: string; search?: string }) => {
      const qs = toQuery(params)
      return request<UserProfile[]>(`/api/admin/users${qs ? `?${qs}` : ''}`)
    },
    get: (id: string) => request<UserProfile>(`/api/admin/users/${id}`),
    createSalesRep: (data: { email: string; password: string; full_name: string }) => request<UserProfile>('/api/admin/users', { method: 'POST', body: JSON.stringify(data) }),
    update: (id: string, data: { email?: string; role?: UserRole; full_name?: string | null }) => request<UserProfile>(`/api/admin/users/${id}`, { method: 'PATCH', body: JSON.stringify(data) }),
    resetPassword: (id: string, new_password: string) => request<{ success: boolean }>(`/api/admin/users/${id}/reset-password`, { method: 'POST', body: JSON.stringify({ new_password }) }),
    disable: (id: string, reason?: string) => request<{ success: boolean }>(`/api/admin/users/${id}/disable`, { method: 'POST', body: JSON.stringify({ reason }) }),
    reactivate: (id: string) => request<{ success: boolean }>(`/api/admin/users/${id}/reactivate`, { method: 'POST' }),
    close: (id: string, reason?: string) => request<{ success: boolean }>(`/api/admin/users/${id}/close`, { method: 'POST', body: JSON.stringify({ reason }) }),
  },
  search: {
    global: (q: string) => request<SearchResults>(`/api/search?q=${encodeURIComponent(q)}`),
  },
  savedViews: {
    list: (entityType?: SavedViewEntityType) => request<SavedView[]>(`/api/saved-views${entityType ? `?entity_type=${encodeURIComponent(entityType)}` : ''}`),
    create: (data: Pick<SavedView, 'name' | 'entity_type'> & Partial<Pick<SavedView, 'filters' | 'sort' | 'is_shared'>>) => request<SavedView>('/api/saved-views', { method: 'POST', body: JSON.stringify(data) }),
    update: (id: string, data: Partial<Pick<SavedView, 'name' | 'entity_type' | 'filters' | 'sort' | 'is_shared'>>) => request<SavedView>(`/api/saved-views/${id}`, { method: 'PATCH', body: JSON.stringify(data) }),
    delete: (id: string) => request<{ success: boolean }>(`/api/saved-views/${id}`, { method: 'DELETE' }),
  },
  users: {
    salesReps: () => request<SalesRepresentative[]>('/api/users/sales-reps'),
  },
  merchants: {
    list: () => request<FormData[]>('/api/merchants'),
    listFiltered: (params: Record<string, string | number | boolean | null | undefined>) => {
      const qs = toQuery(params)
      return request<PaginatedResponse<FormData>>(`/api/merchants${qs ? `?${qs}` : ''}`)
    },
    create: (merchant: FormData) => request<FormData>('/api/merchants', { method: 'POST', body: JSON.stringify(merchant) }),
    update: (merchant: FormData) => request<FormData>(`/api/merchants/${merchant.id}`, { method: 'PATCH', body: JSON.stringify(merchant) }),
    get: (id: string) => request<FormData>(`/api/merchants/${id}`),
  },
  lenders: {
    list: () => request<LenderInfo[]>('/api/lenders'),
    listFiltered: (params: Record<string, string | number | boolean | null | undefined>) => {
      const qs = toQuery(params)
      return request<PaginatedResponse<LenderInfo>>(`/api/lenders${qs ? `?${qs}` : ''}`)
    },
    get: (id: string) => request<LenderInfo>(`/api/lenders/${id}`),
    create: (lender: LenderInfo) => request<LenderInfo>('/api/lenders', { method: 'POST', body: JSON.stringify(lender) }),
    update: (lender: LenderInfo) => request<LenderInfo>(`/api/lenders/${lender.id}`, { method: 'PATCH', body: JSON.stringify(lender) }),
  },
  offers: {
    create: (merchantId: string, offer: FormData['offers'][number]) => request<FormData['offers'][number]>('/api/offers', { method: 'POST', body: JSON.stringify({ ...offer, merchantId }) }),
    update: (offerId: string, status: 'Accepted' | 'Rejected') => request<FormData['offers'][number]>(`/api/offers/${offerId}`, { method: 'PATCH', body: JSON.stringify({ status }) }),
  },
  leads: {
    list: () => request<Lead[]>('/api/leads'),
    listFiltered: (params: Record<string, string | number | boolean | null | undefined>) => {
      const qs = toQuery(params)
      return request<PaginatedResponse<Lead>>(`/api/leads${qs ? `?${qs}` : ''}`)
    },
    create: (lead: Partial<Lead> & { initial_note?: string }) => request<Lead>('/api/leads', { method: 'POST', body: JSON.stringify(lead) }),
    get: (id: string) => request<Lead>(`/api/leads/${id}`),
    update: (lead: Partial<Lead> & { id: string }) => request<Lead>(`/api/leads/${lead.id}`, { method: 'PATCH', body: JSON.stringify(lead) }),
    addNote: (leadId: string, body: string) => request<LeadNote>(`/api/leads/${leadId}/notes`, { method: 'POST', body: JSON.stringify({ body }) }),
    convert: (leadId: string) => request<{ merchant_id: string }>(`/api/leads/${leadId}/convert`, { method: 'POST' }),
  },
  documents: {
    list: (merchantId: string) => request<Document[]>(`/api/documents?merchant_id=${encodeURIComponent(merchantId)}`),
    upload: (merchantId: string, docType: DocType, file: File, stipulationId?: string, payoffRequestId?: string) => {
      const body = new globalThis.FormData()
      body.append('file', file)
      body.append('merchant_id', merchantId)
      body.append('doc_type', docType)
      if (stipulationId) body.append('stipulation_id', stipulationId)
      if (payoffRequestId) body.append('payoff_request_id', payoffRequestId)
      return uploadRequest<Document>('/api/documents/upload', body)
    },
    delete: (id: string) => request<{ success: boolean }>(`/api/documents/${id}`, { method: 'DELETE' }),
  },
  stipulations: {
    list: (merchantId: string) => request<Stipulation[]>(`/api/stipulations?merchant_id=${encodeURIComponent(merchantId)}`),
    create: (merchantId: string, lenderId: string, description: string) => request<Stipulation>('/api/stipulations', { method: 'POST', body: JSON.stringify({ merchant_id: merchantId, lender_id: lenderId, description }) }),
  },
  activities: {
    list: (entityType: EntityType, entityId: string) => request<Activity[]>(`/api/activities?entity_type=${encodeURIComponent(entityType)}&entity_id=${encodeURIComponent(entityId)}`),
    create: (data: { entity_type: EntityType; entity_id: string; activity_type: Extract<ActivityType, 'note' | 'call'>; body: string }) => request<Activity>('/api/activities', { method: 'POST', body: JSON.stringify(data) }),
  },
  tasks: {
    list: (params?: { entity_type?: EntityType; entity_id?: string }) => {
      const qs = toQuery(params)
      return request<Task[]>(`/api/tasks${qs ? `?${qs}` : ''}`)
    },
    listFiltered: (params: Record<string, string | number | boolean | null | undefined>) => {
      const qs = toQuery(params)
      return request<PaginatedResponse<Task>>(`/api/tasks${qs ? `?${qs}` : ''}`)
    },
    create: (data: Pick<Task, 'entity_type' | 'entity_id' | 'title'> & Partial<Pick<Task, 'description' | 'priority' | 'assigned_to' | 'due_at'>>) => request<Task>('/api/tasks', { method: 'POST', body: JSON.stringify(data) }),
    update: (id: string, data: Partial<Pick<Task, 'status' | 'title' | 'description' | 'priority' | 'assigned_to' | 'due_at'>>) => request<Task>(`/api/tasks/${id}`, { method: 'PATCH', body: JSON.stringify(data) }),
    delete: (id: string) => request<{ success: boolean }>(`/api/tasks/${id}`, { method: 'DELETE' }),
  },
  fundings: {
    list: (params?: { merchant_id?: string }) => {
      const qs = params?.merchant_id ? `?merchant_id=${encodeURIComponent(params.merchant_id)}` : ''
      return request<Funding[]>(`/api/fundings${qs}`)
    },
    listFiltered: (params: Record<string, string | number | boolean | null | undefined>) => {
      const qs = toQuery(params)
      return request<PaginatedResponse<Funding>>(`/api/fundings${qs ? `?${qs}` : ''}`)
    },
    create: (data: Partial<Funding> & { merchant_id: string; funded_amount: number | string; broker_revenue_amount?: number | string | null; broker_revenue_rate?: number | string | null; sales_rep_commission_amount?: number | string | null; sales_rep_commission_rate?: number | string | null }) => request<Funding>('/api/fundings', { method: 'POST', body: JSON.stringify(data) }),
    get: (id: string) => request<Funding>(`/api/fundings/${id}`),
    update: (id: string, data: Partial<Funding>) => request<Funding>(`/api/fundings/${id}`, { method: 'PATCH', body: JSON.stringify(data) }),
  },
  renewals: {
    list: (params?: Record<string, string | number | boolean | null | undefined>) => {
      const qs = toQuery(params)
      return request<Renewal[]>(`/api/renewals${qs ? `?${qs}` : ''}`)
    },
    listFiltered: (params: Record<string, string | number | boolean | null | undefined>) => {
      const qs = toQuery(params)
      return request<PaginatedResponse<Renewal>>(`/api/renewals${qs ? `?${qs}` : ''}`)
    },
    create: (data: Partial<Renewal> & { merchant_id: string; eligibility_date: string }) => request<Renewal>('/api/renewals', { method: 'POST', body: JSON.stringify(data) }),
    get: (id: string) => request<Renewal>(`/api/renewals/${id}`),
    update: (id: string, data: Partial<Renewal>) => request<Renewal>(`/api/renewals/${id}`, { method: 'PATCH', body: JSON.stringify(data) }),
    requestReview: (id: string) => request<{ success: boolean }>(`/api/renewals/${id}/request-review`, { method: 'POST' }),
  },
  payoffRequests: {
    list: (params?: Record<string, string | number | boolean | null | undefined>) => {
      const qs = toQuery(params)
      return request<PayoffRequest[]>(`/api/payoff-requests${qs ? `?${qs}` : ''}`)
    },
    create: (data: Partial<PayoffRequest> & { merchant_id: string }) => request<PayoffRequest>('/api/payoff-requests', { method: 'POST', body: JSON.stringify(data) }),
    get: (id: string) => request<PayoffRequest>(`/api/payoff-requests/${id}`),
    update: (id: string, data: Partial<PayoffRequest>) => request<PayoffRequest>(`/api/payoff-requests/${id}`, { method: 'PATCH', body: JSON.stringify(data) }),
  },
  brokerRevenue: {
    list: (params?: { funding_id?: string; merchant_id?: string }) => {
      const qs = params ? new URLSearchParams(Object.entries(params).filter((entry): entry is [string, string] => typeof entry[1] === 'string' && entry[1].length > 0)).toString() : ''
      return request<BrokerRevenue[]>(`/api/broker-revenue${qs ? `?${qs}` : ''}`)
    },
    create: (data: Partial<BrokerRevenue> & { amount: number | string }) => request<BrokerRevenue>('/api/broker-revenue', { method: 'POST', body: JSON.stringify(data) }),
    update: (id: string, data: Partial<BrokerRevenue>) => request<BrokerRevenue>(`/api/broker-revenue/${id}`, { method: 'PATCH', body: JSON.stringify(data) }),
  },
  salesRepCommissions: {
    list: (params?: { funding_id?: string }) => {
      const qs = params?.funding_id ? `?funding_id=${encodeURIComponent(params.funding_id)}` : ''
      return request<SalesRepCommission[]>(`/api/sales-rep-commissions${qs}`)
    },
    create: (data: Partial<SalesRepCommission> & { sales_rep_id: string; amount: number | string }) => request<SalesRepCommission>('/api/sales-rep-commissions', { method: 'POST', body: JSON.stringify(data) }),
    update: (id: string, data: Partial<SalesRepCommission>) => request<SalesRepCommission>(`/api/sales-rep-commissions/${id}`, { method: 'PATCH', body: JSON.stringify(data) }),
  },
  merchantFileSubmissions: {
    list: (params: { merchant_id: string }) => request<MerchantFileSubmission[]>(`/api/merchant-file-submissions?merchant_id=${encodeURIComponent(params.merchant_id)}`),
    create: (data: { merchant_id: string; lender_id: string; match_id?: string | null; notes?: string | null }) => request<MerchantFileSubmission>('/api/merchant-file-submissions', { method: 'POST', body: JSON.stringify(data) }),
    update: (id: string, data: Partial<Pick<MerchantFileSubmission, 'status' | 'decline_reason' | 'notes'>>) => request<MerchantFileSubmission>(`/api/merchant-file-submissions/${id}`, { method: 'PATCH', body: JSON.stringify(data) }),
  },
  matching: {
    list: (merchantId: string) => request<LenderMatch[]>(`/api/matching?merchant_id=${encodeURIComponent(merchantId)}`),
    run: (merchantId: string) => request<{ matched: number; matches: LenderMatch[] }>('/api/matching/run', { method: 'POST', body: JSON.stringify({ merchant_id: merchantId }) }),
    addManual: (merchantId: string, lenderId: string) => request<LenderMatch>('/api/matching/manual', { method: 'POST', body: JSON.stringify({ merchant_id: merchantId, lender_id: lenderId }) }),
    removeManual: (merchantId: string, lenderId: string) => request<{ success: boolean }>('/api/matching/manual', { method: 'DELETE', body: JSON.stringify({ merchant_id: merchantId, lender_id: lenderId }) }),
    notify: (merchantId: string) => request<{ notified: number; notified_at: string }>('/api/matching/notify', { method: 'POST', body: JSON.stringify({ merchant_id: merchantId }) }),
  },
}
