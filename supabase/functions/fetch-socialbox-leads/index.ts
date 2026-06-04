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
      return new Response(JSON.stringify({ error: 'SocialBox not configured for this store.' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // Build query params
    const params = new URLSearchParams();
    if (status) params.set('status', status);
    if (limit) params.set('limit', String(limit || 200));

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
    const leadsArray = Array.isArray(leads) ? leads : (leads?.data || leads?.leads || []);
    console.log('SocialBox returned', leadsArray.length, 'leads from API');

    // Get all pulled leads for this store
    const { data: pulledLeads } = await supabase
      .from('socialbox_pulled_leads')
      .select('socialbox_lead_id, is_transferred, is_deleted, lead_data')
      .eq('store_id', storeId);

    const pulledMap = new Map<string, { is_transferred: boolean; is_deleted: boolean; lead_data: any }>();
    (pulledLeads || []).forEach((pl: any) => {
      pulledMap.set(pl.socialbox_lead_id, { 
        is_transferred: pl.is_transferred || false,
        is_deleted: pl.is_deleted || false,
        lead_data: pl.lead_data,
      });
    });

    // Classify
    const newLeads: any[] = [];      // truly new (not in DB)
    const reactivate: any[] = [];    // in DB, transferred but not deleted — re-activate
    const skippedDeleted: any[] = []; // explicitly deleted by user — don't bring back

    for (const lead of leadsArray) {
      const info = pulledMap.get(String(lead.id));
      if (!info) {
        newLeads.push(lead);
      } else if (info.is_deleted) {
        skippedDeleted.push(lead);
      } else {
        // Already in DB and not deleted. If it was transferred, re-activate.
        if (info.is_transferred) reactivate.push(lead);
      }
    }

    // Insert new leads
    if (newLeads.length > 0) {
      const pullRecords = newLeads.map((lead: any) => ({
        store_id: storeId,
        socialbox_lead_id: String(lead.id),
        phone: lead.phone || null,
        full_name: lead.full_name || lead.name || null,
        lead_data: lead,
        is_transferred: false,
        is_deleted: false,
      }));

      const { error: insertErr } = await supabase
        .from('socialbox_pulled_leads')
        .upsert(pullRecords, { onConflict: 'store_id,socialbox_lead_id' });
      if (insertErr) console.error('Insert new leads error:', insertErr);
    }

    // Re-activate previously transferred leads that SocialBox still surfaces
    if (reactivate.length > 0) {
      const ids = reactivate.map((l: any) => String(l.id));
      const { error: updErr } = await supabase
        .from('socialbox_pulled_leads')
        .update({ is_transferred: false, transferred_at: null, lead_data: undefined })
        .eq('store_id', storeId)
        .in('socialbox_lead_id', ids);
      if (updErr) console.error('Reactivate leads error:', updErr);
    }

    // Build active leads to return (new + reactivated + previously-active)
    const activeLeads: any[] = [...newLeads, ...reactivate];
    for (const [leadId, info] of pulledMap.entries()) {
      if (!info.is_transferred && !info.is_deleted && info.lead_data) {
        // Avoid duplicates with newLeads / reactivate
        if (!activeLeads.find((l: any) => String(l.id) === leadId)) {
          activeLeads.push(info.lead_data);
        }
      }
    }

    const surfacedCount = newLeads.length + reactivate.length;


    // Update last_synced_at
    await supabase
      .from('socialbox_config')
      .update({ last_synced_at: new Date().toISOString() })
      .eq('id', config.id);

    return new Response(JSON.stringify({ 
      leads: activeLeads, 
      new_count: surfacedCount,
      truly_new: newLeads.length,
      reactivated: reactivate.length,
      total_active: activeLeads.length,
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
