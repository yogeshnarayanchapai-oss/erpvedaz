import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { DateRange } from '@/hooks/useSalesByDateRange';
import { format } from 'date-fns';
import { useCurrentStore } from '@/contexts/CurrentStoreContext';

export interface StaffLeaderboardEntry {
  id: string;
  name: string;
  totalOrders: number;
  confirmedOrders: number;
  totalLeads: number;
  vdNotDeliver: number;
  conversionRate: number;
  totalSales: number;
}

export function useStaffLeaderboard(dateRange: DateRange) {
  const dateFrom = format(dateRange.from, 'yyyy-MM-dd');
  const dateTo = format(dateRange.to, 'yyyy-MM-dd');
  const { currentStore } = useCurrentStore();
  const storeId = currentStore?.id;

  return useQuery({
    queryKey: ['staff-leaderboard', dateFrom, dateTo, storeId],
    queryFn: async () => {
      // Fetch all orders with sales person info, filtered by store
      let ordersQuery = supabase
        .from('orders')
        .select(`
          id,
          amount,
          order_status,
          sales_person_id,
          order_date,
          store_id,
          delivery_location,
          inside_delivery_status
        `)
        .eq('is_deleted', false)
        .gte('order_date', `${dateFrom}T00:00:00`)
        .lte('order_date', `${dateTo}T23:59:59`)
        .not('sales_person_id', 'is', null);

      // Filter by store_id
      if (storeId) {
        ordersQuery = ordersQuery.eq('store_id', storeId);
      }

      const { data: orders, error: ordersError } = await ordersQuery;

      if (ordersError) throw ordersError;

      // Fetch ALL leads with assignment info to properly count:
      // 1. Original assignments (first_assigned_to_user_id) - counted by created_at/date
      // 2. Current assignments (assigned_to_user_id) - for reassigned leads, counted by assigned_at
      // This prevents double-counting when a lead is reassigned on a different date
      let leadsQuery = supabase
        .from('leads')
        .select('id, first_assigned_to_user_id, assigned_to_user_id, created_by_user_id, status, store_id, date, assigned_at, created_at');

      // Filter by store_id
      if (storeId) {
        leadsQuery = leadsQuery.eq('store_id', storeId);
      }

      // Filter by date range - include leads where:
      // - date is within range (for original assignments - counted on original date)
      // - OR assigned_at is within range (for reassignments - counted on reassignment date)
      leadsQuery = leadsQuery.or(`and(date.gte.${dateFrom},date.lte.${dateTo}),and(assigned_at.gte.${dateFrom}T00:00:00,assigned_at.lte.${dateTo}T23:59:59)`);

      const { data: allLeads, error: leadsError } = await leadsQuery;

      if (leadsError) throw leadsError;

      // Fetch only CALLING staff profiles
      const { data: profiles, error: profilesError } = await supabase
        .from('profiles')
        .select('id, name')
        .eq('is_active', true)
        .eq('role', 'CALLING');

      if (profilesError) throw profilesError;

      // Create a set of calling staff IDs for filtering
      const callingStaffIds = new Set(profiles?.map(p => p.id) || []);

      // Create a map of profile names
      const profileMap = new Map(profiles?.map(p => [p.id, p.name]) || []);

      // Aggregate orders by sales person
      const staffStats = new Map<string, {
        totalOrders: number;
        confirmedOrders: number;
        vdNotDeliver: number;
        totalSales: number;
      }>();

      orders?.forEach(order => {
        if (!order.sales_person_id) return;
        
        const existing = staffStats.get(order.sales_person_id) || {
          totalOrders: 0,
          confirmedOrders: 0,
          vdNotDeliver: 0,
          totalSales: 0,
        };

        existing.totalOrders++;
        if (order.order_status === 'DELIVERED' || order.order_status === 'DISPATCHED' || order.order_status === 'CONFIRMED') {
          existing.confirmedOrders++;
          existing.totalSales += order.amount || 0;
          
          // Count VD Not Deliver: Valley orders that are confirmed but not delivered
          const isValley = order.delivery_location === 'INSIDE_VALLEY';
          const isNotDelivered = order.inside_delivery_status !== 'DELIVERED';
          if (isValley && isNotDelivered) {
            existing.vdNotDeliver++;
          }
        }

        staffStats.set(order.sales_person_id, existing);
      });

      // Count leads per user with date-aware logic to prevent double-counting:
      // 1. Staff A (original assignee): counts based on first_assigned_to_user_id, filtered by created_at in date range
      // 2. Staff B (reassigned): counts based on assigned_to_user_id when different from first, filtered by assigned_at in date range
      // 3. Self-created leads: count for the creator based on created_at
      const leadsPerUser = new Map<string, Set<string>>();
      
      allLeads?.forEach(lead => {
        const createdAt = lead.date ? lead.date.split('T')[0] : null;
        const assignedAt = lead.assigned_at ? lead.assigned_at.split('T')[0] : null;
        
        // Count for original assignee (first_assigned_to_user_id) - use created_at/date for date filtering
        // This ensures original assignee counts on the ORIGINAL assignment date, not reassignment date
        if (lead.first_assigned_to_user_id && createdAt) {
          if (createdAt >= dateFrom && createdAt <= dateTo) {
            if (!leadsPerUser.has(lead.first_assigned_to_user_id)) {
              leadsPerUser.set(lead.first_assigned_to_user_id, new Set());
            }
            leadsPerUser.get(lead.first_assigned_to_user_id)!.add(lead.id);
          }
        }
        
        // Count for current assignee if different from original (reassigned leads) - use assigned_at for date filtering
        // This ensures reassigned staff counts on the REASSIGNMENT date only
        if (lead.assigned_to_user_id && lead.assigned_to_user_id !== lead.first_assigned_to_user_id && assignedAt) {
          if (assignedAt >= dateFrom && assignedAt <= dateTo) {
            if (!leadsPerUser.has(lead.assigned_to_user_id)) {
              leadsPerUser.set(lead.assigned_to_user_id, new Set());
            }
            leadsPerUser.get(lead.assigned_to_user_id)!.add(lead.id);
          }
        }
        
        // Count for creator (self-created leads) if not already counted via assignment - use created_at
        if (lead.created_by_user_id && 
            lead.created_by_user_id !== lead.first_assigned_to_user_id && 
            lead.created_by_user_id !== lead.assigned_to_user_id &&
            createdAt && createdAt >= dateFrom && createdAt <= dateTo) {
          if (!leadsPerUser.has(lead.created_by_user_id)) {
            leadsPerUser.set(lead.created_by_user_id, new Set());
          }
          leadsPerUser.get(lead.created_by_user_id)!.add(lead.id);
        }
      });

      // Build leaderboard - only include CALLING staff
      const leaderboard: StaffLeaderboardEntry[] = [];
      
      // Only use calling staff IDs
      callingStaffIds.forEach(staffId => {
        const name = profileMap.get(staffId);
        if (!name) return;

        const stats = staffStats.get(staffId) || { totalOrders: 0, confirmedOrders: 0, vdNotDeliver: 0, totalSales: 0 };
        const leadsSet = leadsPerUser.get(staffId);
        const leadsCount = leadsSet ? leadsSet.size : 0;
        
        // Total Leads = assigned leads + created leads (unique, no duplicates) - Orders are NOT included
        const totalLeads = leadsCount;
        
        // Only include staff with some activity
        if (stats.totalOrders === 0 && leadsCount === 0) return;

        // Conversion Rate = (Confirmed Orders - VD Not Deliver) / Total Leads * 100
        const effectiveOrders = stats.confirmedOrders - stats.vdNotDeliver;
        const conversionRate = totalLeads > 0 
          ? (effectiveOrders / totalLeads) * 100 
          : 0;

        leaderboard.push({
          id: staffId,
          name,
          totalOrders: stats.totalOrders,
          confirmedOrders: stats.confirmedOrders,
          totalLeads,
          vdNotDeliver: stats.vdNotDeliver,
          conversionRate,
          totalSales: stats.totalSales,
        });
      });

      // Sort by confirmed orders descending
      leaderboard.sort((a, b) => b.confirmedOrders - a.confirmedOrders);

      return leaderboard;
    },
    enabled: !!storeId,
  });
}
