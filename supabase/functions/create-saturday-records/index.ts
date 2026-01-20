import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// This function creates Saturday attendance records
// Should be called at 12:01 AM on Saturdays via cron
Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Parse request body for optional target_date
    let targetDate: string;
    try {
      const body = await req.json();
      targetDate = body.target_date || new Date().toISOString().split("T")[0];
    } catch {
      targetDate = new Date().toISOString().split("T")[0];
    }

    // Check if target date is Saturday
    const date = new Date(targetDate + "T00:00:00Z");
    const dayOfWeek = date.getUTCDay(); // 0 = Sunday, 6 = Saturday

    if (dayOfWeek !== 6) {
      return new Response(
        JSON.stringify({
          success: true,
          message: `${targetDate} is not a Saturday (day of week: ${dayOfWeek})`,
          recordsCreated: 0,
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Get all active employees
    const { data: employees, error: empError } = await supabase
      .from("employees")
      .select("id, full_name, store_id")
      .eq("status", "Active");

    if (empError) throw empError;

    // Get existing records for this date
    const { data: existingRecords, error: recError } = await supabase
      .from("attendance_records")
      .select("employee_id")
      .eq("date", targetDate);

    if (recError) throw recError;

    const existingEmployeeIds = new Set(existingRecords?.map((r) => r.employee_id) || []);

    // Build records to insert
    const recordsToInsert = [];
    for (const emp of employees || []) {
      if (!existingEmployeeIds.has(emp.id)) {
        recordsToInsert.push({
          employee_id: emp.id,
          date: targetDate,
          status: "Saturday",
          store_id: emp.store_id,
          notes: "Weekly off (Saturday)",
        });
      }
    }

    // Insert records
    if (recordsToInsert.length > 0) {
      const { error: insertError } = await supabase
        .from("attendance_records")
        .insert(recordsToInsert);

      if (insertError) throw insertError;
    }

    console.log(`Created ${recordsToInsert.length} Saturday records for ${targetDate}`);

    return new Response(
      JSON.stringify({
        success: true,
        targetDate,
        recordsCreated: recordsToInsert.length,
        employees: recordsToInsert.map((r) => {
          const emp = employees?.find((e) => e.id === r.employee_id);
          return emp?.full_name;
        }),
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error: unknown) {
    console.error("Error creating Saturday records:", error);
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
