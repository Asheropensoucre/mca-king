import type { RouteUser } from '../route-utils'

export type CommunicationEntityType = 'lead' | 'merchant' | 'contact' | 'user'
export type CommunicationChannel = 'email' | 'sms' | 'sms_future'
export type MessageTemplateCategory = 'transactional' | 'campaign'
export type CampaignStatus = 'draft' | 'scheduled' | 'sending' | 'completed' | 'cancelled' | 'failed'
export type CampaignRecipientStatus = 'pending' | 'skipped' | 'queued' | 'sent' | 'delivered' | 'bounced' | 'complained' | 'unsubscribed' | 'failed'

export type CommunicationPreference = {
  id: string
  entity_type: CommunicationEntityType
  entity_id: string
  email: string | null
  phone: string | null
  email_opt_in: boolean
  email_opt_out: boolean
  email_opt_out_at: string | null
  sms_opt_in: boolean
  sms_opt_out: boolean
  sms_opt_out_at: string | null
  sms_consent_source: string | null
  sms_consent_text: string | null
  sms_consent_ip: string | null
  sms_consent_at: string | null
  do_not_contact: boolean
  preferred_contact_method: string | null
  created_at: string
  updated_at: string
}

export type MessageTemplate = {
  id: string
  name: string
  channel: 'email' | 'sms_future'
  category: MessageTemplateCategory
  subject: string | null
  body: string
  variables: string[]
  is_active: boolean
  created_by: string | null
  updated_by: string | null
  created_at: string
  updated_at: string
}

export type Campaign = {
  id: string
  name: string
  channel: 'email' | 'sms_future'
  category: MessageTemplateCategory
  template_id: string | null
  subject: string | null
  body: string | null
  status: CampaignStatus
  created_by: string | null
  scheduled_at: string | null
  started_at: string | null
  completed_at: string | null
  metadata: Record<string, unknown>
  created_at: string
  updated_at: string
}

export type CampaignRecipient = {
  id: string
  campaign_id: string
  entity_type: CommunicationEntityType
  entity_id: string
  email: string | null
  phone: string | null
  status: CampaignRecipientStatus
  skip_reason: string | null
  provider: string | null
  provider_message_id: string | null
  sent_at: string | null
  delivered_at: string | null
  failed_at: string | null
  metadata: Record<string, unknown>
  created_at: string
  updated_at: string
}

export type CommunicationEvent = {
  id: string
  entity_type: CommunicationEntityType
  entity_id: string
  channel: 'email' | 'sms_future' | 'call' | 'system'
  communication_type: 'manual' | 'campaign' | 'transactional' | 'delivery_event' | 'call' | 'system'
  from_user_id: string | null
  to_contact: string | null
  subject: string | null
  body_preview: string | null
  status: string
  provider: string | null
  provider_message_id: string | null
  campaign_id: string | null
  campaign_recipient_id: string | null
  metadata: Record<string, unknown>
  created_at: string
}

export type RecipientCandidate = {
  entity_type: CommunicationEntityType
  entity_id: string
  name: string
  email: string | null
  phone: string | null
}

export type RecipientPreviewRow = RecipientCandidate & {
  sendable: boolean
  skip_reason: string | null
}

export type RecipientPreview = {
  total: number
  sendable: number
  skipped: number
  suppressed: number
  missing_email: number
  do_not_contact: number
  rows: RecipientPreviewRow[]
}

export type EmailPayload = {
  to: string
  subject: string
  html: string
  text?: string
  category: MessageTemplateCategory
  entity_type: CommunicationEntityType
  entity_id: string
  user: RouteUser
  campaign_id?: string | null
  campaign_recipient_id?: string | null
}

export type SendResult = {
  ok: boolean
  provider: string
  provider_message_id?: string | null
  error?: string
}
