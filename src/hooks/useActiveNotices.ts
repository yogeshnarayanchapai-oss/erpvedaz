import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useCurrentStoreId } from '@/hooks/useCurrentStoreId';
import { useAuth } from '@/contexts/AuthContext';

export interface ActiveNotice {
  id: string;
  title: string;
  message: string | null;
  start_date: string;
  end_date: string | null;
  show_as_popup: boolean;
}

export function useActiveNoticesForUser() {
  const storeId = useCurrentStoreId();
  const { user } = useAuth();

  return useQuery({
    queryKey: ['active-notices-for-user', storeId, user?.id],
    queryFn: async () => {
      if (!storeId || !user?.id) return [];

      const today = new Date().toISOString().split('T')[0];

      // Fetch employee link with department_id
      const { data: employeeLink } = await supabase
        .from('employees')
        .select('id, department_id')
        .eq('user_id', user.id)
        .eq('store_id', storeId)
        .maybeSingle();

      // Fetch all active notices for this store
      const { data: notices, error: noticesError } = await supabase
        .from('notices')
        .select('*')
        .eq('store_id', storeId)
        .eq('is_active', true)
        .eq('show_as_popup', true)
        .lte('start_date', today)
        .or(`end_date.is.null,end_date.gte.${today}`);

      if (noticesError) throw noticesError;
      if (!notices || notices.length === 0) return [];

      // Filter notices based on target type
      const filteredNotices = notices.filter((notice: any) => {
        if (notice.target_type === 'all') return true;
        
        if (notice.target_type === 'department' && employeeLink?.department_id) {
          const deptIds = notice.target_department_ids || [];
          return deptIds.includes(employeeLink.department_id);
        }
        
        if (notice.target_type === 'employee' && employeeLink?.id) {
          const empIds = notice.target_employee_ids || [];
          return empIds.includes(employeeLink.id);
        }
        
        return false;
      });

      if (filteredNotices.length === 0) return [];

      // Fetch dismissed notices for this user
      const { data: dismissals, error: dismissalsError } = await supabase
        .from('notice_dismissals')
        .select('notice_id')
        .eq('user_id', user.id);

      if (dismissalsError) throw dismissalsError;

      const dismissedIds = new Set((dismissals || []).map((d: any) => d.notice_id));

      // Return only non-dismissed notices
      return filteredNotices.filter((n: any) => !dismissedIds.has(n.id)) as ActiveNotice[];
    },
    enabled: !!storeId && !!user?.id,
  });
}

export function useDismissNotice() {
  const queryClient = useQueryClient();
  const storeId = useCurrentStoreId();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async (noticeId: string) => {
      if (!user?.id) throw new Error('Not authenticated');
      
      const { error } = await supabase
        .from('notice_dismissals')
        .insert({
          notice_id: noticeId,
          user_id: user.id,
          store_id: storeId,
        });
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['active-notices-for-user'] });
    },
  });
}
