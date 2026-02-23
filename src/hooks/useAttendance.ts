import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useCurrentStoreId } from '@/hooks/useCurrentStoreId';
import { useIsModuleStoreWise } from '@/hooks/useModuleStoreSettings';
import { sendHRMEmail, getAdminTeamEmails } from '@/lib/hrmEmailService';

export interface AttendanceRecord {
  id: string;
  employee_id: string;
  date: string;
  check_in_time: string | null;
  check_out_time: string | null;
  status: 'Present' | 'Absent' | 'Half-day' | 'Work From Home' | 'Leave' | 'Late';
  late_minutes: number | null;
  notes: string | null;
  created_at: string;
  store_id?: string | null;
  employees?: { full_name: string; office_start_time?: string; grace_minutes?: number };
}

export function useAttendanceRecords(employeeId?: string, dateRange?: { from: string; to: string }) {
  const storeId = useCurrentStoreId();
  const filterByStore = useIsModuleStoreWise('hrm');

  return useQuery({
    queryKey: ['attendance', storeId, filterByStore, employeeId, dateRange],
    queryFn: async () => {
      let query = supabase
        .from('attendance_records')
        .select('*, employees(full_name)')
        .order('date', { ascending: false })
        .order('check_in_time', { ascending: false, nullsFirst: false });

      if (filterByStore && storeId) {
        query = query.eq('store_id', storeId);
      }
      if (employeeId) {
        query = query.eq('employee_id', employeeId);
      }
      if (dateRange?.from) {
        query = query.gte('date', dateRange.from);
      }
      if (dateRange?.to) {
        query = query.lte('date', dateRange.to);
      }

      const { data, error } = await query;
      if (error) throw error;
      return (data || []) as unknown as AttendanceRecord[];
    },
    enabled: !!storeId,
  });
}

export function useMyAttendance() {
  return useQuery({
    queryKey: ['my-attendance'],
    queryFn: async () => {
      const userId = (await supabase.auth.getUser()).data.user?.id;
      if (!userId) return [];

      const { data: employee } = await supabase
        .from('employees')
        .select('id')
        .eq('user_id', userId)
        .eq('status', 'Active')
        .maybeSingle();

      if (!employee) return [];

      const { data, error } = await supabase
        .from('attendance_records' as any)
        .select('*')
        .eq('employee_id', employee.id)
        .order('date', { ascending: false });

      if (error) throw error;
      return (data || []) as unknown as AttendanceRecord[];
    },
  });
}

export function useTodayAttendance() {
  const today = new Date().toISOString().split('T')[0];
  
  return useQuery({
    queryKey: ['today-attendance'],
    queryFn: async () => {
      const userId = (await supabase.auth.getUser()).data.user?.id;
      if (!userId) return null;

      const { data: employee } = await supabase
        .from('employees')
        .select('id')
        .eq('user_id', userId)
        .eq('status', 'Active')
        .maybeSingle();

      if (!employee) return null;

      const { data, error } = await supabase
        .from('attendance_records' as any)
        .select('*')
        .eq('employee_id', employee.id)
        .eq('date', today)
        .maybeSingle();

      if (error && error.code !== 'PGRST116') throw error;
      return data as unknown as AttendanceRecord | null;
    },
  });
}

// Helper function to calculate attendance status based on office time
function calculateAttendanceStatus(
  checkInTime: Date,
  officeStartTime: string | null,
  graceMinutes: number | null
): { status: 'Present' | 'Late'; lateMinutes: number | null } {
  // Default values
  const defaultOfficeStart = '09:00:00';
  const defaultGrace = 30;
  
  const officeStart = officeStartTime || defaultOfficeStart;
  const grace = graceMinutes ?? defaultGrace;
  
  // Parse office start time (format: HH:MM:SS or HH:MM)
  const [hours, minutes] = officeStart.split(':').map(Number);
  
  // Create a date with the office start time on the same day as check-in
  const officeStartDate = new Date(checkInTime);
  officeStartDate.setHours(hours, minutes, 0, 0);
  
  // Add grace period
  const graceDeadline = new Date(officeStartDate.getTime() + grace * 60 * 1000);
  
  if (checkInTime <= graceDeadline) {
    return { status: 'Present', lateMinutes: null };
  }
  
  // Calculate how many minutes late (from office start time, not grace deadline)
  const lateMs = checkInTime.getTime() - officeStartDate.getTime();
  const lateMinutes = Math.floor(lateMs / (60 * 1000));
  
  return { status: 'Late', lateMinutes };
}

