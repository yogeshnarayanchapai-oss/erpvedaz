import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { startOfMonth, format } from 'date-fns';
import { useCurrentStoreId } from '@/hooks/useCurrentStoreId';
import { notifyStaff, getEmployeeDetails, getCurrentUserName } from '@/lib/hrmNotifications';
import { sendHRMEmail, getEmployeeEmail } from '@/lib/hrmEmailService';

export interface LeaveQuota {
  id: string;
  employee_id: string;
  month_start: string;
  max_days: number;
  created_by: string | null;
  created_at: string;
  store_id?: string | null;
  employees?: { full_name: string };
}

export interface LeaveSettings {
  id: string;
  default_monthly_limit: number | null;
  apply_default_if_no_quota: boolean;
  updated_at: string;
  store_id?: string | null;
}

export function useLeaveQuotas(month?: string) {
  const storeId = useCurrentStoreId();

  return useQuery({
    queryKey: ['leave-quotas', storeId, month],
    queryFn: async () => {
      let query = supabase
        .from('leave_quota' as any)
        .select('*, employees(full_name)')
        .order('month_start', { ascending: false });

      if (storeId) query = query.eq('store_id', storeId);
      if (month) query = query.eq('month_start', month);

      const { data, error } = await query;
      if (error) throw error;
      return (data || []) as unknown as LeaveQuota[];
    },
    enabled: !!storeId,
  });
}

export function useLeaveSettings() {
  const storeId = useCurrentStoreId();

  return useQuery({
    queryKey: ['leave-settings', storeId],
    queryFn: async () => {
      let query = supabase
        .from('leave_settings' as any)
        .select('*');

      if (storeId) query = query.eq('store_id', storeId);
      
      const { data, error } = await query.limit(1).maybeSingle();

      if (error) throw error;
      return data as unknown as LeaveSettings | null;
    },
    enabled: !!storeId,
  });
}

export function useEmployeeLeaveQuota(employeeId: string, month?: string) {
  const monthStart = month || format(startOfMonth(new Date()), 'yyyy-MM-dd');
  
  return useQuery({
    queryKey: ['employee-leave-quota', employeeId, monthStart],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('leave_quota' as any)
        .select('*')
        .eq('employee_id', employeeId)
        .eq('month_start', monthStart)
        .maybeSingle();

      if (error) throw error;
      return data as unknown as LeaveQuota | null;
    },
    enabled: !!employeeId,
  });
}

export function useMyLeaveQuota() {
  const monthStart = format(startOfMonth(new Date()), 'yyyy-MM-dd');
  
  return useQuery({
    queryKey: ['my-leave-quota', monthStart],
    queryFn: async () => {
      const { data: employee } = await supabase
        .from('employees')
        .select('id')
        .eq('user_id', (await supabase.auth.getUser()).data.user?.id)
        .maybeSingle();

      if (!employee) return null;

      const { data, error } = await supabase
        .from('leave_quota' as any)
        .select('*')
        .eq('employee_id', employee.id)
        .eq('month_start', monthStart)
        .maybeSingle();

      if (error) throw error;
      return data as unknown as LeaveQuota | null;
    },
  });
}

export function useCreateLeaveQuota() {
  const queryClient = useQueryClient();
  const storeId = useCurrentStoreId();
  
  return useMutation({
    mutationFn: async (data: Partial<LeaveQuota>) => {
      const { data: user } = await supabase.auth.getUser();
      
      const { data: result, error } = await supabase
        .from('leave_quota' as any)
        .insert({
          ...data,
          created_by: user.user?.id,
          store_id: storeId,
        } as any)
        .select('*, employees(full_name, user_id)')
        .single();

      if (error) throw error;
      return result;
    },
    onSuccess: async (data) => {
      queryClient.invalidateQueries({ queryKey: ['leave-quotas'] });
      toast.success('Leave quota created');

      // Notify the employee about their quota
      try {
        const employee = (data as any).employees;
        if (employee?.user_id) {
          const actorName = await getCurrentUserName();
          await notifyStaff({
            type: 'LEAVE_QUOTA_UPDATED',
            title: 'Leave Quota Assigned',
            message: `Your leave quota for ${(data as any).month_start} has been set to ${(data as any).max_days} days`,
            targetUserId: employee.user_id,
            actorName,
            storeId: storeId || undefined,
            linkPath: '/my-hr/leave',
            entityType: 'leave_quota',
            entityId: (data as any).id,
          });

          // Send email notification
          const employeeEmail = await getEmployeeEmail((data as any).employee_id);
          if (employeeEmail) {
            await sendHRMEmail({
              type: 'LEAVE_QUOTA_UPDATED',
              to: [employeeEmail],
              employeeName: employee.full_name || 'Employee',
              details: {
                month: (data as any).month_start,
                maxDays: (data as any).max_days,
              },
              linkUrl: `${window.location.origin}/my-hr/leave`,
            });
          }
        }
      } catch (e) {
        console.error('Failed to send leave quota notification:', e);
      }
    },
    onError: (error: any) => {
      toast.error(error.message || 'Failed to create leave quota');
    },
  });
}

