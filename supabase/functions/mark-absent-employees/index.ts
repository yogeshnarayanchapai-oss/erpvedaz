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

    // Nepal time: UTC+5:45
    const nowUtc = new Date();
    const nepalOffsetMs = (5 * 60 + 45) * 60 * 1000;
    const nepalNow = new Date(nowUtc.getTime() + nepalOffsetMs);
    const todayStr = nepalNow.toISOString().split("T")[0];
    const dayOfWeek = nepalNow.getDay(); // 0=Sun, 6=Sat
    const currentNepalMinutes = nepalNow.getHours() * 60 + nepalNow.getMinutes();

    // Get all active employees with their store and office time settings
    const { data: employees, error: empError } = await supabase
      .from("employees")
      .select("id, full_name, store_id, office_start_time, grace_minutes")
      .eq("status", "Active");

    if (empError) throw empError;

    // Get today's existing attendance records
    const { data: existingRecords, error: recError } = await supabase
      .from("attendance_records")
      .select("employee_id")
      .eq("date", todayStr);

    if (recError) throw recError;

    const checkedInEmployeeIds = new Set(existingRecords?.map((r) => r.employee_id) || []);

    // Fetch office holidays for today
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

    const isSaturday = dayOfWeek === 6;

    const recordsToInsert: Array<{
      employee_id: string;
      date: string;
      status: string;
      store_id: string | null;
      notes: string;
    }> = [];

    for (const emp of employees || []) {
      // Skip if already has an attendance record (checked in, or already marked)
      if (checkedInEmployeeIds.has(emp.id)) continue;

      let status: string;
      let notes: string;

      // 1. Saturday
      if (isSaturday) {
        status = "Saturday";
        notes = "Weekly off (Saturday)";
      }
      // 2. Approved leave
      else if (employeesOnLeave.has(emp.id)) {
        status = "Leave";
        notes = "Approved leave";
      }
      // 3. Holiday
      else if (hasGlobalHoliday || (emp.store_id && holidayStoreIds.has(emp.store_id))) {
        status = "Holiday";
        notes = "Office holiday";
      }
      // 4. Check if grace period has passed for this employee
      else {
        const officeStart = emp.office_start_time || "09:00:00";
        const graceMins = emp.grace_minutes ?? 30;

        // Parse office start time to minutes since midnight
        const [h, m] = officeStart.split(":").map(Number);
        const deadlineMinutes = h * 60 + m + graceMins;

        // Only mark absent if current Nepal time has passed the deadline
        if (currentNepalMinutes < deadlineMinutes) {
          // Grace period hasn't passed yet for this employee, skip
          continue;
        }

        status = "Absent";
        notes = `Auto-marked absent (no check-in by ${officeStart} + ${graceMins}min grace)`;
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

    // Insert records (upsert to avoid duplicates)
    if (recordsToInsert.length > 0) {
      const { error: insertError } = await supabase
        .from("attendance_records")
        .upsert(recordsToInsert, { onConflict: "employee_id,date" });

      if (insertError) throw insertError;
    }

    return new Response(
      JSON.stringify({
        success: true,
        nepalTime: nepalNow.toISOString(),
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
