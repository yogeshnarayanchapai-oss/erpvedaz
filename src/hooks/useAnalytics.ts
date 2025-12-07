import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { format } from 'date-fns';

export interface AnalyticsFilters {
  dateFrom: string;
  dateTo: string;
  branchId?: string;
  productId?: string;
  staffId?: string;
  deliveryZone?: 'all' | 'INSIDE_VALLEY' | 'OUTSIDE_VALLEY';
  paymentMethod?: 'all' | 'COD' | 'ONLINE';
  orderStatus?: string;
}

export interface SalesMetrics {
  totalRevenue: number;
  totalOrders: number;
  deliveryChargeCollected: number;
  onlinePayments: number;
  discountAmount: number;
  uniqueCustomers: number;
  averageOrderValue: number;
  grossMargin: number;
  grossProfit: number;
  conversionRate: number;
  visitors: number;
}

export interface OrderChannelData {
  channel: string;
  count: number;
  revenue: number;
}

export interface OrderStatusData {
  status: string;
  count: number;
  percentage: number;
}

export interface TopCityData {
  city: string;
  orders: number;
  revenue: number;
}

export interface ProductInsight {
  id: string;
  name: string;
  quantitySold: number;
  revenue: number;
  profit: number;
  profitMargin: number;
  revenueContribution: number;
}

export interface StaffPerformance {
  id: string;
  name: string;
  leadsAssigned: number;
  leadsFollowed: number;
  ordersConfirmed: number;
  revenue: number;
  conversionRate: number;
  insideValley: number;
  outsideValley: number;
}

// Hook for sales overview metrics
export function useSalesMetrics(filters: AnalyticsFilters) {
  return useQuery({
    queryKey: ['analytics-sales-metrics', filters],
    queryFn: async (): Promise<SalesMetrics> => {
      let ordersQuery = supabase
        .from('orders')
        .select('amount, is_cod, quantity, product_id, customer_id')
        .eq('is_deleted', false)
        .gte('created_at', filters.dateFrom)
        .lte('created_at', filters.dateTo);

      if (filters.branchId && filters.branchId !== 'all') {
        ordersQuery = ordersQuery.eq('branch_id', filters.branchId);
      }
      if (filters.productId && filters.productId !== 'all') {
        ordersQuery = ordersQuery.eq('product_id', filters.productId);
      }
      if (filters.staffId && filters.staffId !== 'all') {
        ordersQuery = ordersQuery.eq('sales_person_id', filters.staffId);
      }
      if (filters.deliveryZone && filters.deliveryZone !== 'all') {
        ordersQuery = ordersQuery.eq('delivery_location', filters.deliveryZone);
      }
      if (filters.paymentMethod && filters.paymentMethod !== 'all') {
        if (filters.paymentMethod === 'COD') {
          ordersQuery = ordersQuery.eq('is_cod', true);
        } else {
          ordersQuery = ordersQuery.eq('is_cod', false);
        }
      }
      if (filters.orderStatus && filters.orderStatus !== 'all') {
        ordersQuery = ordersQuery.eq('order_status', filters.orderStatus as any);
      }

      const { data: orders } = await ordersQuery;
      
      const totalRevenue = orders?.reduce((sum, o) => sum + (o.amount || 0), 0) || 0;
      const totalOrders = orders?.length || 0;
      
      // Get product delivery costs
      const productIds = [...new Set(orders?.map(o => o.product_id).filter(Boolean))];
      const { data: products } = await supabase
        .from('products')
        .select('id, cost_price, sell_price, delivery_cost')
        .in('id', productIds);
      
      const productMap = new Map(products?.map(p => [p.id, p]));
      
      let deliveryChargeCollected = 0;
      let totalCost = 0;
      let onlinePayments = 0;
      
      orders?.forEach(o => {
        const product = productMap.get(o.product_id);
        if (product) {
          deliveryChargeCollected += (product.delivery_cost || 0) * (o.quantity || 1);
          totalCost += (product.cost_price || 0) * (o.quantity || 1);
        }
        if (!o.is_cod) {
          onlinePayments += o.amount || 0;
        }
      });
      
      const uniqueCustomers = new Set(orders?.map(o => o.customer_id).filter(Boolean)).size;
      const averageOrderValue = totalOrders > 0 ? totalRevenue / totalOrders : 0;
      
      const grossProfit = totalRevenue - totalCost;
      const grossMargin = totalRevenue > 0 ? (grossProfit / totalRevenue) * 100 : 0;

      // Get leads for conversion rate
      let leadsQuery = supabase
        .from('leads')
        .select('id')
        .gte('created_at', filters.dateFrom)
        .lte('created_at', filters.dateTo);
      
      const { data: leads } = await leadsQuery;
      const totalLeads = leads?.length || 0;
      const conversionRate = totalLeads > 0 ? (totalOrders / totalLeads) * 100 : 0;

      return {
        totalRevenue,
        totalOrders,
        deliveryChargeCollected,
        onlinePayments,
        discountAmount: 0,
        uniqueCustomers,
        averageOrderValue,
        grossMargin,
        grossProfit,
        conversionRate,
        visitors: 0,
      };
    },
  });
}

