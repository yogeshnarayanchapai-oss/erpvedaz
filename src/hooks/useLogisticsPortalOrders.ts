import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useEffect, useCallback, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { notifyLogisticsStatusUpdate, notifyOrderRedirected } from '@/lib/notificationHelpers';
import { useCurrentStoreId } from '@/hooks/useCurrentStoreId';

interface LogisticsOrdersFilters {
  dateFrom?: string;
  dateTo?: string;
}

// Limit logistics fetch window for performance (logistics flow is short-lived)
const FETCH_WINDOW_DAYS = 90;

function getCacheKeys(storeId: string | null) {
  const suffix = storeId || 'global';
  return {
    data: `logistics_all_orders_cache_${suffix}`,
    ts: `logistics_all_orders_ts_${suffix}`,
  };
}
const CACHE_MAX_AGE = 10 * 60 * 1000; // 10 minutes

function getSessionCache(storeId: string | null): any[] | null {
  try {
    const { data, ts } = getCacheKeys(storeId);
    const tsVal = sessionStorage.getItem(ts);
    if (!tsVal || Date.now() - parseInt(tsVal) > CACHE_MAX_AGE) return null;
    const cached = sessionStorage.getItem(data);
    return cached ? JSON.parse(cached) : null;
  } catch { return null; }
}

function setSessionCache(storeId: string | null, data: any[]) {
  try {
    const keys = getCacheKeys(storeId);
    sessionStorage.setItem(keys.data, JSON.stringify(data));
    sessionStorage.setItem(keys.ts, String(Date.now()));
  } catch { /* storage full - ignore */ }
}

export function clearLogisticsOrdersCache() {
  // Clear all logistics cache entries (any store)
  try {
    const keysToRemove: string[] = [];
    for (let i = 0; i < sessionStorage.length; i++) {
      const k = sessionStorage.key(i);
      if (k && k.startsWith('logistics_all_orders_')) keysToRemove.push(k);
    }
    keysToRemove.forEach(k => sessionStorage.removeItem(k));
  } catch { /* ignore */ }
}

