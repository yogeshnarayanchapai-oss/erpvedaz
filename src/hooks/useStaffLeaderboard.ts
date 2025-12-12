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

      // Fetch ALL leads with assignment info
      // COUNTING LOGIC (Bucket Date = lead.date):
      // - For original assignee (first_assigned_to_user_id): use created_at for date filtering (original bucket date, never changes)
      // - For current assignee (assigned_to_user_id if different): use lead.date (updated on reassignment)
      // This ensures:
      // - Original assignee counts on ORIGINAL date (e.g., 12/12 stays with Calling 1)
      // - Reassigned staff counts on REASSIGNMENT date (e.g., 12/13 for Calling 2)
      let leadsQuery = supabase
        .from('leads')
        .select('id, first_assigned_to_user_id, assigned_to_user_id, created_by_user_id, status, store_id, date, assigned_at, created_at');

      // Filter by store_id
      if (storeId) {
        leadsQuery = leadsQuery.eq('store_id', storeId);
      }

      // Fetch leads where either:
      // - created_at is in date range (for original assignees - historical bucket date)
      // - date is in date range (for current assignees - current bucket date)
      leadsQuery = leadsQuery.or(`and(created_at.gte.${dateFrom}T00:00:00,created_at.lte.${dateTo}T23:59:59),and(date.gte.${dateFrom},date.lte.${dateTo})`);

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

      // Count leads per user with bucket-date-aware logic:
      // Rule: Count ALWAYS by bucket date (lead.date), NOT by action/assignment date
      // - Original assignee: counted by created_at (original bucket date before any reassignment)
      // - Current assignee (if reassigned): counted by current lead.date (updated on reassignment)
      const leadsPerUser = new Map<string, Set<string>>();
      
      allLeads?.forEach(lead => {
        // Extract dates - use date portion only for comparison
        const createdAtDate = lead.created_at ? lead.created_at.split('T')[0] : null;
        const currentBucketDate = lead.date ? lead.date.split('T')[0] : null;
        
        // For ORIGINAL assignee (first_assigned_to_user_id): 
        // Count by created_at (original bucket date when lead was first assigned)
        // This date NEVER changes even when lead is reassigned
        if (lead.first_assigned_to_user_id && createdAtDate) {
          if (createdAtDate >= dateFrom && createdAtDate <= dateTo) {
            if (!leadsPerUser.has(lead.first_assigned_to_user_id)) {
              leadsPerUser.set(lead.first_assigned_to_user_id, new Set());
            }
            leadsPerUser.get(lead.first_assigned_to_user_id)!.add(lead.id);
          }
        }
        
        // For CURRENT assignee if REASSIGNED (assigned_to_user_id != first_assigned_to_user_id):
        // Count by CURRENT lead.date (bucket date, updated on reassignment)
        // This ensures new assignee sees the lead on the reassignment date
        if (lead.assigned_to_user_id && 
            lead.assigned_to_user_id !== lead.first_assigned_to_user_id && 
            currentBucketDate) {
          if (currentBucketDate >= dateFrom && currentBucketDate <= dateTo) {
            if (!leadsPerUser.has(lead.assigned_to_user_id)) {
              leadsPerUser.set(lead.assigned_to_user_id, new Set());
            }
            leadsPerUser.get(lead.assigned_to_user_id)!.add(lead.id);
          }
        }
        
        // For CREATOR (self-created leads) if not already counted via assignment:
        // Count by created_at (original bucket date)
        if (lead.created_by_user_id && 
            lead.created_by_user_id !== lead.first_assigned_to_user_id && 
            lead.created_by_user_id !== lead.assigned_to_user_id &&
            createdAtDate && createdAtDate >= dateFrom && createdAtDate <= dateTo) {
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