export function useUpdateLeaveQuota() {
  const queryClient = useQueryClient();
  const storeId = useCurrentStoreId();
  
  return useMutation({
    mutationFn: async ({ id, ...data }: Partial<LeaveQuota> & { id: string }) => {
      const { data: result, error } = await supabase
        .from('leave_quota' as any)
        .update(data as any)
        .eq('id', id)
        .select('*, employees(full_name, user_id)')
        .single();

      if (error) throw error;
      return result;
    },
    onSuccess: async (data) => {
      queryClient.invalidateQueries({ queryKey: ['leave-quotas'] });
      toast.success('Leave quota updated');

      // Notify the employee about updated quota
      try {
        const employee = (data as any).employees;
        if (employee?.user_id) {
          const actorName = await getCurrentUserName();
          await notifyStaff({
            type: 'LEAVE_QUOTA_UPDATED',
            title: 'Leave Quota Updated',
            message: `Your leave quota has been updated to ${(data as any).max_days} days`,
            targetUserId: employee.user_id,
            actorName,
            storeId: storeId || undefined,
            linkPath: '/my-hr/leave',
            entityType: 'leave_quota',
            entityId: (data as any).id,
          });

          // Send email notification
          const employeeEmail = await getEmployeeEmail((data as any).employee_id);
          if (employeeEmail) {
            await sendHRMEmail({
              type: 'LEAVE_QUOTA_UPDATED',
              to: [employeeEmail],
              employeeName: employee.full_name || 'Employee',
              details: {
                month: (data as any).month_start,
                maxDays: (data as any).max_days,
              },
              linkUrl: `${window.location.origin}/my-hr/leave`,
            });
          }
        }
      } catch (e) {
        console.error('Failed to send leave quota update notification:', e);
      }
    },
    onError: (error: any) => {
      toast.error(error.message || 'Failed to update leave quota');
    },
  });
}

export function useDeleteLeaveQuota() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('leave_quota' as any).delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['leave-quotas'] });
      toast.success('Leave quota deleted');
    },
    onError: (error: any) => {
      toast.error(error.message || 'Failed to delete leave quota');
    },
  });
}

export function useUpdateLeaveSettings() {
  const queryClient = useQueryClient();
  const storeId = useCurrentStoreId();
  
  return useMutation({
    mutationFn: async (data: Partial<LeaveSettings>) => {
      let query = supabase.from('leave_settings' as any).select('id');
      if (storeId) query = query.eq('store_id', storeId);
      const { data: existing } = await query.limit(1).maybeSingle();
      
      if (existing) {
        const { data: result, error } = await supabase
          .from('leave_settings' as any)
          .update(data as any)
          .eq('id', (existing as any).id)
          .select()
          .single();

        if (error) throw error;
        return result;
      } else {
        const { data: result, error } = await supabase
          .from('leave_settings' as any)
          .insert({ ...data, store_id: storeId } as any)
          .select()
          .single();

        if (error) throw error;
        return result;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['leave-settings'] });
      toast.success('Leave settings updated');
    },
    onError: (error: any) => {
      toast.error(error.message || 'Failed to update leave settings');
    },
  });
}

// Validation hook - check if employee can request leave
export function useValidateLeaveRequest() {
  return useMutation({
    mutationFn: async ({ 
      employeeId, 
      fromDate, 
      totalDays 
    }: { 
      employeeId: string; 
      fromDate: string; 
      toDate: string; 
      totalDays: number;
    }) => {
      const monthStart = format(startOfMonth(new Date(fromDate)), 'yyyy-MM-dd');
      
      // Get employee's quota for this month
      const { data: quota } = await supabase
        .from('leave_quota' as any)
        .select('max_days')
        .eq('employee_id', employeeId)
        .eq('month_start', monthStart)
        .maybeSingle();

      // Get leave settings if no quota
      const { data: settings } = await supabase
        .from('leave_settings' as any)
        .select('*')
        .limit(1)
        .maybeSingle();

      const quotaData = quota as unknown as { max_days: number } | null;
      const settingsData = settings as unknown as LeaveSettings | null;
      
      const maxDays = quotaData?.max_days ?? (settingsData?.apply_default_if_no_quota ? settingsData?.default_monthly_limit : null);

      if (maxDays === null) {
        return { valid: true, message: 'No limit set' };
      }

      // Get existing leaves for this month
      const { data: existingLeaves } = await supabase
        .from('leave_requests')
        .select('total_days')
        .eq('employee_id', employeeId)
        .gte('from_date', monthStart)
        .in('status', ['Approved', 'Pending']);

      const usedDays = existingLeaves?.reduce((sum, l) => sum + l.total_days, 0) || 0;
      const requestedTotal = usedDays + totalDays;

      if (requestedTotal > maxDays) {
        return { 
          valid: false, 
          message: `You have exceeded your leave limit for this month. Used: ${usedDays}, Requested: ${totalDays}, Max: ${maxDays}` 
        };
      }

      return { valid: true, remaining: maxDays - requestedTotal };
    },
  });
}
