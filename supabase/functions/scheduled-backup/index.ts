import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Tables to completely skip (system/security sensitive)
const SKIP_TABLES = [
  'backup_logs',           // Don't backup backup logs
  'email_verifications',   // Security sensitive
  'failed_login_attempts', // Security sensitive
  'factory_reset_codes',   // Security sensitive
];

// Tables that should be backed up entirely (no store_id filter)
const GLOBAL_TABLES = [
  'stores', 'couriers', 'system_branding', 'system_modules', 
  'system_roles', 'role_permissions', 'company_info'
];

// ID field to lookup table mapping for enrichment
const ID_LOOKUPS: Record<string, { table: string; nameField: string }> = {
  'product_id': { table: 'products', nameField: 'name' },
  'warehouse_id': { table: 'warehouses', nameField: 'name' },
  'party_id': { table: 'parties', nameField: 'name' },
  'employee_id': { table: 'employees', nameField: 'full_name' },
  'customer_id': { table: 'customers', nameField: 'customer_name' },
  'account_id': { table: 'accounts', nameField: 'name' },
  'branch_id': { table: 'branches', nameField: 'branch_name' },
  'category_id': { table: 'categories', nameField: 'name' },
  'department_id': { table: 'departments', nameField: 'name' },
  'lead_id': { table: 'leads', nameField: 'client_name' },
  'order_id': { table: 'orders', nameField: 'order_number' },
  'courier_id': { table: 'couriers', nameField: 'name' },
  'task_id': { table: 'tasks', nameField: 'title' },
  'campaign_id': { table: 'campaigns', nameField: 'name' },
  'asset_id': { table: 'assets', nameField: 'name' },
  'store_id': { table: 'stores', nameField: 'name' },
  'from_warehouse_id': { table: 'warehouses', nameField: 'name' },
  'to_warehouse_id': { table: 'warehouses', nameField: 'name' },
  'supplier_id': { table: 'accounting_suppliers', nameField: 'name' },
  'wholesaler_id': { table: 'accounting_wholesalers', nameField: 'name' },
  'bank_id': { table: 'accounting_banks', nameField: 'bank_name' },
  'bank_account_id': { table: 'accounts', nameField: 'name' },
  'room_id': { table: 'chat_rooms', nameField: 'name' },
};

// User ID fields - all resolve to profiles.name
const USER_ID_FIELDS = [
  'user_id', 'created_by', 'updated_by', 'assigned_to_user_id', 
  'first_assigned_to_user_id', 'created_by_user_id', 'created_by_staff_id',
  'transferred_by_user_id', 'from_user_id', 'to_user_id', 'target_user_id',
  'sender_id', 'performed_by', 'changed_by', 'staff_id', 'actor_id',
  'handled_by', 'manager_id', 'approved_by', 'assigned_by'
];

// Get Google OAuth token using refresh token
async function getGoogleAccessToken(): Promise<string> {
  const clientId = Deno.env.get("GOOGLE_CLIENT_ID");
  const clientSecret = Deno.env.get("GOOGLE_CLIENT_SECRET");
  const refreshToken = Deno.env.get("GOOGLE_REFRESH_TOKEN");

  if (!clientId || !clientSecret || !refreshToken) {
    throw new Error("Missing Google OAuth credentials");
  }

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
    throw new Error(`Failed to get access token: ${tokenData.error_description || tokenData.error}`);
  }

  return tokenData.access_token;
}

// Search for existing backup file
async function findExistingBackupFile(
  accessToken: string,
  folderId: string | null,
  storeName: string
): Promise<{ id: string; name: string } | null> {
  let query = `name contains '${storeName}_' and name contains '_backup.json' and trashed=false`;
  if (folderId) {
    query += ` and '${folderId}' in parents`;
  }

  const response = await fetch(
    `https://www.googleapis.com/drive/v3/files?q=${encodeURIComponent(query)}&fields=files(id,name)&orderBy=modifiedTime desc`,
    { headers: { Authorization: `Bearer ${accessToken}` } }
  );

  if (!response.ok) return null;

  const data = await response.json();
  return data.files?.[0] || null;
}

// Upload to Google Drive
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

  if (folderId?.trim()) {
    metadata.parents = [folderId];
  }

  const boundary = "backup_boundary_" + Date.now();
  const body = 
    `--${boundary}\r\nContent-Type: application/json; charset=UTF-8\r\n\r\n` +
    JSON.stringify(metadata) + `\r\n--${boundary}\r\nContent-Type: application/json\r\n\r\n` +
    content + `\r\n--${boundary}--`;

  const response = await fetch(
    "https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart&fields=id,webViewLink",
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": `multipart/related; boundary=${boundary}`,
      },
      body,
    }
  );

  if (!response.ok) {
    throw new Error(`Drive upload failed: ${response.status}`);
  }

  return await response.json();
}

