import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useCurrentStoreId } from '@/hooks/useCurrentStoreId';
import { useNotifications } from '@/hooks/useNotifications';
import { format, subDays } from 'date-fns';

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

// Helper function to fetch HR notifications count
async function fetchHRNotificationsCount(userId: string): Promise<number> {
  const hrTypes = ['DOCUMENT', 'LEAVE', 'PAYROLL', 'ASSET'];
  
  // @ts-ignore - Workaround for TS2589
  const { data } = await supabase
    .from('notifications')
    .select('type')
    .eq('to_user_id', userId)
    .eq('is_read', false);
  
  if (!data) return 0;
  return (data as Array<{ type: string | null }>).filter(n => hrTypes.includes(n.type || '')).length;
}

const EMPTY_BADGES: SidebarBadges = { orders: 0, leads: 0, notifications: 0, leaveRequests: 0, lowStock: 0, pendingDocuments: 0, todayAttendance: 0, myTasks: 0, myHR: 0, teamChat: 0, highAlert: 0 };

export function useSidebarBadges() {
  const { profile, user } = useAuth();
  const storeId = useCurrentStoreId();
  const { unreadCount } = useNotifications();

  // NO realtime subscriptions — polling only at 10-minute intervals
  // This eliminates 7 postgres_changes channels that were causing cascading invalidations

  return useQuery({
    queryKey: ['sidebar-badges', profile?.id, profile?.role, storeId],
    queryFn: async (): Promise<SidebarBadges> => {
      if (!profile?.id || !user?.id) return EMPTY_BADGES;

      const badges: SidebarBadges = { ...EMPTY_BADGES };
      const role = profile.role;

      // Run independent queries in parallel instead of sequentially
      const promises: PromiseLike<void>[] = [];

      // Notifications badge count
      badges.notifications = unreadCount || 0;

      // My Tasks badge - for ALL roles
      promises.push(
        supabase
          .from('tasks')
          .select('*', { count: 'exact', head: true })
          .eq('assigned_to_user_id', user.id)
          .in('status', ['PENDING', 'IN_PROGRESS'])
          .then(({ count }) => { badges.myTasks = count || 0; })
      );

      if (role === 'ADMIN' || role === 'MANAGER' || role === 'OWNER') {
        // Fetch view state
        const viewStatePromise = supabase
          .from('user_view_state')
          .select('section, last_seen_at')
          .eq('user_id', user.id)
          .then(({ data }) => {
            const viewState: Record<string, string | null> = {};
            data?.forEach((row) => { viewState[row.section] = row.last_seen_at; });
            return viewState;
          });

        promises.push(
          viewStatePromise.then(async (viewState) => {
            // Unseen leads
            const leadsLastSeen = viewState['all_leads'];
            if (leadsLastSeen && storeId) {
              const { count } = await supabase
                .from('leads')
                .select('*', { count: 'exact', head: true })
                .eq('store_id', storeId)
                .gt('created_at', leadsLastSeen);
              badges.leads = count || 0;
            }

            // Unseen orders
            const ordersLastSeen = viewState['all_orders'];
            if (ordersLastSeen && storeId) {
              const { count } = await supabase
                .from('orders')
                .select('*', { count: 'exact', head: true })
                .eq('store_id', storeId)
                .gt('created_at', ordersLastSeen);
              badges.orders = count || 0;
            }
          })
        );

        // Pending leave requests
        promises.push(
          (async () => {
            let leaveQuery = supabase
              .from('leave_requests')
              .select('*', { count: 'exact', head: true })
              .eq('status', 'Pending');
            if (storeId) leaveQuery = leaveQuery.eq('store_id', storeId);
            const { count } = await leaveQuery;
            badges.leaveRequests = count || 0;
          })()
        );

        // Low stock alert
        promises.push(
          supabase
            .from('product_inventory')
            .select('*', { count: 'exact', head: true })
            .eq('reorder_required', true)
            .gt('reorder_level', 0)
            .then(({ count }) => { badges.lowStock = count || 0; })
        );

        // High Alert inventory
        if (storeId) {
          promises.push(
            (async () => {
              const { data: costSettings } = await supabase
                .from('cost_settings')
                .select('high_alert_days')
                .eq('store_id', storeId)
                .maybeSingle();
              
              const highAlertDays = costSettings?.high_alert_days ?? null;
              if (!highAlertDays || highAlertDays < 1) return;

              const { data: stockData } = await supabase
                .from('product_inventory')
                .select('product_id, warehouse_id, current_stock, products!inner(store_id, is_active)')
                .eq('products.store_id', storeId)
                .eq('products.is_active', true);

              if (!stockData?.length) return;

              const currentStockMap = new Map<string, number>();
              stockData.forEach((s: any) => {
                currentStockMap.set(`${s.product_id}_${s.warehouse_id}`, s.current_stock || 0);
              });

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
                outTotals[key] = (outTotals[key] || 0) + (m.qty || 0);
              });

              let highAlertCount = 0;
              currentStockMap.forEach((currentStock, key) => {
                const totalOut = outTotals[key] || 0;
                const avgOutPerDay = totalOut / highAlertDays;
                if (avgOutPerDay >= 1 && currentStock / avgOutPerDay < highAlertDays) {
                  highAlertCount++;
                }
              });
              badges.highAlert = highAlertCount;
            })()
          );
        }
      }

      if (role === 'LEADS' && storeId) {
        promises.push(
          supabase
            .from('leads')
            .select('*', { count: 'exact', head: true })
            .eq('store_id', storeId)
            .eq('current_team', 'LEADS')
            .eq('status', 'NEW')
            .then(({ count }) => { badges.leads = count || 0; })
        );
      }

      if (role === 'CALLING' && storeId) {
        promises.push(
          supabase
            .from('leads')
            .select('*', { count: 'exact', head: true })
            .eq('store_id', storeId)
            .eq('assigned_to_user_id', profile.id)
            .in('status', ['ASSIGNED', 'NEW'])
            .then(({ count }) => { badges.leads = count || 0; })
        );
        badges.orders = 0;
      }

      if (role === 'FOLLOWUP' && storeId) {
        promises.push(
          supabase
            .from('orders')
            .select('*', { count: 'exact', head: true })
            .eq('store_id', storeId)
            .eq('delivery_location', 'OUTSIDE_VALLEY')
            .in('order_status', ['CONFIRMED', 'PACKED'])
            .then(({ count }) => { badges.orders = count || 0; })
        );
      }

      if (role === 'HR') {
        promises.push(
          (async () => {
            let leaveQuery = supabase
              .from('leave_requests')
              .select('*', { count: 'exact', head: true })
              .eq('status', 'Pending');
            if (storeId) leaveQuery = leaveQuery.eq('store_id', storeId);
            const { count } = await leaveQuery;
            badges.leaveRequests = count || 0;
          })()
        );

        promises.push(
          supabase
            .from('employee_documents')
            .select('*', { count: 'exact', head: true })
            .eq('status', 'PENDING')
            .then(({ count }) => { badges.pendingDocuments = count || 0; })
        );
      }

      // My HR badge for staff
      const isStaffRole = !['OWNER', 'ADMIN', 'MANAGER', 'HR'].includes(role);
      if (isStaffRole) {
        promises.push(
          fetchHRNotificationsCount(user.id).then(count => { badges.myHR = count; })
        );
      }

      // Team Chat badge
      if (storeId) {
        promises.push(
          (async () => {
            const { data: allRooms } = await supabase
              .from('chat_rooms')
              .select('id, type, participants')
              .eq('store_id', storeId);

            if (!allRooms?.length) return;

            const accessibleRoomIds = allRooms
              .filter((room) => {
                if (room.type === 'GLOBAL') return true;
                return room.participants && Array.isArray(room.participants) && room.participants.includes(user.id);
              })
              .map(r => r.id);

            if (!accessibleRoomIds.length) return;

            const { data: messages } = await supabase
              .from('chat_messages')
              .select('id, read_by, sender_id')
              .in('room_id', accessibleRoomIds)
              .neq('sender_id', user.id);

            badges.teamChat = (messages || []).filter(msg => {
              const readBy = msg.read_by || [];
              return !readBy.includes(user.id);
            }).length;
          })()
        );
      }

      // Execute all independent queries in parallel
      await Promise.all(promises);

      return badges;
    },
    enabled: !!profile?.id && !!storeId,
    refetchInterval: 600000, // 10 minutes (was 5 min) — no realtime needed
  });
}
