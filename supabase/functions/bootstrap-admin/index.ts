import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

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

    // Create admin client with service role key
    const adminClient = createClient(supabaseUrl, supabaseServiceKey);

    // Check if any admin users exist
    const { data: existingAdmins, error: checkError } = await adminClient
      .from("user_roles")
      .select("user_id")
      .eq("role", "ADMIN")
      .limit(1);

    if (checkError) {
      console.error("Error checking existing admins:", checkError);
    }

    if (existingAdmins && existingAdmins.length > 0) {
      return new Response(
        JSON.stringify({ error: "Admin user already exists. This endpoint is disabled." }),
        { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Parse request body
    const { email, password, name } = await req.json();

    if (!email || !password) {
      return new Response(
        JSON.stringify({ error: "Email and password are required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log("Creating first admin user:", email);

    // Create the user using Supabase Admin API
    const { data: authData, error: createError } = await adminClient.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: { name: name || "Admin" },
    });

    if (createError) {
      console.error("Error creating user:", createError);
      return new Response(
        JSON.stringify({ error: createError.message }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const userId = authData.user.id;
    console.log("User created in auth:", userId);

    // Wait for trigger to create profile, then update to ADMIN
    await new Promise(resolve => setTimeout(resolve, 1000));

    // Update the profile to ADMIN role
    const { error: profileError } = await adminClient
      .from("profiles")
      .update({ role: "ADMIN", is_active: true })
      .eq("id", userId);

    if (profileError) {
      console.error("Error updating profile:", profileError);
    }

    // Update user_roles table
    const { error: userRoleError } = await adminClient
      .from("user_roles")
      .update({ role: "ADMIN" })
      .eq("user_id", userId);

    if (userRoleError) {
      console.error("Error updating user_roles:", userRoleError);
    }

    console.log("Admin user created successfully");

    return new Response(
      JSON.stringify({
        success: true,
        message: "Admin user created successfully. You can now log in.",
        user: { id: userId, email },
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Unexpected error:", error);
    return new Response(
      JSON.stringify({ error: "Internal server error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
