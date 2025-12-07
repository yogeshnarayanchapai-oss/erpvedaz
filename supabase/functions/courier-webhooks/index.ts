import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-webhook-secret',
};

// Status mapping from courier status to internal status
const statusMapping: Record<string, string> = {
  // NCM statuses
  'pending': 'PENDING_PICKUP',
  'picked_up': 'PICKED_UP',
  'in_transit': 'IN_TRANSIT',
  'out_for_delivery': 'OUT_FOR_DELIVERY',
  'delivered': 'DELIVERED',
  'cancelled': 'CANCELED',
  'rto': 'RTO',
  'returned': 'RETURNED_TO_SELLER',
  
  // GBL statuses
  'booked': 'PENDING_PICKUP',
  'pickup_done': 'PICKED_UP',
  'transit': 'IN_TRANSIT',
  'ofd': 'OUT_FOR_DELIVERY',
  'dlv': 'DELIVERED',
  'can': 'CANCELED',
  'rts': 'RTO',
  
  // Pathao statuses
  'Pending': 'PENDING_PICKUP',
  'Pickup Processing': 'PENDING_PICKUP',
  'Picked': 'PICKED_UP',
  'At Sorting Hub': 'IN_TRANSIT',
  'In Transit': 'IN_TRANSIT',
  'In Transit To Hub': 'IN_TRANSIT',
  'At Destination Hub': 'IN_TRANSIT',
  'Out for Delivery': 'OUT_FOR_DELIVERY',
  'Delivered': 'DELIVERED',
  'Partial Delivery': 'DELIVERED',
  'On Hold': 'IN_TRANSIT',
  'Return': 'RTO',
  'Exchange': 'RTO',
};

