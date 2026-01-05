import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Tables to backup
const TABLES_TO_BACKUP = [
  'leads', 'lead_transfers', 'lead_sources', 'call_logs', 'followup_logs',
  'orders', 'order_items', 'order_status_history', 'order_comments',
  'customers', 'customer_notes', 'customer_activity_log',
  'logistics_orders', 'courier_updates', 'cod_settlements',
  'stock_movements', 'product_inventory', 'sales_records', 'daily_records',
  'transactions', 'party_payments', 'party_transactions', 'parties',
  'attendance_records', 'leave_requests', 'payroll_records', 'employees',
  'ads', 'ads_spend', 'ad_spend_reference', 'staff_targets',
  'products', 'branches', 'warehouses', 'profiles', 'stores',
  'accounting_transactions', 'accounting_banks', 'accounts',
  'tasks', 'task_remarks', 'assets', 'asset_assignments',
  'campaigns', 'influencers', 'video_projects',
  'chat_messages', 'chat_rooms', 'notifications'
];

// Get Google OAuth token using refresh token (for personal Gmail accounts)
async function getGoogleAccessToken(): Promise<string> {
  const clientId = Deno.env.get("GOOGLE_CLIENT_ID");
  const clientSecret = Deno.env.get("GOOGLE_CLIENT_SECRET");
  const refreshToken = Deno.env.get("GOOGLE_REFRESH_TOKEN");

  if (!clientId || !clientSecret || !refreshToken) {
    throw new Error("Missing Google OAuth credentials (CLIENT_ID, CLIENT_SECRET, or REFRESH_TOKEN)");
  }

  console.log("🔑 Exchanging refresh token for access token...");

  const tokenResponse = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: clientId,
      client_secret: clientSecret,
      refresh_token: refreshToken,
      grant_type: "refresh_token",
    }),
  });

  const tokenData = await tokenResponse.json();
  
  if (!tokenData.access_token) {
    console.error("Token response error:", tokenData);
    throw new Error(`Failed to get access token: ${tokenData.error_description || tokenData.error}`);
  }

  console.log("✅ Access token obtained successfully");
  return tokenData.access_token;
}

