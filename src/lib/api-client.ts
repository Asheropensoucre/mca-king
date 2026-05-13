import type { Activity, ActivityType, EntityType, LenderInfo, FormData, Lead, LeadNote, SalesRepresentative, Document, DocType, Stipulation, LenderMatch, Task } from '../../types'

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

export const api = {
  users: {
    salesReps: () => request<SalesRepresentative[]>('/api/users/sales-reps'),
  },
  merchants: {
    list: () => request<FormData[]>('/api/merchants'),
    create: (merchant: FormData) => request<FormData>('/api/merchants', { method: 'POST', body: JSON.stringify(merchant) }),
    update: (merchant: FormData) => request<FormData>(`/api/merchants/${merchant.id}`, { method: 'PATCH', body: JSON.stringify(merchant) }),
    get: (id: string) => request<FormData>(`/api/merchants/${id}`),
  },
  lenders: {
    list: () => request<LenderInfo[]>('/api/lenders'),
    create: (lender: LenderInfo) => request<LenderInfo>('/api/lenders', { method: 'POST', body: JSON.stringify(lender) }),
    update: (lender: LenderInfo) => request<LenderInfo>(`/api/lenders/${lender.id}`, { method: 'PATCH', body: JSON.stringify(lender) }),
  },
  offers: {
    create: (merchantId: string, offer: FormData['offers'][number]) => request<FormData['offers'][number]>('/api/offers', { method: 'POST', body: JSON.stringify({ ...offer, merchantId }) }),
    update: (offerId: string, status: 'Accepted' | 'Rejected') => request<FormData['offers'][number]>(`/api/offers/${offerId}`, { method: 'PATCH', body: JSON.stringify({ status }) }),
  },
  leads: {
    list: () => request<Lead[]>('/api/leads'),
    create: (lead: Partial<Lead> & { initial_note?: string }) => request<Lead>('/api/leads', { method: 'POST', body: JSON.stringify(lead) }),
    get: (id: string) => request<Lead>(`/api/leads/${id}`),
    update: (lead: Partial<Lead> & { id: string }) => request<Lead>(`/api/leads/${lead.id}`, { method: 'PATCH', body: JSON.stringify(lead) }),
    addNote: (leadId: string, body: string) => request<LeadNote>(`/api/leads/${leadId}/notes`, { method: 'POST', body: JSON.stringify({ body }) }),
    convert: (leadId: string) => request<{ merchant_id: string }>(`/api/leads/${leadId}/convert`, { method: 'POST' }),
  },
  documents: {
    list: (merchantId: string) => request<Document[]>(`/api/documents?merchant_id=${encodeURIComponent(merchantId)}`),
    upload: (merchantId: string, docType: DocType, file: File, stipulationId?: string) => {
      const body = new globalThis.FormData()
      body.append('file', file)
      body.append('merchant_id', merchantId)
      body.append('doc_type', docType)
      if (stipulationId) body.append('stipulation_id', stipulationId)
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
      const qs = params ? new URLSearchParams(Object.entries(params).filter((entry): entry is [string, string] => typeof entry[1] === 'string' && entry[1].length > 0)).toString() : ''
      return request<Task[]>(`/api/tasks${qs ? `?${qs}` : ''}`)
    },
    create: (data: Pick<Task, 'entity_type' | 'entity_id' | 'title'> & Partial<Pick<Task, 'description' | 'priority' | 'assigned_to' | 'due_at'>>) => request<Task>('/api/tasks', { method: 'POST', body: JSON.stringify(data) }),
    update: (id: string, data: Partial<Pick<Task, 'status' | 'title' | 'description' | 'priority' | 'assigned_to' | 'due_at'>>) => request<Task>(`/api/tasks/${id}`, { method: 'PATCH', body: JSON.stringify(data) }),
    delete: (id: string) => request<{ success: boolean }>(`/api/tasks/${id}`, { method: 'DELETE' }),
  },
  matching: {
    list: (merchantId: string) => request<LenderMatch[]>(`/api/matching?merchant_id=${encodeURIComponent(merchantId)}`),
    run: (merchantId: string) => request<{ matched: number; matches: LenderMatch[] }>('/api/matching/run', { method: 'POST', body: JSON.stringify({ merchant_id: merchantId }) }),
    addManual: (merchantId: string, lenderId: string) => request<LenderMatch>('/api/matching/manual', { method: 'POST', body: JSON.stringify({ merchant_id: merchantId, lender_id: lenderId }) }),
    removeManual: (merchantId: string, lenderId: string) => request<{ success: boolean }>('/api/matching/manual', { method: 'DELETE', body: JSON.stringify({ merchant_id: merchantId, lender_id: lenderId }) }),
    notify: (merchantId: string) => request<{ notified: number; notified_at: string }>('/api/matching/notify', { method: 'POST', body: JSON.stringify({ merchant_id: merchantId }) }),
  },
}
