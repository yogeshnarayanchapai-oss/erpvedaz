import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

const normalizePhone = (value: unknown) => String(value || '').replace(/\D/g, '');

const getLeadPhone = (lead: any) => lead?.phone || lead?.contact_number || lead?.mobile || lead?.number || null;

const getLeadName = (lead: any) => lead?.full_name || lead?.name || lead?.client_name || null;

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

    const serviceSupabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
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
    // Build query params - ALWAYS filter to status=new to avoid pulling already-pulled leads
    const effectiveStatus = status || 'new';
    const params = new URLSearchParams();
    params.set('status', effectiveStatus);
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

    // Get all previously pulled leads for this store. Any existing row means it was already seen once,
    // so transferred/deleted leads must never be reactivated or pulled again.
    const { data: pulledLeads, error: pulledError } = await serviceSupabase
      .from('socialbox_pulled_leads')
      .select('socialbox_lead_id, phone, is_transferred, is_deleted, lead_data')
      .eq('store_id', storeId);

    if (pulledError) {
      console.error('Pulled leads lookup error:', pulledError);
      return new Response(JSON.stringify({ error: 'Failed to check pulled lead history.' }), {
        status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    const pulledMap = new Map<string, { is_transferred: boolean; is_deleted: boolean; lead_data: any }>();
    const pulledPhones = new Set<string>();
    (pulledLeads || []).forEach((pl: any) => {
      pulledMap.set(pl.socialbox_lead_id, { 
        is_transferred: pl.is_transferred || false,
        is_deleted: pl.is_deleted || false,
        lead_data: pl.lead_data,
      });
      const pulledPhone = normalizePhone(pl.phone || pl.lead_data?.phone || pl.lead_data?.contact_number);
      if (pulledPhone.length >= 10) pulledPhones.add(pulledPhone);
    });

    const candidatePhones = Array.from(new Set(
      leadsArray
        .map((lead: any) => normalizePhone(getLeadPhone(lead)))
        .filter((phone: string) => phone.length >= 10)
    ));

    const existingLeadPhones = new Set<string>();
    const pageSize = 10000;
    for (let from = 0; ; from += pageSize) {
      const { data: existingLeads, error: existingError } = await serviceSupabase
        .from('leads')
        .select('contact_number')
        .eq('store_id', storeId)
        .range(from, from + pageSize - 1);

      if (existingError) {
        console.error('Existing leads lookup error:', existingError);
        return new Response(JSON.stringify({ error: 'Failed to check existing system leads.' }), {
          status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }

      for (const row of existingLeads || []) {
        const phone = normalizePhone((row as any).contact_number);
        if (phone.length >= 10 && candidatePhones.includes(phone)) {
          existingLeadPhones.add(phone);
        }
      }

      if (!existingLeads || existingLeads.length < pageSize) break;
    }

    // Classify
    const newLeads: any[] = [];      // truly new (not pulled before and not already in system leads)
    const skippedAlreadyPulled: any[] = [];
    const skippedExistingSystem: any[] = [];
    const seenPhones = new Set<string>();

    for (const lead of leadsArray) {
      const leadId = String(lead.id);
      const phone = normalizePhone(getLeadPhone(lead));
      const info = pulledMap.get(leadId);

      if (info || (phone.length >= 10 && pulledPhones.has(phone))) {
        skippedAlreadyPulled.push(lead);
        continue;
      }

      if (phone.length >= 10 && (existingLeadPhones.has(phone) || seenPhones.has(phone))) {
        skippedExistingSystem.push(lead);
        continue;
      }

      if (!info) {
        newLeads.push(lead);
        if (phone.length >= 10) seenPhones.add(phone);
      }
    }

    // Insert new leads
    if (newLeads.length > 0) {
      const pullRecords = newLeads.map((lead: any) => ({
        store_id: storeId,
        socialbox_lead_id: String(lead.id),
        phone: getLeadPhone(lead),
        full_name: getLeadName(lead),
        lead_data: lead,
        is_transferred: false,
        is_deleted: false,
      }));

      const { error: insertErr } = await serviceSupabase
        .from('socialbox_pulled_leads')
        .upsert(pullRecords, { onConflict: 'store_id,socialbox_lead_id' });
      if (insertErr) console.error('Insert new leads error:', insertErr);
    }

    // Build active leads to return (new + reactivated + previously-active)
    const activeLeads: any[] = [...newLeads];
    for (const [leadId, info] of pulledMap.entries()) {
      if (!info.is_transferred && !info.is_deleted && info.lead_data) {
        // Avoid duplicates with newLeads / reactivate
        if (!activeLeads.find((l: any) => String(l.id) === leadId)) {
          activeLeads.push(info.lead_data);
        }
      }
    }

    const surfacedCount = newLeads.length;


    // Update last_synced_at
    await supabase
      .from('socialbox_config')
      .update({ last_synced_at: new Date().toISOString() })
      .eq('id', config.id);

    return new Response(JSON.stringify({ 
      leads: activeLeads, 
      new_count: surfacedCount,
      truly_new: newLeads.length,
      reactivated: 0,
      skipped_already_pulled: skippedAlreadyPulled.length,
      skipped_existing_system: skippedExistingSystem.length,
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
