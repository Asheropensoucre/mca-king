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
  assignedRep?: SalesRepresentative | null;
  matchedLenderIds?: string[];
  updated_at?: string;
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

export interface LenderMatch {
  id: string;
  merchant_id: string;
  lender_id: string;
  match_type: 'auto' | 'manual';
  matched_by: string | null;
  notified_at: string | null;
  created_at: string;
  lender?: {
    id: string;
    company_name: string;
    contact_name: string | null;
    contact_email: string;
  } | null;
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
export type EntityType = 'lead' | 'merchant' | 'lender' | 'offer' | 'document' | 'stipulation' | 'user' | 'funding';
export type ActivityType = 'note' | 'call' | 'email' | 'status_change' | 'upload' | 'match' | 'offer' | 'task' | 'system';
export type TaskPriority = 'low' | 'normal' | 'high' | 'urgent';
export type TaskStatus = 'open' | 'completed' | 'cancelled';

export interface Activity {
  id: string;
  entity_type: EntityType;
  entity_id: string;
  user_id: string | null;
  activity_type: ActivityType;
  body: string | null;
  metadata: Record<string, unknown>;
  created_at: string;
  author_name?: string;
}

export interface Task {
  id: string;
  assigned_to: string | null;
  created_by: string;
  entity_type: EntityType;
  entity_id: string;
  title: string;
  description: string | null;
  priority: TaskPriority;
  status: TaskStatus;
  due_at: string | null;
  completed_at: string | null;
  created_at: string;
  updated_at: string;
  assignee_name?: string;
  entity_name?: string;
}

export type MerchantFileSubmissionStatus = 'submitted' | 'viewed' | 'no_response' | 'declined' | 'offer_received' | 'stips_requested' | 'withdrawn';

export interface MerchantFileSubmission {
  id: string;
  merchant_id: string;
  lender_id: string;
  match_id: string | null;
  submitted_by: string | null;
  submitted_at: string;
  status: MerchantFileSubmissionStatus;
  response_at: string | null;
  decline_reason: string | null;
  package_version: number;
  notes: string | null;
  created_at: string;
  updated_at: string;
  merchant_name?: string;
  lender_name?: string;
  lender_contact_name?: string | null;
  lender_contact_email?: string | null;
}

export type PaymentFrequency = 'daily' | 'weekly' | 'biweekly' | 'monthly';
export type FundingType = 'first_funding' | 'renewal' | 'additional_funding';
export type BrokerRevenueType = 'commission' | 'points' | 'origination_fee' | 'bonus' | 'other';
export type BrokerRevenueStatus = 'expected' | 'invoiced' | 'received' | 'short_paid' | 'disputed' | 'waived';
export type CommissionBasisType = 'broker_revenue' | 'funded_amount' | 'flat';
export type SalesRepCommissionStatus = 'unpaid' | 'approved' | 'paid' | 'adjusted' | 'clawed_back' | 'void';

export interface Funding {
  id: string;
  merchant_id: string;
  lender_id: string | null;
  offer_id: string | null;
  funded_amount: number | string;
  payback_amount: number | string | null;
  factor_rate: number | string | null;
  buy_rate: number | string | null;
  sell_rate: number | string | null;
  payment_frequency: PaymentFrequency | null;
  term_days: number | null;
  funded_at: string;
  funding_type: FundingType;
  renewal_number: number;
  funding_position: number;
  created_by: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
  merchant_name?: string;
  lender_name?: string;
}

export interface BrokerRevenue {
  id: string;
  funding_id: string | null;
  merchant_id: string | null;
  lender_id: string | null;
  revenue_type: BrokerRevenueType;
  basis_amount: number | string | null;
  rate: number | string | null;
  amount: number | string;
  status: BrokerRevenueStatus;
  expected_payment_date: string | null;
  received_at: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
  merchant_name?: string;
  lender_name?: string;
}

export interface SalesRepCommission {
  id: string;
  funding_id: string | null;
  sales_rep_id: string | null;
  basis_type: CommissionBasisType;
  basis_amount: number | string | null;
  rate: number | string | null;
  amount: number | string;
  status: SalesRepCommissionStatus;
  paid_at: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
  merchant_name?: string;
  sales_rep_name?: string;
}

export type RenewalStatus = 'not_ready' | 'eligible' | 'contacted' | 'application_started' | 'submitted' | 'renewed' | 'declined' | 'not_interested';

export interface Renewal {
  id: string;
  merchant_id: string;
  funding_id: string | null;
  eligibility_date: string;
  status: RenewalStatus;
  estimated_balance: number | string | null;
  payoff_amount: number | string | null;
  assigned_rep_id: string | null;
  last_contacted_at: string | null;
  next_follow_up_at: string | null;
  notes: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
  merchant_name?: string;
  lender_name?: string | null;
  funded_amount?: number | string | null;
  funded_at?: string | null;
  assigned_rep_name?: string | null;
  is_eligible?: boolean;
}

export type PayoffRequestStatus = 'requested' | 'received' | 'expired' | 'used' | 'cancelled';

export interface PayoffRequest {
  id: string;
  merchant_id: string;
  funding_id: string | null;
  renewal_id: string | null;
  requested_from_lender_id: string | null;
  requested_from_name: string | null;
  payoff_amount: number | string | null;
  requested_at: string;
  received_at: string | null;
  expires_at: string | null;
  file_document_id: string | null;
  status: PayoffRequestStatus;
  notes: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
  merchant_name?: string;
  document_name?: string | null;
  funding_lender_id?: string | null;
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

export type SavedViewEntityType = 'merchants' | 'leads' | 'lenders' | 'tasks' | 'fundings';

export interface SavedView {
  id: string;
  user_id: string;
  name: string;
  entity_type: SavedViewEntityType;
  filters: Record<string, string>;
  sort: { field?: string; direction?: 'asc' | 'desc' };
  is_shared: boolean;
  created_at: string;
  updated_at: string;
}

export interface SearchResults {
  merchants: Array<{ id: string; business_name: string; status: string; state: string | null; assigned_rep_id?: string | null }>;
  leads: Array<{ id: string; business_name: string; owner_name: string | null; status: string; assigned_rep_id?: string | null }>;
  lenders: Array<{ id: string; company_name: string; contact_name: string | null; contact_email: string }>;
  query: string;
}

export interface UserProfile {
  id: string;
  email: string;
  role: UserRole;
  full_name: string | null;
  is_disabled: boolean;
  disabled_at: string | null;
  closed_at: string | null;
  last_login_at: string | null;
  created_at: string;
}

export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  per_page: number;
}

export interface ReportDateRange {
  from: string;
  to: string;
  label: string;
}

export interface ReportMetric {
  label: string;
  value: number | string;
  helper?: string;
  trend?: number | null;
}

export interface ReportBreakdownRow {
  key: string;
  label: string;
  count: number;
  amount?: number;
  percent?: number;
}

export interface ReportSeriesPoint {
  period: string;
  count: number;
  amount?: number;
}

export interface ReportDrilldownRow {
  id: string;
  label: string;
  secondary?: string | null;
  status?: string | null;
  amount?: number | string | null;
  date?: string | null;
  metadata?: Record<string, string | number | null | undefined>;
}

export interface OverviewReport {
  range: ReportDateRange;
  metrics: {
    total_leads: number;
    converted_leads: number;
    total_merchants: number;
    funded_deals: number;
    funded_volume: number;
    average_funding_amount: number;
    lead_conversion_rate: number;
    offer_to_funded_rate: number;
    broker_revenue_expected: number;
    broker_revenue_received: number;
    commissions_unpaid: number;
    overdue_tasks: number;
    eligible_renewals: number;
  };
  funding_series: ReportSeriesPoint[];
  pipeline_breakdown: ReportBreakdownRow[];
  top_reps: ReportBreakdownRow[];
  top_lenders: ReportBreakdownRow[];
}

export interface PipelineReport {
  range: ReportDateRange;
  metrics: Record<string, number>;
  by_status: ReportBreakdownRow[];
  by_rep: ReportBreakdownRow[];
  stale_deals: ReportDrilldownRow[];
}

export interface FundingReport {
  range: ReportDateRange;
  metrics: Record<string, number>;
  series: ReportSeriesPoint[];
  by_rep: ReportBreakdownRow[];
  by_lender: ReportBreakdownRow[];
  by_funding_type: ReportBreakdownRow[];
  by_position: ReportBreakdownRow[];
  rows: ReportDrilldownRow[];
}

export interface LeadReport {
  range: ReportDateRange;
  metrics: Record<string, number>;
  by_status: ReportBreakdownRow[];
  by_rep: ReportBreakdownRow[];
  series: ReportSeriesPoint[];
  rows: ReportDrilldownRow[];
}

export interface LenderReport {
  range: ReportDateRange;
  metrics: Record<string, number>;
  rows: ReportDrilldownRow[];
}

export interface RevenueReport {
  range: ReportDateRange;
  metrics: Record<string, number>;
  by_status: ReportBreakdownRow[];
  by_lender: ReportBreakdownRow[];
  aging: ReportBreakdownRow[];
  rows: ReportDrilldownRow[];
}

export interface CommissionReport {
  range: ReportDateRange;
  metrics: Record<string, number>;
  by_status: ReportBreakdownRow[];
  by_rep: ReportBreakdownRow[];
  aging: ReportBreakdownRow[];
  rows: ReportDrilldownRow[];
}

export interface RenewalReport {
  range: ReportDateRange;
  metrics: Record<string, number>;
  by_status: ReportBreakdownRow[];
  by_rep: ReportBreakdownRow[];
  rows: ReportDrilldownRow[];
}

export interface TaskReport {
  range: ReportDateRange;
  metrics: Record<string, number>;
  by_status: ReportBreakdownRow[];
  by_rep: ReportBreakdownRow[];
  by_priority: ReportBreakdownRow[];
  rows: ReportDrilldownRow[];
}

export interface LenderDashboardAnalytics {
  metrics: {
    files_sent: number;
    pending_review: number;
    offers_sent: number;
    declines: number;
    funded_deals: number;
    total_funded: number;
    total_payback: number;
    average_funded: number;
    this_month_funded: number;
    last_90_days_funded: number;
    payoff_requests_pending: number;
  };
  recent_submissions: ReportDrilldownRow[];
  recent_fundings: ReportDrilldownRow[];
  pending_payoff_requests: ReportDrilldownRow[];
}

export interface AuditLog {
  id: string;
  user_id: string | null;
  action: string;
  entity_type: string | null;
  entity_id: string | null;
  ip_address: string | null;
  user_agent: string | null;
  metadata: Record<string, unknown>;
  created_at: string;
  user_name?: string | null;
  user_email?: string | null;
}

export type CommunicationEntityType = 'lead' | 'merchant' | 'contact' | 'user';
export type CommunicationChannel = 'email' | 'sms_future';
export type MessageTemplateCategory = 'transactional' | 'campaign';
export type CampaignStatus = 'draft' | 'scheduled' | 'sending' | 'completed' | 'cancelled' | 'failed';
export type CampaignRecipientStatus = 'pending' | 'skipped' | 'queued' | 'sent' | 'delivered' | 'bounced' | 'complained' | 'unsubscribed' | 'failed';

export interface CommunicationPreference {
  id: string;
  entity_type: CommunicationEntityType;
  entity_id: string;
  email: string | null;
  phone: string | null;
  email_opt_in: boolean;
  email_opt_out: boolean;
  email_opt_out_at: string | null;
  sms_opt_in: boolean;
  sms_opt_out: boolean;
  sms_opt_out_at: string | null;
  sms_consent_source: string | null;
  sms_consent_text: string | null;
  sms_consent_ip: string | null;
  sms_consent_at: string | null;
  do_not_contact: boolean;
  preferred_contact_method: string | null;
  created_at: string;
  updated_at: string;
}

export interface MessageTemplate {
  id: string;
  name: string;
  channel: CommunicationChannel;
  category: MessageTemplateCategory;
  subject: string | null;
  body: string;
  variables: string[];
  is_active: boolean;
  created_by: string | null;
  updated_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface CampaignRecipient {
  id: string;
  campaign_id: string;
  entity_type: CommunicationEntityType;
  entity_id: string;
  email: string | null;
  phone: string | null;
  status: CampaignRecipientStatus;
  skip_reason: string | null;
  provider: string | null;
  provider_message_id: string | null;
  sent_at: string | null;
  delivered_at: string | null;
  failed_at: string | null;
  metadata: Record<string, unknown>;
  created_at: string;
  updated_at: string;
}

export interface Campaign {
  id: string;
  name: string;
  channel: CommunicationChannel;
  category: MessageTemplateCategory;
  template_id: string | null;
  subject: string | null;
  body: string | null;
  status: CampaignStatus;
  created_by: string | null;
  scheduled_at: string | null;
  started_at: string | null;
  completed_at: string | null;
  metadata: Record<string, unknown>;
  created_at: string;
  updated_at: string;
  recipients?: CampaignRecipient[];
}

export interface CommunicationEvent {
  id: string;
  entity_type: CommunicationEntityType;
  entity_id: string;
  channel: 'email' | 'sms_future' | 'call' | 'system';
  communication_type: 'manual' | 'campaign' | 'transactional' | 'delivery_event' | 'call' | 'system';
  from_user_id: string | null;
  to_contact: string | null;
  subject: string | null;
  body_preview: string | null;
  status: string;
  provider: string | null;
  provider_message_id: string | null;
  campaign_id: string | null;
  campaign_recipient_id: string | null;
  metadata: Record<string, unknown>;
  created_at: string;
}

export interface RecipientPreviewRow {
  entity_type: CommunicationEntityType;
  entity_id: string;
  name: string;
  email: string | null;
  phone: string | null;
  sendable: boolean;
  skip_reason: string | null;
}

export interface RecipientPreview {
  total: number;
  sendable: number;
  skipped: number;
  suppressed: number;
  missing_email: number;
  do_not_contact: number;
  rows: RecipientPreviewRow[];
}
