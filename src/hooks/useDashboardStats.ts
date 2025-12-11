import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useEffect } from 'react';
import { useCurrentStore } from '@/contexts/CurrentStoreContext';

// Nepal timezone offset: UTC+5:45
const NEPAL_TIMEZONE = 'Asia/Kathmandu';

/**
 * Get current date in Nepal timezone as YYYY-MM-DD string
 */
export function getNepalDate(date: Date = new Date()): string {
  return date.toLocaleDateString('en-CA', { timeZone: NEPAL_TIMEZONE });
}

/**
 * Get start of day in Nepal timezone as ISO string (for DB queries)
 */
export function getNepalDayStart(dateStr: string): string {
  // Create date at start of day in Nepal timezone
  return `${dateStr}T00:00:00+05:45`;
}

/**
 * Get end of day in Nepal timezone as ISO string (for DB queries)
 */
export function getNepalDayEnd(dateStr: string): string {
  // Create date at end of day in Nepal timezone
  return `${dateStr}T23:59:59+05:45`;
}

interface LeadStatsResult {
  total: number;
  confirmed: number;
  callNotReceived: number;
  followUp: number;
  cancelled: number;
  redirect: number;
  pendingTransfer: number;
  newLeads: number;
  assigned: number;
}

interface OrderStatsResult {
  total: number;
  confirmed: number;
  dispatched: number;
  delivered: number;
  returned: number;
  cancelled: number;
  insideValley: number;
  outsideValley: number;
  totalSales: number;
}

/**
 * Hook to fetch lead statistics for dashboard - includes ALL leads including confirmed
 * Uses Nepal timezone for date filtering
 * Filters by current store
 */
