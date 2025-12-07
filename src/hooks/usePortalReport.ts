import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { format } from 'date-fns';

export type PortalType = 'LEADS' | 'CALLING' | 'FOLLOWUP' | 'ADMIN';

export interface DateRange {
  from: Date;
  to: Date;
}

export interface LeadsReportData {
  leadsCreated: number;
  transferredToCalling: number;
  sentToFollowup: number;
  cnrSentBack: number;
  convertedToOrders: number;
  conversionRate: number;
  dailyBreakdown: Array<{
    date: string;
    leadsCreated: number;
    assignedToCalling: number;
    followup: number;
    cnr: number;
    converted: number;
    conversionRate: number;
  }>;
}

export interface CallingReportData {
  assignedLeads: number;
  callsMade: number;
  confirmed: number;
  followup: number;
  cnr: number;
  cancelled: number;
  ordersConfirmed: number;
  insideValleyOrders: number;
  outsideValleyOrders: number;
  insideValleySales: number;
  outsideValleySales: number;
  insideDelivered: number;
  insidePending: number;
  totalSales: number;
  conversionRate: number;
  dailyBreakdown: Array<{
    date: string;
    assignedLeads: number;
    calls: number;
    confirmed: number;
    followup: number;
    cnr: number;
    cancelled: number;
    orders: number;
    sales: number;
    conversionRate: number;
  }>;
}

export interface FollowupReportData {
  followupHandled: number;
  confirmedOrders: number;
  redirectedOrders: number;
  cancelled: number;
  totalSales: number;
  redirectRate: number;
  dailyBreakdown: Array<{
    date: string;
    followups: number;
    confirmed: number;
    redirected: number;
    cancelled: number;
    sales: number;
  }>;
}

// Leads Portal Report Hook
export function useLeadsReport(staffId: string, dateRange: DateRange) {
  const dateFrom = format(dateRange.from, 'yyyy-MM-dd');
  const dateTo = format(dateRange.to, 'yyyy-MM-dd');

  return useQuery({
    queryKey: ['leads-report', staffId, dateFrom, dateTo],
    queryFn: async (): Promise<LeadsReportData> => {
      // Get leads created by this staff
      const { data: leads, error } = await supabase
        .from('leads')
        .select('id, date, status, current_team, order_id')
        .eq('created_by_user_id', staffId)
        .gte('date', dateFrom)
        .lte('date', dateTo);

      if (error) throw error;

      const leadsCreated = leads?.length || 0;
      const transferredToCalling = leads?.filter(l => l.current_team === 'CALLING').length || 0;
      const sentToFollowup = leads?.filter(l => l.current_team === 'FOLLOWUP').length || 0;
      const cnrSentBack = leads?.filter(l => l.status === 'CALL_NOT_RECEIVED').length || 0;
      const convertedToOrders = leads?.filter(l => l.order_id !== null || l.status === 'CONFIRMED').length || 0;
      const conversionRate = leadsCreated > 0 ? (convertedToOrders / leadsCreated) * 100 : 0;

      // Group by date for daily breakdown
      const dailyMap: Record<string, typeof leads> = {};
      leads?.forEach(lead => {
        if (!dailyMap[lead.date]) dailyMap[lead.date] = [];
        dailyMap[lead.date].push(lead);
      });

      const dailyBreakdown = Object.entries(dailyMap)
        .map(([date, dayLeads]) => {
          const created = dayLeads.length;
          const converted = dayLeads.filter(l => l.order_id !== null || l.status === 'CONFIRMED').length;
          return {
            date,
            leadsCreated: created,
            assignedToCalling: dayLeads.filter(l => l.current_team === 'CALLING').length,
            followup: dayLeads.filter(l => l.current_team === 'FOLLOWUP').length,
            cnr: dayLeads.filter(l => l.status === 'CALL_NOT_RECEIVED').length,
            converted,
            conversionRate: created > 0 ? (converted / created) * 100 : 0,
          };
        })
        .sort((a, b) => a.date.localeCompare(b.date));

      return {
        leadsCreated,
        transferredToCalling,
        sentToFollowup,
        cnrSentBack,
        convertedToOrders,
        conversionRate,
        dailyBreakdown,
      };
    },
    enabled: !!staffId,
  });
}

