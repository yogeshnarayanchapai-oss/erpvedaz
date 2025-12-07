import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { DateRange } from '@/hooks/useSalesByDateRange';
import { format } from 'date-fns';

export interface StaffLeaderboardEntry {
  id: string;
  name: string;
  totalOrders: number;
  confirmedOrders: number;
  totalLeads: number;
  conversionRate: number;
  totalSales: number;
}

export function useStaffLeaderboard(dateRange: DateRange) {
  const dateFrom = format(dateRange.from, 'yyyy-MM-dd');
  const dateTo = format(dateRange.to, 'yyyy-MM-dd');

  return useQuery({
    queryKey: ['staff-leaderboard', dateFrom, dateTo],
    queryFn: async () => {
      // Fetch all orders with sales person info
      const { data: orders, error: ordersError } = await supabase
        .from('orders')
        .select(`
          id,
          amount,
          order_status,
          sales_person_id,
          order_date
        `)
        .eq('is_deleted', false)
        .gte('order_date', `${dateFrom}T00:00:00`)
        .lte('order_date', `${dateTo}T23:59:59`)
        .not('sales_person_id', 'is', null);

      if (ordersError) throw ordersError;

      // Fetch all leads with assigned user info
      const { data: leads, error: leadsError } = await supabase
        .from('leads')
        .select('id, assigned_to_user_id, status')
        .gte('date', dateFrom)
        .lte('date', dateTo)
        .not('assigned_to_user_id', 'is', null);

      if (leadsError) throw leadsError;

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
        totalSales: number;
      }>();

      orders?.forEach(order => {
        if (!order.sales_person_id) return;
        
        const existing = staffStats.get(order.sales_person_id) || {
          totalOrders: 0,
          confirmedOrders: 0,
          totalSales: 0,
        };

        existing.totalOrders++;
        if (order.order_status === 'DELIVERED' || order.order_status === 'DISPATCHED' || order.order_status === 'CONFIRMED') {
          existing.confirmedOrders++;
          existing.totalSales += order.amount || 0;
        }

        staffStats.set(order.sales_person_id, existing);
      });

      // Count leads per assigned user
      const leadsPerUser = new Map<string, number>();
      leads?.forEach(lead => {
        if (!lead.assigned_to_user_id) return;
        leadsPerUser.set(
          lead.assigned_to_user_id,
          (leadsPerUser.get(lead.assigned_to_user_id) || 0) + 1
        );
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

        const stats = staffStats.get(staffId) || { totalOrders: 0, confirmedOrders: 0, totalSales: 0 };
        const totalLeads = leadsPerUser.get(staffId) || 0;
        
        // Only include staff with some activity
        if (stats.totalOrders === 0 && totalLeads === 0) return;

        const conversionRate = totalLeads > 0 
          ? (stats.confirmedOrders / totalLeads) * 100 
          : 0;

        leaderboard.push({
          id: staffId,
          name,
          totalOrders: stats.totalOrders,
          confirmedOrders: stats.confirmedOrders,
          totalLeads,
          conversionRate,
          totalSales: stats.totalSales,
        });
      });

      // Sort by confirmed orders descending
      leaderboard.sort((a, b) => b.confirmedOrders - a.confirmedOrders);

      return leaderboard;
    },
  });
}
