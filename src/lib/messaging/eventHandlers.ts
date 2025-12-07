import { supabase } from '@/integrations/supabase/client';
import { renderTemplate } from './templateRenderer';
import { sendMessageViaChannel, updateMessageLogStatus } from './messageSender';
import type { MessageAutomationRule, MessageChannel, MessageTemplate, MessageRecipientType } from './types';

interface Lead {
  id: string;
  client_name: string;
  contact_number: string;
  alt_phone?: string | null;
  product_id?: string | null;
  products?: { name: string } | null;
}

interface Order {
  id: string;
  lead_id?: string | null;
  product_id?: string | null;
  amount?: number | null;
  full_address?: string | null;
  sales_person_id?: string | null;
  lead?: Lead | null;
  products?: { name: string } | null;
}

interface StaffUser {
  id: string;
  name: string;
  phone?: string | null;
  email: string;
}

interface ResellerOrder {
  id: string;
  reseller_id: string;
  product_id?: string | null;
  quantity?: number | null;
  amount?: number | null;
  reseller?: { name: string; phone: string } | null;
  products?: { name: string } | null;
}

interface Ticket {
  id: string;
  code: string;
  subject: string;
  customer_name: string;
  customer_phone: string;
  resolution?: string | null;
}

// Admin notification phone - can be configured later
const ADMIN_NOTIFICATION_PHONE = '9800000000';

/**
 * Resolve recipient phone based on send_to type
 */
function resolveRecipientPhone(
  sendTo: MessageRecipientType,
  context: {
    lead?: Lead | null;
    order?: Order | null;
    staff?: StaffUser | null;
    reseller?: { name: string; phone: string } | null;
    ticket?: Ticket | null;
  }
): string | null {
  switch (sendTo) {
    case 'CUSTOMER':
      return context.lead?.contact_number || context.order?.lead?.contact_number || context.ticket?.customer_phone || null;
    case 'STAFF':
      return context.staff?.phone || null;
    case 'ADMIN':
      return ADMIN_NOTIFICATION_PHONE;
    case 'RESELLER':
      return context.reseller?.phone || null;
    default:
      return null;
  }
}

/**
 * Process automation rules for an event
 */
async function processAutomationRules(
  eventName: string,
  context: {
    lead?: Lead | null;
    order?: Order | null;
    staff?: StaffUser | null;
    reseller?: { name: string; phone: string } | null;
    ticket?: Ticket | null;
    oldStatus?: string | null;
    newStatus?: string | null;
  },
  templateData: Record<string, string | number | undefined>
): Promise<void> {
  // Fetch active rules for this event
  let query = supabase
    .from('message_automation_rules')
    .select(`
      *,
      channel:message_channels(*),
      template:message_templates(*)
    `)
    .eq('event_name', eventName)
    .eq('is_active', true);

  // Add status filters if provided
  if (context.oldStatus) {
    query = query.or(`trigger_status_from.is.null,trigger_status_from.eq.${context.oldStatus}`);
  }
  if (context.newStatus) {
    query = query.or(`trigger_status_to.is.null,trigger_status_to.eq.${context.newStatus}`);
  }

  const { data: rules, error } = await query;

  if (error || !rules || rules.length === 0) {
    console.log(`No active automation rules found for event: ${eventName}`);
    return;
  }

  // Process each rule
  for (const rule of rules) {
    const typedRule = rule as MessageAutomationRule & {
      channel: MessageChannel;
      template: MessageTemplate;
    };

    if (!typedRule.channel || !typedRule.template || !typedRule.channel.is_active) {
      continue;
    }

    const recipientPhone = resolveRecipientPhone(typedRule.send_to, context);
    if (!recipientPhone) {
      console.warn(`Could not resolve recipient phone for rule ${typedRule.id}`);
      continue;
    }

    // Render the template
    const renderedContent = renderTemplate(typedRule.template.content, templateData);

    // Create message log entry
    const { data: logEntry, error: logError } = await supabase
      .from('message_logs')
      .insert({
        rule_id: typedRule.id,
        template_id: typedRule.template_id,
        channel_id: typedRule.channel_id,
        recipient_phone: recipientPhone,
        payload_preview: renderedContent,
        status: 'PENDING',
        related_lead_id: context.lead?.id || null,
        related_order_id: context.order?.id || null,
        related_reseller_order_id: null,
      })
      .select()
      .single();

    if (logError || !logEntry) {
      console.error('Failed to create message log:', logError);
      continue;
    }

    // Send the message
    const result = await sendMessageViaChannel(
      typedRule.channel,
      renderedContent,
      recipientPhone
    );

    // Update log status
    await updateMessageLogStatus(
      logEntry.id,
      result.success ? 'SENT' : 'FAILED',
      result.messageId,
      result.error
    );
  }
}

