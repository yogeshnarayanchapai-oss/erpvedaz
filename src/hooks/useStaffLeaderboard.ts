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

      // Fetch leads assigned to staff within the date range
      let assignedLeadsQuery = supabase
        .from('leads')
        .select('id, assigned_to_user_id, created_by_user_id, status, store_id, date')
        .gte('date', dateFrom)
        .lte('date', dateTo)
        .not('assigned_to_user_id', 'is', null);

      // Filter by store_id
      if (storeId) {
        assignedLeadsQuery = assignedLeadsQuery.eq('store_id', storeId);
      }

      // Fetch leads created by staff (self-created) within the date range
      let createdLeadsQuery = supabase
        .from('leads')
        .select('id, assigned_to_user_id, created_by_user_id, status, store_id, date')
        .gte('date', dateFrom)
        .lte('date', dateTo)
        .not('created_by_user_id', 'is', null);

      // Filter by store_id
      if (storeId) {
        createdLeadsQuery = createdLeadsQuery.eq('store_id', storeId);
      }

      const [assignedLeadsResult, createdLeadsResult] = await Promise.all([
        assignedLeadsQuery,
        createdLeadsQuery
      ]);

      if (assignedLeadsResult.error) throw assignedLeadsResult.error;
      if (createdLeadsResult.error) throw createdLeadsResult.error;

      const assignedLeads = assignedLeadsResult.data || [];
      const createdLeads = createdLeadsResult.data || [];

      // Fetch all staff profiles
      const { data: profiles, error: profilesError } = await supabase
        .from('profiles')
        .select('id, name')
        .eq('is_active', true);

      if (profilesError) throw profilesError;

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

      // Count leads per user: assigned TO user + created BY user (no duplicates)
      const leadsPerUser = new Map<string, Set<string>>();
      
      // Add assigned leads
      assignedLeads?.forEach(lead => {
        if (!lead.assigned_to_user_id) return;
        if (!leadsPerUser.has(lead.assigned_to_user_id)) {
          leadsPerUser.set(lead.assigned_to_user_id, new Set());
        }
        leadsPerUser.get(lead.assigned_to_user_id)!.add(lead.id);
      });
      
      // Add created leads (self-created by calling staff)
      createdLeads?.forEach(lead => {
        if (!lead.created_by_user_id) return;
        if (!leadsPerUser.has(lead.created_by_user_id)) {
          leadsPerUser.set(lead.created_by_user_id, new Set());
        }
        leadsPerUser.get(lead.created_by_user_id)!.add(lead.id);
      });

      // Build leaderboard
      const leaderboard: StaffLeaderboardEntry[] = [];
      
      // Combine all staff IDs from both orders and leads
      const allStaffIds = new Set([
        ...staffStats.keys(),
        ...leadsPerUser.keys(),
      ]);

      allStaffIds.forEach(staffId => {
        const name = profileMap.get(staffId);
        if (!name) return;

        const stats = staffStats.get(staffId) || { totalOrders: 0, confirmedOrders: 0, vdNotDeliver: 0, totalSales: 0 };
        const leadsSet = leadsPerUser.get(staffId);
        const leadsCount = leadsSet ? leadsSet.size : 0;
        
        // Total Leads = assigned leads + created leads (unique, no duplicates) + total orders
        const totalLeads = leadsCount + stats.totalOrders;
        
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