// Load all lookup maps for ID to name resolution
async function loadLookupMaps(supabase: any, storeId: string): Promise<Record<string, Record<string, string>>> {
  const maps: Record<string, Record<string, string>> = {};
  
  // Load profiles (global - all users)
  const { data: profiles } = await supabase.from('profiles').select('id, name');
  maps['user_id'] = {};
  for (const p of profiles || []) {
    maps['user_id'][p.id] = p.name || 'Unknown';
  }
  
  // Load store-specific lookups
  const lookupConfigs = [
    { key: 'product_id', table: 'products', idField: 'id', nameField: 'name', filterStore: true },
    { key: 'warehouse_id', table: 'warehouses', idField: 'id', nameField: 'name', filterStore: true },
    { key: 'party_id', table: 'parties', idField: 'id', nameField: 'name', filterStore: true },
    { key: 'employee_id', table: 'employees', idField: 'id', nameField: 'full_name', filterStore: true },
    { key: 'customer_id', table: 'customers', idField: 'id', nameField: 'customer_name', filterStore: true },
    { key: 'account_id', table: 'accounts', idField: 'id', nameField: 'name', filterStore: true },
    { key: 'branch_id', table: 'branches', idField: 'id', nameField: 'branch_name', filterStore: true },
    { key: 'category_id', table: 'categories', idField: 'id', nameField: 'name', filterStore: true },
    { key: 'department_id', table: 'departments', idField: 'id', nameField: 'name', filterStore: true },
    { key: 'lead_id', table: 'leads', idField: 'id', nameField: 'client_name', filterStore: true },
    { key: 'order_id', table: 'orders', idField: 'id', nameField: 'order_number', filterStore: true },
    { key: 'task_id', table: 'tasks', idField: 'id', nameField: 'title', filterStore: true },
    { key: 'campaign_id', table: 'campaigns', idField: 'id', nameField: 'name', filterStore: true },
    { key: 'asset_id', table: 'assets', idField: 'id', nameField: 'name', filterStore: true },
    { key: 'room_id', table: 'chat_rooms', idField: 'id', nameField: 'name', filterStore: true },
    { key: 'supplier_id', table: 'accounting_suppliers', idField: 'id', nameField: 'name', filterStore: true },
    { key: 'wholesaler_id', table: 'accounting_wholesalers', idField: 'id', nameField: 'name', filterStore: true },
    { key: 'bank_id', table: 'accounting_banks', idField: 'id', nameField: 'bank_name', filterStore: true },
    // Global lookups
    { key: 'courier_id', table: 'couriers', idField: 'id', nameField: 'name', filterStore: false },
    { key: 'store_id', table: 'stores', idField: 'id', nameField: 'name', filterStore: false },
  ];
  
  for (const config of lookupConfigs) {
    try {
      let query = supabase.from(config.table).select(`${config.idField}, ${config.nameField}`);
      if (config.filterStore) {
        query = query.eq('store_id', storeId);
      }
      const { data } = await query.limit(10000);
      
      maps[config.key] = {};
      for (const row of data || []) {
        maps[config.key][row[config.idField]] = row[config.nameField] || 'Unknown';
      }
    } catch {
      maps[config.key] = {};
    }
  }
  
  // Copy user_id map to all user fields
  for (const field of USER_ID_FIELDS) {
    if (field !== 'user_id') {
      maps[field] = maps['user_id'];
    }
  }
  
  // Copy warehouse map for from/to warehouse
  maps['from_warehouse_id'] = maps['warehouse_id'];
  maps['to_warehouse_id'] = maps['warehouse_id'];
  maps['bank_account_id'] = maps['account_id'];
  
  return maps;
}

// Enrich a single row with human-readable names
function enrichRow(row: any, lookupMaps: Record<string, Record<string, string>>): any {
  const enriched = { ...row };
  
  for (const [key, value] of Object.entries(row)) {
    if (value && typeof value === 'string' && lookupMaps[key]) {
      const name = lookupMaps[key][value];
      if (name) {
        // Add enriched name field with underscore prefix
        const nameKey = key.replace('_id', '_name').replace('_by', '_by_name');
        enriched[`_${nameKey}`] = name;
      }
    }
  }
  
  return enriched;
}