// Calling Portal Report Hook
export function useCallingReport(staffId: string, dateRange: DateRange) {
  const dateFrom = format(dateRange.from, 'yyyy-MM-dd');
  const dateTo = format(dateRange.to, 'yyyy-MM-dd');

  return useQuery({
    queryKey: ['calling-report', staffId, dateFrom, dateTo],
    queryFn: async (): Promise<CallingReportData> => {
      // Get leads assigned to this staff
      const { data: leads, error: leadsErr } = await supabase
        .from('leads')
        .select('id, date, status, assigned_at')
        .eq('assigned_to_user_id', staffId)
        .gte('date', dateFrom)
        .lte('date', dateTo);

      if (leadsErr) throw leadsErr;

      // Get orders by this staff
      const { data: orders, error: ordersErr } = await supabase
        .from('orders')
        .select('id, order_date, amount, order_status, delivery_location, inside_delivery_status')
        .eq('sales_person_id', staffId)
        .gte('order_date', `${dateFrom}T00:00:00`)
        .lte('order_date', `${dateTo}T23:59:59`);

      if (ordersErr) throw ordersErr;

      // Get call logs
      const { data: callLogs, error: callsErr } = await supabase
        .from('call_logs')
        .select('id, called_at')
        .eq('staff_id', staffId)
        .gte('called_at', `${dateFrom}T00:00:00`)
        .lte('called_at', `${dateTo}T23:59:59`);

      if (callsErr) throw callsErr;

      const assignedLeads = leads?.length || 0;
      const callsMade = callLogs?.length || 0;
      const confirmed = leads?.filter(l => l.status === 'CONFIRMED').length || 0;
      const followup = leads?.filter(l => l.status === 'FOLLOW_UP').length || 0;
      const cnr = leads?.filter(l => l.status === 'CALL_NOT_RECEIVED').length || 0;
      const cancelled = leads?.filter(l => l.status === 'CANCELLED').length || 0;
      
      const confirmedOrders = orders?.filter(o => 
        ['CONFIRMED', 'DELIVERED', 'DISPATCHED'].includes(o.order_status)
      ) || [];
      const ordersConfirmed = confirmedOrders.length;
      
      const insideOrders = confirmedOrders.filter(o => 
        o.delivery_location === 'INSIDE_VALLEY'
      );
      const insideValleyOrders = insideOrders.length;
      const outsideValleyOrders = confirmedOrders.filter(o => 
        o.delivery_location !== 'INSIDE_VALLEY'
      ).length;
      
      // Inside Valley delivery stats
      const insideDelivered = insideOrders.filter(o => 
        (o as any).inside_delivery_status === 'DELIVERED'
      ).length;
      const insidePending = insideOrders.filter(o => 
        !(o as any).inside_delivery_status || (o as any).inside_delivery_status === 'PENDING'
      ).length;
      
      const insideValleySales = insideOrders
        .reduce((sum, o) => sum + (o.amount || 0), 0);
      const outsideValleySales = confirmedOrders
        .filter(o => o.delivery_location !== 'INSIDE_VALLEY')
        .reduce((sum, o) => sum + (o.amount || 0), 0);
      
      const totalSales = insideValleySales + outsideValleySales;
      const conversionRate = assignedLeads > 0 ? (ordersConfirmed / assignedLeads) * 100 : 0;

      // Daily breakdown
      const dailyMap: Record<string, { leads: typeof leads; orders: typeof orders; calls: typeof callLogs }> = {};
      
      leads?.forEach(lead => {
        if (!dailyMap[lead.date]) dailyMap[lead.date] = { leads: [], orders: [], calls: [] };
        dailyMap[lead.date].leads.push(lead);
      });
      
      orders?.forEach(order => {
        const date = format(new Date(order.order_date), 'yyyy-MM-dd');
        if (!dailyMap[date]) dailyMap[date] = { leads: [], orders: [], calls: [] };
        dailyMap[date].orders.push(order);
      });

      callLogs?.forEach(call => {
        const date = format(new Date(call.called_at!), 'yyyy-MM-dd');
        if (!dailyMap[date]) dailyMap[date] = { leads: [], orders: [], calls: [] };
        dailyMap[date].calls.push(call);
      });

      const dailyBreakdown = Object.entries(dailyMap)
        .map(([date, data]) => {
          const dayLeads = data.leads.length;
          const dayOrders = data.orders.filter(o => 
            ['CONFIRMED', 'DELIVERED', 'DISPATCHED'].includes(o.order_status)
          ).length;
          const daySales = data.orders
            .filter(o => ['CONFIRMED', 'DELIVERED', 'DISPATCHED'].includes(o.order_status))
            .reduce((sum, o) => sum + (o.amount || 0), 0);
          
          return {
            date,
            assignedLeads: dayLeads,
            calls: data.calls.length,
            confirmed: data.leads.filter(l => l.status === 'CONFIRMED').length,
            followup: data.leads.filter(l => l.status === 'FOLLOW_UP').length,
            cnr: data.leads.filter(l => l.status === 'CALL_NOT_RECEIVED').length,
            cancelled: data.leads.filter(l => l.status === 'CANCELLED').length,
            orders: dayOrders,
            sales: daySales,
            conversionRate: dayLeads > 0 ? (dayOrders / dayLeads) * 100 : 0,
          };
        })
        .sort((a, b) => a.date.localeCompare(b.date));

      return {
        assignedLeads,
        callsMade,
        confirmed,
        followup,
        cnr,
        cancelled,
        ordersConfirmed,
        insideValleyOrders,
        outsideValleyOrders,
        insideValleySales,
        outsideValleySales,
        insideDelivered,
        insidePending,
        totalSales,
        conversionRate,
        dailyBreakdown,
      };
    },
    enabled: !!staffId,
  });
}

