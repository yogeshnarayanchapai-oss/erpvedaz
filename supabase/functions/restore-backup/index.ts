import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Tables that should be restored first (no dependencies)
const PRIORITY_TABLES = [
  'stores', 'profiles', 'departments', 'branches', 'warehouses', 'products',
  'lead_sources', 'employees', 'accounts', 'accounting_banks', 'accounting_expense_categories',
  'accounting_suppliers', 'accounting_wholesalers',
  'parties', 'chat_rooms', 'campaigns', 'influencers', 'video_projects',
  'assets', 'couriers', 'categories', 'shifts', 'leave_types',
  'training_courses', 'training_quizzes', 'message_channels', 'message_templates',
  'social_channels', 'hr_policies', 'notices', 'office_holidays'
];

// Tables that should be restored last (have dependencies)
const DEPENDENT_TABLES = [
  'leads', 'lead_transfers', 'lead_history', 'call_logs', 'followup_logs',
  'customers', 'customer_notes', 'customer_activity_log',
  'orders', 'order_items', 'order_status_history', 'order_comments', 'order_events', 'order_history',
  'logistics_orders', 'courier_updates', 'cod_settlements',
  'stock_movements', 'product_inventory', 'sales_records', 'daily_records',
  'transactions', 'party_payments', 'party_transactions', 'party_ledger',
  'accounting_transactions', 'accounting_bills', 'accounting_invoices', 
  'accounting_payments', 'accounting_invoice_items', 'accounting_cash_ledger',
  'attendance_records', 'leave_requests', 'payroll_records', 'leave_quota',
  'ads', 'ads_spend', 'ad_spend_reference', 'staff_targets',
  'tasks', 'task_remarks', 'asset_assignments',
  'chat_messages', 'chat_room_members', 'notifications',
  'training_lessons', 'training_enrollments', 'training_lesson_completions',
  'training_questions', 'training_quiz_attempts', 'training_certificates',
  'social_posts', 'social_post_channels', 'message_automation_rules', 'message_logs',
  'employee_documents', 'hr_bank_accounts', 'notice_dismissals',
  'audit_logs', 'audit_manual_entries', 'inventory_activity_logs', 'accounting_activity_logs'
];

// Clean row by removing enriched fields (those starting with underscore)
function cleanRowForRestore(row: any): any {
  const cleaned: any = {};
  for (const [key, value] of Object.entries(row)) {
    // Skip enriched fields (start with underscore)
    if (!key.startsWith('_')) {
      cleaned[key] = value;
    }
  }
  return cleaned;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  console.log("🔄 Starting database restore...");
  const startTime = Date.now();

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const body = await req.json();
    const { backup_data, restore_mode = "merge", user_id } = body;

    if (!backup_data || !backup_data.tables) {
      throw new Error("Invalid backup data format - missing tables");
    }

    const backupVersion = backup_data.backup_info?.version || "1.0";
    console.log(`📋 Backup version: ${backupVersion}`);
    console.log(`📋 Backup info:`, backup_data.backup_info);
    console.log(`🔧 Restore mode: ${restore_mode}`);

    const results: Record<string, { success: boolean; rows: number; error?: string }> = {};
    let totalRestored = 0;
    let tablesRestored = 0;

    // Get all table names from backup
    const backupTableNames = Object.keys(backup_data.tables);
    console.log(`📦 Found ${backupTableNames.length} tables in backup`);

    // Build restore order: priority tables first, then others, then dependent tables
    const restoreOrder: string[] = [];
    
    // Add priority tables first (that exist in backup)
    for (const table of PRIORITY_TABLES) {
      if (backupTableNames.includes(table)) {
        restoreOrder.push(table);
      }
    }
    
    // Add tables not in priority or dependent lists (middle)
    for (const table of backupTableNames) {
      if (!PRIORITY_TABLES.includes(table) && !DEPENDENT_TABLES.includes(table)) {
        restoreOrder.push(table);
      }
    }
    
    // Add dependent tables last (that exist in backup)
    for (const table of DEPENDENT_TABLES) {
      if (backupTableNames.includes(table)) {
        restoreOrder.push(table);
      }
    }

    console.log(`📝 Restore order: ${restoreOrder.length} tables`);

    for (const tableName of restoreOrder) {
      const tableData = backup_data.tables[tableName];
      
      if (!tableData || !Array.isArray(tableData) || tableData.length === 0) {
        results[tableName] = { success: true, rows: 0 };
        continue;
      }

      try {
        console.log(`📥 Restoring ${tableName} (${tableData.length} rows)...`);

        // Clean data - remove enriched fields before restore
        const cleanedData = tableData.map(cleanRowForRestore);

        if (restore_mode === "replace") {
          // Delete existing data first
          const { error: deleteError } = await supabase
            .from(tableName)
            .delete()
            .neq('id', '00000000-0000-0000-0000-000000000000');

          if (deleteError) {
            console.warn(`⚠️ Delete warning for ${tableName}:`, deleteError.message);
          }
        }

        // Insert data in batches of 100
        const batchSize = 100;
        let insertedCount = 0;

        for (let i = 0; i < cleanedData.length; i += batchSize) {
          const batch = cleanedData.slice(i, i + batchSize);
          
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
      store_id: backup_data.backup_info?.store_id || null,
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
      { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 200 }
    );

  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error("❌ Restore failed:", errorMessage);

    return new Response(
      JSON.stringify({ success: false, error: errorMessage }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 500 }
    );
  }
});