export function useCheckIn() {
  const queryClient = useQueryClient();
  const currentStoreId = useCurrentStoreId();
  
  return useMutation({
    mutationFn: async () => {
      const { data: userData } = await supabase.auth.getUser();
      const userId = userData.user?.id;
      
      if (!userId) {
        throw new Error('You must be logged in to check in');
      }
      
      // Get employee with their assigned store and office time settings
      // Use maybeSingle() to handle cases where employee might not exist or multiple exist
      const { data: employees, error: empError } = await supabase
        .from('employees')
        .select('id, full_name, store_id, office_start_time, office_end_time, grace_minutes, status')
        .eq('user_id', userId)
        .eq('status', 'Active');

      if (empError) {
        console.error('Error fetching employee:', empError);
        throw new Error('Failed to fetch employee data. Please try again.');
      }

      if (!employees || employees.length === 0) {
        throw new Error('No active employee profile found for your account. Please contact your administrator.');
      }

      // Use the first active employee if multiple exist (shouldn't happen normally)
      const employee = employees[0];

      // Use employee's assigned store_id as the source of truth
      const employeeStoreId = employee.store_id;
      
      if (!employeeStoreId) {
        throw new Error('You are not assigned to any store. Please contact your administrator.');
      }

      // Validate that the current store matches the employee's assigned store
      if (currentStoreId && currentStoreId !== employeeStoreId) {
        // Get store name for better error message
        const { data: employeeStore } = await supabase
          .from('stores')
          .select('name')
          .eq('id', employeeStoreId)
          .single();
        
        throw new Error(`You are not assigned to this store. Your attendance is recorded in "${employeeStore?.name || 'your assigned store'}".`);
      }

      const today = new Date().toISOString().split('T')[0];
      const now = new Date();
      const nowIso = now.toISOString();

      // Calculate status based on office time settings
      const { status, lateMinutes } = calculateAttendanceStatus(
        now,
        employee.office_start_time,
        employee.grace_minutes
      );

      // Check if there's an existing record for today (could be auto-marked Absent, Saturday, Holiday, or Leave)
      const { data: existingRecord } = await supabase
        .from('attendance_records')
        .select('id, status')
        .eq('employee_id', employee.id)
        .eq('date', today)
        .maybeSingle();

      // Statuses that should be converted to Present/Late when employee checks in
      const convertibleStatuses = ['Absent', 'Saturday', 'Holiday', 'Leave'];

      let data;
      if (existingRecord) {
        // Update the existing record if it's a convertible status
        const previousStatus = existingRecord.status;
        const shouldConvert = convertibleStatuses.includes(previousStatus);
        
        const { data: updated, error } = await supabase
          .from('attendance_records' as any)
          .update({
            check_in_time: nowIso,
            status,
            late_minutes: lateMinutes,
            notes: shouldConvert
              ? `Status changed from ${previousStatus} to ${status} at check-in` 
              : null,
          } as any)
          .eq('id', existingRecord.id)
          .select()
          .single();

        if (error) throw error;
        data = updated;
      } else {
        // Create new record
        const { data: inserted, error } = await supabase
          .from('attendance_records' as any)
          .insert({
            employee_id: employee.id,
            date: today,
            check_in_time: nowIso,
            status,
            late_minutes: lateMinutes,
            store_id: employeeStoreId,
          } as any)
          .select()
          .single();

        if (error) throw error;
        data = inserted;
      }
      
      // Return employee info for notification
      return { 
        data, 
        employee_name: employee.full_name, 
        actor_id: userId, 
        store_id: employeeStoreId,
        status,
        lateMinutes 
      };
    },
    onSuccess: async (result) => {
      queryClient.invalidateQueries({ queryKey: ['attendance'] });
      queryClient.invalidateQueries({ queryKey: ['today-attendance'] });
      queryClient.invalidateQueries({ queryKey: ['my-attendance'] });
      
      // Show appropriate message based on status
      if (result.status === 'Late') {
        toast.warning(`Checked in - Late by ${result.lateMinutes} minutes`);
      } else {
        toast.success('Checked in successfully');
      }

      const storeId = result.store_id;

      // Notify Admin/Manager/HR about check-in
      try {
        const { data: storeUsers } = await supabase
          .from('user_store_access')
          .select('user_id, store_role')
          .eq('store_id', storeId)
          .eq('is_active', true)
          .in('store_role', ['ADMIN', 'MANAGER', 'HR', 'OWNER']);

        if (storeUsers && storeUsers.length > 0) {
          const checkInTime = new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
          const notifications = storeUsers.map(u => ({
            target_user_id: u.user_id,
            title: 'Staff Check-in',
            message: `${result.employee_name} checked in at ${checkInTime}`,
            type: 'ATTENDANCE',
            store_id: storeId,
            actor_id: result.actor_id,
            actor_name: result.employee_name,
          }));

          await supabase.from('notifications').insert(notifications);

          // Send email notification to admin team
          if (storeId) {
            const adminEmails = await getAdminTeamEmails(storeId);
            if (adminEmails.length > 0) {
              await sendHRMEmail({
                type: 'ATTENDANCE_CHECKIN',
                to: adminEmails,
                employeeName: result.employee_name,
                details: {
                  date: new Date().toLocaleDateString(),
                  time: checkInTime,
                },
              });
            }
          }
        }
      } catch (e) {
        console.error('Failed to send check-in notifications:', e);
      }
    },
    onError: (error: any) => {
      toast.error(error.message || 'Failed to check in');
    },
  });
}

