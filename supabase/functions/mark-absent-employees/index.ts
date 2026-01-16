import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const today = new Date().toISOString().split("T")[0];

    // Get all active employees with their store and office time settings
    const { data: employees, error: empError } = await supabase
      .from("employees")
      .select("id, full_name, store_id, office_start_time, grace_minutes")
      .eq("status", "Active")
      .not("store_id", "is", null);

    if (empError) throw empError;

    // Get today's attendance records
    const { data: existingRecords, error: recError } = await supabase
      .from("attendance_records")
      .select("employee_id")
      .eq("date", today);

    if (recError) throw recError;

    const checkedInEmployeeIds = new Set(existingRecords?.map((r) => r.employee_id) || []);

    // Filter employees who haven't checked in and are past their cutoff time
    const now = new Date();
    const absentEmployees = (employees || []).filter((emp) => {
      if (checkedInEmployeeIds.has(emp.id)) return false;

      // Calculate cutoff time (office_start + grace)
      const officeStart = emp.office_start_time || "09:00:00";
      const grace = emp.grace_minutes ?? 30;

      const [hours, minutes] = officeStart.split(":").map(Number);
      const cutoffDate = new Date();
      cutoffDate.setHours(hours, minutes + grace, 0, 0);

      return now > cutoffDate;
    });

    // Mark absent employees
    if (absentEmployees.length > 0) {
      const absentRecords = absentEmployees.map((emp) => ({
        employee_id: emp.id,
        date: today,
        status: "Absent",
        store_id: emp.store_id,
        notes: "Auto-marked absent (no check-in)",
      }));

      const { error: insertError } = await supabase
        .from("attendance_records")
        .upsert(absentRecords, { onConflict: "employee_id,date", ignoreDuplicates: true });

      if (insertError) throw insertError;
    }

    return new Response(
      JSON.stringify({
        success: true,
        markedAbsent: absentEmployees.length,
        employees: absentEmployees.map((e) => e.full_name),
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error: any) {
    console.error("Error marking absent employees:", error);
    return new Response(
      JSON.stringify({ error: error?.message || "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
