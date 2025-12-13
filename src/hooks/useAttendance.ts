import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useCurrentStoreId } from '@/hooks/useCurrentStoreId';

export interface AttendanceRecord {
  id: string;
  employee_id: string;
  date: string;
  check_in_time: string | null;
  check_out_time: string | null;
  status: 'Present' | 'Absent' | 'Half-day' | 'Work From Home' | 'Leave';
  notes: string | null;
  created_at: string;
  store_id?: string | null;
  employees?: { full_name: string };
}

export function useAttendanceRecords(employeeId?: string, dateRange?: { from: string; to: string }) {
  const storeId = useCurrentStoreId();

  return useQuery({
    queryKey: ['attendance', storeId, employeeId, dateRange],
    queryFn: async () => {
      let query = supabase
        .from('attendance_records')
        .select('*, employees(full_name)')
        .order('date', { ascending: false });

      if (storeId) {
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
      const { data: employee } = await supabase
        .from('employees')
        .select('id')
        .eq('user_id', (await supabase.auth.getUser()).data.user?.id)
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
      const { data: employee } = await supabase
        .from('employees')
        .select('id')
        .eq('user_id', (await supabase.auth.getUser()).data.user?.id)
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

export function useCheckIn() {
  const queryClient = useQueryClient();
  const storeId = useCurrentStoreId();
  
  return useMutation({
    mutationFn: async () => {
      const { data: userData } = await supabase.auth.getUser();
      const userId = userData.user?.id;
      
      const { data: employee } = await supabase
        .from('employees')
        .select('id, full_name')
        .eq('user_id', userId)
        .single();

      if (!employee) throw new Error('Employee not found');

      const today = new Date().toISOString().split('T')[0];
      const now = new Date().toISOString();

      const { data, error } = await supabase
        .from('attendance_records' as any)
        .insert({
          employee_id: employee.id,
          date: today,
          check_in_time: now,
          status: 'Present',
          store_id: storeId,
        } as any)
        .select()
        .single();

      if (error) throw error;
      
      // Return employee info for notification
      return { data, employee_name: employee.full_name, actor_id: userId };
    },
    onSuccess: async (data) => {
      queryClient.invalidateQueries({ queryKey: ['attendance'] });
      queryClient.invalidateQueries({ queryKey: ['today-attendance'] });
      queryClient.invalidateQueries({ queryKey: ['my-attendance'] });
      toast.success('Checked in successfully');

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
            message: `${data.employee_name} checked in at ${checkInTime}`,
            type: 'ATTENDANCE',
            store_id: storeId,
            actor_id: data.actor_id,
            actor_name: data.employee_name,
          }));

          await supabase.from('notifications').insert(notifications);
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
  const storeId = useCurrentStoreId();
  
  return useMutation({
    mutationFn: async (data: Partial<AttendanceRecord>) => {
      const insertData = { ...data, store_id: storeId } as any;
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