// Hook for order channel distribution (using shipping_partner as proxy for channel)
export function useOrderChannels(filters: AnalyticsFilters) {
  return useQuery({
    queryKey: ['analytics-order-channels', filters],
    queryFn: async (): Promise<OrderChannelData[]> => {
      let ordersQuery = supabase
        .from('orders')
        .select('shipping_partner, amount, delivery_location')
        .eq('is_deleted', false)
        .gte('created_at', filters.dateFrom)
        .lte('created_at', filters.dateTo);

      if (filters.branchId && filters.branchId !== 'all') ordersQuery = ordersQuery.eq('branch_id', filters.branchId);
      if (filters.productId && filters.productId !== 'all') ordersQuery = ordersQuery.eq('product_id', filters.productId);

      const { data: orders } = await ordersQuery;

      const channelMap = new Map<string, { count: number; revenue: number }>();
      
      orders?.forEach(order => {
        // Use delivery_location as channel proxy
        const channel = order.delivery_location === 'INSIDE_VALLEY' ? 'Inside Valley' : 
                       order.delivery_location === 'OUTSIDE_VALLEY' ? 'Outside Valley' : 'Direct';
        const existing = channelMap.get(channel) || { count: 0, revenue: 0 };
        channelMap.set(channel, {
          count: existing.count + 1,
          revenue: existing.revenue + (order.amount || 0),
        });
      });

      return Array.from(channelMap.entries()).map(([channel, data]) => ({
        channel,
        ...data,
      })).sort((a, b) => b.revenue - a.revenue);
    },
  });
}

// Hook for order status distribution
export function useOrderStatusDistribution(filters: AnalyticsFilters) {
  return useQuery({
    queryKey: ['analytics-order-status', filters],
    queryFn: async (): Promise<OrderStatusData[]> => {
      let ordersQuery = supabase
        .from('orders')
        .select('order_status')
        .eq('is_deleted', false)
        .gte('created_at', filters.dateFrom)
        .lte('created_at', filters.dateTo);

      if (filters.deliveryZone && filters.deliveryZone !== 'all') {
        ordersQuery = ordersQuery.eq('delivery_location', filters.deliveryZone);
      }

      const { data: orders } = await ordersQuery;
      const total = orders?.length || 0;

      const statusMap = new Map<string, number>();
      orders?.forEach(order => {
        const status = order.order_status || 'PENDING';
        statusMap.set(status, (statusMap.get(status) || 0) + 1);
      });

      return Array.from(statusMap.entries()).map(([status, count]) => ({
        status,
        count,
        percentage: total > 0 ? (count / total) * 100 : 0,
      })).sort((a, b) => b.count - a.count);
    },
  });
}

