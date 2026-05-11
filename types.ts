export interface OwnerInfo {
  id: string;
  name: string;
  homeAddress: string;
  signature: string;
  ownership: string;
  title: string;
  cellPhone: string;
  dateOfBirth: string;
  ssn: string;
  email: string;
  creditScore: string;
}

export interface BusinessInfo {
  legalName: string;
  dbaName: string;
  address: string;
  monthlyRevenue: string;
  phone: string;
  taxId: string;
  startDate: string;
  industryType: string;
  entityType: string;
  recentNSFs: string;
}

export interface Agreements {
    creditAuth: boolean;
    signatureDataUrl: string;
    ipAddress: string;
    geolocation: { latitude: number; longitude: number; } | null;
}

export interface DocumentInfo {
    name: string;
    type: string;
    size: number;
}

export interface Offer {
  id?: string;
  lenderId: string;
  lenderName: string;
  amount: string;
  rate?: string;
  term: string;
  status: 'Pending' | 'Accepted' | 'Rejected';
  notes?: string;
}

export type ApplicationStatus =
  | 'application & 3 months bank statements in'
  | 'sent to lender'
  | 'all lenders decline'
  | "one or more lender's sent offer"
  | 'Merchant accepts offer'
  | "Merchant Declines Offer's"
  | 'more docs requested'
  | 'contract sent'
  | 'contract signed'
  | 'contract declined by the merchant'
  | 'Declined by funder'
  | 'FUNDED';


export interface FormData {
  id: string;
  businessInfo: BusinessInfo;
  owners: OwnerInfo[];
  agreements: Agreements;
  documents: DocumentInfo[];
  status: ApplicationStatus;
  offers: Offer[];
  requestedAmount: string;
  salesRepId?: string;
  matchedLenderIds?: string[];
}

export interface LenderInfo {
  id: string;
  lenderName: string;
  positions: string;
  longestTerm: string;
  maxFundingAmount: string;
  minRevenue: string;
  minCreditScore: string;
  industryRestrictions: string;
  nsfs: string;
  timeInBusiness: string;
  stateRestrictions: string;
  isoRep: string;
  cell: string;
  email: string;
  notes: string;
  buyRate: string;
  fees: string;
  trucking: 'Yes' | 'No' | '';
}

export type UserRole = 'admin' | 'sales_rep' | 'merchant' | 'lender';

export interface AuthUser {
  id: string;
  email: string;
  role: UserRole;
  full_name?: string | null;
  name?: string | null;
}

export interface SalesRepresentative {
  id: string;
  name: string;
  email: string;
}

export type LeadStatus = 'new' | 'contacted' | 'docs_requested' | 'converted' | 'dead';

export interface LeadNote {
  id: string;
  lead_id: string;
  written_by: string;
  body: string;
  created_at: string;
  author_name?: string;
}

export interface Lead {
  id: string;
  created_by: string;
  assigned_rep_id: string | null;
  business_name: string;
  owner_name: string | null;
  phone: string | null;
  email: string | null;
  state: string | null;
  status: LeadStatus;
  converted_to: string | null;
  created_at: string;
  updated_at: string;
  latest_note?: LeadNote | null;
  notes?: LeadNote[];
}
export type DocType = 'bank_statement' | 'contract' | 'stipulation' | 'id' | 'other';

export interface Document {
  id: string;
  merchant_id: string;
  uploaded_by: string;
  doc_type: DocType;
  file_name: string;
  storage_path: string;
  uploaded_at: string;
  signed_url?: string;
}

export interface Stipulation {
  id: string;
  merchant_id: string;
  lender_id: string;
  requested_by: string;
  description: string;
  is_fulfilled: boolean;
  fulfilled_at: string | null;
  created_at: string;
}
