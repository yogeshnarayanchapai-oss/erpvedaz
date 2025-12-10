import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { format, subDays } from 'date-fns';
import { DateRange } from '@/hooks/useSalesByDateRange';

export interface StaffDetailSummary {
  leadsReceived: number;
  ordersHandled: number;
  confirmedOrders: number;
  conversionRate: number;
  totalSales: number;
  avgOrderValue: number;
}

export interface StaffLead {
  id: string;
  date: string;
  client_name: string;
  source: string | null;
  status: string | null;
  contact_number: string;
}

export interface StaffOrder {
  id: string;
  order_date: string;
  product_id: string | null;
  product_name?: string | null;
  amount: number;
  order_status: string;
  delivery_location: string | null;
}

export interface DailyPerformance {
  date: string;
  sales: number;
  orders: number;
}

export function useStaffProfile(staffId: string) {
  return useQuery({
    queryKey: ['staff-profile', staffId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('profiles')
        .select('id, name, role, email')
        .eq('id', staffId)
        .maybeSingle();

      if (error) throw error;
      return data;
    },
    enabled: !!staffId,
  });
}

export function useStaffDetailSummary(staffId: string, dateRange: DateRange) {
  const dateFrom = format(dateRange.from, 'yyyy-MM-dd');
  const dateTo = format(dateRange.to, 'yyyy-MM-dd');

  return useQuery({
    queryKey: ['staff-detail-summary', staffId, dateFrom, dateTo],
    queryFn: async () => {
      // Get leads assigned to this staff
      const { data: assignedLeads, error: assignedErr } = await supabase
        .from('leads')
        .select('id, status')
        .eq('assigned_to_user_id', staffId)
        .gte('date', dateFrom)
        .lte('date', dateTo);

      if (assignedErr) throw assignedErr;

      // Get leads created by this staff
      const { data: createdLeads, error: createdErr } = await supabase
        .from('leads')
        .select('id, status')
        .eq('created_by_user_id', staffId)
        .gte('date', dateFrom)
        .lte('date', dateTo);

      if (createdErr) throw createdErr;

      // Get orders by this staff
      const { data: orders, error: ordersErr } = await supabase
        .from('orders')
        .select('id, amount, order_status, delivery_location, inside_delivery_status')
        .eq('sales_person_id', staffId)
        .gte('order_date', `${dateFrom}T00:00:00`)
        .lte('order_date', `${dateTo}T23:59:59`);

      if (ordersErr) throw ordersErr;

      // Use Set to count unique leads (assigned + created, no duplicates)
      const uniqueLeadIds = new Set<string>();
      assignedLeads?.forEach(l => uniqueLeadIds.add(l.id));
      createdLeads?.forEach(l => uniqueLeadIds.add(l.id));

      const uniqueLeadsCount = uniqueLeadIds.size;
      const ordersHandled = orders?.length || 0;
      const confirmedOrders = orders?.filter((o: any) => 
        ['CONFIRMED', 'DELIVERED', 'DISPATCHED'].includes(o.order_status)
      ).length || 0;
      
      // VD Not Deliver: confirmed orders in INSIDE_VALLEY that are not delivered
      const vdNotDeliver = orders?.filter((o: any) => 
        ['CONFIRMED', 'DELIVERED', 'DISPATCHED'].includes(o.order_status) &&
        o.delivery_location === 'INSIDE_VALLEY' &&
        o.inside_delivery_status !== 'DELIVERED'
      ).length || 0;
      
      const totalSales = orders
        ?.filter((o: any) => ['CONFIRMED', 'DELIVERED', 'DISPATCHED'].includes(o.order_status))
        .reduce((sum: number, o: any) => sum + (o.amount || 0), 0) || 0;
      
      // Leads Received = only unique leads (assigned + created) - Orders are NOT included
      const leadsReceived = uniqueLeadsCount;
      
      // Conversion Rate = (Confirmed Orders - VD Not Deliver) / Total Leads * 100
      const conversionRate = leadsReceived > 0 ? ((confirmedOrders - vdNotDeliver) / leadsReceived) * 100 : 0;
      const avgOrderValue = confirmedOrders > 0 ? totalSales / confirmedOrders : 0;

      return {
        leadsReceived,
        ordersHandled,
        confirmedOrders,
        conversionRate,
        totalSales,
        avgOrderValue,
      } as StaffDetailSummary;
    },
    enabled: !!staffId,
  });
}