// Followup Portal Report Hook
export function useFollowupReport(staffId: string, dateRange: DateRange) {
  const dateFrom = format(dateRange.from, 'yyyy-MM-dd');
  const dateTo = format(dateRange.to, 'yyyy-MM-dd');

  return useQuery({
    queryKey: ['followup-report', staffId, dateFrom, dateTo],
    queryFn: async (): Promise<FollowupReportData> => {
      // Get followup leads handled by this staff
      const { data: leads, error: leadsErr } = await supabase
        .from('leads')
        .select('id, date, status, current_team')
        .eq('assigned_to_user_id', staffId)
        .eq('current_team', 'FOLLOWUP')
        .gte('date', dateFrom)
        .lte('date', dateTo);

      if (leadsErr) throw leadsErr;

      // Get orders from followup
      const { data: orders, error: ordersErr } = await supabase
        .from('orders')
        .select('id, order_date, amount, order_status, delivery_location')
        .eq('sales_person_id', staffId)
        .gte('order_date', `${dateFrom}T00:00:00`)
        .lte('order_date', `${dateTo}T23:59:59`);

      if (ordersErr) throw ordersErr;

      const followupHandled = leads?.length || 0;
      const confirmedOrders = orders?.filter(o => 
        ['CONFIRMED', 'DELIVERED', 'DISPATCHED'].includes(o.order_status)
      ).length || 0;
      
      // Redirected = outside valley orders that were redirected
      const redirectedOrders = orders?.filter(o => 
        o.order_status === 'DISPATCHED' && 
        !(o.delivery_location || '').toLowerCase().includes('inside')
      ).length || 0;
      
      const cancelled = leads?.filter(l => l.status === 'CANCELLED').length || 0;
      const totalSales = orders
        ?.filter(o => ['CONFIRMED', 'DELIVERED', 'DISPATCHED'].includes(o.order_status))
        .reduce((sum, o) => sum + (o.amount || 0), 0) || 0;
      const redirectRate = followupHandled > 0 ? (redirectedOrders / followupHandled) * 100 : 0;

      // Daily breakdown
      const dailyMap: Record<string, { leads: typeof leads; orders: typeof orders }> = {};
      
      leads?.forEach(lead => {
        if (!dailyMap[lead.date]) dailyMap[lead.date] = { leads: [], orders: [] };
        dailyMap[lead.date].leads.push(lead);
      });
      
      orders?.forEach(order => {
        const date = format(new Date(order.order_date), 'yyyy-MM-dd');
        if (!dailyMap[date]) dailyMap[date] = { leads: [], orders: [] };
        dailyMap[date].orders.push(order);
      });

      const dailyBreakdown = Object.entries(dailyMap)
        .map(([date, data]) => ({
          date,
          followups: data.leads.length,
          confirmed: data.orders.filter(o => 
            ['CONFIRMED', 'DELIVERED', 'DISPATCHED'].includes(o.order_status)
          ).length,
          redirected: data.orders.filter(o => 
            o.order_status === 'DISPATCHED' && 
            !(o.delivery_location || '').toLowerCase().includes('inside')
          ).length,
          cancelled: data.leads.filter(l => l.status === 'CANCELLED').length,
          sales: data.orders
            .filter(o => ['CONFIRMED', 'DELIVERED', 'DISPATCHED'].includes(o.order_status))
            .reduce((sum, o) => sum + (o.amount || 0), 0),
        }))
        .sort((a, b) => a.date.localeCompare(b.date));

      return {
        followupHandled,
        confirmedOrders,
        redirectedOrders,
        cancelled,
        totalSales,
        redirectRate,
        dailyBreakdown,
      };
    },
    enabled: !!staffId,
  });
}