// Validate webhook payload structure
function validatePayload(body: unknown, courier: string): { valid: boolean; error?: string; trackingId?: string; status?: string } {
  if (!body || typeof body !== 'object') {
    return { valid: false, error: 'Invalid payload: must be a JSON object' };
  }

  const data = body as Record<string, unknown>;
  let trackingId: string | null = null;
  let courierStatus: string | null = null;

  // Parse based on courier type
  if (courier === 'NCM') {
    trackingId = (data.tracking_id || data.tracking_number) as string | null;
    courierStatus = data.status as string | null;
  } else if (courier === 'GBL') {
    trackingId = (data.awb_no || data.tracking_id) as string | null;
    courierStatus = (data.status_code || data.status) as string | null;
  } else if (courier === 'PATHAO') {
    trackingId = data.consignment_id?.toString() || null;
    courierStatus = data.status as string | null;
  } else {
    // Generic parsing for unknown couriers
    trackingId = (data.tracking_id || data.trackingId || data.awb || data.waybill || data.awb_no) as string | null;
    courierStatus = (data.status || data.delivery_status || data.event_type) as string | null;
  }

  if (!trackingId) {
    return { valid: false, error: 'Invalid payload: missing tracking identifier' };
  }

  if (!courierStatus) {
    return { valid: false, error: 'Invalid payload: missing status field' };
  }

  return { valid: true, trackingId, status: courierStatus };
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  const url = new URL(req.url);
  const pathParts = url.pathname.split('/');
  const courier = pathParts[pathParts.length - 1]?.toUpperCase() || 'UNKNOWN';

  console.log(`[Courier Webhooks] Webhook received from ${courier}`);

  try {
    // Check for webhook secret if configured
    const webhookSecret = Deno.env.get('COURIER_WEBHOOK_SECRET');
    if (webhookSecret) {
      const providedSecret = req.headers.get('x-webhook-secret');
      if (providedSecret !== webhookSecret) {
        console.error('[Courier Webhooks] Unauthorized: Invalid or missing webhook secret');
        return new Response(JSON.stringify({ error: 'Unauthorized' }), {
          status: 401,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    let body: unknown;
    try {
      body = await req.json();
    } catch {
      console.error('[Courier Webhooks] Invalid JSON payload');
      return new Response(JSON.stringify({ error: 'Invalid JSON payload' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Validate payload structure
    const validation = validatePayload(body, courier);
    if (!validation.valid) {
      console.error('[Courier Webhooks] Validation failed:', validation.error);
      return new Response(JSON.stringify({ error: validation.error }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const trackingId = validation.trackingId!;
    const courierStatus = validation.status!;
    const timestamp = (body as Record<string, unknown>).timestamp as string || 
                     (body as Record<string, unknown>).updated_at as string || null;

    console.log('[Courier Webhooks] Validated payload:', JSON.stringify(body).substring(0, 500));

    // Map courier status to internal status
    const internalStatus = mapStatus(courierStatus);
    console.log(`[Courier Webhooks] Status mapping: ${courierStatus} -> ${internalStatus}`);

    // Find and update logistics order
    const { data: logisticsOrder, error: findError } = await supabase
      .from('logistics_orders')
      .select('id, order_id')
      .eq('tracking_id', trackingId)
      .single();

    if (findError || !logisticsOrder) {
      console.log(`[Courier Webhooks] Order not found for tracking ID: ${trackingId}`);
      return new Response(
        JSON.stringify({ error: 'Order not found', trackingId }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Update logistics order
    const updateData: Record<string, unknown> = {
      courier_status: courierStatus,
      delivery_status: internalStatus,
      status_updated_at: timestamp || new Date().toISOString(),
      last_webhook_data: body,
    };

    if (internalStatus === 'DELIVERED') {
      updateData.actual_delivery = timestamp || new Date().toISOString();
      updateData.cod_collected = true;
    }

    await supabase
      .from('logistics_orders')
      .update(updateData)
      .eq('id', logisticsOrder.id);

    // Update main order
    if (logisticsOrder.order_id) {
      await supabase
        .from('orders')
        .update({
          logistics_status: internalStatus,
          order_status: mapToOrderStatus(internalStatus),
        })
        .eq('id', logisticsOrder.order_id);
    }

    // Create notification
    const statusLabel = formatStatusLabel(internalStatus);
    await supabase.from('notifications').insert([
      {
        title: `${courier} Status Update`,
        message: `Order ${trackingId} is now ${statusLabel}`,
        type: 'logistics_update',
        target_role: 'ADMIN',
        meta: { trackingId, courier, status: internalStatus },
      },
      {
        title: `${courier} Status Update`,
        message: `Order ${trackingId} is now ${statusLabel}`,
        type: 'logistics_update',
        target_role: 'LOGISTICS',
        meta: { trackingId, courier, status: internalStatus },
      },
      {
        title: `${courier} Status Update`,
        message: `Order ${trackingId} is now ${statusLabel}`,
        type: 'logistics_update',
        target_role: 'MANAGER',
        meta: { trackingId, courier, status: internalStatus },
      },
    ]);

    console.log('[Courier Webhooks] Webhook processed successfully');

    return new Response(
      JSON.stringify({ success: true, trackingId, status: internalStatus }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error: unknown) {
    console.error('[Courier Webhooks] Error:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

function mapStatus(courierStatus: string | null): string {
  if (!courierStatus) return 'PENDING_PICKUP';
  
  const normalized = courierStatus.toLowerCase().replace(/[_-]/g, '_');
  
  for (const [key, value] of Object.entries(statusMapping)) {
    if (key.toLowerCase() === normalized || courierStatus === key) {
      return value;
    }
  }
  
  // Fuzzy matching
  if (normalized.includes('deliver')) return 'DELIVERED';
  if (normalized.includes('transit')) return 'IN_TRANSIT';
  if (normalized.includes('pick')) return 'PICKED_UP';
  if (normalized.includes('return') || normalized.includes('rto')) return 'RTO';
  if (normalized.includes('cancel')) return 'CANCELED';
  
  return 'IN_TRANSIT';
}

function mapToOrderStatus(logisticsStatus: string): string {
  switch (logisticsStatus) {
    case 'DELIVERED':
      return 'DELIVERED';
    case 'RTO':
    case 'RETURNED_TO_SELLER':
      return 'RETURNED';
    case 'CANCELED':
      return 'CANCELLED';
    case 'OUT_FOR_DELIVERY':
    case 'IN_TRANSIT':
      return 'DISPATCHED';
    default:
      return 'DISPATCHED';
  }
}

function formatStatusLabel(status: string): string {
  return status
    .replace(/_/g, ' ')
    .toLowerCase()
    .replace(/\b\w/g, l => l.toUpperCase());
}
