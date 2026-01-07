import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface NCMOrderPayload {
  orderId: string;
  customerName: string;
  customerPhone: string;
  address: string;
  codAmount: number;
  weight?: number;
  productName?: string;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // Verify authentication
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'Missing authorization header' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const { data: { user }, error: authError } = await supabase.auth.getUser(
      authHeader.replace('Bearer ', '')
    );

    if (authError || !user) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Parse request body
    const body: NCMOrderPayload = await req.json();
    console.log('[NCM] Creating order:', body);

    // Get NCM settings
    const { data: settings } = await supabase
      .from('logistics_settings')
      .select('*')
      .eq('courier', 'NCM')
      .eq('is_active', true)
      .single();

    if (!settings) {
      throw new Error('NCM courier settings not configured');
    }

    // TODO: Replace with actual NCM API call
    // For now, create a mock response
    const mockNCMResponse = {
      success: true,
      tracking_id: `NCM${Date.now()}`,
      courier_order_id: `NCM-ORD-${Math.floor(Math.random() * 100000)}`,
      status: 'PENDING_PICKUP',
      estimated_delivery: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString(),
    };

    console.log('[NCM] Mock response:', mockNCMResponse);

    // Create logistics_order record
    const { data: logisticsOrder, error: insertError } = await supabase
      .from('logistics_orders')
      .insert({
        order_id: body.orderId,
        courier: 'NCM',
        customer_name: body.customerName,
        customer_phone: body.customerPhone,
        full_address: body.address,
        cod_amount: body.codAmount,
        weight_grams: body.weight || 500,
        product_name: body.productName,
        tracking_id: mockNCMResponse.tracking_id,
        courier_order_id: mockNCMResponse.courier_order_id,
        courier_status: mockNCMResponse.status,
        delivery_status: 'PENDING_PICKUP',
        estimated_delivery: mockNCMResponse.estimated_delivery,
        api_response: mockNCMResponse,
        created_by: user.id,
      })
      .select()
      .single();

    if (insertError) throw insertError;

    // Log courier update
    await supabase.from('courier_updates').insert({
      order_id: body.orderId,
      logistics_order_id: logisticsOrder.id,
      courier: 'NCM',
      status: 'PENDING_PICKUP',
      note: 'Order submitted to NCM',
      webhook_data: mockNCMResponse,
    });

    // Log order history
    await supabase.from('order_history').insert({
      order_id: body.orderId,
      changed_by: user.id,
      event_type: 'COURIER_SUBMIT',
      new_value: 'NCM',
      description: 'Order submitted to NCM courier',
    });

    return new Response(
      JSON.stringify({
        success: true,
        logisticsOrder,
        trackingId: mockNCMResponse.tracking_id,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('[NCM] Error:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
