import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { notifyLogisticsStatusUpdate, notifyOrderRedirected } from '@/lib/notificationHelpers';

interface LogisticsOrdersFilters {
  dateFrom?: string;
  dateTo?: string;
}

const CACHE_KEY = 'logistics_all_orders_cache';
const CACHE_TIMESTAMP_KEY = 'logistics_all_orders_ts';
const CACHE_MAX_AGE = 10 * 60 * 1000; // 10 minutes

function getSessionCache(): any[] | null {
  try {
    const ts = sessionStorage.getItem(CACHE_TIMESTAMP_KEY);
    if (!ts || Date.now() - parseInt(ts) > CACHE_MAX_AGE) return null;
    const cached = sessionStorage.getItem(CACHE_KEY);
    return cached ? JSON.parse(cached) : null;
  } catch { return null; }
}

function setSessionCache(data: any[]) {
  try {
    sessionStorage.setItem(CACHE_KEY, JSON.stringify(data));
    sessionStorage.setItem(CACHE_TIMESTAMP_KEY, String(Date.now()));
  } catch { /* storage full - ignore */ }
}

export function clearLogisticsOrdersCache() {
  sessionStorage.removeItem(CACHE_KEY);
  sessionStorage.removeItem(CACHE_TIMESTAMP_KEY);
}

// Single hook that fetches ALL orders once and caches in sessionStorage
export function useAllLogisticsOrders() {
  const queryClient = useQueryClient();

  // Realtime subscription to invalidate cache on changes
  useEffect(() => {
    const channel = supabase
      .channel('logistics-portal-orders-realtime')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'orders' },
        () => {
          clearLogisticsOrdersCache();
          queryClient.invalidateQueries({ queryKey: ['logistics-all-orders'] });
        }
      )
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [queryClient]);

  const query = useQuery({
    queryKey: ['logistics-all-orders'],
    queryFn: async () => {
      // Check sessionStorage cache first
      const cached = getSessionCache();
      if (cached) return cached;

      // Paginate to get ALL orders (bypass 1000 row limit)
      const allOrders: any[] = [];
      const PAGE_SIZE = 1000;
      let page = 0;
      let hasMore = true;

      while (hasMore) {
        const { data, error } = await supabase
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

      // Cache in sessionStorage
      setSessionCache(allOrders);
      return allOrders;
    },
    staleTime: 5 * 60 * 1000, // 5 min
    gcTime: 10 * 60 * 1000,
  });

  const forceRefresh = useCallback(() => {
    clearLogisticsOrdersCache();
    queryClient.invalidateQueries({ queryKey: ['logistics-all-orders'] });
  }, [queryClient]);

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
      queryClient.invalidateQueries({ queryKey: ['logistics-portal-orders'] });
      queryClient.invalidateQueries({ queryKey: ['orders'] });
    },
  });
}
