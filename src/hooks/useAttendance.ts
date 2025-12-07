import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export interface AttendanceRecord {
  id: string;
  employee_id: string;
  date: string;
  check_in_time: string | null;
  check_out_time: string | null;
  status: 'Present' | 'Absent' | 'Half-day' | 'Work From Home' | 'Leave';
  notes: string | null;
  created_at: string;
  employees?: { full_name: string };
}

export function useAttendanceRecords(employeeId?: string, dateRange?: { from: string; to: string }) {
  return useQuery({
    queryKey: ['attendance', employeeId, dateRange],
    queryFn: async () => {
      let query = supabase
        .from('attendance_records' as any)
        .select('*, employees(full_name)')
        .order('date', { ascending: false });

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
  
  return useMutation({
    mutationFn: async () => {
      const { data: employee } = await supabase
        .from('employees')
        .select('id')
        .eq('user_id', (await supabase.auth.getUser()).data.user?.id)
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
        } as any)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['attendance'] });
      queryClient.invalidateQueries({ queryKey: ['today-attendance'] });
      queryClient.invalidateQueries({ queryKey: ['my-attendance'] });
      toast.success('Checked in successfully');
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
    mutationFn: async (data: Partial<AttendanceRecord>) => {
      const { data: result, error } = await supabase
        .from('attendance_records' as any)
        .insert(data as any)
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
