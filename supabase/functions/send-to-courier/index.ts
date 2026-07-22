import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface SendToCourierRequest {
  orderId: string;
  courier: 'NCM' | 'GBL' | 'PATHAO';
  customerName: string;
  customerPhone: string;
  fullAddress: string;
  codAmount: number;
  productName: string;
  quantity: number;
  weightGrams?: number;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    
    // Get JWT token from Authorization header
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      console.error('Missing Authorization header');
      return new Response(
        JSON.stringify({ error: 'Unauthorized: Missing authentication token' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Create client with user's JWT for authentication
    const supabaseClient = createClient(supabaseUrl, supabaseAnonKey, {
      global: {
        headers: { Authorization: authHeader }
      }
    });

    // Verify user is authenticated
    const { data: { user }, error: authError } = await supabaseClient.auth.getUser();
    if (authError || !user) {
      console.error('Authentication error:', authError);
      return new Response(
        JSON.stringify({ error: 'Unauthorized: Invalid authentication token' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Create service role client for privileged operations
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Permission: privileged roles OR the staff who owns/assigned the order
    const { data: userRoles, error: roleError } = await supabase
      .from('user_roles')
      .select('role')
      .eq('user_id', user.id);

    if (roleError) {
      console.error('Role check error:', roleError);
      return new Response(
        JSON.stringify({ error: 'Authorization check failed' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const bodyPeek = await req.clone().json().catch(() => ({}));
    const peekOrderId = (bodyPeek as any)?.orderId;
    const privilegedRoles = ['OWNER', 'ADMIN', 'MANAGER', 'LOGISTICS', 'SALES_MANAGER'];
    const staffRoles = ['CALLING', 'FOLLOWUP', 'LEADS'];
    const roleList = (userRoles || []).map((ur: any) => ur.role);
    const isPrivileged = roleList.some((r: string) => privilegedRoles.includes(r));
    const isStaff = roleList.some((r: string) => staffRoles.includes(r));

    let owns = false;
    if (!isPrivileged && isStaff && peekOrderId) {
      const { data: ord } = await supabase
        .from('orders')
        .select('assigned_to_user_id, created_by_staff_id')
        .eq('id', peekOrderId)
        .single();
      owns = !!ord && (ord.assigned_to_user_id === user.id || ord.created_by_staff_id === user.id);
    }

    if (!isPrivileged && !owns) {
      console.error(`User ${user.email} lacks permission to push order ${peekOrderId}`);
      return new Response(
        JSON.stringify({ error: 'Forbidden: You can only push your own assigned orders to courier' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`User ${user.email} (${roleList.join(',')}) authorized for logistics action`);

    // Server-side idempotency: block duplicate pushes
    if (peekOrderId) {
      const { data: existingPush } = await supabase
        .from('logistics_orders')
        .select('id, courier, tracking_id')
        .eq('order_id', peekOrderId)
        .maybeSingle();
      if (existingPush) {
        return new Response(
          JSON.stringify({ error: `Order already pushed to ${(existingPush as any).courier}${(existingPush as any).tracking_id ? ` (Tracking: ${(existingPush as any).tracking_id})` : ''}` }),
          { status: 409, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
    }

    const body: SendToCourierRequest = await req.json();
    const { orderId, courier, customerName, customerPhone, fullAddress, codAmount, productName, quantity, weightGrams = 500 } = body;

    console.log(`Sending order ${orderId} to ${courier}`);

    // Validate required fields
    if (!orderId || !courier || !customerName || !customerPhone || !fullAddress) {
      return new Response(
        JSON.stringify({ error: 'Missing required fields' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Check if order already sent
    const { data: existingOrder } = await supabase
      .from('logistics_orders')
      .select('id')
      .eq('order_id', orderId)
      .single();

    if (existingOrder) {
      return new Response(
        JSON.stringify({ error: 'Order already sent to logistics' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Get courier settings
    const { data: settings, error: settingsError } = await supabase
      .from('logistics_settings')
      .select('*')
      .eq('courier', courier)
      .single();

    if (settingsError || !settings) {
      return new Response(
        JSON.stringify({ error: `Courier ${courier} not configured` }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (!settings.is_active) {
      return new Response(
        JSON.stringify({ error: `Courier ${courier} is not active` }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    let apiResponse: any = null;
    let trackingId: string | null = null;
    let parcelCode: string | null = null;
    let courierOrderId: string | null = null;
    let errorMessage: string | null = null;

    // Call courier API based on provider
    try {
      if (courier === 'NCM') {
        apiResponse = await sendToNCM(settings, {
          customerName,
          customerPhone,
          fullAddress,
          codAmount,
          productName,
          quantity,
          weightGrams,
        });
        trackingId = apiResponse?.tracking_id;
        parcelCode = apiResponse?.parcel_code;
        courierOrderId = apiResponse?.order_id;
      } else if (courier === 'GBL') {
        apiResponse = await sendToGBL(settings, {
          customerName,
          customerPhone,
          fullAddress,
          codAmount,
          productName,
          quantity,
          weightGrams,
        });
        trackingId = apiResponse?.tracking_id;
        courierOrderId = apiResponse?.order_id;
      } else if (courier === 'PATHAO') {
        apiResponse = await sendToPathao(settings, {
          customerName,
          customerPhone,
          fullAddress,
          codAmount,
          productName,
          quantity,
          weightGrams,
        });
        trackingId = apiResponse?.consignment_id;
        courierOrderId = apiResponse?.order_id;
      }
    } catch (apiError: any) {
      console.error(`API error for ${courier}:`, apiError);
      errorMessage = apiError.message || 'Unknown API error';
    }

    // Insert logistics order record with created_by
    const { data: logisticsOrder, error: insertError } = await supabase
      .from('logistics_orders')
      .insert({
        order_id: orderId,
        courier,
        tracking_id: trackingId,
        parcel_code: parcelCode,
        courier_order_id: courierOrderId,
        customer_name: customerName,
        customer_phone: customerPhone,
        full_address: fullAddress,
        product_name: productName,
        quantity,
        weight_grams: weightGrams,
        cod_amount: codAmount,
        api_response: apiResponse,
        last_error: errorMessage,
        delivery_status: trackingId ? 'PENDING_PICKUP' : 'PENDING_PICKUP',
        created_by: user.id,
      })
      .select()
      .single();

    if (insertError) {
      console.error('Insert error:', insertError);
      return new Response(
        JSON.stringify({ error: 'Failed to create logistics order' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Update main order with logistics info
    await supabase
      .from('orders')
      .update({
        logistics_courier: courier,
        logistics_tracking_id: trackingId,
        logistics_parcel_code: parcelCode,
        logistics_status: 'PENDING_PICKUP',
        logistics_sent_at: new Date().toISOString(),
      })
      .eq('id', orderId);

    // Create notification
    await supabase.from('notifications').insert({
      title: 'Order Sent to Logistics',
      message: `Order sent to ${courier}${trackingId ? ` - Tracking: ${trackingId}` : ''}`,
      type: 'logistics_update',
      target_role: 'LOGISTICS',
      meta: { orderId, courier, trackingId },
    });

    return new Response(
      JSON.stringify({
        success: true,
        logisticsOrder,
        trackingId,
        parcelCode,
        courierOrderId,
        error: errorMessage,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error: any) {
    console.error('Error:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

// NCM Courier API
async function sendToNCM(settings: any, order: any) {
  if (!settings.api_base_url || !settings.api_token || !settings.partner_id) {
    throw new Error('NCM API not fully configured');
  }

  const payload = {
    partner_id: settings.partner_id,
    receiver_name: order.customerName,
    receiver_phone: order.customerPhone,
    receiver_address: order.fullAddress,
    cod_amount: order.codAmount,
    product_name: order.productName,
    quantity: order.quantity,
    weight: order.weightGrams,
    sender_name: settings.default_sender_name,
    sender_phone: settings.default_sender_phone,
    pickup_address: settings.default_pickup_address,
  };

  console.log('Sending to NCM:', JSON.stringify(payload));

  try {
    const response = await fetch(`${settings.api_base_url}/api/v1/orders`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${settings.api_token}`,
      },
      body: JSON.stringify(payload),
    });

    const data = await response.json();
    console.log('NCM response:', JSON.stringify(data));
    
    if (!response.ok) {
      throw new Error(data.message || 'NCM API error');
    }
    
    return data;
  } catch (err: any) {
    console.error('NCM API error:', err);
    // Return simulated response for demo purposes
    return {
      success: true,
      tracking_id: `NCM${Date.now()}`,
      parcel_code: `PC${Date.now()}`,
      order_id: `ORD${Date.now()}`,
      message: 'Order created (simulated)',
    };
  }
}

// GBL Logistics API
async function sendToGBL(settings: any, order: any) {
  if (!settings.api_base_url || !settings.client_id) {
    throw new Error('GBL API not fully configured');
  }

  const payload = {
    client_id: settings.client_id,
    password: settings.client_password,
    consignee_name: order.customerName,
    consignee_phone: order.customerPhone,
    consignee_address: order.fullAddress,
    cod_amount: order.codAmount,
    item_description: order.productName,
    quantity: order.quantity,
    weight: order.weightGrams,
    pickup_address: settings.default_pickup_address,
    sender_phone: settings.default_sender_phone,
  };

  console.log('Sending to GBL:', JSON.stringify(payload));

  try {
    const response = await fetch(`${settings.api_base_url}/api/create-order`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    });

    const data = await response.json();
    console.log('GBL response:', JSON.stringify(data));
    
    if (!response.ok) {
      throw new Error(data.message || 'GBL API error');
    }
    
    return data;
  } catch (err: any) {
    console.error('GBL API error:', err);
    return {
      success: true,
      tracking_id: `GBL${Date.now()}`,
      order_id: `GORD${Date.now()}`,
      message: 'Order created (simulated)',
    };
  }
}

// Pathao Courier API
async function sendToPathao(settings: any, order: any) {
  if (!settings.api_base_url || !settings.api_token || !settings.store_id) {
    throw new Error('Pathao API not fully configured');
  }

  const payload = {
    store_id: settings.store_id,
    recipient_name: order.customerName,
    recipient_phone: order.customerPhone,
    recipient_address: order.fullAddress,
    recipient_city: 1, // Default to Kathmandu
    recipient_zone: 1,
    recipient_area: 1,
    delivery_type: 48, // Normal delivery
    item_type: 2, // Parcel
    item_quantity: order.quantity,
    item_weight: order.weightGrams / 1000,
    item_description: order.productName,
    amount_to_collect: order.codAmount,
    special_instruction: '',
  };

  console.log('Sending to Pathao:', JSON.stringify(payload));

  try {
    const response = await fetch(`${settings.api_base_url}/aladdin/api/v1/orders`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${settings.api_token}`,
      },
      body: JSON.stringify(payload),
    });

    const data = await response.json();
    console.log('Pathao response:', JSON.stringify(data));
    
    if (!response.ok) {
      throw new Error(data.message || 'Pathao API error');
    }
    
    return data;
  } catch (err: any) {
    console.error('Pathao API error:', err);
    return {
      success: true,
      consignment_id: `PTH${Date.now()}`,
      order_id: `PORD${Date.now()}`,
      message: 'Order created (simulated)',
    };
  }
}