export function useLeadDashboardStats(dateFrom?: string, dateTo?: string) {
  const queryClient = useQueryClient();
  const { currentStore } = useCurrentStore();
  const storeId = currentStore?.id;
  
  // Set up realtime subscription
  useEffect(() => {
    const channel = supabase
      .channel('leads-dashboard-stats')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'leads' }, () => {
        queryClient.invalidateQueries({ queryKey: ['lead-dashboard-stats'] });
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [queryClient]);

  return useQuery({
    queryKey: ['lead-dashboard-stats', dateFrom, dateTo, storeId],
    queryFn: async (): Promise<LeadStatsResult> => {
      let query = supabase
        .from('leads')
        .select('id, status, assigned_to_user_id, order_id, date, store_id');

      // Filter by store_id
      if (storeId) {
        query = query.eq('store_id', storeId);
      }

      // Apply date filters using the 'date' field (lead date, not created_at)
      if (dateFrom) {
        query = query.gte('date', dateFrom);
      }
      if (dateTo) {
        query = query.lte('date', dateTo);
      }

      const { data, error } = await query;
      if (error) throw error;

      const leads = data || [];
      
      return {
        total: leads.length,
        confirmed: leads.filter(l => l.status === 'CONFIRMED' || l.order_id !== null).length,
        callNotReceived: leads.filter(l => l.status === 'CALL_NOT_RECEIVED').length,
        followUp: leads.filter(l => l.status === 'FOLLOW_UP').length,
        cancelled: leads.filter(l => l.status === 'CANCELLED').length,
        redirect: leads.filter(l => l.status === 'REDIRECT').length,
        // Pending transfer: unassigned leads that are NOT confirmed (exclude converted leads)
        pendingTransfer: leads.filter(l => 
          l.assigned_to_user_id === null && 
          l.status !== 'CONFIRMED' && 
          l.order_id === null
        ).length,
        newLeads: leads.filter(l => l.status === 'NEW').length,
        assigned: leads.filter(l => l.status === 'ASSIGNED').length,
      };
    },
    enabled: !!storeId,
  });
}

/**
 * Hook to fetch order statistics for dashboard
 * Uses Nepal timezone for date filtering
 * Filters by current store
 */
export function useOrderDashboardStats(dateFrom?: string, dateTo?: string) {
  const queryClient = useQueryClient();
  const { currentStore } = useCurrentStore();
  const storeId = currentStore?.id;
  
  // Set up realtime subscription
  useEffect(() => {
    const channel = supabase
      .channel('orders-dashboard-stats')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'orders' }, () => {
        queryClient.invalidateQueries({ queryKey: ['order-dashboard-stats'] });
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [queryClient]);

  return useQuery({
    queryKey: ['order-dashboard-stats', dateFrom, dateTo, storeId],
    queryFn: async (): Promise<OrderStatsResult> => {
      let query = supabase
        .from('orders')
        .select('id, order_status, delivery_location, amount, is_deleted, store_id')
        .eq('is_deleted', false);

      // Filter by store_id
      if (storeId) {
        query = query.eq('store_id', storeId);
      }

      // Apply date filters using Nepal timezone
      if (dateFrom) {
        query = query.gte('order_date', getNepalDayStart(dateFrom));
      }
      if (dateTo) {
        query = query.lte('order_date', getNepalDayEnd(dateTo));
      }

      const { data, error } = await query;
      if (error) throw error;

      const orders = data || [];
      const validStatuses = ['CONFIRMED', 'DISPATCHED', 'DELIVERED', 'PACKED'];
      const salesOrders = orders.filter(o => validStatuses.includes(o.order_status || ''));
      
      return {
        total: orders.length,
        confirmed: orders.filter(o => o.order_status === 'CONFIRMED').length,
        dispatched: orders.filter(o => o.order_status === 'DISPATCHED').length,
        delivered: orders.filter(o => o.order_status === 'DELIVERED').length,
        returned: orders.filter(o => o.order_status === 'RETURNED').length,
        cancelled: orders.filter(o => o.order_status === 'CANCELLED').length,
        insideValley: salesOrders.filter(o => o.delivery_location === 'INSIDE_VALLEY').length,
        outsideValley: salesOrders.filter(o => o.delivery_location === 'OUTSIDE_VALLEY').length,
        totalSales: salesOrders.reduce((sum, o) => sum + (o.amount || 0), 0),
      };
    },
    enabled: !!storeId,
  });
}

/**
 * Hook for staff-specific lead stats (CallingDashboard)
 * Fetches leads assigned to OR created by a specific user
 * Filters by current store
 */
export function useStaffLeadStats(userId?: string, dateFrom?: string, dateTo?: string) {
  const queryClient = useQueryClient();
  const { currentStore } = useCurrentStore();
  const storeId = currentStore?.id;
  
  useEffect(() => {
    if (!userId) return;
    
    // Subscribe to leads changes
    const leadsChannel = supabase
      .channel(`staff-leads-${userId}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'leads' }, (payload) => {
        // Invalidate if the lead is assigned to or created by this user
        const newData = payload.new as any;
        const oldData = payload.old as any;
        if (
          newData?.assigned_to_user_id === userId || 
          oldData?.assigned_to_user_id === userId ||
          newData?.created_by_user_id === userId ||
          oldData?.created_by_user_id === userId
        ) {
          queryClient.invalidateQueries({ queryKey: ['staff-lead-stats', userId] });
        }
      })
      .subscribe();
    
    // Subscribe to profiles changes for total_leads_ever_assigned updates
    const profilesChannel = supabase
      .channel(`staff-profile-${userId}`)
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'profiles', filter: `id=eq.${userId}` }, () => {
        queryClient.invalidateQueries({ queryKey: ['staff-lead-stats', userId] });
      })
      .subscribe();

    return () => {
      supabase.removeChannel(leadsChannel);
      supabase.removeChannel(profilesChannel);
    };
  }, [queryClient, userId]);

  return useQuery({
    queryKey: ['staff-lead-stats', userId, dateFrom, dateTo, storeId],
    queryFn: async () => {
      if (!userId) return null;

      // Fetch leads CURRENTLY assigned to this user (for active workload)
      let currentQuery = supabase
        .from('leads')
        .select('id, status, order_id, date, current_team, created_by_user_id, assigned_at, store_id, first_assigned_to_user_id')
        .eq('assigned_to_user_id', userId);

      // Filter by store_id
      if (storeId) {
        currentQuery = currentQuery.eq('store_id', storeId);
      }

      // Filter by date - include leads where date OR assigned_at is within range
      if (dateFrom && dateTo) {
        currentQuery = currentQuery.or(`and(date.gte.${dateFrom},date.lte.${dateTo}),and(assigned_at.gte.${dateFrom}T00:00:00,assigned_at.lte.${dateTo}T23:59:59)`);
      } else if (dateFrom) {
        currentQuery = currentQuery.or(`date.gte.${dateFrom},assigned_at.gte.${dateFrom}T00:00:00`);
      }

      // For date-filtered "Assigned" count - use same logic as Staff Leaderboard
      // Count unique leads assigned to this user within date range
      let assignedCount = 0;
      
      if (dateFrom && dateTo) {
        // Date filter is applied - count from leads table with date filtering
        // Same logic as Staff Leaderboard: count leads where user was original assignee, reassigned to, or self-created
        let assignedLeadsQuery = supabase
          .from('leads')
          .select('id, first_assigned_to_user_id, assigned_to_user_id, created_by_user_id, date, assigned_at');
        
        if (storeId) {
          assignedLeadsQuery = assignedLeadsQuery.eq('store_id', storeId);
        }
        
        // Apply date filter on date or assigned_at - same as Staff Leaderboard
        assignedLeadsQuery = assignedLeadsQuery.or(`and(date.gte.${dateFrom},date.lte.${dateTo}),and(assigned_at.gte.${dateFrom}T00:00:00,assigned_at.lte.${dateTo}T23:59:59)`);
        
        const { data: allLeadsInRange, error: assignedError } = await assignedLeadsQuery;
        
        if (assignedError) {
          console.error('[useStaffLeadStats] Query error:', assignedError);
          throw assignedError;
        }
        
        // Log the raw query results for debugging
        const leadsWithFirstAssigned = (allLeadsInRange || []).filter(l => l.first_assigned_to_user_id === userId);
        const leadsReassignedOut = leadsWithFirstAssigned.filter(l => l.assigned_to_user_id !== userId);
        console.log('[useStaffLeadStats] Query debug:', {
          userId,
          storeId,
          dateFrom,
          dateTo,
          totalLeadsReturned: allLeadsInRange?.length || 0,
          leadsWithFirstAssignedToUser: leadsWithFirstAssigned.length,
          leadsReassignedOut: leadsReassignedOut.length,
          reassignedOutIds: leadsReassignedOut.map(l => l.id).slice(0, 5)
        });
        
        // Count unique leads where this user was involved (same logic as Staff Leaderboard)
        const assignedLeadIds = new Set<string>();
        let firstAssignedCount = 0;
        let reassignedInCount = 0;
        let selfCreatedCount = 0;
        
        (allLeadsInRange || []).forEach(lead => {
          // Original assignment (historical - includes reassigned OUT)
          if (lead.first_assigned_to_user_id === userId) {
            assignedLeadIds.add(lead.id);
            firstAssignedCount++;
          }
          // Reassigned to this user (different from original)
          if (lead.assigned_to_user_id === userId && lead.assigned_to_user_id !== lead.first_assigned_to_user_id) {
            assignedLeadIds.add(lead.id);
            reassignedInCount++;
          }
          // Self-created (when not already counted)
          if (lead.created_by_user_id === userId && 
              lead.first_assigned_to_user_id !== userId && 
              lead.assigned_to_user_id !== userId) {
            assignedLeadIds.add(lead.id);
            selfCreatedCount++;
          }
        });
        
        console.log('[useStaffLeadStats] Lead counts:', {
          userId,
          dateFrom,
          dateTo,
          totalLeadsInRange: allLeadsInRange?.length,
          firstAssignedCount,
          reassignedInCount,
          selfCreatedCount,
          uniqueTotal: assignedLeadIds.size
        });
        
        assignedCount = assignedLeadIds.size;
      } else {
        // No date filter - use all-time counter from profiles (never decreases)
        const { data: profileData } = await supabase
          .from('profiles')
          .select('total_leads_ever_assigned')
          .eq('id', userId)
          .single();
        
        assignedCount = profileData?.total_leads_ever_assigned ?? 0;
      }

      const currentResult = await currentQuery;
      if (currentResult.error) throw currentResult.error;

      const currentLeads = currentResult.data || [];
      const callingLeads = currentLeads.filter(l => l.current_team === 'CALLING');
      
      // Pending statuses for "Remain to Call" - leads that haven't been processed yet
      const pendingStatuses = ['NEW', 'ASSIGNED', null, ''];
      
      return {
        total: currentLeads.length,
        callingTotal: callingLeads.length,
        // Assigned = date-filtered count when filter applied, otherwise all-time counter
        assigned: assignedCount,
        // Current = only leads currently assigned to this user
        currentAssigned: currentLeads.length,
        confirmed: currentLeads.filter(l => l.status === 'CONFIRMED' || l.order_id !== null).length,
        callNotReceived: currentLeads.filter(l => l.status === 'CALL_NOT_RECEIVED').length,
        followUp: currentLeads.filter(l => l.status === 'FOLLOW_UP').length,
        cancelled: currentLeads.filter(l => l.status === 'CANCELLED').length,
        pending: currentLeads.filter(l => pendingStatuses.includes(l.status)).length,
        // Remain to call = leads with pending/no status (not yet processed)
        remainingToCall: callingLeads.filter(l => 
          pendingStatuses.includes(l.status) || !l.status
        ).length,
      };
    },
    enabled: !!userId && !!storeId,
  });
}

/**
 * Hook for staff-specific order stats
 * Filters by current store
 */
export function useStaffOrderStats(userId?: string, dateFrom?: string, dateTo?: string) {
  const queryClient = useQueryClient();
  const { currentStore } = useCurrentStore();
  const storeId = currentStore?.id;
  
  useEffect(() => {
    if (!userId) return;
    
    const channel = supabase
      .channel(`staff-orders-${userId}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'orders' }, (payload) => {
        const newData = payload.new as any;
        const oldData = payload.old as any;
        if (newData?.sales_person_id === userId || oldData?.sales_person_id === userId) {
          queryClient.invalidateQueries({ queryKey: ['staff-order-stats', userId] });
        }
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [queryClient, userId]);

  return useQuery({
    queryKey: ['staff-order-stats', userId, dateFrom, dateTo, storeId],
    queryFn: async () => {
      if (!userId) return null;

      let query = supabase
        .from('orders')
        .select('id, order_status, delivery_location, inside_delivery_status, amount, is_deleted, store_id')
        .eq('sales_person_id', userId)
        .eq('is_deleted', false);

      // Filter by store_id
      if (storeId) {
        query = query.eq('store_id', storeId);
      }

      if (dateFrom) {
        query = query.gte('order_date', getNepalDayStart(dateFrom));
      }
      if (dateTo) {
        query = query.lte('order_date', getNepalDayEnd(dateTo));
      }

      const { data, error } = await query;
      if (error) throw error;

      const orders = data || [];
      const insideValleyOrders = orders.filter(o => o.delivery_location === 'INSIDE_VALLEY');
      
      return {
        total: orders.length,
        insideValley: {
          total: insideValleyOrders.length,
          // IV Delivered: inside_delivery_status = DELIVERED
          delivered: insideValleyOrders.filter(o => o.inside_delivery_status === 'DELIVERED').length,
          // IV Pending: inside_delivery_status = PENDING
          pending: insideValleyOrders.filter(o => o.inside_delivery_status === 'PENDING').length,
          // IV Reached CNR: inside_delivery_status = REACHED_CNR
          reachedCNR: insideValleyOrders.filter(o => o.inside_delivery_status === 'REACHED_CNR').length,
          // IV Customer Cancel: inside_delivery_status = CANCELLED
          customerCancelled: insideValleyOrders.filter(o => o.inside_delivery_status === 'CANCELLED').length,
        },
        outsideValley: orders.filter(o => o.delivery_location === 'OUTSIDE_VALLEY').length,
      };
    },
    enabled: !!userId && !!storeId,
  });
}