// Single hook that fetches ALL orders once and caches in sessionStorage
export function useAllLogisticsOrders() {
  const queryClient = useQueryClient();
  const storeId = useCurrentStoreId();
  const invalidateTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Realtime subscription with debounced invalidation to avoid thrashing
  useEffect(() => {
    if (!storeId) return;
    const channel = supabase
      .channel(`logistics-portal-orders-realtime-${storeId}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'orders', filter: `store_id=eq.${storeId}` },
        () => {
          if (invalidateTimeoutRef.current) clearTimeout(invalidateTimeoutRef.current);
          invalidateTimeoutRef.current = setTimeout(() => {
            clearLogisticsOrdersCache();
            queryClient.invalidateQueries({ queryKey: ['logistics-all-orders', storeId] });
          }, 3000); // debounce 3s
        }
      )
      .subscribe();

    return () => {
      if (invalidateTimeoutRef.current) clearTimeout(invalidateTimeoutRef.current);
      supabase.removeChannel(channel);
    };
  }, [queryClient, storeId]);

  const query = useQuery({
    queryKey: ['logistics-all-orders', storeId],
    enabled: !!storeId,
    queryFn: async () => {
      // Check sessionStorage cache first
      const cached = getSessionCache(storeId);
      if (cached) return cached;

      // Compute date window (last N days)
      const fromDate = new Date();
      fromDate.setDate(fromDate.getDate() - FETCH_WINDOW_DAYS);
      const fromIso = fromDate.toISOString();

      // Paginate to get orders within the window (bypass 1000 row limit)
      const allOrders: any[] = [];
      const PAGE_SIZE = 1000;
      let page = 0;
      let hasMore = true;

      while (hasMore) {
        let q = supabase
          .from('orders')
          .select(`
            *,
            products (id, name),
            leads:leads!orders_lead_id_fkey (id, client_name, contact_number, remark, full_address, reference_id),
            customers:customers!orders_customer_id_fkey (id, customer_name, phone_number),
            profiles:profiles!orders_sales_person_id_fkey (id, name),
            confirmed_by_profile:profiles!orders_confirmed_by_user_id_fkey (id, name),
            redirected_by:profiles!orders_redirected_by_user_id_fkey (id, name),
            order_items (id, product_id, product_name, quantity, unit_price, discount, total_price)
          `)
          .eq('is_deleted', false)
          .gte('order_date', fromIso)
          .order('order_date', { ascending: false })
          .range(page * PAGE_SIZE, (page + 1) * PAGE_SIZE - 1);

        if (storeId) q = q.eq('store_id', storeId);

        const { data, error } = await q;

        if (error) throw error;
        if (data && data.length > 0) {
          allOrders.push(...data);
          hasMore = data.length === PAGE_SIZE;
          page++;
        } else {
          hasMore = false;
        }
      }

      // Cache in sessionStorage
      setSessionCache(storeId, allOrders);
      return allOrders;
    },
    staleTime: 5 * 60 * 1000, // 5 min
    gcTime: 10 * 60 * 1000,
    retry: 1,
    refetchOnWindowFocus: false,
  });

  const forceRefresh = useCallback(() => {
    clearLogisticsOrdersCache();
    queryClient.invalidateQueries({ queryKey: ['logistics-all-orders', storeId] });
  }, [queryClient, storeId]);

  return { ...query, forceRefresh };
}

// Keep old hook for backward compat but it now just filters the cached data
export function useLogisticsPortalOrders(filters: LogisticsOrdersFilters = {}) {
  const queryClient = useQueryClient();

  useEffect(() => {
    const channel = supabase
      .channel('logistics-portal-orders-realtime-compat')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'orders' },
        () => {
          queryClient.invalidateQueries({ queryKey: ['logistics-portal-orders'] });
        }
      )
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [queryClient]);

  return useQuery({
    queryKey: ['logistics-portal-orders', filters],
    queryFn: async () => {
      let query = supabase
        .from('orders')
        .select(`
          *,
          products (id, name),
          leads:leads!orders_lead_id_fkey (id, client_name, contact_number, remark, full_address, reference_id),
          customers:customers!orders_customer_id_fkey (id, customer_name, phone_number),
          profiles:profiles!orders_sales_person_id_fkey (id, name),
          confirmed_by_profile:profiles!orders_confirmed_by_user_id_fkey (id, name),
          redirected_by:profiles!orders_redirected_by_user_id_fkey (id, name),
          order_items (id, product_id, product_name, quantity, unit_price, discount, total_price)
        `)
        .eq('is_deleted', false)
        .order('order_date', { ascending: false });

      if (filters.dateFrom) {
        query = query.gte('order_date', `${filters.dateFrom}T00:00:00`);
      }
      if (filters.dateTo) {
        query = query.lte('order_date', `${filters.dateTo}T23:59:59`);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data || [];
    },
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
    }: {
      orderId: string;
      branch?: string;
      deliveryLocation?: string;
      courier?: string;
      remark: string;
      userId: string;
      userName: string;
    }) => {
      // Get order details for notification before updating
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

      if (branch) {
        updateData.destination_branch = branch;
      }
      if (deliveryLocation) {
        updateData.delivery_location = deliveryLocation;
      }
      if (courier) {
        updateData.courier_provider = courier;
      }

      const { error } = await supabase
        .from('orders')
        .update(updateData)
        .eq('id', orderId);

      if (error) throw error;

      // Notify the calling staff who owns the order
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
      clearLogisticsOrdersCache();
      queryClient.invalidateQueries({ queryKey: ['logistics-all-orders'] });
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
      clearLogisticsOrdersCache();
      queryClient.invalidateQueries({ queryKey: ['logistics-all-orders'] });
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
      const now = new Date().toISOString();
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
      clearLogisticsOrdersCache();
      queryClient.invalidateQueries({ queryKey: ['logistics-all-orders'] });
      queryClient.invalidateQueries({ queryKey: ['logistics-portal-orders'] });
      queryClient.invalidateQueries({ queryKey: ['orders'] });
    },
  });
}