// Upload file to Google Drive (to root or My Drive if no folder specified)
async function uploadToGoogleDrive(
  accessToken: string,
  folderId: string | null,
  fileName: string,
  content: string
): Promise<{ id: string; webViewLink: string }> {
  const metadata: { name: string; mimeType: string; parents?: string[] } = {
    name: fileName,
    mimeType: "application/json",
  };

  // Only add parents if folder ID is provided
  if (folderId && folderId.trim() !== "") {
    metadata.parents = [folderId];
  }

  const boundary = "backup_boundary_" + Date.now();
  const body = 
    `--${boundary}\r\n` +
    `Content-Type: application/json; charset=UTF-8\r\n\r\n` +
    JSON.stringify(metadata) + `\r\n` +
    `--${boundary}\r\n` +
    `Content-Type: application/json\r\n\r\n` +
    content + `\r\n` +
    `--${boundary}--`;

  const response = await fetch(
    "https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart&fields=id,webViewLink",
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": `multipart/related; boundary=${boundary}`,
      },
      body: body,
    }
  );

  if (!response.ok) {
    const errorText = await response.text();
    console.error("Drive upload error:", errorText);
    throw new Error(`Failed to upload to Google Drive: ${response.status} - ${errorText}`);
  }

  return await response.json();
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  const startTime = Date.now();
  console.log("🚀 Starting database backup...");

  try {
    // Get environment variables
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const driveFolderId = Deno.env.get("GOOGLE_DRIVE_FOLDER_ID") || null;

    console.log("📁 Drive folder ID:", driveFolderId || "(root/My Drive)");

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Parse request body for backup type
    let backupType = "scheduled";
    let createdBy = null;
    try {
      const body = await req.json();
      backupType = body.trigger || "scheduled";
      createdBy = body.user_id || null;
    } catch {
      // Default to scheduled if no body
    }

    // Create backup log entry
    const { data: logEntry, error: logError } = await supabase
      .from("backup_logs")
      .insert({
        backup_type: backupType,
        status: "in_progress",
        started_at: new Date().toISOString(),
        created_by: createdBy,
      })
      .select()
      .single();

    if (logError) {
      console.error("Failed to create log entry:", logError);
    }

    const logId = logEntry?.id;
    console.log("📝 Created backup log:", logId);

    // Export all tables
    const backupData: Record<string, any[]> = {};
    let totalRows = 0;
    let tablesBackedUp = 0;

    for (const tableName of TABLES_TO_BACKUP) {
      try {
        console.log(`📦 Exporting ${tableName}...`);
        const { data, error } = await supabase
          .from(tableName)
          .select("*")
          .limit(50000); // Limit to prevent memory issues

        if (error) {
          console.warn(`⚠️ Error exporting ${tableName}:`, error.message);
          backupData[tableName] = [];
        } else {
          backupData[tableName] = data || [];
          totalRows += (data?.length || 0);
          tablesBackedUp++;
          console.log(`✅ ${tableName}: ${data?.length || 0} rows`);
        }
      } catch (err) {
        console.warn(`⚠️ Failed to export ${tableName}:`, err);
        backupData[tableName] = [];
      }
    }

    // Create backup JSON with Nepal timezone
    const nepalTime = new Date(Date.now() + (5.75 * 60 * 60 * 1000)); // UTC+5:45
    const timestamp = nepalTime.toISOString().replace(/[:.]/g, "-");
    const fileName = `vedaz_erp_backup_${timestamp}.json`;
    
    const backupContent = JSON.stringify({
      backup_info: {
        timestamp: new Date().toISOString(),
        tables_count: tablesBackedUp,
        total_rows: totalRows,
        backup_type: backupType,
      },
      tables: backupData,
    }, null, 2);

    const fileSize = new Blob([backupContent]).size;
    console.log(`📊 Backup size: ${(fileSize / 1024 / 1024).toFixed(2)} MB`);

    // Get Google access token using OAuth refresh token
    console.log("🔑 Getting Google access token...");
    const accessToken = await getGoogleAccessToken();

    // Upload to Google Drive
    console.log("☁️ Uploading to Google Drive...");
    const driveResult = await uploadToGoogleDrive(
      accessToken,
      driveFolderId,
      fileName,
      backupContent
    );

    console.log("✅ Uploaded to Drive:", driveResult.id);

    // Update backup log with success
    if (logId) {
      await supabase
        .from("backup_logs")
        .update({
          status: "success",
          file_name: fileName,
          file_size: fileSize,
          google_drive_id: driveResult.id,
          google_drive_url: driveResult.webViewLink,
          tables_backed_up: tablesBackedUp,
          total_rows: totalRows,
          completed_at: new Date().toISOString(),
        })
        .eq("id", logId);
    }

    const duration = ((Date.now() - startTime) / 1000).toFixed(2);
    console.log(`🎉 Backup completed in ${duration}s`);

    return new Response(
      JSON.stringify({
        success: true,
        message: "Backup completed successfully",
        file_name: fileName,
        file_size: fileSize,
        tables_backed_up: tablesBackedUp,
        total_rows: totalRows,
        google_drive_id: driveResult.id,
        google_drive_url: driveResult.webViewLink,
        duration_seconds: parseFloat(duration),
      }),
      { 
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200 
      }
    );

  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error("❌ Backup failed:", errorMessage);

    // Try to update log with failure
    try {
      const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
      const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
      const supabase = createClient(supabaseUrl, supabaseServiceKey);
      
      await supabase
        .from("backup_logs")
        .update({
          status: "failed",
          error_message: errorMessage,
          completed_at: new Date().toISOString(),
        })
        .eq("status", "in_progress")
        .order("created_at", { ascending: false })
        .limit(1);
    } catch (e) {
      console.error("Failed to update log:", e);
    }

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
