import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Parse request body for date range
    const body = await req.json().catch(() => ({}));
    const startDateStr = body.startDate || '2026-01-01';
    const endDateStr = body.endDate || new Date().toISOString().split('T')[0];

    console.log(`Backfilling absent records from ${startDateStr} to ${endDateStr}`);

    // Get all active employees with their store info
    const { data: employees, error: empError } = await supabase
      .from('employees')
      .select('id, full_name, store_id, joining_date, status')
      .eq('status', 'Active');

    if (empError) throw empError;
    console.log(`Found ${employees?.length || 0} active employees`);

    // Get all existing attendance records in the date range
    const { data: existingRecords, error: recError } = await supabase
      .from('attendance_records')
      .select('employee_id, date')
      .gte('date', startDateStr)
      .lte('date', endDateStr);

    if (recError) throw recError;

    // Create a set of existing records for quick lookup
    const existingSet = new Set(
      existingRecords?.map(r => `${r.employee_id}_${r.date}`) || []
    );
    console.log(`Found ${existingRecords?.length || 0} existing attendance records`);

    // Get all office holidays in the date range
    const { data: holidays, error: holError } = await supabase
      .from('office_holidays')
      .select('date, store_id')
      .gte('date', startDateStr)
      .lte('date', endDateStr);

    if (holError) throw holError;

    // Create a map of holiday dates by store
    const holidayMap = new Map<string, Set<string>>();
    holidays?.forEach(h => {
      if (!holidayMap.has(h.date)) {
        holidayMap.set(h.date, new Set());
      }
      if (h.store_id) {
        holidayMap.get(h.date)!.add(h.store_id);
      }
    });
    console.log(`Found ${holidays?.length || 0} office holidays`);

    // Get all approved leave requests in the date range
    const { data: leaves, error: leaveError } = await supabase
      .from('leave_requests')
      .select('employee_id, from_date, to_date')
      .eq('status', 'Approved')
      .lte('from_date', endDateStr)
      .gte('to_date', startDateStr);

    if (leaveError) throw leaveError;
    console.log(`Found ${leaves?.length || 0} approved leave requests`);

    // Create a set of employee-date pairs that are on leave
    const leaveSet = new Set<string>();
    leaves?.forEach(leave => {
      const fromDate = new Date(leave.from_date);
      const toDate = new Date(leave.to_date);
      for (let d = new Date(fromDate); d <= toDate; d.setDate(d.getDate() + 1)) {
        const dateStr = d.toISOString().split('T')[0];
        leaveSet.add(`${leave.employee_id}_${dateStr}`);
      }
    });

    // Generate all dates in the range
    const startDate = new Date(startDateStr);
    const endDate = new Date(endDateStr);
    const dates: string[] = [];
    
    for (let d = new Date(startDate); d <= endDate; d.setDate(d.getDate() + 1)) {
      dates.push(d.toISOString().split('T')[0]);
    }

    console.log(`Processing ${dates.length} days`);

    // Find missing absent records
    const absentRecords: Array<{
      employee_id: string;
      date: string;
      status: string;
      store_id: string | null;
      notes: string;
    }> = [];

    for (const dateStr of dates) {
      const date = new Date(dateStr + 'T00:00:00');
      const dayOfWeek = date.getDay();

      // Skip Saturdays (6 = Saturday, auto holiday)
      if (dayOfWeek === 6) {
        continue;
      }

      for (const emp of employees || []) {
        const key = `${emp.id}_${dateStr}`;

        // Skip if already has attendance record
        if (existingSet.has(key)) {
          continue;
        }

        // Skip if on approved leave
        if (leaveSet.has(key)) {
          continue;
        }

        // Skip if store has holiday on this date
        if (holidayMap.has(dateStr)) {
          const storeHolidays = holidayMap.get(dateStr)!;
          // If no store specified in holiday OR employee's store matches
          if (storeHolidays.size === 0 || (emp.store_id && storeHolidays.has(emp.store_id))) {
            continue;
          }
        }

        // Skip if employee joined after this date
        if (emp.joining_date && new Date(emp.joining_date) > date) {
          continue;
        }

        // This employee should be marked absent for this date
        absentRecords.push({
          employee_id: emp.id,
          date: dateStr,
          status: 'Absent',
          store_id: emp.store_id,
          notes: 'Auto-marked absent (backfill)',
        });
      }
    }

    console.log(`Found ${absentRecords.length} missing absent records to insert`);

    // Insert absent records in batches
    let insertedCount = 0;
    const batchSize = 100;
    
    for (let i = 0; i < absentRecords.length; i += batchSize) {
      const batch = absentRecords.slice(i, i + batchSize);
      const { error: insertError } = await supabase
        .from('attendance_records')
        .upsert(batch, { onConflict: 'employee_id,date' });

      if (insertError) {
        console.error(`Error inserting batch ${i / batchSize + 1}:`, insertError);
      } else {
        insertedCount += batch.length;
      }
    }

    console.log(`Successfully inserted ${insertedCount} absent records`);

    // Group by employee for summary
    const employeeSummary: Record<string, string[]> = {};
    absentRecords.forEach(r => {
      const emp = employees?.find(e => e.id === r.employee_id);
      const name = emp?.full_name || r.employee_id;
      if (!employeeSummary[name]) {
        employeeSummary[name] = [];
      }
      employeeSummary[name].push(r.date);
    });

    return new Response(
      JSON.stringify({
        success: true,
        message: `Backfilled ${insertedCount} absent records`,
        dateRange: { start: startDateStr, end: endDateStr },
        totalDays: dates.length,
        recordsInserted: insertedCount,
        employeeSummary,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error: unknown) {
    console.error('Error in backfill-absent-records:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({ success: false, error: errorMessage }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
    );
  }
});
