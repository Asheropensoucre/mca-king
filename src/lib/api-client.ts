import type { LenderInfo, FormData, Lead, LeadNote, SalesRepresentative, Document, DocType, Stipulation } from '../../types'

export type DemoRole = 'admin' | 'sales_rep' | 'merchant' | 'lender'

export type DemoIdentity = {
  role: DemoRole
  userId: string
  email?: string
  name?: string
}

const defaultIdentity: DemoIdentity = {
  role: 'admin',
  userId: '00000000-0000-4000-8000-000000000001',
  email: 'admin@demo.local',
  name: 'Demo Admin',
}

export const DEMO_SALES_REPS: SalesRepresentative[] = [
  { id: '00000000-0000-4000-8000-000000000101', name: 'Alex Johnson', email: 'alex.j@mcaking.com' },
  { id: '00000000-0000-4000-8000-000000000102', name: 'Brenda Chen', email: 'brenda.c@mcaking.com' },
  { id: '00000000-0000-4000-8000-000000000103', name: 'Carlos Diaz', email: 'carlos.d@mcaking.com' },
]

let currentIdentity = defaultIdentity

export function setDemoIdentity(identity: DemoIdentity): void {
  currentIdentity = identity
}

export function getDemoIdentity(): DemoIdentity {
  return currentIdentity
}

function authHeaders(): HeadersInit {
  return {
    'x-demo-role': currentIdentity.role,
    'x-demo-user-id': currentIdentity.userId,
    'x-demo-email': currentIdentity.email ?? `${currentIdentity.userId}@demo.local`,
    'x-demo-name': currentIdentity.name ?? currentIdentity.userId,
  }
}

function headers(extra?: HeadersInit): HeadersInit {
  return {
    'Content-Type': 'application/json',
    ...authHeaders(),
    ...extra,
  }
}


async function uploadRequest<T>(url: string, body: globalThis.FormData): Promise<T> {
  const res = await fetch(url, { method: 'POST', headers: authHeaders(), body })
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
}
