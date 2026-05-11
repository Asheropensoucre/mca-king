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

export interface SalesRepresentative {
  id: string;
  name: string;
  email: string;
}
