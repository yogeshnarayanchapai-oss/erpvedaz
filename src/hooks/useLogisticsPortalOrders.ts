import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useEffect, useCallback, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { notifyLogisticsStatusUpdate, notifyOrderRedirected } from '@/lib/notificationHelpers';
import { useCurrentStoreId } from '@/hooks/useCurrentStoreId';

interface LogisticsOrdersFilters {
  dateFrom?: string;
  dateTo?: string;
}

// Lightweight SELECT — only fields used by the table/modal. Avoids `*` and heavy joins.
const LOGISTICS_SELECT = `
  id, order_date, created_at, order_status, delivery_location, delivery_notes,
  destination_branch, courier_provider, amount, quantity, store_id,
  sales_person_id, called_by_user_id, redirected_by_user_id, confirmed_by_user_id,
  is_deleted, lead_id, customer_id, product_id,
  products:products!orders_product_id_fkey (id, name),
  leads:leads!orders_lead_id_fkey (id, client_name, contact_number, remark, full_address, reference_id),
  customers:customers!orders_customer_id_fkey (id, customer_name, phone_number),
  profiles:profiles!orders_sales_person_id_fkey (id, name),
  confirmed_by_profile:profiles!orders_confirmed_by_user_id_fkey (id, name),
  redirected_by:profiles!orders_redirected_by_user_id_fkey (id, name),
  order_items (id, product_id, product_name, quantity, unit_price, discount, total_price)
`;

function dateOnlyIso(d: Date): string {
  // YYYY-MM-DD in local time
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

/**
 * Fetch logistics orders for a specific date range (server-side filtered).
 * Default range: today only — extend via the dateRange argument for "All Orders" tab.
 */
export function useLogisticsOrdersInRange(dateRange?: { from: Date; to: Date }) {
  const queryClient = useQueryClient();
  const storeId = useCurrentStoreId();
  const invalidateTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const fromStr = dateRange ? dateOnlyIso(dateRange.from) : dateOnlyIso(new Date());
  const toStr = dateRange ? dateOnlyIso(dateRange.to) : dateOnlyIso(new Date());

  // Realtime subscription with debounced invalidation
  useEffect(() => {
    if (!storeId) return;
    const channel = supabase
      .channel(`logistics-orders-rt-${storeId}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'orders', filter: `store_id=eq.${storeId}` },
        () => {
          if (invalidateTimeoutRef.current) clearTimeout(invalidateTimeoutRef.current);
          invalidateTimeoutRef.current = setTimeout(() => {
            queryClient.invalidateQueries({ queryKey: ['logistics-orders-range', storeId] });
          }, 5000); // 5s debounce
        }
      )
      .subscribe();

    return () => {
      if (invalidateTimeoutRef.current) clearTimeout(invalidateTimeoutRef.current);
      supabase.removeChannel(channel);
    };
  }, [queryClient, storeId]);

  const query = useQuery({
    queryKey: ['logistics-orders-range', storeId, fromStr, toStr],
    enabled: !!storeId,
    queryFn: async () => {
      // Server-side bounded query. Use timestamptz boundaries with NPT offset.
      const fromIso = `${fromStr}T00:00:00+05:45`;
      const toIso = `${toStr}T23:59:59+05:45`;

      // Paginate to handle high-volume stores without hitting the 1000 default cap.
      const allOrders: any[] = [];
      const PAGE_SIZE = 1000;
      const MAX_PAGES = 5; // hard cap = 5000 records to avoid UI freeze
      let page = 0;
      let hasMore = true;

      while (hasMore && page < MAX_PAGES) {
        const { data, error } = await supabase
          .from('orders')
          .select(LOGISTICS_SELECT)
          .eq('store_id', storeId!)
          .eq('is_deleted', false)
          .gte('order_date', fromIso)
          .lte('order_date', toIso)
          .order('order_date', { ascending: false })
          .range(page * PAGE_SIZE, (page + 1) * PAGE_SIZE - 1);

        if (error) throw error;
        if (data && data.length > 0) {
          allOrders.push(...data);
          hasMore = data.length === PAGE_SIZE;
          page++;
        } else {
          hasMore = false;
        }
      }
      return allOrders;
    },
    staleTime: 2 * 60 * 1000,
    gcTime: 5 * 60 * 1000,
    retry: 1,
    refetchOnWindowFocus: false,
  });

  const forceRefresh = useCallback(() => {
    queryClient.invalidateQueries({ queryKey: ['logistics-orders-range', storeId] });
  }, [queryClient, storeId]);

  return { ...query, forceRefresh };
}

// Backward-compat shim: returns today's orders when called with no args.
export function useAllLogisticsOrders() {
  return useLogisticsOrdersInRange();
}

export function clearLogisticsOrdersCache() {
  // No sessionStorage cache anymore — kept for API compatibility.
  return;
}

// Legacy hook kept for backward compatibility with other callers.
export function useLogisticsPortalOrders(filters: LogisticsOrdersFilters = {}) {
  const queryClient = useQueryClient();
  const storeId = useCurrentStoreId();

  useEffect(() => {
    if (!storeId) return;
    const channel = supabase
      .channel(`logistics-portal-orders-compat-${storeId}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'orders', filter: `store_id=eq.${storeId}` },
        () => {
          queryClient.invalidateQueries({ queryKey: ['logistics-portal-orders'] });
        }
      )
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [queryClient, storeId]);

  return useQuery({
    queryKey: ['logistics-portal-orders', storeId, filters],
    enabled: !!storeId,
    queryFn: async () => {
      let query = supabase
        .from('orders')
        .select(LOGISTICS_SELECT)
        .eq('is_deleted', false)
        .eq('store_id', storeId!)
        .order('order_date', { ascending: false })
        .limit(2000);

      if (filters.dateFrom) {
        query = query.gte('order_date', `${filters.dateFrom}T00:00:00+05:45`);
      }
      if (filters.dateTo) {
        query = query.lte('order_date', `${filters.dateTo}T23:59:59+05:45`);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data || [];
    },
    staleTime: 2 * 60 * 1000,
    retry: 1,
    refetchOnWindowFocus: false,
  });
}

export function useLogisticsRedirectOrder() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      orderId,
      branch,
      deliveryLocation,
      courier,
      remark,
      userId,
      userName,
      attributedStaffId,
    }: {
      orderId: string;
      branch?: string;
      deliveryLocation?: string;
      courier?: string;
      remark: string;
      userId: string;
      userName: string;
      attributedStaffId?: string;
    }) => {
      const { data: order } = await supabase
        .from('orders')
        .select(`
          id,
          sales_person_id,
          store_id,
          amount,
          leads:leads!orders_lead_id_fkey (client_name),
          products (name)
        `)
        .eq('id', orderId)
        .single();

      const now = new Date().toISOString();
      const redirectNote = `Redirected by ${userName} on ${new Date().toLocaleDateString()}`;
      const fullRemark = remark ? `${remark}\n${redirectNote}` : redirectNote;

      const updateData: Record<string, any> = {
        order_status: 'REDIRECT',
        delivery_notes: fullRemark,
        redirected_by_user_id: userId,
        redirected_at: now,
      };

      if (branch) updateData.destination_branch = branch;
      if (deliveryLocation) updateData.delivery_location = deliveryLocation;
      if (courier) updateData.courier_provider = courier;
      if (attributedStaffId) updateData.redirect_attributed_to_staff_id = attributedStaffId;

      const { error } = await supabase
        .from('orders')
        .update(updateData)
        .eq('id', orderId);

      if (error) throw error;

      if (order && order.sales_person_id && order.sales_person_id !== userId) {
        try {
          await notifyOrderRedirected({
            orderId,
            productName: (order.products as any)?.name || 'Product',
            customerName: (order.leads as any)?.client_name || 'Customer',
            amount: order.amount || 0,
            callingStaffId: order.sales_person_id,
            actorId: userId,
            actorName: userName,
            storeId: order.store_id || undefined,
          });
        } catch (notifyError) {
          console.error('Failed to send redirect notification:', notifyError);
        }
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['logistics-orders-range'] });
      queryClient.invalidateQueries({ queryKey: ['logistics-portal-orders'] });
      queryClient.invalidateQueries({ queryKey: ['orders'] });
    },
  });
}

