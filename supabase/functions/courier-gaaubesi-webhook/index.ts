import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-webhook-secret',
}

interface GaaubesiWebhookPayload {
  awb: string;
  status: string;
  substatus?: string;
  timestamp?: string;
  remarks?: string;
  delivery_date?: string;
  cod_amount?: number;
  cod_collected?: boolean;
}

// Validate Gaaubesi webhook payload structure
function validatePayload(body: unknown): { valid: boolean; error?: string; payload?: GaaubesiWebhookPayload } {
  if (!body || typeof body !== 'object') {
    return { valid: false, error: 'Invalid payload: must be a JSON object' };
  }

  const data = body as Record<string, unknown>;
  
  // Must have AWB number
  if (!data.awb || typeof data.awb !== 'string') {
    return { valid: false, error: 'Invalid payload: missing or invalid AWB number' };
  }

  // Must have status
  if (!data.status || typeof data.status !== 'string') {
    return { valid: false, error: 'Invalid payload: missing or invalid status field' };
  }

  return { valid: true, payload: data as unknown as GaaubesiWebhookPayload };
}

Deno.serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Check for webhook secret if configured
    const webhookSecret = Deno.env.get('COURIER_WEBHOOK_SECRET');
    if (webhookSecret) {
      const providedSecret = req.headers.get('x-webhook-secret');
      if (providedSecret !== webhookSecret) {
        console.error('[Gaaubesi Webhook] Unauthorized: Invalid or missing webhook secret');
        return new Response(JSON.stringify({ error: 'Unauthorized' }), {
          status: 401,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    let body: unknown;
    try {
      body = await req.json();
    } catch {
      console.error('[Gaaubesi Webhook] Invalid JSON payload');
      return new Response(JSON.stringify({ error: 'Invalid JSON payload' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Validate payload structure
    const validation = validatePayload(body);
    if (!validation.valid || !validation.payload) {
      console.error('[Gaaubesi Webhook] Validation failed:', validation.error);
      return new Response(JSON.stringify({ error: validation.error }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const payload = validation.payload;
    console.log('[Gaaubesi Webhook] Received valid payload:', JSON.stringify(payload).substring(0, 500));

    // Map Gaaubesi status to internal status
    const statusMap: Record<string, string> = {
      'Pending Pickup': 'PENDING_PICKUP',
      'Picked Up': 'PICKED_UP',
      'In Transit': 'IN_TRANSIT',
      'Out for Delivery': 'OUT_FOR_DELIVERY',
      'Delivered': 'DELIVERED',
      'RTO': 'RTO',
      'RTO Initiated': 'RTO',
      'Returned': 'RETURNED_TO_SELLER',
      'Returned to Seller': 'RETURNED_TO_SELLER',
      'Cancelled': 'CANCELED',
    };

    const internalStatus = statusMap[payload.status] || 'IN_TRANSIT';

    // Find and update logistics_orders by AWB/tracking_id
    const { data: logOrder, error: findError } = await supabase
      .from('logistics_orders')
      .select('id, order_id, cod_amount')
      .eq('tracking_id', payload.awb)
      .eq('courier', 'GAAUBESI')
      .maybeSingle();

    if (findError) {
      console.error('[Gaaubesi Webhook] Find error:', findError);
    }

    if (logOrder) {
      // Update logistics_orders
      const updateData: Record<string, unknown> = {
        courier_status: payload.status,
        delivery_status: internalStatus,
        status_updated_at: new Date().toISOString(),
        last_webhook_data: payload,
      };

      if (internalStatus === 'DELIVERED') {
        updateData.actual_delivery = payload.delivery_date || new Date().toISOString();
        updateData.cod_collected = payload.cod_collected ?? true;
      }

      await supabase
        .from('logistics_orders')
        .update(updateData)
        .eq('id', logOrder.id);

      // Update main orders table
      if (logOrder.order_id) {
        const orderUpdate: Record<string, unknown> = {
          logistic_tracking_status: payload.status,
          logistic_tracking_substatus: payload.substatus || payload.remarks,
          logistic_tracking_last_update: new Date().toISOString(),
        };

        // Update order status based on delivery status
        if (internalStatus === 'DELIVERED') {
          orderUpdate.order_status = 'DELIVERED';
          orderUpdate.cod_status = 'Collected';
        } else if (internalStatus === 'RTO' || internalStatus === 'RETURNED_TO_SELLER') {
          orderUpdate.order_status = 'RETURNED';
          orderUpdate.cod_status = 'Pending';
        }

        await supabase
          .from('orders')
          .update(orderUpdate)
          .eq('id', logOrder.order_id);

        // Create order history entry for status change
        await supabase.from('order_history').insert({
          order_id: logOrder.order_id,
          event_type: 'COURIER_UPDATE',
          description: `Gaaubesi webhook: ${payload.status}${payload.substatus ? ` - ${payload.substatus}` : ''}`,
          new_value: payload.status,
          portal: 'WEBHOOK',
          action_type: 'STATUS_UPDATE',
        });
      }

      console.log('[Gaaubesi Webhook] Updated order:', logOrder.order_id, 'Status:', payload.status);
    } else {
      // Try to find by courier_awb in orders table directly
      const { data: orderByAwb } = await supabase
        .from('orders')
        .select('id')
        .eq('courier_awb', payload.awb)
        .eq('courier_provider', 'GAAUBESI')
        .maybeSingle();

      if (orderByAwb) {
        await supabase
          .from('orders')
          .update({
            logistic_tracking_status: payload.status,
            logistic_tracking_substatus: payload.substatus || payload.remarks,
            logistic_tracking_last_update: new Date().toISOString(),
            order_status: internalStatus === 'DELIVERED' ? 'DELIVERED' : 
                         internalStatus === 'RTO' ? 'RETURNED' : undefined,
            cod_status: internalStatus === 'DELIVERED' ? 'Collected' : undefined,
          })
          .eq('id', orderByAwb.id);

        console.log('[Gaaubesi Webhook] Updated order by AWB:', orderByAwb.id);
      } else {
        console.warn('[Gaaubesi Webhook] No order found for AWB:', payload.awb);
      }
    }

    return new Response(JSON.stringify({ 
      success: true, 
      message: 'Webhook processed',
      awb: payload.awb,
      status: payload.status,
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error: unknown) {
    console.error('[Gaaubesi Webhook] Error:', error);
    return new Response(JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
