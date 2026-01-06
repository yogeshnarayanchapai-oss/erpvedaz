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

// Backup a single store
async function backupStore(
  supabase: any,
  accessToken: string,
  driveFolderId: string | null,
  storeId: string,
  storeName: string,
  storeSlug: string,
  backupType: string,
  createdBy: string | null
): Promise<{ success: boolean; error?: string; fileName?: string; totalRows?: number }> {
  console.log(`\n📦 ===== Backing up store: ${storeName} (${storeId}) =====`);
  
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

  try {
    // Export all tables filtered by store_id
    const backupData: Record<string, any[]> = {};
    let totalRows = 0;
    let tablesBackedUp = 0;

    for (const tableName of TABLES_TO_BACKUP) {
      try {
        let query = supabase.from(tableName).select("*").eq("store_id", storeId);
        const { data, error } = await query.limit(50000);

        if (error) {
          console.warn(`⚠️ Error exporting ${tableName}:`, error.message);
          backupData[tableName] = [];
        } else {
          backupData[tableName] = data || [];
          totalRows += (data?.length || 0);
          tablesBackedUp++;
          if (data && data.length > 0) {
            console.log(`✅ ${tableName}: ${data.length} rows`);
          }
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

    console.log(`✅ Store ${storeName} backup completed: ${totalRows} rows`);
    return { success: true, fileName, totalRows };

  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error(`❌ Store ${storeName} backup failed:`, errorMessage);

    // Update log with failure
    if (logId) {
      await supabase
        .from("backup_logs")
        .update({
          status: "failed",
          error_message: errorMessage,
          completed_at: new Date().toISOString(),
        })
        .eq("id", logId);
    }

    return { success: false, error: errorMessage };
  }
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
    
    try {
      const body = await req.json();
      backupType = body.trigger || "scheduled";
      createdBy = body.user_id || null;
      storeId = body.store_id || null;
    } catch {
      // Default to scheduled if no body
    }

    // Get Google access token
    console.log("🔑 Getting Google access token...");
    const accessToken = await getGoogleAccessToken();

    // If store_id provided, backup only that store (manual backup)
    if (storeId) {
      const { data: storeData } = await supabase
        .from("stores")
        .select("id, slug, name")
        .eq("id", storeId)
        .single();
      
      if (!storeData) {
        throw new Error(`Store not found: ${storeId}`);
      }

      const result = await backupStore(
        supabase,
        accessToken,
        driveFolderId,
        storeData.id,
        storeData.name || "Store",
        storeData.slug || "store",
        backupType === "scheduled" ? "manual" : backupType,
        createdBy
      );

      const duration = ((Date.now() - startTime) / 1000).toFixed(2);
      
      if (result.success) {
        return new Response(
          JSON.stringify({
            success: true,
            message: "Backup completed successfully",
            file_name: result.fileName,
            total_rows: result.totalRows,
            duration_seconds: parseFloat(duration),
          }),
          { 
            headers: { ...corsHeaders, "Content-Type": "application/json" },
            status: 200 
          }
        );
      } else {
        throw new Error(result.error);
      }
    }

    // SCHEDULED BACKUP: Backup ALL stores
    console.log("📦 Scheduled backup - backing up ALL stores...");
    
    const { data: stores, error: storesError } = await supabase
      .from("stores")
      .select("id, slug, name")
      .order("name");

    if (storesError) {
      throw new Error(`Failed to fetch stores: ${storesError.message}`);
    }

    if (!stores || stores.length === 0) {
      throw new Error("No stores found to backup");
    }

    console.log(`📋 Found ${stores.length} stores to backup`);

    const results: { storeName: string; success: boolean; error?: string }[] = [];

    for (const store of stores) {
      const result = await backupStore(
        supabase,
        accessToken,
        driveFolderId,
        store.id,
        store.name || "Store",
        store.slug || "store",
        "scheduled",
        null
      );
      
      results.push({
        storeName: store.name,
        success: result.success,
        error: result.error,
      });
    }

    const successCount = results.filter(r => r.success).length;
    const failedCount = results.filter(r => !r.success).length;
    const duration = ((Date.now() - startTime) / 1000).toFixed(2);

    console.log(`\n🎉 Scheduled backup completed in ${duration}s`);
    console.log(`✅ Success: ${successCount}/${stores.length} stores`);
    if (failedCount > 0) {
      console.log(`❌ Failed: ${failedCount} stores`);
    }

    return new Response(
      JSON.stringify({
        success: failedCount === 0,
        message: `Backed up ${successCount}/${stores.length} stores`,
        results: results,
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
