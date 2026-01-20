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

    const today = new Date();
    const todayStr = today.toISOString().split("T")[0];
    const dayOfWeek = today.getDay(); // 0 = Sunday, 6 = Saturday

    // Skip if today is Saturday (auto holiday)
    if (dayOfWeek === 6) {
      return new Response(
        JSON.stringify({
          success: true,
          message: "Saturday is auto holiday - skipping absent marking",
          markedAbsent: 0,
          employees: [],
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Check current time - only run after 10 PM (22:00)
    const currentHour = today.getHours();
    if (currentHour < 22) {
      return new Response(
        JSON.stringify({
          success: true,
          message: `Too early to mark absent. Current hour: ${currentHour}. Will mark at 22:00 or later.`,
          markedAbsent: 0,
          employees: [],
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

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
      .eq("date", todayStr);

    if (recError) throw recError;

    const checkedInEmployeeIds = new Set(existingRecords?.map((r) => r.employee_id) || []);

    // Get all store IDs from employees
    const storeIds = [...new Set(employees?.map((e) => e.store_id).filter(Boolean) || [])];

    // Fetch office holidays for today across all stores
    const { data: holidays, error: holError } = await supabase
      .from("office_holidays")
      .select("store_id")
      .eq("date", todayStr)
      .in("store_id", storeIds);

    if (holError) throw holError;

    const holidayStoreIds = new Set(holidays?.map((h) => h.store_id) || []);

    // Fetch approved leave requests that cover today
    const { data: approvedLeaves, error: leaveError } = await supabase
      .from("leave_requests")
      .select("employee_id")
      .eq("status", "Approved")
      .lte("from_date", todayStr)
      .gte("to_date", todayStr);

    if (leaveError) throw leaveError;

    const employeesOnLeave = new Set(approvedLeaves?.map((l) => l.employee_id) || []);

    // Filter employees who should be marked absent
    const absentEmployees = (employees || []).filter((emp) => {
      // Skip if already has an attendance record
      if (checkedInEmployeeIds.has(emp.id)) return false;

      // Skip if employee's store has a holiday today
      if (holidayStoreIds.has(emp.store_id)) return false;

      // Skip if employee has approved leave today
      if (employeesOnLeave.has(emp.id)) return false;

      return true;
    });

    // Mark absent employees
    if (absentEmployees.length > 0) {
      const absentRecords = absentEmployees.map((emp) => ({
        employee_id: emp.id,
        date: todayStr,
        status: "Absent",
        store_id: emp.store_id,
        notes: "Auto-marked absent (no check-in by 10 PM)",
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
        skippedHoliday: holidayStoreIds.size,
        skippedLeave: employeesOnLeave.size,
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