// Backup a single store with dynamic table discovery
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
  console.log(`\n📦 ===== Backing up store: ${storeName} =====`);
  
  // Create backup log entry
  const { data: logEntry } = await supabase
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

  const logId = logEntry?.id;

  try {
    // DYNAMIC TABLE DISCOVERY - fetch all tables from database
    console.log("🔍 Discovering all tables dynamically...");
    const { data: allTables, error: tablesError } = await supabase.rpc('get_all_public_tables');
    
    if (tablesError) {
      throw new Error(`Failed to discover tables: ${tablesError.message}`);
    }
    
    console.log(`📋 Found ${allTables.length} tables in database`);
    
    // Load lookup maps for data enrichment
    console.log("📚 Loading lookup maps for data enrichment...");
    const lookupMaps = await loadLookupMaps(supabase, storeId);
    
    const backupData: Record<string, any[]> = {};
    let totalRows = 0;
    let tablesBackedUp = 0;

    for (const tableInfo of allTables) {
      const tableName = tableInfo.table_name;
      const hasStoreId = tableInfo.has_store_id;
      
      // Skip system/sensitive tables
      if (SKIP_TABLES.includes(tableName)) {
        continue;
      }
      
      try {
        let query;
        
        if (GLOBAL_TABLES.includes(tableName)) {
          // Backup entire table (no filter)
          query = supabase.from(tableName).select("*");
        } else if (hasStoreId) {
          // Filter by store_id
          query = supabase.from(tableName).select("*").eq("store_id", storeId);
        } else {
          // Table without store_id - skip unless it's a known global table
          // These are typically junction tables or tables related to auth
          continue;
        }
        
        const { data, error } = await query.limit(50000);

        if (error) {
          console.warn(`⚠️ Error exporting ${tableName}:`, error.message);
          backupData[tableName] = [];
        } else if (data && data.length > 0) {
          // Enrich each row with human-readable names
          const enrichedData = data.map(row => enrichRow(row, lookupMaps));
          backupData[tableName] = enrichedData;
          totalRows += data.length;
          tablesBackedUp++;
          console.log(`✅ ${tableName}: ${data.length} rows`);
        } else {
          backupData[tableName] = [];
        }
      } catch (err) {
        console.warn(`⚠️ Failed to export ${tableName}:`, err);
        backupData[tableName] = [];
      }
    }

    // Create backup file
    const today = new Date();
    const dateStr = today.toISOString().split('T')[0];
    const fileName = `${storeName}_${dateStr}_backup.json`;
    
    const backupContent = JSON.stringify({
      backup_info: {
        version: "2.0",  // New version with enriched data
        timestamp: new Date().toISOString(),
        store_id: storeId,
        store_name: storeName,
        store_slug: storeSlug,
        backup_date: dateStr,
        tables_count: tablesBackedUp,
        total_rows: totalRows,
        backup_type: backupType,
        dynamic_discovery: true,
        enriched_data: true,
      },
      tables: backupData,
    }, null, 2);

    const fileSize = new Blob([backupContent]).size;
    console.log(`📊 Backup size: ${(fileSize / 1024 / 1024).toFixed(2)} MB, Tables: ${tablesBackedUp}`);

    // Delete existing backup file and upload new one
    const existingFile = await findExistingBackupFile(accessToken, driveFolderId, storeName);
    
    if (existingFile) {
      console.log(`🗑️ Deleting old backup: ${existingFile.name}`);
      await fetch(`https://www.googleapis.com/drive/v3/files/${existingFile.id}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${accessToken}` },
      });
    }

    console.log(`☁️ Uploading: ${fileName}`);
    const driveResult = await uploadToGoogleDrive(accessToken, driveFolderId, fileName, backupContent);

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

    console.log(`✅ ${storeName}: ${totalRows} rows in ${tablesBackedUp} tables`);
    return { success: true, fileName, totalRows };

  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error(`❌ ${storeName} backup failed:`, errorMessage);

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
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  const startTime = Date.now();
  console.log("🚀 Starting dynamic database backup...");

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const driveFolderId = Deno.env.get("GOOGLE_DRIVE_FOLDER_ID") || null;

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    let backupType = "scheduled";
    let createdBy = null;
    let storeId = null;
    
    try {
      const body = await req.json();
      backupType = body.trigger || "scheduled";
      createdBy = body.user_id || null;
      storeId = body.store_id || null;
    } catch {
      // Default to scheduled
    }

    const accessToken = await getGoogleAccessToken();

    // Manual backup for specific store
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
        supabase, accessToken, driveFolderId,
        storeData.id, storeData.name || "Store", storeData.slug || "store",
        backupType === "scheduled" ? "manual" : backupType, createdBy
      );

      const duration = ((Date.now() - startTime) / 1000).toFixed(2);
      
      return new Response(
        JSON.stringify({
          success: result.success,
          message: result.success ? "Backup completed" : result.error,
          file_name: result.fileName,
          total_rows: result.totalRows,
          duration_seconds: parseFloat(duration),
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: result.success ? 200 : 500 }
      );
    }

    // Scheduled backup: ALL stores
    console.log("📦 Scheduled backup - all stores...");
    
    const { data: stores, error: storesError } = await supabase
      .from("stores")
      .select("id, slug, name")
      .order("name");

    if (storesError || !stores?.length) {
      throw new Error(storesError?.message || "No stores found");
    }

    console.log(`📋 Found ${stores.length} stores`);

    const results: { storeName: string; success: boolean; error?: string }[] = [];

    for (const store of stores) {
      const result = await backupStore(
        supabase, accessToken, driveFolderId,
        store.id, store.name || "Store", store.slug || "store",
        "scheduled", null
      );
      
      results.push({
        storeName: store.name,
        success: result.success,
        error: result.error,
      });
    }

    const successCount = results.filter(r => r.success).length;
    const duration = ((Date.now() - startTime) / 1000).toFixed(2);

    return new Response(
      JSON.stringify({
        success: successCount === stores.length,
        message: `Backed up ${successCount}/${stores.length} stores`,
        results,
        duration_seconds: parseFloat(duration),
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 200 }
    );

  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error("❌ Backup failed:", errorMessage);

    return new Response(
      JSON.stringify({ success: false, error: errorMessage }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 500 }
    );
  }
});
