import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { DateRange } from '@/hooks/useSalesByDateRange';
import { format } from 'date-fns';
import { useCurrentStore } from '@/contexts/CurrentStoreContext';
import { useLeadAssignmentCounts } from './useLeadAssignmentCounts';

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

  // Use unified lead assignment counts hook (excludeSelfCreated: false for leaderboard)
  const { data: leadCounts, isLoading: leadCountsLoading } = useLeadAssignmentCounts({
    dateFrom,
    dateTo,
    excludeSelfCreated: false, // Include all leads for Staff Leaderboard
  });

  return useQuery({
    queryKey: ['staff-leaderboard', dateFrom, dateTo, storeId, JSON.stringify(leadCounts?.countsByStaff || {})],
    queryFn: async () => {
      // Fetch ALL orders using pagination to overcome 1000-row limit
      const allOrders: any[] = [];
      const PAGE_SIZE = 1000;
      let page = 0;
      let hasMore = true;

      while (hasMore) {
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
          .not('sales_person_id', 'is', null)
          .range(page * PAGE_SIZE, (page + 1) * PAGE_SIZE - 1);

        // Filter by store_id
        if (storeId) {
          ordersQuery = ordersQuery.eq('store_id', storeId);
        }

        const { data: orders, error: ordersError } = await ordersQuery;

        if (ordersError) throw ordersError;

        if (orders && orders.length > 0) {
          allOrders.push(...orders);
          hasMore = orders.length === PAGE_SIZE;
          page++;
        } else {
          hasMore = false;
        }
      }

      const orders = allOrders;

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

      // Get lead counts from unified hook
      const leadsPerUser = leadCounts?.countsByStaff || {};

      // Build leaderboard - only include CALLING staff
      const leaderboard: StaffLeaderboardEntry[] = [];
      
      // Only use calling staff IDs
      callingStaffIds.forEach(staffId => {
        const name = profileMap.get(staffId);
        if (!name) return;

        const stats = staffStats.get(staffId) || { totalOrders: 0, confirmedOrders: 0, vdNotDeliver: 0, totalSales: 0 };
        const leadsCount = leadsPerUser[staffId] || 0;
        
        // Total Leads = count from lead_transfers (unified hook)
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

      // Sort by conversion rate descending (top performers first)
      leaderboard.sort((a, b) => b.conversionRate - a.conversionRate);

      // Hard cap: show only top 10 staff on leaderboard
      return leaderboard.slice(0, 10);

    },
    enabled: !!storeId && !leadCountsLoading && !!leadCounts,
  });
}