// Hook for top cities (using destination_branch as proxy)
export function useTopCities(filters: AnalyticsFilters, type: 'orders' | 'revenue') {
  return useQuery({
    queryKey: ['analytics-top-cities', filters, type],
    queryFn: async (): Promise<TopCityData[]> => {
      let ordersQuery = supabase
        .from('orders')
        .select('destination_branch, amount')
        .eq('is_deleted', false)
        .gte('created_at', filters.dateFrom)
        .lte('created_at', filters.dateTo);

      if (filters.productId && filters.productId !== 'all') {
        ordersQuery = ordersQuery.eq('product_id', filters.productId);
      }

      const { data: orders } = await ordersQuery;

      const cityMap = new Map<string, { orders: number; revenue: number }>();
      orders?.forEach(order => {
        const city = order.destination_branch || 'Unknown';
        const existing = cityMap.get(city) || { orders: 0, revenue: 0 };
        cityMap.set(city, {
          orders: existing.orders + 1,
          revenue: existing.revenue + (order.amount || 0),
        });
      });

      const result = Array.from(cityMap.entries()).map(([city, data]) => ({
        city,
        ...data,
      }));

      return result.sort((a, b) => type === 'orders' ? b.orders - a.orders : b.revenue - a.revenue).slice(0, 10);
    },
  });
}

// Hook for product insights
export function useProductInsights(filters: AnalyticsFilters) {
  return useQuery({
    queryKey: ['analytics-product-insights', filters],
    queryFn: async (): Promise<ProductInsight[]> => {
      let ordersQuery = supabase
        .from('orders')
        .select('product_id, quantity, amount')
        .eq('is_deleted', false)
        .gte('created_at', filters.dateFrom)
        .lte('created_at', filters.dateTo);

      const { data: orders } = await ordersQuery;

      const productMap = new Map<string, { qty: number; revenue: number }>();
      orders?.forEach(order => {
        if (!order.product_id) return;
        const existing = productMap.get(order.product_id) || { qty: 0, revenue: 0 };
        productMap.set(order.product_id, {
          qty: existing.qty + (order.quantity || 1),
          revenue: existing.revenue + (order.amount || 0),
        });
      });

      const productIds = Array.from(productMap.keys());
      const { data: products } = await supabase
        .from('products')
        .select('id, name, cost_price, sell_price')
        .in('id', productIds);

      const totalRevenue = Array.from(productMap.values()).reduce((sum, p) => sum + p.revenue, 0);

      return (products || []).map(product => {
        const data = productMap.get(product.id) || { qty: 0, revenue: 0 };
        const cost = (product.cost_price || 0) * data.qty;
        const profit = data.revenue - cost;
        const profitMargin = data.revenue > 0 ? (profit / data.revenue) * 100 : 0;
        const revenueContribution = totalRevenue > 0 ? (data.revenue / totalRevenue) * 100 : 0;

        return {
          id: product.id,
          name: product.name,
          quantitySold: data.qty,
          revenue: data.revenue,
          profit,
          profitMargin,
          revenueContribution,
        };
      }).sort((a, b) => b.revenue - a.revenue);
    },
  });
}

// Hook for staff performance
export function useStaffPerformance(filters: AnalyticsFilters) {
  return useQuery({
    queryKey: ['analytics-staff-performance', filters],
    queryFn: async (): Promise<StaffPerformance[]> => {
      const { data: staff } = await supabase
        .from('profiles')
        .select('id, name')
        .in('role', ['CALLING', 'LEADS']);

      if (!staff) return [];

      const performancePromises = staff.map(async (s) => {
        let leadsQuery = supabase
          .from('leads')
          .select('id, status')
          .eq('assigned_to_user_id', s.id)
          .gte('created_at', filters.dateFrom)
          .lte('created_at', filters.dateTo);

        let ordersQuery = supabase
          .from('orders')
          .select('amount, delivery_location')
          .eq('is_deleted', false)
          .eq('sales_person_id', s.id)
          .gte('created_at', filters.dateFrom)
          .lte('created_at', filters.dateTo);

        const [{ data: leads }, { data: orders }] = await Promise.all([leadsQuery, ordersQuery]);

        const leadsAssigned = leads?.length || 0;
        const leadsFollowed = leads?.filter(l => l.status === 'FOLLOW_UP' || l.status === 'CONFIRMED').length || 0;
        const ordersConfirmed = orders?.length || 0;
        const revenue = orders?.reduce((sum, o) => sum + (o.amount || 0), 0) || 0;
        const conversionRate = leadsAssigned > 0 ? (ordersConfirmed / leadsAssigned) * 100 : 0;
        const insideValley = orders?.filter(o => o.delivery_location === 'INSIDE_VALLEY').length || 0;
        const outsideValley = orders?.filter(o => o.delivery_location === 'OUTSIDE_VALLEY').length || 0;

        return {
          id: s.id,
          name: s.name,
          leadsAssigned,
          leadsFollowed,
          ordersConfirmed,
          revenue,
          conversionRate,
          insideValley,
          outsideValley,
        };
      });

      const results = await Promise.all(performancePromises);
      return results.filter(r => r.ordersConfirmed > 0 || r.leadsAssigned > 0).sort((a, b) => b.revenue - a.revenue);
    },
  });
}

