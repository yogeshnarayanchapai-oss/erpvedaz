import { supabase } from '@/integrations/supabase/client';
import type { MessageChannel, MessageStatus } from './types';

interface SendMessageResult {
  success: boolean;
  messageId?: string;
  error?: string;
}

/**
 * Send a message via the specified channel.
 * This is a pluggable interface - actual provider implementations can be added later.
 * For now, it simulates sending and logs the message.
 */
export async function sendMessageViaChannel(
  channel: MessageChannel,
  content: string,
  recipientPhone: string
): Promise<SendMessageResult> {
  // In development/simulation mode, just log and return success
  const isDevelopment = !channel.api_key || channel.api_key === '';

  if (isDevelopment) {
    console.log(`[MESSAGE SIMULATION] Channel: ${channel.name}`);
    console.log(`[MESSAGE SIMULATION] To: ${recipientPhone}`);
    console.log(`[MESSAGE SIMULATION] Content: ${content}`);
    
    return {
      success: true,
      messageId: `SIM-${Date.now()}`,
    };
  }

  // Real provider implementations
  try {
    switch (channel.provider) {
      case 'SPARROW':
        return await sendViaSparrow(channel, content, recipientPhone);
      case 'TWILIO':
        return await sendViaTwilio(channel, content, recipientPhone);
      case 'META':
        return await sendViaMeta(channel, content, recipientPhone);
      default:
        return await sendViaGeneric(channel, content, recipientPhone);
    }
  } catch (error: any) {
    console.error('Error sending message:', error);
    return {
      success: false,
      error: error.message || 'Unknown error',
    };
  }
}

// Sparrow SMS implementation (Nepal)
async function sendViaSparrow(
  channel: MessageChannel,
  content: string,
  recipientPhone: string
): Promise<SendMessageResult> {
  if (!channel.api_base_url || !channel.api_key) {
    return { success: false, error: 'Sparrow SMS credentials not configured' };
  }

  const params = new URLSearchParams({
    token: channel.api_key,
    from: channel.sender_id || 'Demo',
    to: recipientPhone,
    text: content,
  });

  const response = await fetch(`${channel.api_base_url}?${params.toString()}`, {
    method: 'GET',
  });

  const result = await response.json();

  if (result.response_code === 200) {
    return { success: true, messageId: result.message_id };
  } else {
    return { success: false, error: result.message || 'Sparrow SMS error' };
  }
}

// Twilio implementation
async function sendViaTwilio(
  channel: MessageChannel,
  content: string,
  recipientPhone: string
): Promise<SendMessageResult> {
  if (!channel.api_key || !channel.api_secret) {
    return { success: false, error: 'Twilio credentials not configured' };
  }

  const accountSid = channel.api_key;
  const authToken = channel.api_secret;
  const from = channel.sender_id;

  const response = await fetch(
    `https://api.twilio.com/2010-04-01/Accounts/${accountSid}/Messages.json`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        Authorization: 'Basic ' + btoa(`${accountSid}:${authToken}`),
      },
      body: new URLSearchParams({
        To: recipientPhone,
        From: from || '',
        Body: content,
      }),
    }
  );

  const result = await response.json();

  if (result.sid) {
    return { success: true, messageId: result.sid };
  } else {
    return { success: false, error: result.message || 'Twilio error' };
  }
}

// Meta WhatsApp Cloud API implementation
async function sendViaMeta(
  channel: MessageChannel,
  content: string,
  recipientPhone: string
): Promise<SendMessageResult> {
  if (!channel.api_key || !channel.sender_id) {
    return { success: false, error: 'Meta WhatsApp credentials not configured' };
  }

  const response = await fetch(
    `https://graph.facebook.com/v18.0/${channel.sender_id}/messages`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${channel.api_key}`,
      },
      body: JSON.stringify({
        messaging_product: 'whatsapp',
        to: recipientPhone,
        type: 'text',
        text: { body: content },
      }),
    }
  );

  const result = await response.json();

  if (result.messages?.[0]?.id) {
    return { success: true, messageId: result.messages[0].id };
  } else {
    return { success: false, error: result.error?.message || 'Meta API error' };
  }
}

// Generic HTTP API implementation
async function sendViaGeneric(
  channel: MessageChannel,
  content: string,
  recipientPhone: string
): Promise<SendMessageResult> {
  if (!channel.api_base_url) {
    return { success: false, error: 'API URL not configured' };
  }

  const response = await fetch(channel.api_base_url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(channel.api_key ? { Authorization: `Bearer ${channel.api_key}` } : {}),
    },
    body: JSON.stringify({
      to: recipientPhone,
      message: content,
      sender_id: channel.sender_id,
    }),
  });

  const result = await response.json();

  if (response.ok) {
    return { success: true, messageId: result.id || `GEN-${Date.now()}` };
  } else {
    return { success: false, error: result.error || 'API error' };
  }
}

/**
 * Update message log status
 */
export async function updateMessageLogStatus(
  logId: string,
  status: MessageStatus,
  providerMessageId?: string,
  errorMessage?: string
): Promise<void> {
  await supabase
    .from('message_logs')
    .update({
      status,
      provider_message_id: providerMessageId,
      error_message: errorMessage,
    })
    .eq('id', logId);
}