export function useCheckOut() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (recordId: string) => {
      const now = new Date().toISOString();

      const { data, error } = await supabase
        .from('attendance_records' as any)
        .update({ check_out_time: now } as any)
        .eq('id', recordId)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['attendance'] });
      queryClient.invalidateQueries({ queryKey: ['today-attendance'] });
      queryClient.invalidateQueries({ queryKey: ['my-attendance'] });
      toast.success('Checked out successfully');
    },
    onError: (error: any) => {
      toast.error(error.message || 'Failed to check out');
    },
  });
}

export function useCreateAttendance() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (data: Partial<AttendanceRecord> & { employee_id: string }) => {
      // Get employee's assigned store_id
      const { data: employee } = await supabase
        .from('employees')
        .select('store_id')
        .eq('id', data.employee_id)
        .single();

      if (!employee?.store_id) {
        throw new Error('Employee is not assigned to any store');
      }

      const insertData = { ...data, store_id: employee.store_id } as any;
      const { data: result, error } = await supabase
        .from('attendance_records')
        .insert(insertData)
        .select()
        .single();

      if (error) throw error;
      return result;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['attendance'] });
      toast.success('Attendance record created');
    },
    onError: (error: any) => {
      toast.error(error.message || 'Failed to create attendance');
    },
  });
}

export function useUpdateAttendance() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ id, ...data }: Partial<AttendanceRecord> & { id: string }) => {
      const { data: result, error } = await supabase
        .from('attendance_records' as any)
        .update(data as any)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return result;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['attendance'] });
      toast.success('Attendance record updated');
    },
    onError: (error: any) => {
      toast.error(error.message || 'Failed to update attendance');
    },
  });
}
