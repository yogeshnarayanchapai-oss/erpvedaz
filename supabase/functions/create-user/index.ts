import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface CreateUserRequest {
  email: string;
  password?: string;
  full_name?: string;
  name?: string;
  phone?: string;
  role: string;
  daily_target?: number;
  store_id?: string;
}

serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY")!;

    // Create client with user's auth token to verify they are admin/owner
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: "No authorization header" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const userClient = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
    });

    // Get the calling user's profile to verify admin/owner role
    const { data: { user: callingUser }, error: authError } = await userClient.auth.getUser();
    if (authError || !callingUser) {
      return new Response(
        JSON.stringify({ error: "Unauthorized" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Check if user is admin or owner via user_roles table
    const { data: roleData, error: roleError } = await userClient
      .from("user_roles")
      .select("role")
      .eq("user_id", callingUser.id)
      .single();

    const allowedRoles = ["ADMIN", "OWNER"];
    if (roleError || !roleData || !allowedRoles.includes(roleData.role)) {
      return new Response(
        JSON.stringify({ error: "Only administrators and owners can create users" }),
        { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Parse request body
    const requestData: CreateUserRequest = await req.json();
    const { email, password, full_name, name, phone, role, daily_target, store_id } = requestData;
    
    const userName = full_name || name;

    if (!email || !userName || !role) {
      return new Response(
        JSON.stringify({ error: "Missing required fields: email, name, role" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Generate a random password if not provided
    const userPassword = password || Math.random().toString(36).slice(-12) + "Aa1!";

    // Validate role
    const validRoles = ["ADMIN", "LEADS", "CALLING", "FOLLOWUP", "LOGISTICS", "MARKETING", "MANAGER", "HR", "OWNER"];
    if (!validRoles.includes(role)) {
      return new Response(
        JSON.stringify({ error: "Invalid role" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Create admin client with service role key
    const adminClient = createClient(supabaseUrl, supabaseServiceKey);

    // Create the user in Supabase Auth with auto-confirmed email
    const { data: authData, error: createError } = await adminClient.auth.admin.createUser({
      email,
      password: userPassword,
      email_confirm: true, // Auto-confirm email (no verification needed)
      user_metadata: { name: userName },
    });

    if (createError) {
      console.error("Error creating user:", createError);
      console.error("Error code:", (createError as any).code);
      console.error("Error status:", (createError as any).status);
      
      // Provide user-friendly error messages
      let errorMessage = createError.message;
      if (createError.message.includes("already been registered") || 
          createError.message.includes("already exists") ||
          (createError as any).code === "email_exists") {
        errorMessage = "A user with this email already exists. Please use a different email.";
      }
      return new Response(
        JSON.stringify({ error: errorMessage }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const newUserId = authData.user.id;

    // Upsert the profile (insert if doesn't exist, update if it does)
    const { error: profileError } = await adminClient
      .from("profiles")
      .upsert({
        id: newUserId,
        name: userName,
        email,
        role,
        phone: phone || null,
        daily_target: daily_target || 100,
        is_active: true,
        default_store_id: store_id || null,
      }, { onConflict: 'id' });

    if (profileError) {
      console.error("Error upserting profile:", profileError);
    }

    // Upsert user_roles table
    const { error: userRoleError } = await adminClient
      .from("user_roles")
      .upsert({
        user_id: newUserId,
        role,
      }, { onConflict: 'user_id' });

    if (userRoleError) {
      console.error("Error upserting user_roles:", userRoleError);
    }

    // If store_id is provided, also add user_store_access
    if (store_id) {
      const { error: storeAccessError } = await adminClient
        .from("user_store_access")
        .upsert({
          user_id: newUserId,
          store_id: store_id,
          access_level: 'admin',
          is_active: true,
        }, { onConflict: 'user_id,store_id' });

      if (storeAccessError) {
        console.error("Error adding store access:", storeAccessError);
      }
    }

    // User created successfully with auto-confirmed email - can log in immediately
    console.log("User created successfully and can log in immediately:", email);
    console.log("Generated password:", userPassword);

    return new Response(
      JSON.stringify({
        success: true,
        user: {
          id: newUserId,
          email: authData.user.email,
          name: userName,
          role,
        },
        temp_password: userPassword,
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
