import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_ANON_KEY')!,
      { global: { headers: { Authorization: authHeader } } }
    );

    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    const { storeId, status, limit } = await req.json();
    if (!storeId) {
      return new Response(JSON.stringify({ error: 'storeId is required' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // Get SocialBox config for this store
    const { data: config, error: configError } = await supabase
      .from('socialbox_config')
      .select('*')
      .eq('store_id', storeId)
      .eq('is_active', true)
      .single();

    if (configError || !config) {
      return new Response(JSON.stringify({ error: 'SocialBox not configured for this store. Go to Settings > AI Connect to set up.' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // Build query params
    const params = new URLSearchParams();
    if (status) params.set('status', status);
    if (limit) params.set('limit', String(limit));

    const apiUrl = `${config.api_base_url}${params.toString() ? '?' + params.toString() : ''}`;
    
    console.log('Fetching from SocialBox API:', apiUrl);

    // Fetch leads from SocialBox API
    const response = await fetch(apiUrl, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${config.api_token}`,
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('SocialBox API error:', response.status, errorText);
      return new Response(JSON.stringify({ error: `SocialBox API error: ${response.status} - ${errorText}` }), {
        status: response.status, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    const leads = await response.json();
    console.log('SocialBox returned', Array.isArray(leads) ? leads.length : 'non-array', 'leads');

    // Get already pulled lead IDs for this store
    const { data: pulledLeads } = await supabase
      .from('socialbox_pulled_leads')
      .select('socialbox_lead_id, is_transferred')
      .eq('store_id', storeId);

    const pulledMap = new Map<string, boolean>();
    (pulledLeads || []).forEach((pl: any) => {
      pulledMap.set(pl.socialbox_lead_id, pl.is_transferred);
    });

    // Filter out already pulled leads
    const leadsArray = Array.isArray(leads) ? leads : (leads?.data || leads?.leads || []);
    const newLeads = leadsArray.filter((lead: any) => !pulledMap.has(String(lead.id)));

    // Mark new leads as pulled
    if (newLeads.length > 0) {
      const pullRecords = newLeads.map((lead: any) => ({
        store_id: storeId,
        socialbox_lead_id: String(lead.id),
        phone: lead.phone || null,
        full_name: lead.full_name || lead.name || null,
      }));

      await supabase
        .from('socialbox_pulled_leads')
        .upsert(pullRecords, { onConflict: 'store_id,socialbox_lead_id' });
    }

    // Update last_synced_at
    await supabase
      .from('socialbox_config')
      .update({ last_synced_at: new Date().toISOString() })
      .eq('id', config.id);

    return new Response(JSON.stringify({ 
      leads: newLeads, 
      total_from_api: leadsArray.length,
      filtered_duplicates: leadsArray.length - newLeads.length,
      synced_at: new Date().toISOString() 
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('fetch-socialbox-leads error:', error);
    return new Response(JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
});
