import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders });

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY')!;
    const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

    const authHeader = req.headers.get('Authorization');
    if (!authHeader) return json({ error: 'Unauthorized' }, 401);

    const userClient = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: { user }, error: authErr } = await userClient.auth.getUser();
    if (authErr || !user) return json({ error: 'Unauthorized' }, 401);

    const supabase = createClient(supabaseUrl, serviceKey);
    const { orderId } = await req.json();
    if (!orderId) return json({ error: 'orderId required' }, 400);

    // Permission: allow if user is ADMIN/MANAGER/OWNER/LOGISTICS OR owns the order
    const [{ data: roles }, { data: order }] = await Promise.all([
      supabase.from('user_roles').select('role').eq('user_id', user.id),
      supabase.from('orders').select('id, assigned_to_user_id, created_by_staff_id').eq('id', orderId).single(),
    ]);
    if (!order) return json({ error: 'Order not found' }, 404);
    const roleList = (roles || []).map((r: any) => r.role);
    const privileged = roleList.some((r: string) => ['OWNER', 'ADMIN', 'MANAGER', 'LOGISTICS', 'SALES_MANAGER'].includes(r));
    const owns = order.assigned_to_user_id === user.id || order.created_by_staff_id === user.id;
    if (!privileged && !owns) return json({ error: 'Forbidden' }, 403);

    const { data: logi } = await supabase
      .from('logistics_orders')
      .select('*')
      .eq('order_id', orderId)
      .single();
    if (!logi) return json({ error: 'Order not pushed to any courier yet' }, 400);

    const { data: settings } = await supabase
      .from('logistics_settings')
      .select('*')
      .eq('courier', (logi as any).courier)
      .single();

    let newStatus: string | null = null;
    let raw: any = null;
    try {
      const c = (logi as any).courier;
      if (c === 'NCM' && settings) {
        raw = await fetchNCM(settings, (logi as any).tracking_id);
        newStatus = mapNcmStatus(raw?.status);
      } else if (c === 'GAAUBESI' && settings) {
        raw = await fetchGaaubesi(settings, (logi as any).tracking_id);
        newStatus = mapGenericStatus(raw?.status);
      } else {
        raw = { note: 'No live tracking implemented for this courier yet' };
      }
    } catch (e: any) {
      raw = { error: e.message };
    }

    if (newStatus) {
      await supabase
        .from('logistics_orders')
        .update({ delivery_status: newStatus, api_response: raw })
        .eq('id', (logi as any).id);
      await supabase
        .from('orders')
        .update({ logistics_status: newStatus })
        .eq('id', orderId);
    }

    return json({ success: true, status: newStatus || (logi as any).delivery_status, raw });
  } catch (e: any) {
    return json({ error: e.message }, 500);
  }
});

function json(body: any, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}

async function fetchNCM(settings: any, trackingId: string | null) {
  if (!trackingId) return null;
  const r = await fetch(`${settings.api_base_url}/api/v1/orders/${trackingId}`, {
    headers: { Authorization: `Bearer ${settings.api_token}` },
  });
  return await r.json();
}

async function fetchGaaubesi(settings: any, trackingId: string | null) {
  if (!trackingId) return null;
  const r = await fetch(`${settings.api_base_url}/track/${trackingId}`, {
    headers: { Authorization: `Bearer ${settings.api_token}` },
  });
  return await r.json();
}

function mapNcmStatus(s?: string): string | null {
  if (!s) return null;
  const up = s.toString().toUpperCase();
  if (up.includes('DELIVER')) return 'DELIVERED';
  if (up.includes('RETURN')) return 'RETURNED';
  if (up.includes('PICK')) return 'PICKED_UP';
  if (up.includes('TRANSIT') || up.includes('DISPATCH')) return 'IN_TRANSIT';
  if (up.includes('OUT')) return 'OUT_FOR_DELIVERY';
  return null;
}

function mapGenericStatus(s?: string): string | null {
  return mapNcmStatus(s);
}
