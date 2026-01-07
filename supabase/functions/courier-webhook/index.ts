import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-webhook-secret',
};

// Validate webhook payload structure
function validateWebhookPayload(body: unknown): { valid: boolean; error?: string } {
  if (!body || typeof body !== 'object') {
    return { valid: false, error: 'Invalid payload: must be a JSON object' };
  }

  const payload = body as Record<string, unknown>;
  
  // Must have at least a tracking identifier
  const trackingId = payload.tracking_id || payload.trackingId || payload.waybill;
  if (!trackingId || typeof trackingId !== 'string') {
    return { valid: false, error: 'Invalid payload: missing tracking identifier' };
  }

  // Must have a status field
  const status = payload.status || payload.delivery_status;
  if (!status || typeof status !== 'string') {
    return { valid: false, error: 'Invalid payload: missing status field' };
  }

  return { valid: true };
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Check for webhook secret if configured
    const webhookSecret = Deno.env.get('COURIER_WEBHOOK_SECRET');
    if (webhookSecret) {
      const providedSecret = req.headers.get('x-webhook-secret');
      if (providedSecret !== webhookSecret) {
        console.error('[Webhook] Unauthorized: Invalid or missing webhook secret');
        return new Response(JSON.stringify({ error: 'Unauthorized' }), {
          status: 401,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    let body: unknown;
    try {
      body = await req.json();
    } catch {
      console.error('[Webhook] Invalid JSON payload');
      return new Response(JSON.stringify({ error: 'Invalid JSON payload' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Validate payload structure
    const validation = validateWebhookPayload(body);
    if (!validation.valid) {
      console.error('[Webhook] Validation failed:', validation.error);
      return new Response(JSON.stringify({ error: validation.error }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const payload = body as Record<string, unknown>;
    console.log('[Webhook] Received valid payload:', JSON.stringify(payload).substring(0, 500));

    // Determine courier from webhook payload
    const courier = (payload.courier || payload.provider || 'UNKNOWN') as string;
    const trackingId = (payload.tracking_id || payload.trackingId || payload.waybill) as string;
    const status = (payload.status || payload.delivery_status || 'UNKNOWN') as string;

    // Find the logistics order
    const { data: logisticsOrder } = await supabase
      .from('logistics_orders')
      .select('*')
      .eq('tracking_id', trackingId)
      .single();

    if (!logisticsOrder) {
      console.warn('[Webhook] No order found for tracking:', trackingId);
      return new Response(JSON.stringify({ message: 'Order not found' }), {
        status: 404,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Map courier status to our internal status
    let deliveryStatus = 'IN_TRANSIT';
    const courierStatus = status.toUpperCase();
    
    if (courierStatus.includes('DELIVER')) deliveryStatus = 'DELIVERED';
    else if (courierStatus.includes('PICKUP') || courierStatus.includes('PICKED')) deliveryStatus = 'PICKED_UP';
    else if (courierStatus.includes('OUT')) deliveryStatus = 'OUT_FOR_DELIVERY';
    else if (courierStatus.includes('RETURN') || courierStatus.includes('RTO')) deliveryStatus = 'RETURNED_TO_SELLER';
    else if (courierStatus.includes('CANCEL')) deliveryStatus = 'CANCELED';

    // Update logistics order
    await supabase
      .from('logistics_orders')
      .update({
        courier_status: status,
        delivery_status: deliveryStatus,
        status_updated_at: new Date().toISOString(),
        last_webhook_data: payload,
      })
      .eq('id', logisticsOrder.id);

    // Log courier update
    await supabase.from('courier_updates').insert({
      order_id: logisticsOrder.order_id,
      logistics_order_id: logisticsOrder.id,
      courier: courier,
      status: deliveryStatus,
      note: `Webhook update: ${status}`,
      webhook_data: payload,
    });

    // Log order history if there's a linked order
    if (logisticsOrder.order_id) {
      await supabase.from('order_history').insert({
        order_id: logisticsOrder.order_id,
        event_type: 'COURIER_UPDATE',
        new_value: deliveryStatus,
        description: `Courier status updated to ${deliveryStatus}`,
      });
    }

    console.log('[Webhook] Successfully processed:', {
      tracking: trackingId,
      status: deliveryStatus,
    });

    return new Response(
      JSON.stringify({ success: true, message: 'Webhook processed' }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('[Webhook] Error:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
