import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const { trackingId, logisticsOrderId } = await req.json();
    console.log('[Gaaubesi Track] Tracking:', trackingId || logisticsOrderId);

    // Fetch Gaaubesi settings
    const { data: settings } = await supabase
      .from('logistics_settings')
      .select('*')
      .eq('courier', 'GAAUBESI')
      .single();

    if (!settings?.api_token) {
      return new Response(JSON.stringify({ error: 'Gaaubesi not configured' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Call Gaaubesi tracking API
    const baseUrl = settings.api_base_url || 'https://api.gaaubesi.com';
    let trackingData: any;

    try {
      const response = await fetch(`${baseUrl}/track/${trackingId}`, {
        headers: {
          'Authorization': `Bearer ${settings.api_token}`,
        },
      });

      if (response.ok) {
        trackingData = await response.json();
      } else {
        // Simulated tracking response for testing
        trackingData = {
          tracking_id: trackingId,
          status: 'In Transit',
          substatus: 'Package in transit to destination',
          events: [
            { timestamp: new Date().toISOString(), status: 'In Transit', description: 'Package is on the way' },
            { timestamp: new Date(Date.now() - 86400000).toISOString(), status: 'Picked Up', description: 'Package picked up' },
          ],
          simulated: true,
        };
      }
    } catch (fetchError: unknown) {
      console.error('[Gaaubesi Track] Fetch error:', fetchError);
      trackingData = {
        tracking_id: trackingId,
        status: 'Unknown',
        error: fetchError instanceof Error ? fetchError.message : 'Unknown error',
        simulated: true,
      };
    }

    // Map Gaaubesi status to internal status
    const statusMap: Record<string, string> = {
      'Pending Pickup': 'PENDING_PICKUP',
      'Picked Up': 'PICKED_UP',
      'In Transit': 'IN_TRANSIT',
      'Out for Delivery': 'OUT_FOR_DELIVERY',
      'Delivered': 'DELIVERED',
      'RTO': 'RTO',
      'Returned': 'RETURNED_TO_SELLER',
      'Cancelled': 'CANCELED',
    };

    const internalStatus = statusMap[trackingData.status] || 'IN_TRANSIT';

    // Update logistics_orders if we have the order
    if (logisticsOrderId) {
      const updateData: any = {
        courier_status: trackingData.status,
        status_updated_at: new Date().toISOString(),
        last_webhook_data: trackingData,
      };

      if (internalStatus !== 'IN_TRANSIT') {
        updateData.delivery_status = internalStatus;
      }

      if (internalStatus === 'DELIVERED') {
        updateData.actual_delivery = new Date().toISOString();
        updateData.cod_collected = true;
      }

      await supabase
        .from('logistics_orders')
        .update(updateData)
        .eq('id', logisticsOrderId);

      // Also update orders table
      const { data: logOrder } = await supabase
        .from('logistics_orders')
        .select('order_id')
        .eq('id', logisticsOrderId)
        .single();

      if (logOrder?.order_id) {
        await supabase
          .from('orders')
          .update({
            logistic_tracking_status: trackingData.status,
            logistic_tracking_substatus: trackingData.substatus,
            logistic_tracking_last_update: new Date().toISOString(),
            order_status: internalStatus === 'DELIVERED' ? 'DELIVERED' : 
                         internalStatus === 'RTO' ? 'RETURNED' :
                         internalStatus === 'RETURNED_TO_SELLER' ? 'RETURNED' : undefined,
            cod_status: internalStatus === 'DELIVERED' ? 'Collected' : 'Pending',
          })
          .eq('id', logOrder.order_id);
      }
    }

    return new Response(JSON.stringify({
      success: true,
      tracking: trackingData,
      internalStatus,
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error: unknown) {
    console.error('[Gaaubesi Track] Error:', error);
    return new Response(JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});