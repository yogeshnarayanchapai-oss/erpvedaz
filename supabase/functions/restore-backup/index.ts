import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Tables to restore in order (respecting foreign key dependencies)
const TABLES_RESTORE_ORDER = [
  // Base tables first (no dependencies)
  'stores', 'profiles', 'branches', 'warehouses', 'products',
  'lead_sources', 'employees', 'accounts', 'accounting_banks',
  'parties', 'chat_rooms', 'campaigns', 'influencers', 'video_projects',
  'assets',
  
  // Tables with dependencies
  'leads', 'lead_transfers', 'call_logs', 'followup_logs',
  'customers', 'customer_notes', 'customer_activity_log',
  'orders', 'order_items', 'order_status_history', 'order_comments',
  'logistics_orders', 'courier_updates', 'cod_settlements',
  'stock_movements', 'product_inventory', 'sales_records', 'daily_records',
  'transactions', 'party_payments', 'party_transactions',
  'attendance_records', 'leave_requests', 'payroll_records',
  'ads', 'ads_spend', 'ad_spend_reference', 'staff_targets',
  'accounting_transactions',
  'tasks', 'task_remarks', 'asset_assignments',
  'chat_messages', 'chat_room_members', 'notifications'
];

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  console.log("🔄 Starting database restore...");
  const startTime = Date.now();

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Parse request body
    const body = await req.json();
    const { backup_data, restore_mode = "merge", user_id } = body;

    if (!backup_data || !backup_data.tables) {
      throw new Error("Invalid backup data format - missing tables");
    }

    console.log("📋 Backup info:", backup_data.backup_info);
    console.log("🔧 Restore mode:", restore_mode);

    const results: Record<string, { success: boolean; rows: number; error?: string }> = {};
    let totalRestored = 0;
    let tablesRestored = 0;

    for (const tableName of TABLES_RESTORE_ORDER) {
      const tableData = backup_data.tables[tableName];
      
      if (!tableData || !Array.isArray(tableData) || tableData.length === 0) {
        console.log(`⏭️ Skipping ${tableName} (no data)`);
        results[tableName] = { success: true, rows: 0 };
        continue;
      }

      try {
        console.log(`📥 Restoring ${tableName} (${tableData.length} rows)...`);

        if (restore_mode === "replace") {
          // Delete existing data first
          const { error: deleteError } = await supabase
            .from(tableName)
            .delete()
            .neq('id', '00000000-0000-0000-0000-000000000000'); // Delete all

          if (deleteError) {
            console.warn(`⚠️ Delete warning for ${tableName}:`, deleteError.message);
          }
        }

        // Insert data in batches of 100
        const batchSize = 100;
        let insertedCount = 0;

        for (let i = 0; i < tableData.length; i += batchSize) {
          const batch = tableData.slice(i, i + batchSize);
          
          const { error: insertError } = await supabase
            .from(tableName)
            .upsert(batch, { 
              onConflict: 'id',
              ignoreDuplicates: restore_mode === "merge"
            });

          if (insertError) {
            console.warn(`⚠️ Insert warning for ${tableName} batch:`, insertError.message);
          } else {
            insertedCount += batch.length;
          }
        }

        results[tableName] = { success: true, rows: insertedCount };
        totalRestored += insertedCount;
        tablesRestored++;
        console.log(`✅ ${tableName}: ${insertedCount} rows restored`);

      } catch (err) {
        const errorMsg = err instanceof Error ? err.message : 'Unknown error';
        console.error(`❌ Failed to restore ${tableName}:`, errorMsg);
        results[tableName] = { success: false, rows: 0, error: errorMsg };
      }
    }

    const duration = ((Date.now() - startTime) / 1000).toFixed(2);
    console.log(`🎉 Restore completed in ${duration}s`);

    // Log the restore operation
    await supabase.from("backup_logs").insert({
      backup_type: "restore",
      status: "success",
      started_at: new Date(startTime).toISOString(),
      completed_at: new Date().toISOString(),
      tables_backed_up: tablesRestored,
      total_rows: totalRestored,
      created_by: user_id,
    });

    return new Response(
      JSON.stringify({
        success: true,
        message: "Restore completed successfully",
        tables_restored: tablesRestored,
        total_rows: totalRestored,
        duration_seconds: parseFloat(duration),
        results,
      }),
      { 
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200 
      }
    );

  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error("❌ Restore failed:", errorMessage);

    return new Response(
      JSON.stringify({
        success: false,
        error: errorMessage,
      }),
      { 
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 500 
      }
    );
  }
});
