import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useCurrentStoreId } from '@/hooks/useCurrentStoreId';
import { useEffect } from 'react';

export interface SidebarBadges {
  orders: number;
  leads: number;
  notifications: number;
  leaveRequests: number;
  lowStock: number;
}

export function useSidebarBadges() {
  const { profile, user } = useAuth();
  const queryClient = useQueryClient();
  const storeId = useCurrentStoreId();

  // Set up real-time subscriptions for badge updates
  useEffect(() => {
    if (!profile?.id) return;

    const channel = supabase
      .channel('sidebar-badges-realtime')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'leads' },
        () => {
          queryClient.invalidateQueries({ queryKey: ['sidebar-badges'] });
        }
      )
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'orders' },
        () => {
          queryClient.invalidateQueries({ queryKey: ['sidebar-badges'] });
        }
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'notifications' },
        () => {
          queryClient.invalidateQueries({ queryKey: ['sidebar-badges'] });
        }
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'leave_requests' },
        () => {
          queryClient.invalidateQueries({ queryKey: ['sidebar-badges'] });
        }
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'user_view_state' },
        () => {
          queryClient.invalidateQueries({ queryKey: ['sidebar-badges'] });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [profile?.id, queryClient]);

  return useQuery({
    queryKey: ['sidebar-badges', profile?.id, profile?.role, storeId],
    queryFn: async (): Promise<SidebarBadges> => {
      if (!profile?.id || !user?.id) return { orders: 0, leads: 0, notifications: 0, leaveRequests: 0, lowStock: 0 };

      const badges: SidebarBadges = { orders: 0, leads: 0, notifications: 0, leaveRequests: 0, lowStock: 0 };
      const role = profile.role;

      // Fetch user view state for "unseen" calculations
      const { data: viewStateData } = await supabase
        .from('user_view_state')
        .select('section, last_seen_at')
        .eq('user_id', user.id);

      const viewState: Record<string, string | null> = {};
      viewStateData?.forEach((row) => {
        viewState[row.section] = row.last_seen_at;
      });

      // Unread notifications count - filter by store_id
      let notificationQuery = supabase
        .from('notifications')
        .select('*', { count: 'exact', head: true })
        .or(`target_user_id.eq.${profile.id},target_role.eq.${role}`)
        .is('read_at', null);
      
      if (storeId) {
        notificationQuery = notificationQuery.eq('store_id', storeId);
      }
      
      const { count: notificationCount } = await notificationQuery;
      badges.notifications = notificationCount || 0;

      if (role === 'ADMIN' || role === 'MANAGER') {
        // Unseen leads (created after last_seen_at) - filter by store_id
        const leadsLastSeen = viewState['all_leads'];
        if (leadsLastSeen && storeId) {
          const { count: leadsCount } = await supabase
            .from('leads')
            .select('*', { count: 'exact', head: true })
            .eq('store_id', storeId)
            .gt('created_at', leadsLastSeen);
          badges.leads = leadsCount || 0;
        } else {
          badges.leads = 0;
        }

        // Unseen orders (created after last_seen_at) - filter by store_id
        const ordersLastSeen = viewState['all_orders'];
        if (ordersLastSeen && storeId) {
          const { count: ordersCount } = await supabase
            .from('orders')
            .select('*', { count: 'exact', head: true })
            .eq('store_id', storeId)
            .gt('created_at', ordersLastSeen);
          badges.orders = ordersCount || 0;
        } else {
          badges.orders = 0;
        }

        // Pending leave requests
        const { count: leaveCount } = await supabase
          .from('leave_requests')
          .select('*', { count: 'exact', head: true })
          .eq('status', 'Pending');
        badges.leaveRequests = leaveCount || 0;

        // Low stock alert (products below reorder level)
        const { count: lowStockCount } = await supabase
          .from('product_inventory')
          .select('*', { count: 'exact', head: true })
          .eq('reorder_required', true);
        badges.lowStock = lowStockCount || 0;
      }

      if (role === 'LEADS' && storeId) {
        const { count: leadsCount } = await supabase
          .from('leads')
          .select('*', { count: 'exact', head: true })
          .eq('store_id', storeId)
          .eq('current_team', 'LEADS')
          .eq('status', 'NEW');
        badges.leads = leadsCount || 0;
      }

      if (role === 'CALLING' && storeId) {
        const { count: leadsCount } = await supabase
          .from('leads')
          .select('*', { count: 'exact', head: true })
          .eq('store_id', storeId)
          .eq('assigned_to_user_id', profile.id)
          .in('status', ['ASSIGNED', 'IN_PROGRESS', 'FOLLOW_UP']);
        badges.leads = leadsCount || 0;

        const { count: ordersCount } = await supabase
          .from('orders')
          .select('*', { count: 'exact', head: true })
          .eq('store_id', storeId)
          .eq('sales_person_id', profile.id)
          .eq('delivery_location', 'INSIDE_VALLEY')
          .eq('inside_delivery_status', 'PENDING');
        badges.orders = ordersCount || 0;
      }

      if (role === 'FOLLOWUP' && storeId) {
        const { count: ordersCount } = await supabase
          .from('orders')
          .select('*', { count: 'exact', head: true })
          .eq('store_id', storeId)
          .eq('delivery_location', 'OUTSIDE_VALLEY')
          .in('order_status', ['CONFIRMED', 'PACKED']);
        badges.orders = ordersCount || 0;
      }

      if (role === 'HR') {
        const { count: leaveCount } = await supabase
          .from('leave_requests')
          .select('*', { count: 'exact', head: true })
          .eq('status', 'Pending');
        badges.leaveRequests = leaveCount || 0;
      }

      return badges;
    },
    enabled: !!profile?.id && !!storeId,
    refetchInterval: 60000,
  });
}
