import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useCurrentStoreId } from '@/hooks/useCurrentStoreId';
import { useEffect } from 'react';
import { useNotifications } from '@/hooks/useNotifications';
import { format, subDays } from 'date-fns';

const HIGH_ALERT_DAYS_KEY = 'inventory_high_alert_days';

export interface SidebarBadges {
  orders: number;
  leads: number;
  notifications: number;
  leaveRequests: number;
  lowStock: number;
  pendingDocuments: number;
  todayAttendance: number;
  myTasks: number;
  myHR: number; // Staff-specific: admin actions requiring their attention
  teamChat: number; // Unread chat messages across accessible rooms
  highAlert: number; // High alert inventory count
}

// Helper function to fetch HR notifications count - extracted to avoid TS deep instantiation
async function fetchHRNotificationsCount(userId: string): Promise<number> {
  const hrTypes = ['DOCUMENT', 'LEAVE', 'PAYROLL', 'ASSET'];
  
  // @ts-ignore - Workaround for TS2589 deep type instantiation with supabase
  const { data } = await supabase
    .from('notifications')
    .select('type')
    .eq('to_user_id', userId)
    .eq('is_read', false);
  
  if (!data) return 0;
  return (data as Array<{ type: string | null }>).filter(n => hrTypes.includes(n.type || '')).length;
}

