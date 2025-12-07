export type MessageChannelType = 'SMS' | 'WHATSAPP';
export type MessageProvider = 'SPARROW' | 'TWILIO' | 'META' | 'OTHER';
export type MessageRecipientType = 'CUSTOMER' | 'RESELLER' | 'STAFF' | 'ADMIN';
export type MessageStatus = 'PENDING' | 'SENT' | 'FAILED';

export interface MessageChannel {
  id: string;
  name: string;
  type: MessageChannelType;
  provider: MessageProvider;
  api_base_url: string | null;
  api_key: string | null;
  api_secret: string | null;
  sender_id: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface MessageTemplate {
  id: string;
  code: string;
  channel_type: MessageChannelType;
  language: string;
  content: string;
  description: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface MessageAutomationRule {
  id: string;
  event_name: string;
  trigger_status_from: string | null;
  trigger_status_to: string | null;
  channel_id: string;
  template_id: string;
  send_to: MessageRecipientType;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  channel?: MessageChannel;
  template?: MessageTemplate;
}

export interface MessageLog {
  id: string;
  rule_id: string | null;
  template_id: string | null;
  channel_id: string;
  recipient_phone: string;
  payload_preview: string;
  status: MessageStatus;
  provider_message_id: string | null;
  error_message: string | null;
  related_lead_id: string | null;
  related_order_id: string | null;
  related_reseller_order_id: string | null;
  created_at: string;
  channel?: MessageChannel;
  template?: MessageTemplate;
  rule?: MessageAutomationRule;
}

export const MESSAGE_EVENTS = [
  'LEAD_ASSIGNED',
  'LEAD_STATUS_CHANGED',
  'ORDER_CREATED',
  'ORDER_STATUS_CHANGED',
  'RESELLER_ORDER_CREATED',
  'COMPLAINT_CREATED',
  'COMPLAINT_RESOLVED',
] as const;

export type MessageEvent = typeof MESSAGE_EVENTS[number];

export const TEMPLATE_PLACEHOLDERS: Record<MessageEvent, string[]> = {
  LEAD_ASSIGNED: ['{{customer_name}}', '{{customer_phone}}', '{{product_name}}', '{{staff_name}}', '{{assigned_date}}'],
  LEAD_STATUS_CHANGED: ['{{customer_name}}', '{{customer_phone}}', '{{old_status}}', '{{new_status}}', '{{product_name}}'],
  ORDER_CREATED: ['{{customer_name}}', '{{customer_phone}}', '{{order_code}}', '{{product_name}}', '{{amount}}', '{{address}}'],
  ORDER_STATUS_CHANGED: ['{{customer_name}}', '{{customer_phone}}', '{{order_code}}', '{{old_status}}', '{{new_status}}', '{{product_name}}'],
  RESELLER_ORDER_CREATED: ['{{reseller_name}}', '{{reseller_phone}}', '{{order_code}}', '{{product_name}}', '{{quantity}}', '{{amount}}'],
  COMPLAINT_CREATED: ['{{customer_name}}', '{{customer_phone}}', '{{ticket_code}}', '{{subject}}'],
  COMPLAINT_RESOLVED: ['{{customer_name}}', '{{customer_phone}}', '{{ticket_code}}', '{{resolution}}'],
};
