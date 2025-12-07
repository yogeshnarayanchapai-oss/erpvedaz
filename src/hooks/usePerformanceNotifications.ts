import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { format } from 'date-fns';

export interface PerformanceInsight {
  id: string;
  type: 'TOP_STAFF' | 'TOP_PRODUCT' | 'SALES_LOCATION';
  title: string;
  message: string;
  icon: string;
  timestamp: string;
}

export function usePerformanceNotifications() {
  return useQuery({
    queryKey: ['performance-notifications'],
    queryFn: async () => {
      const today = format(new Date(), 'yyyy-MM-dd');
      const insights: PerformanceInsight[] = [];

      // Get today's orders for top staff
      const { data: todayOrders, error: ordersErr } = await supabase
        .from('orders')
        .select('id, amount, sales_person_id, delivery_location')
        .eq('is_deleted', false)
        .gte('order_date', `${today}T00:00:00`)
        .lte('order_date', `${today}T23:59:59`)
        .in('order_status', ['CONFIRMED', 'DELIVERED', 'DISPATCHED']);

      if (ordersErr) throw ordersErr;

      // Aggregate by staff
      const staffSales: Record<string, number> = {};
      let insideValley = 0;
      let outsideValley = 0;

      todayOrders?.forEach((order) => {
        if (order.sales_person_id) {
          staffSales[order.sales_person_id] = (staffSales[order.sales_person_id] || 0) + (order.amount || 0);
        }
        // Use delivery_location to determine valley type
        const location = (order.delivery_location || '').toLowerCase();
        if (location.includes('inside') || location.includes('valley')) {
          insideValley += order.amount || 0;
        } else {
          outsideValley += order.amount || 0;
        }
      });

      // Find top staff
      const topStaffId = Object.entries(staffSales).sort(([,a], [,b]) => b - a)[0];
      if (topStaffId) {
        const { data: profile } = await supabase
          .from('profiles')
          .select('name')
          .eq('id', topStaffId[0])
          .maybeSingle();

        if (profile) {
          insights.push({
            id: 'top-staff-today',
            type: 'TOP_STAFF',
            title: `Today's Top Staff`,
            message: `${profile.name} – Rs ${topStaffId[1].toLocaleString()} sales`,
            icon: '👑',
            timestamp: new Date().toISOString(),
          });
        }
      }

      // Get today's sales by product for ROI
      const { data: salesMovements, error: salesErr } = await supabase
        .from('stock_movements')
        .select('product_id, total_value, products:product_id(name)')
        .eq('movement_type', 'OUT')
        .gte('movement_date', today)
        .lte('movement_date', today);

      if (salesErr) throw salesErr;

      // Aggregate by product
      const productRevenue: Record<string, { name: string; revenue: number }> = {};
      salesMovements?.forEach((m) => {
        if (m.product_id) {
          const productData = m.products as { name: string } | null;
          const name = productData?.name || 'Unknown';
          if (!productRevenue[m.product_id]) {
            productRevenue[m.product_id] = { name, revenue: 0 };
          }
          productRevenue[m.product_id].revenue += m.total_value || 0;
        }
      });

      // Find top product
      const topProduct = Object.values(productRevenue).sort((a, b) => b.revenue - a.revenue)[0];
      if (topProduct && topProduct.revenue > 0) {
        insights.push({
          id: 'top-product-today',
          type: 'TOP_PRODUCT',
          title: 'Top Product Today',
          message: `${topProduct.name} – Rs ${topProduct.revenue.toLocaleString()} revenue`,
          icon: '🔥',
          timestamp: new Date().toISOString(),
        });
      }

      // Inside vs Outside Valley
      if (insideValley > 0 || outsideValley > 0) {
        insights.push({
          id: 'sales-location-today',
          type: 'SALES_LOCATION',
          title: 'Sales by Location',
          message: `Inside: Rs ${insideValley.toLocaleString()} | Outside: Rs ${outsideValley.toLocaleString()}`,
          icon: '📍',
          timestamp: new Date().toISOString(),
        });
      }

      return insights;
    },
    refetchInterval: 5 * 60 * 1000, // Refetch every 5 minutes
  });
}
