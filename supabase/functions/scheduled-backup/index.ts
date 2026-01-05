import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Tables to backup (filtered by store_id)
const TABLES_TO_BACKUP = [
  'leads', 'lead_transfers', 'lead_sources', 'call_logs', 'followup_logs',
  'orders', 'order_items', 'order_status_history', 'order_comments',
  'customers', 'customer_notes', 'customer_activity_log',
  'logistics_orders', 'courier_updates', 'cod_settlements',
  'stock_movements', 'product_inventory', 'sales_records', 'daily_records',
  'transactions', 'party_payments', 'party_transactions', 'parties',
  'attendance_records', 'leave_requests', 'payroll_records', 'employees',
  'ads', 'ads_spend', 'ad_spend_reference', 'staff_targets',
  'products', 'branches', 'warehouses', 'profiles',
  'accounting_transactions', 'accounting_banks', 'accounts',
  'tasks', 'task_remarks', 'assets', 'asset_assignments',
  'campaigns', 'influencers', 'video_projects',
  'chat_messages', 'chat_rooms', 'notifications'
];

// Get Google OAuth token using refresh token
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

// Search for existing backup file by name pattern (store_name prefix)
async function findExistingBackupFile(
  accessToken: string,
  folderId: string | null,
  storeName: string
): Promise<{ id: string; name: string } | null> {
  // Search for files starting with store name and ending with _backup.json
  let query = `name contains '${storeName}_' and name contains '_backup.json' and trashed=false`;
  if (folderId) {
    query += ` and '${folderId}' in parents`;
  }

  const searchUrl = `https://www.googleapis.com/drive/v3/files?q=${encodeURIComponent(query)}&fields=files(id,name)&orderBy=modifiedTime desc`;
  
  const response = await fetch(searchUrl, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });

  if (!response.ok) {
    console.warn("Failed to search for existing file:", await response.text());
    return null;
  }

  const data = await response.json();
  if (data.files && data.files.length > 0) {
    console.log(`📁 Found existing backup file: ${data.files[0].name} (${data.files[0].id})`);
    return { id: data.files[0].id, name: data.files[0].name };
  }

  return null;
}

// Update existing file content
async function updateGoogleDriveFile(
  accessToken: string,
  fileId: string,
  content: string
): Promise<{ id: string; webViewLink: string }> {
  const response = await fetch(
    `https://www.googleapis.com/upload/drive/v3/files/${fileId}?uploadType=media&fields=id,webViewLink`,
    {
      method: "PATCH",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      body: content,
    }
  );

  if (!response.ok) {
    const errorText = await response.text();
    console.error("Drive update error:", errorText);
    throw new Error(`Failed to update Google Drive file: ${response.status} - ${errorText}`);
  }

  return await response.json();
}

// Upload new file to Google Drive
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
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const driveFolderId = Deno.env.get("GOOGLE_DRIVE_FOLDER_ID") || null;

    console.log("📁 Drive folder ID:", driveFolderId || "(root/My Drive)");

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Parse request body for backup type and store_id
    let backupType = "scheduled";
    let createdBy = null;
    let storeId = null;
    let storeName = "Vedaz";
    let storeSlug = "vedaz";
    
    try {
      const body = await req.json();
      backupType = body.trigger || "scheduled";
      createdBy = body.user_id || null;
      storeId = body.store_id || null;
    } catch {
      // Default to scheduled if no body
    }

    // Get store info for backup file naming
    if (storeId) {
      const { data: storeData } = await supabase
        .from("stores")
        .select("slug, name")
        .eq("id", storeId)
        .single();
      
      if (storeData) {
        storeName = storeData.name || "Store";
        storeSlug = storeData.slug || "store";
      }
      console.log(`📦 Backing up store: ${storeName} (${storeId})`);
    } else {
      console.log("⚠️ No store_id provided, backing up default store");
    }

    // Create backup log entry
    const { data: logEntry, error: logError } = await supabase
      .from("backup_logs")
      .insert({
        backup_type: backupType,
        status: "in_progress",
        started_at: new Date().toISOString(),
        created_by: createdBy,
        store_id: storeId,
      })
      .select()
      .single();

    if (logError) {
      console.error("Failed to create log entry:", logError);
    }

    const logId = logEntry?.id;
    console.log("📝 Created backup log:", logId);

    // Export all tables filtered by store_id
    const backupData: Record<string, any[]> = {};
    let totalRows = 0;
    let tablesBackedUp = 0;

    for (const tableName of TABLES_TO_BACKUP) {
      try {
        console.log(`📦 Exporting ${tableName}...`);
        
        let query = supabase.from(tableName).select("*");
        
        // Filter by store_id if provided
        if (storeId) {
          query = query.eq("store_id", storeId);
        }
        
        const { data, error } = await query.limit(50000);

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

    // Format: StoreName_YYYY-MM-DD_backup.json
    const today = new Date();
    const dateStr = today.toISOString().split('T')[0]; // YYYY-MM-DD
    const fileName = `${storeName}_${dateStr}_backup.json`;
    
    const backupContent = JSON.stringify({
      backup_info: {
        timestamp: new Date().toISOString(),
        store_id: storeId,
        store_name: storeName,
        store_slug: storeSlug,
        backup_date: dateStr,
        tables_count: tablesBackedUp,
        total_rows: totalRows,
        backup_type: backupType,
      },
      tables: backupData,
    }, null, 2);

    const fileSize = new Blob([backupContent]).size;
    console.log(`📊 Backup size: ${(fileSize / 1024 / 1024).toFixed(2)} MB`);

    // Get Google access token
    console.log("🔑 Getting Google access token...");
    const accessToken = await getGoogleAccessToken();

    // Check if backup file already exists for this store (will be replaced daily)
    console.log(`🔍 Searching for existing backup file for store: ${storeName}`);
    const existingFile = await findExistingBackupFile(accessToken, driveFolderId, storeName);

    let driveResult: { id: string; webViewLink: string };

    if (existingFile) {
      // Delete old file first, then create new one with today's date
      console.log(`🗑️ Deleting old backup file: ${existingFile.name}`);
      await fetch(`https://www.googleapis.com/drive/v3/files/${existingFile.id}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${accessToken}` },
      });
      
      // Create new file with today's date
      console.log(`☁️ Creating new backup file: ${fileName}`);
      driveResult = await uploadToGoogleDrive(accessToken, driveFolderId, fileName, backupContent);
      console.log("✅ Created new file:", driveResult.id);
    } else {
      // Create new file
      console.log(`☁️ Creating new backup file: ${fileName}`);
      driveResult = await uploadToGoogleDrive(accessToken, driveFolderId, fileName, backupContent);
      console.log("✅ Created new file:", driveResult.id);
    }

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
