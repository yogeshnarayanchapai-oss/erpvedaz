import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");
const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const resendApiKey = Deno.env.get("RESEND_API_KEY");
    
    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    
    // Get auth header to identify user
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      throw new Error("No authorization header");
    }
    
    const token = authHeader.replace("Bearer ", "");
    const { data: { user }, error: userError } = await supabase.auth.getUser(token);
    
    if (userError || !user) {
      throw new Error("Unauthorized");
    }
    
    const { action, code } = await req.json();
    
    if (action === "send-code") {
      // Verify user is OWNER
      const { data: roleData, error: roleError } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", user.id)
        .single();
      
      if (roleError || roleData?.role !== "OWNER") {
        throw new Error("Only OWNER can initiate factory reset");
      }
      
      // Generate 6-digit code
      const resetCode = Math.floor(100000 + Math.random() * 900000).toString();
      const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes
      
      // Store code
      const { error: insertError } = await supabase
        .from("factory_reset_codes")
        .insert({
          user_id: user.id,
          code: resetCode,
          expires_at: expiresAt.toISOString(),
        });
      
      if (insertError) {
        console.error("Failed to store reset code:", insertError);
        throw new Error("Failed to generate reset code");
      }
      
      // Send email with code using Resend API
      const resendApiKey = RESEND_API_KEY;
      if (!resendApiKey) {
        console.error("RESEND_API_KEY not configured");
        throw new Error("Email service not configured");
      }
      
      const emailHtml = `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
          <h1 style="color: #dc2626;">⚠️ Factory Reset Request</h1>
          <p>You have requested a <strong>FACTORY RESET</strong> for Vedaz ERP.</p>
          <p><strong>This will permanently delete ALL data from the system including:</strong></p>
          <ul>
            <li>All orders</li>
            <li>All leads</li>
            <li>All customers</li>
            <li>All products</li>
            <li>All transactions</li>
            <li>All employees and HR data</li>
            <li>All backups</li>
          </ul>
          <div style="background: #fee2e2; border: 2px solid #dc2626; padding: 20px; border-radius: 8px; text-align: center; margin: 20px 0;">
            <p style="margin: 0; font-size: 14px; color: #991b1b;">Your verification code:</p>
            <p style="font-size: 36px; font-weight: bold; color: #dc2626; margin: 10px 0; letter-spacing: 8px;">${resetCode}</p>
            <p style="margin: 0; font-size: 12px; color: #991b1b;">Valid for 10 minutes</p>
          </div>
          <p style="color: #dc2626; font-weight: bold;">⚠️ DO NOT share this code with anyone!</p>
          <p>If you did not request this reset, please ignore this email and secure your account immediately.</p>
          <hr style="margin: 20px 0; border: none; border-top: 1px solid #e5e7eb;">
          <p style="font-size: 12px; color: #6b7280;">This email was sent from Vedaz ERP system.</p>
        </div>
      `;
      
      const emailResponse = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${resendApiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          from: "Vedaz ERP <noreply@vedaz.com.np>",
          to: [user.email!],
          subject: "⚠️ Factory Reset Verification Code - Vedaz ERP",
          html: emailHtml,
        }),
      });
      
      if (!emailResponse.ok) {
        const errorText = await emailResponse.text();
        console.error("Resend error:", errorText);
        throw new Error("Failed to send email");
      }
      
      console.log("Factory reset code sent to:", user.email);
      
      return new Response(
        JSON.stringify({ success: true, message: "Verification code sent to your email" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
      
    } else if (action === "verify-and-reset") {
      if (!code) {
        throw new Error("Verification code is required");
      }
      
      // Verify user is OWNER
      const { data: roleData, error: roleError } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", user.id)
        .single();
      
      if (roleError || roleData?.role !== "OWNER") {
        throw new Error("Only OWNER can perform factory reset");
      }
      
      // Verify code
      const { data: codeData, error: codeError } = await supabase
        .from("factory_reset_codes")
        .select("*")
        .eq("user_id", user.id)
        .eq("code", code)
        .eq("used", false)
        .gt("expires_at", new Date().toISOString())
        .order("created_at", { ascending: false })
        .limit(1)
        .single();
      
      if (codeError || !codeData) {
        throw new Error("Invalid or expired verification code");
      }
      
      // Mark code as used
      await supabase
        .from("factory_reset_codes")
        .update({ used: true })
        .eq("id", codeData.id);
      
      console.log("Starting factory reset for user:", user.id);
      
      // Delete all data in correct order (respecting foreign keys)
      const tablesToDelete = [
        // Dependent tables first
        "courier_updates",
        "cod_settlements",
        "logistics_orders",
        "order_events",
        "order_items",
        "order_comments",
        "orders",
        "call_logs",
        "followup_logs",
        "leads",
        "customer_notes",
        "customer_activity_log",
        "customers",
        "stock_movements",
        "daily_records",
        "inventory",
        "products",
        "accounting_transaction_lines",
        "accounting_transactions",
        "accounting_payments",
        "accounting_invoice_items",
        "accounting_invoices",
        "accounting_bills",
        "accounting_cash_ledger",
        "transactions",
        "accounting_banks",
        "accounting_suppliers",
        "accounting_wholesalers",
        "accounting_expense_categories",
        "accounts",
        "parties",
        "party_transactions",
        "asset_assignments",
        "assets",
        "attendance_records",
        "leave_requests",
        "payroll_records",
        "employee_bank_accounts",
        "employee_documents",
        "employees",
        "holidays",
        "policies",
        "notices",
        "chat_messages",
        "chat_room_members",
        "chat_rooms",
        "task_remarks",
        "tasks",
        "ads",
        "ads_spend",
        "ad_spend_reference",
        "campaigns",
        "influencers",
        "social_posts",
        "social_post_channels",
        "social_channels",
        "video_projects",
        "notification_preferences",
        "notifications",
        "warehouses",
        "branches",
        "branding",
        "backup_logs",
        "audit_manual_entries",
        "audit_snapshots",
        "audit_entry_toggles",
        "accounting_activity_logs",
        "audit_logs",
        "factory_reset_codes",
        // Keep stores and user_roles for system to function
      ];
      
      let deletedTables = 0;
      let errors: string[] = [];
      
      for (const table of tablesToDelete) {
        try {
          const { error } = await supabase
            .from(table)
            .delete()
            .neq("id", "00000000-0000-0000-0000-000000000000"); // Delete all (workaround)
          
          if (error) {
            console.error(`Failed to delete from ${table}:`, error.message);
            errors.push(`${table}: ${error.message}`);
          } else {
            console.log(`Deleted all from ${table}`);
            deletedTables++;
          }
        } catch (e) {
          console.error(`Error deleting from ${table}:`, e);
          errors.push(`${table}: ${e}`);
        }
      }
      
      console.log(`Factory reset complete. Deleted from ${deletedTables} tables.`);
      if (errors.length > 0) {
        console.log("Some errors occurred:", errors);
      }
      
      return new Response(
        JSON.stringify({ 
          success: true, 
          message: "Factory reset completed",
          deletedTables,
          errors: errors.length > 0 ? errors : undefined
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }
    
    throw new Error("Invalid action");
    
  } catch (error: any) {
    console.error("Factory reset error:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});