export function useLogisticsMarkDelivered() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      orderId,
      userId,
    }: {
      orderId: string;
      userId: string;
    }) => {
      const now = new Date().toISOString();

      const { data: order } = await supabase
        .from('orders')
        .select(`
          id, 
          sales_person_id,
          store_id,
          leads:leads!orders_lead_id_fkey (client_name)
        `)
        .eq('id', orderId)
        .single();

      const { error } = await supabase
        .from('orders')
        .update({
          order_status: 'DELIVERED',
          delivered_at: now,
          delivered_by: userId,
        })
        .eq('id', orderId);

      if (error) throw error;

      if (order && order.sales_person_id && order.sales_person_id !== userId) {
        const { data: actorProfile } = await supabase
          .from('profiles')
          .select('name')
          .eq('id', userId)
          .single();

        try {
          await notifyLogisticsStatusUpdate({
            orderId,
            customerName: (order.leads as any)?.client_name || 'Customer',
            newStatus: 'DELIVERED',
            orderOwnerUserId: order.sales_person_id,
            actorId: userId,
            actorName: actorProfile?.name || 'Logistics',
            storeId: order.store_id || undefined,
          });
        } catch (notifyError) {
          console.error('Failed to send notification:', notifyError);
        }
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['logistics-orders-range'] });
      queryClient.invalidateQueries({ queryKey: ['logistics-portal-orders'] });
      queryClient.invalidateQueries({ queryKey: ['orders'] });
    },
  });
}

export function useLogisticsMarkReturned() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      orderId,
      userId,
      userName,
    }: {
      orderId: string;
      userId: string;
      userName: string;
    }) => {
      const returnNote = `Marked as RETURNED by ${userName} on ${new Date().toLocaleDateString()}`;

      const { error } = await supabase
        .from('orders')
        .update({
          order_status: 'RETURNED',
          delivery_notes: returnNote,
        })
        .eq('id', orderId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['logistics-orders-range'] });
      queryClient.invalidateQueries({ queryKey: ['logistics-portal-orders'] });
      queryClient.invalidateQueries({ queryKey: ['orders'] });
    },
  });
}
