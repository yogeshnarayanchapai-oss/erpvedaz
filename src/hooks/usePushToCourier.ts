import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface PushInput {
  orderId: string;
  courier: 'NCM' | 'GBL' | 'PATHAO' | 'GAAUBESI';
}

export function usePushToCourier() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ orderId, courier }: PushInput) => {
      // Idempotency: block if already pushed to any courier
      const { data: existing } = await supabase
        .from('logistics_orders')
        .select('id, courier, tracking_id')
        .eq('order_id', orderId)
        .maybeSingle();
      if (existing) {
        throw new Error(`Already pushed to ${(existing as any).courier}${(existing as any).tracking_id ? ` (Tracking: ${(existing as any).tracking_id})` : ''}`);
      }

      // Fetch order with lead details for payload
      const { data: order, error } = await supabase
        .from('orders')
        .select(`*, leads:lead_id(client_name, contact_number, full_address), order_items(product_name, quantity)`)
        .eq('id', orderId)
        .single();
      if (error) throw error;

      const customerName = (order as any).leads?.client_name || 'N/A';
      const customerPhone = (order as any).leads?.contact_number || 'N/A';
      const fullAddress = (order as any).full_address || (order as any).leads?.full_address || 'N/A';
      const items = (order as any).order_items || [];
      const productName = items.length
        ? items.map((i: any) => `${i.product_name}${i.quantity > 1 ? ` (${i.quantity})` : ''}`).join(', ')
        : 'Product';
      const quantity = items.reduce((s: number, i: any) => s + (i.quantity || 0), 0) || 1;
      const codAmount = (order as any).total_amount || 0;

      const fnName = courier === 'GAAUBESI' ? 'courier-gaaubesi-create' : 'send-to-courier';
      const { data, error: fnError } = await supabase.functions.invoke(fnName, {
        body: {
          orderId,
          courier,
          customerName,
          customerPhone,
          fullAddress,
          codAmount,
          productName,
          quantity,
        },
      });
      if (fnError) throw fnError;
      if ((data as any)?.error) throw new Error((data as any).error);
      return data;
    },
    onSuccess: (data: any) => {
      toast.success(`Pushed to courier${data?.trackingId ? ` — Tracking: ${data.trackingId}` : ''}`);
      qc.invalidateQueries({ queryKey: ['orders'] });
      qc.invalidateQueries({ queryKey: ['logistics-orders'] });
    },
    onError: (e: any) => toast.error(e.message || 'Failed to push to courier'),
  });
}