// Hook for delivery insights
export function useDeliveryInsights(filters: AnalyticsFilters) {
  return useQuery({
    queryKey: ['analytics-delivery-insights', filters],
    queryFn: async () => {
      let ordersQuery = supabase
        .from('orders')
        .select('delivery_location, order_status, destination_branch, created_at')
        .eq('is_deleted', false)
        .gte('created_at', filters.dateFrom)
        .lte('created_at', filters.dateTo);

      const { data: orders } = await ordersQuery;

      const insideValley = orders?.filter(o => o.delivery_location === 'INSIDE_VALLEY') || [];
      const outsideValley = orders?.filter(o => o.delivery_location === 'OUTSIDE_VALLEY') || [];

      const insideDelivered = insideValley.filter(o => o.order_status === 'DELIVERED').length;
      const outsideDelivered = outsideValley.filter(o => o.order_status === 'DELIVERED').length;

      const insideRTO = insideValley.filter(o => o.order_status === 'RETURNED').length;
      const outsideRTO = outsideValley.filter(o => o.order_status === 'RETURNED').length;

      const insideRate = insideValley.length > 0 ? (insideDelivered / insideValley.length) * 100 : 0;
      const outsideRate = outsideValley.length > 0 ? (outsideDelivered / outsideValley.length) * 100 : 0;

      const insideRTORate = insideValley.length > 0 ? (insideRTO / insideValley.length) * 100 : 0;
      const outsideRTORate = outsideValley.length > 0 ? (outsideRTO / outsideValley.length) * 100 : 0;

      // Top RTO cities (using destination_branch)
      const rtoCities = new Map<string, number>();
      orders?.filter(o => o.order_status === 'RETURNED').forEach(o => {
        const city = o.destination_branch || 'Unknown';
        rtoCities.set(city, (rtoCities.get(city) || 0) + 1);
      });

      const topRTOCities = Array.from(rtoCities.entries())
        .map(([city, count]) => ({ city, count }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 5);

      // Calculate average delivery time (placeholder - needs proper delivered_at field)
      const avgDeliveryTime = 3; // Placeholder value in days

      return {
        insideValley: {
          total: insideValley.length,
          delivered: insideDelivered,
          rate: insideRate,
          rto: insideRTO,
          rtoRate: insideRTORate,
        },
        outsideValley: {
          total: outsideValley.length,
          delivered: outsideDelivered,
          rate: outsideRate,
          rto: outsideRTO,
          rtoRate: outsideRTORate,
        },
        avgDeliveryTime,
        topRTOCities,
      };
    },
  });
}

// Hook for revenue trend (daily data for chart)
export function useRevenueTrend(filters: AnalyticsFilters) {
  return useQuery({
    queryKey: ['analytics-revenue-trend', filters],
    queryFn: async () => {
      let ordersQuery = supabase
        .from('orders')
        .select('created_at, amount')
        .eq('is_deleted', false)
        .gte('created_at', filters.dateFrom)
        .lte('created_at', filters.dateTo)
        .order('created_at');

      const { data: orders } = await ordersQuery;

      const dailyMap = new Map<string, { revenue: number; orders: number }>();
      orders?.forEach(order => {
        const day = format(new Date(order.created_at!), 'yyyy-MM-dd');
        const existing = dailyMap.get(day) || { revenue: 0, orders: 0 };
        dailyMap.set(day, {
          revenue: existing.revenue + (order.amount || 0),
          orders: existing.orders + 1,
        });
      });

      return Array.from(dailyMap.entries()).map(([date, data]) => ({
        date,
        revenue: data.revenue,
        orders: data.orders,
      })).sort((a, b) => a.date.localeCompare(b.date));
    },
  });
}