/**
 * Called when a lead is assigned to staff
 */
export async function onLeadAssigned(lead: Lead, staffUser: StaffUser): Promise<void> {
  await processAutomationRules(
    'LEAD_ASSIGNED',
    { lead, staff: staffUser },
    {
      customer_name: lead.client_name,
      customer_phone: lead.contact_number,
      product_name: lead.products?.name || 'N/A',
      staff_name: staffUser.name,
      assigned_date: new Date().toISOString().split('T')[0],
    }
  );
}

/**
 * Called when lead status changes
 */
export async function onLeadStatusChanged(
  lead: Lead,
  oldStatus: string,
  newStatus: string
): Promise<void> {
  await processAutomationRules(
    'LEAD_STATUS_CHANGED',
    { lead, oldStatus, newStatus },
    {
      customer_name: lead.client_name,
      customer_phone: lead.contact_number,
      product_name: lead.products?.name || 'N/A',
      old_status: oldStatus,
      new_status: newStatus,
    }
  );
}

/**
 * Called when an order is created
 */
export async function onOrderCreated(order: Order): Promise<void> {
  await processAutomationRules(
    'ORDER_CREATED',
    { order, lead: order.lead },
    {
      customer_name: order.lead?.client_name || 'Customer',
      customer_phone: order.lead?.contact_number || '',
      order_code: order.id.substring(0, 8).toUpperCase(),
      product_name: order.products?.name || 'N/A',
      amount: order.amount ? `Rs. ${order.amount.toLocaleString()}` : 'N/A',
      address: order.full_address || 'N/A',
    }
  );
}

/**
 * Called when order status changes
 */
export async function onOrderStatusChanged(
  order: Order,
  oldStatus: string,
  newStatus: string
): Promise<void> {
  await processAutomationRules(
    'ORDER_STATUS_CHANGED',
    { order, lead: order.lead, oldStatus, newStatus },
    {
      customer_name: order.lead?.client_name || 'Customer',
      customer_phone: order.lead?.contact_number || '',
      order_code: order.id.substring(0, 8).toUpperCase(),
      product_name: order.products?.name || 'N/A',
      old_status: oldStatus,
      new_status: newStatus,
    }
  );
}

/**
 * Called when a reseller order is created
 */
export async function onResellerOrderCreated(resellerOrder: ResellerOrder): Promise<void> {
  await processAutomationRules(
    'RESELLER_ORDER_CREATED',
    { reseller: resellerOrder.reseller },
    {
      reseller_name: resellerOrder.reseller?.name || 'Reseller',
      reseller_phone: resellerOrder.reseller?.phone || '',
      order_code: resellerOrder.id.substring(0, 8).toUpperCase(),
      product_name: resellerOrder.products?.name || 'N/A',
      quantity: String(resellerOrder.quantity || 1),
      amount: resellerOrder.amount ? `Rs. ${resellerOrder.amount.toLocaleString()}` : 'N/A',
    }
  );
}

/**
 * Called when a complaint is created (stub for future)
 */
export async function onComplaintCreated(ticket: Ticket): Promise<void> {
  await processAutomationRules(
    'COMPLAINT_CREATED',
    { ticket },
    {
      customer_name: ticket.customer_name,
      customer_phone: ticket.customer_phone,
      ticket_code: ticket.code,
      subject: ticket.subject,
    }
  );
}

/**
 * Called when a complaint is resolved (stub for future)
 */
export async function onComplaintResolved(ticket: Ticket): Promise<void> {
  await processAutomationRules(
    'COMPLAINT_RESOLVED',
    { ticket },
    {
      customer_name: ticket.customer_name,
      customer_phone: ticket.customer_phone,
      ticket_code: ticket.code,
      resolution: ticket.resolution || 'Resolved',
    }
  );
}
