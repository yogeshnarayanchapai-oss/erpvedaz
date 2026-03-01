import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useCurrentStoreId } from '@/hooks/useCurrentStoreId';

export interface SidebarBadges {
  orders: number;
  leads: number;
  notifications: number;
  leaveRequests: number;
  lowStock: number;
  pendingDocuments: number;
  todayAttendance: number;
  myTasks: number;
  myHR: number;
  teamChat: number;
  highAlert: number;
}

const EMPTY_BADGES: SidebarBadges = { orders: 0, leads: 0, notifications: 0, leaveRequests: 0, lowStock: 0, pendingDocuments: 0, todayAttendance: 0, myTasks: 0, myHR: 0, teamChat: 0, highAlert: 0 };

/**
 * Sidebar badges via single RPC call — no realtime, 10-minute polling.
 * Non-critical: failures silently return empty badges (circuit breaker).
 */
export function useSidebarBadges() {
  const { profile, user } = useAuth();
  const storeId = useCurrentStoreId();

  return useQuery({
    queryKey: ['sidebar-badges', profile?.id, profile?.role, storeId],
    queryFn: async (): Promise<SidebarBadges> => {
      if (!profile?.id || !user?.id || !storeId) return EMPTY_BADGES;

      try {
        const { data, error } = await supabase.rpc('get_sidebar_badges', {
          p_user_id: user.id,
          p_store_id: storeId,
          p_role: profile.role || 'CALLING',
        });

        if (error) {
          console.warn('Sidebar badges RPC failed, using empty badges:', error.message);
          return EMPTY_BADGES;
        }

        const d = data as any;
        return {
          ...EMPTY_BADGES,
          notifications: d?.notifications ?? 0,
          myTasks: d?.tasks ?? 0,
          leads: d?.leads ?? 0,
          orders: d?.orders ?? 0,
          leaveRequests: d?.leave_requests ?? 0,
          lowStock: d?.low_stock ?? 0,
          pendingDocuments: d?.pending_docs ?? 0,
        };
      } catch (e) {
        // Circuit breaker: never block core ERP for badge failures
        console.warn('Sidebar badges failed completely:', e);
        return EMPTY_BADGES;
      }
    },
    enabled: !!profile?.id && !!storeId,
    staleTime: 5 * 60 * 1000, // 5 minutes
    refetchInterval: 600000, // 10 minutes
    refetchIntervalInBackground: false,
    retry: 1, // Only 1 retry for non-critical
  });
}
