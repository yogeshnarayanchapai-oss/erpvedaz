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
      .eq("status", "Active");

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
      .eq("date", todayStr);

    if (holError) throw holError;

    const holidayStoreIds = new Set(holidays?.map((h) => h.store_id) || []);
    const hasGlobalHoliday = holidays?.some(h => h.store_id === null) || false;

    // Fetch approved leave requests that cover today
    const { data: approvedLeaves, error: leaveError } = await supabase
      .from("leave_requests")
      .select("employee_id")
      .eq("status", "Approved")
      .lte("from_date", todayStr)
      .gte("to_date", todayStr);

    if (leaveError) throw leaveError;

    const employeesOnLeave = new Set(approvedLeaves?.map((l) => l.employee_id) || []);

    // Build records to insert with appropriate status
    const recordsToInsert: Array<{
      employee_id: string;
      date: string;
      status: string;
      store_id: string | null;
      notes: string;
    }> = [];

    const isSaturday = dayOfWeek === 6;

    for (const emp of employees || []) {
      // Skip if already has an attendance record
      if (checkedInEmployeeIds.has(emp.id)) continue;

      let status: string;
      let notes: string;

      // 1. Saturday (weekly off)
      if (isSaturday) {
        status = "Saturday";
        notes = "Weekly off (Saturday)";
      }
      // 2. Approved leave
      else if (employeesOnLeave.has(emp.id)) {
        status = "Leave";
        notes = "Approved leave";
      }
      // 3. Global holiday or store-specific holiday
      else if (hasGlobalHoliday || (emp.store_id && holidayStoreIds.has(emp.store_id))) {
        status = "Holiday";
        notes = "Office holiday";
      }
      // 4. No check-in = Absent
      else {
        status = "Absent";
        notes = "Auto-marked absent (no check-in by 10 PM)";
      }

      recordsToInsert.push({
        employee_id: emp.id,
        date: todayStr,
        status,
        store_id: emp.store_id,
        notes,
      });
    }

    // Count by status
    const statusCounts: Record<string, number> = {};
    recordsToInsert.forEach(r => {
      statusCounts[r.status] = (statusCounts[r.status] || 0) + 1;
    });

    // Insert records
    if (recordsToInsert.length > 0) {
      const { error: insertError } = await supabase
        .from("attendance_records")
        .upsert(recordsToInsert, { onConflict: "employee_id,date" });

      if (insertError) throw insertError;
    }

    return new Response(
      JSON.stringify({
        success: true,
        totalRecords: recordsToInsert.length,
        statusBreakdown: statusCounts,
        employees: recordsToInsert.map((r) => {
          const emp = employees?.find(e => e.id === r.employee_id);
          return { name: emp?.full_name, status: r.status };
        }),
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error: unknown) {
    console.error("Error marking absent employees:", error);
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
