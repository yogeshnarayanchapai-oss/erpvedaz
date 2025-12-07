import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useEffect, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { playNotificationSound } from '@/lib/notificationSound';
import { notifyOrderRedirected } from '@/lib/notificationHelpers';

interface FollowupOrdersFilters {
  dateFrom?: string;
  dateTo?: string;
  deliveryLocation?: string;
  status?: string;
}

export function useFollowupOrders(filters: FollowupOrdersFilters = {}, enableSound: boolean = false) {
  const queryClient = useQueryClient();
  const hasInteractedRef = useRef(false);

  // Track user interaction to enable audio
  useEffect(() => {
    if (!enableSound) return;
    
    const enableAudio = () => {
      hasInteractedRef.current = true;
    };
    
    document.addEventListener('click', enableAudio, { once: true });
    document.addEventListener('keydown', enableAudio, { once: true });
    
    return () => {
      document.removeEventListener('click', enableAudio);
      document.removeEventListener('keydown', enableAudio);
    };
  }, [enableSound]);

  // Set up realtime subscription for orders
  useEffect(() => {
    const channel = supabase
      .channel('followup-orders-realtime')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'orders',
        },
        (payload) => {
          console.log('New order inserted:', payload);
          // Play notification sound for new orders
          if (enableSound && hasInteractedRef.current) {
            playNotificationSound();
          }
          queryClient.invalidateQueries({ queryKey: ['followup-orders'] });
          queryClient.invalidateQueries({ queryKey: ['followup-stats'] });
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'orders',
        },
        (payload) => {
          console.log('Order updated:', payload);
          queryClient.invalidateQueries({ queryKey: ['followup-orders'] });
          queryClient.invalidateQueries({ queryKey: ['followup-stats'] });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [queryClient, enableSound]);

  return useQuery({
    queryKey: ['followup-orders', filters],
    queryFn: async () => {
      let query = supabase
        .from('orders')
        .select(`
          *,
          products (id, name),
          leads:leads!orders_lead_id_fkey (id, client_name, contact_number, remark, full_address),
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
      // Don't filter by delivery/status at query level - do it client-side for proper card counts

      const { data, error } = await query;
      if (error) throw error;
      return data || [];
    },
  });
}

export function useRedirectOrder() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      orderId,
      remark,
      userId,
      userName,
      sendToLogistics = true,
    }: {
      orderId: string;
      remark: string;
      userId: string;
      userName: string;
      sendToLogistics?: boolean;
    }) => {
      // Fetch order details for notification
      const { data: orderData } = await supabase
        .from('orders')
        .select(`
          sales_person_id,
          amount,
          products (name),
          leads (client_name)
        `)
        .eq('id', orderId)
        .single();

      const now = new Date().toISOString();
      const redirectNote = `Redirected by ${userName} on ${new Date().toLocaleDateString()}`;
      const updatedRemark = remark ? `${remark}\n${redirectNote}` : redirectNote;

      const { error } = await supabase
        .from('orders')
        .update({
          order_status: 'REDIRECT',
          delivery_notes: updatedRemark,
          redirected_by_user_id: userId,
          redirected_at: now,
          sent_to_logistics: sendToLogistics,
        })
        .eq('id', orderId);

      if (error) throw error;

      // Send notification
      if (orderData) {
        try {
          await notifyOrderRedirected({
            orderId,
            productName: (orderData.products as any)?.name || 'Unknown',
            customerName: (orderData.leads as any)?.client_name || 'Unknown',
            amount: orderData.amount || 0,
            callingStaffId: orderData.sales_person_id || '',
            actorId: userId,
            actorName: userName,
          });
        } catch (notifyError) {
          console.error('Failed to send redirect notification:', notifyError);
        }
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['followup-orders'] });
      queryClient.invalidateQueries({ queryKey: ['orders'] });
    },
  });
}

export function useFollowupStats(dateFrom: string, dateTo: string) {
  const queryClient = useQueryClient();

  // Set up realtime subscription for stats
  useEffect(() => {
    const channel = supabase
      .channel('followup-stats-realtime')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'orders',
        },
        () => {
          queryClient.invalidateQueries({ queryKey: ['followup-stats'] });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [queryClient]);

  return useQuery({
    queryKey: ['followup-stats', dateFrom, dateTo],
    queryFn: async () => {
      // Get all orders for the date range that followup can see
      const { data: orders, error } = await supabase
        .from('orders')
        .select(`
          id,
          order_status,
          delivery_location,
          sales_person_id,
          redirected_by_user_id,
          profiles:profiles!orders_sales_person_id_fkey (id, name)
        `)
        .eq('is_deleted', false)
        .gte('order_date', `${dateFrom}T00:00:00`)
        .lte('order_date', `${dateTo}T23:59:59`);

      if (error) throw error;

      const totalOrders = orders?.length || 0;
      const redirectOrders = orders?.filter(o => o.order_status === 'REDIRECT') || [];
      const totalRedirect = redirectOrders.length;

      // Group redirects by calling staff
      const redirectsByStaff: Record<string, { name: string; total: number; redirected: number }> = {};
      
      orders?.forEach(order => {
        const staffId = order.sales_person_id;
        const staffName = (order.profiles as any)?.name || 'Unknown';
        
        if (staffId) {
          if (!redirectsByStaff[staffId]) {
            redirectsByStaff[staffId] = { name: staffName, total: 0, redirected: 0 };
          }
          redirectsByStaff[staffId].total++;
          if (order.order_status === 'REDIRECT') {
            redirectsByStaff[staffId].redirected++;
          }
        }
      });

      const staffRedirectStats = Object.entries(redirectsByStaff)
        .map(([id, stats]) => ({
          id,
          name: stats.name,
          totalOrders: stats.total,
          redirectedOrders: stats.redirected,
          redirectPercent: stats.total > 0 ? Math.round((stats.redirected / stats.total) * 100) : 0,
        }))
        .filter(s => s.redirectedOrders > 0)
        .sort((a, b) => b.redirectedOrders - a.redirectedOrders);

      return {
        totalOrders,
        totalRedirect,
        staffRedirectStats,
      };
    },
  });
}

export function useFollowupStaff() {
  return useQuery({
    queryKey: ['followup-staff'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('profiles')
        .select('id, name')
        .eq('role', 'FOLLOWUP')
        .eq('is_active', true);

      if (error) throw error;
      return data || [];
    },
  });
}