export function useSidebarBadges() {
  const { profile, user } = useAuth();
  const queryClient = useQueryClient();
  const storeId = useCurrentStoreId();
  const { unreadCount } = useNotifications();

  // Set up real-time subscriptions for badge updates
  useEffect(() => {
    if (!profile?.id || !storeId) return;

    const channel = supabase
      .channel(`sidebar-badges-realtime-${storeId}-${profile.id}`)
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
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'tasks' },
        () => {
          queryClient.invalidateQueries({ queryKey: ['sidebar-badges'] });
          queryClient.invalidateQueries({ queryKey: ['my-tasks'] });
          queryClient.invalidateQueries({ queryKey: ['tasks'] });
        }
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'chat_messages', filter: `store_id=eq.${storeId}` },
        () => {
          queryClient.invalidateQueries({ queryKey: ['sidebar-badges'] });
          queryClient.invalidateQueries({ queryKey: ['unread-count'] });
          queryClient.invalidateQueries({ queryKey: ['unread-per-room'] });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [profile?.id, storeId, queryClient]);

  return useQuery({
    queryKey: ['sidebar-badges', profile?.id, profile?.role, storeId],
    queryFn: async (): Promise<SidebarBadges> => {
      if (!profile?.id || !user?.id) return { orders: 0, leads: 0, notifications: 0, leaveRequests: 0, lowStock: 0, pendingDocuments: 0, todayAttendance: 0, myTasks: 0, myHR: 0, teamChat: 0, highAlert: 0 };

      const badges: SidebarBadges = { orders: 0, leads: 0, notifications: 0, leaveRequests: 0, lowStock: 0, pendingDocuments: 0, todayAttendance: 0, myTasks: 0, myHR: 0, teamChat: 0, highAlert: 0 };
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

      // Notifications badge count - use unified notification hook for consistent logic
      badges.notifications = unreadCount || 0;

      // My Tasks badge - for ALL roles (pending + in progress tasks assigned to current user)
      const { count: myTaskCount } = await supabase
        .from('tasks')
        .select('*', { count: 'exact', head: true })
        .eq('assigned_to_user_id', user.id)
        .in('status', ['PENDING', 'IN_PROGRESS']);
      badges.myTasks = myTaskCount || 0;

      if (role === 'ADMIN' || role === 'MANAGER' || role === 'OWNER') {
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

        // Pending leave requests (store-wise)
        let leaveQuery = supabase
          .from('leave_requests')
          .select('*', { count: 'exact', head: true })
          .eq('status', 'Pending');
        if (storeId) {
          leaveQuery = leaveQuery.eq('store_id', storeId);
        }
        const { count: leaveCount } = await leaveQuery;
        badges.leaveRequests = leaveCount || 0;

        // Low stock alert (products below reorder level, excluding reorder_level = 0)
        const { count: lowStockCount } = await supabase
          .from('product_inventory')
          .select('*', { count: 'exact', head: true })
          .eq('reorder_required', true)
          .gt('reorder_level', 0);
        badges.lowStock = lowStockCount || 0;

        // Pending documents for approval (store-wise)
        if (storeId) {
          const { count: docCount } = await supabase
            .from('employee_documents')
            .select('*, employees!inner(store_id)', { count: 'exact', head: true })
            .eq('status', 'PENDING')
            .eq('employees.store_id', storeId);
          badges.pendingDocuments = docCount || 0;
        }

        // High Alert inventory count (store-wise)
        const highAlertDays = typeof window !== 'undefined' 
          ? parseInt(localStorage.getItem(HIGH_ALERT_DAYS_KEY) || '0') || null 
          : null;
        
        if (highAlertDays && highAlertDays >= 1 && storeId) {
          // Get current stock for store products
          const { data: stockData } = await supabase
            .from('product_inventory')
            .select('product_id, warehouse_id, current_stock, products!inner(store_id, is_active)')
            .eq('products.store_id', storeId)
            .eq('products.is_active', true);

          if (stockData && stockData.length > 0) {
            const currentStockMap = new Map<string, number>();
            stockData.forEach((s: any) => {
              const key = `${s.product_id}_${s.warehouse_id}`;
              currentStockMap.set(key, s.current_stock || 0);
            });

            // Get OUT movements for past X days
            const today = new Date();
            const startDate = format(subDays(today, highAlertDays - 1), 'yyyy-MM-dd');
            const endDate = format(today, 'yyyy-MM-dd');

            const { data: movements } = await supabase
              .from('stock_movements')
              .select('product_id, warehouse_id, movement_type, qty, products!inner(store_id)')
              .eq('products.store_id', storeId)
              .eq('movement_type', 'OUT')
              .or('is_deleted.is.null,is_deleted.eq.false')
              .gte('movement_date', startDate)
              .lte('movement_date', endDate);

            const outTotals: Record<string, number> = {};
            movements?.forEach((m: any) => {
              const key = `${m.product_id}_${m.warehouse_id}`;
              if (!outTotals[key]) outTotals[key] = 0;
              outTotals[key] += m.qty || 0;
            });

            let highAlertCount = 0;
            currentStockMap.forEach((currentStock, key) => {
              const totalOut = outTotals[key] || 0;
              const avgOutPerDay = totalOut / highAlertDays;
              if (avgOutPerDay >= 1) {
                const daysCover = currentStock / avgOutPerDay;
                if (daysCover < highAlertDays) {
                  highAlertCount++;
                }
              }
            });
            badges.highAlert = highAlertCount;
          }
        }
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
        // Count leads with ASSIGNED or NEW status assigned to this user
        const { count: leadsCount } = await supabase
          .from('leads')
          .select('*', { count: 'exact', head: true })
          .eq('store_id', storeId)
          .eq('assigned_to_user_id', profile.id)
          .in('status', ['ASSIGNED', 'NEW']);
        badges.leads = leadsCount || 0;

        // No badge for My Orders for staff
        badges.orders = 0;
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
        // Pending leave requests (store-wise)
        let leaveQuery = supabase
          .from('leave_requests')
          .select('*', { count: 'exact', head: true })
          .eq('status', 'Pending');
        if (storeId) {
          leaveQuery = leaveQuery.eq('store_id', storeId);
        }
        const { count: leaveCount } = await leaveQuery;
        badges.leaveRequests = leaveCount || 0;

        // Pending documents for approval
        const { count: docCount } = await supabase
          .from('employee_documents')
          .select('*', { count: 'exact', head: true })
          .eq('status', 'PENDING');
        badges.pendingDocuments = docCount || 0;
      }

      // My Tasks badge for all users (Pending + In Progress only)
      const { count: taskCount } = await supabase
        .from('tasks')
        .select('*', { count: 'exact', head: true })
        .eq('assigned_to_user_id', user.id)
        .in('status', ['PENDING', 'IN_PROGRESS']);
      badges.myTasks = taskCount || 0;

      // My HR badge for staff: count unread notifications from admin actions
      // Only counts notifications where action was performed by admin (document/leave approvals/rejections)
      const isStaffRole = !['OWNER', 'ADMIN', 'MANAGER', 'HR'].includes(role);
      if (isStaffRole) {
        badges.myHR = await fetchHRNotificationsCount(user.id);
      }

      // Team Chat badge: count unread messages across accessible rooms (store-wise)
      if (storeId) {
        // Get all rooms for this store
        const { data: allRooms } = await supabase
          .from('chat_rooms')
          .select('id, type, participants')
          .eq('store_id', storeId);

        if (allRooms && allRooms.length > 0) {
          // Filter rooms where user has access
          const accessibleRoomIds = allRooms
            .filter((room) => {
              if (room.type === 'GLOBAL') return true;
              if (room.participants && Array.isArray(room.participants)) {
                return room.participants.includes(user.id);
              }
              return false;
            })
            .map(r => r.id);

          if (accessibleRoomIds.length > 0) {
            const { data: messages } = await supabase
              .from('chat_messages')
              .select('id, read_by, sender_id')
              .in('room_id', accessibleRoomIds)
              .neq('sender_id', user.id);

            badges.teamChat = (messages || []).filter(msg => {
              const readBy = msg.read_by || [];
              return !readBy.includes(user.id);
            }).length;
          }
        }
      }

      return badges;
    },
    enabled: !!profile?.id && !!storeId,
    refetchInterval: 60000,
  });
}