export function useStaffLeads(staffId: string, dateRange: DateRange) {
  const dateFrom = format(dateRange.from, 'yyyy-MM-dd');
  const dateTo = format(dateRange.to, 'yyyy-MM-dd');

  return useQuery({
    queryKey: ['staff-leads', staffId, dateFrom, dateTo],
    queryFn: async () => {
      // Fetch assigned leads
      const { data: assignedLeads, error: assignedErr } = await supabase
        .from('leads')
        .select('id, date, client_name, source, status, contact_number')
        .eq('assigned_to_user_id', staffId)
        .gte('date', dateFrom)
        .lte('date', dateTo);

      if (assignedErr) throw assignedErr;

      // Fetch created leads
      const { data: createdLeads, error: createdErr } = await supabase
        .from('leads')
        .select('id, date, client_name, source, status, contact_number')
        .eq('created_by_user_id', staffId)
        .gte('date', dateFrom)
        .lte('date', dateTo);

      if (createdErr) throw createdErr;

      // Combine and deduplicate by id
      const leadMap = new Map<string, StaffLead>();
      assignedLeads?.forEach(l => leadMap.set(l.id, l as StaffLead));
      createdLeads?.forEach(l => leadMap.set(l.id, l as StaffLead));

      // Sort by date descending and limit to 50
      return Array.from(leadMap.values())
        .sort((a, b) => b.date.localeCompare(a.date))
        .slice(0, 50);
    },
    enabled: !!staffId,
  });
}

export function useStaffOrders(staffId: string, dateRange: DateRange) {
  const dateFrom = format(dateRange.from, 'yyyy-MM-dd');
  const dateTo = format(dateRange.to, 'yyyy-MM-dd');

  return useQuery({
    queryKey: ['staff-orders', staffId, dateFrom, dateTo],
    queryFn: async () => {
      // Get orders with product info
      const { data: orders, error } = await supabase
        .from('orders')
        .select('id, order_date, product_id, amount, order_status, delivery_location')
        .eq('sales_person_id', staffId)
        .gte('order_date', `${dateFrom}T00:00:00`)
        .lte('order_date', `${dateTo}T23:59:59`)
        .order('order_date', { ascending: false })
        .limit(50);

      if (error) throw error;

      // Get product names
      const productIds = [...new Set(orders?.map((o: any) => o.product_id).filter(Boolean))];
      let productMap: Record<string, string> = {};
      
      if (productIds.length > 0) {
        const { data: products } = await supabase
          .from('products')
          .select('id, name')
          .in('id', productIds);
        
        products?.forEach((p: any) => {
          productMap[p.id] = p.name;
        });
      }

      return orders?.map((o: any) => ({
        ...o,
        product_name: o.product_id ? productMap[o.product_id] || 'Unknown' : null,
      })) as StaffOrder[];
    },
    enabled: !!staffId,
  });
}

export function useStaffDailyPerformance(staffId: string, days: number = 30) {
  return useQuery({
    queryKey: ['staff-daily-performance', staffId, days],
    queryFn: async () => {
      const endDate = new Date();
      const startDate = subDays(endDate, days - 1);
      const dateFrom = format(startDate, 'yyyy-MM-dd');
      const dateTo = format(endDate, 'yyyy-MM-dd');

      const { data, error } = await supabase
        .from('orders')
        .select('order_date, amount, order_status')
        .eq('sales_person_id', staffId)
        .gte('order_date', `${dateFrom}T00:00:00`)
        .lte('order_date', `${dateTo}T23:59:59`)
        .in('order_status', ['CONFIRMED', 'DELIVERED', 'DISPATCHED']);

      if (error) throw error;

      // Aggregate by date
      const dailyMap: Record<string, { sales: number; orders: number }> = {};
      
      // Initialize all dates
      for (let i = 0; i < days; i++) {
        const d = format(subDays(endDate, i), 'yyyy-MM-dd');
        dailyMap[d] = { sales: 0, orders: 0 };
      }

      data?.forEach((order: any) => {
        const date = format(new Date(order.order_date), 'yyyy-MM-dd');
        if (dailyMap[date]) {
          dailyMap[date].sales += order.amount || 0;
          dailyMap[date].orders++;
        }
      });

      return Object.entries(dailyMap)
        .map(([date, data]) => ({ date, ...data }))
        .sort((a, b) => a.date.localeCompare(b.date)) as DailyPerformance[];
    },
    enabled: !!staffId,
  });
}
