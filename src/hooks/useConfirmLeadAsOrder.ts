import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { notifyOrderConfirmed } from '@/lib/notificationHelpers';
import { useCurrentStore } from '@/contexts/CurrentStoreContext';

type DeliveryLocation = 'INSIDE_VALLEY' | 'OUTSIDE_VALLEY';

interface OrderItemInput {
  product_id: string;
  product_name: string;
  quantity: number;
  unit_price: number;
  discount: number;
}

interface ConfirmLeadAsOrderInput {
  leadId: string;
  items: OrderItemInput[];
  totalAmount: number;
  deliveryLocation: DeliveryLocation;
  destinationBranch?: string;
  fullAddress?: string;
  isCod?: boolean;
}

export function useConfirmLeadAsOrder() {
  const queryClient = useQueryClient();
  const { currentStore } = useCurrentStore();

  return useMutation({
    mutationFn: async (input: ConfirmLeadAsOrderInput) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      if (input.items.length === 0) {
        throw new Error('At least one product is required');
      }

      // Check if lead already has an order
      const { data: existingLead } = await supabase
        .from('leads')
        .select('order_id, client_name, contact_number')
        .eq('id', input.leadId)
        .single();

      if (existingLead?.order_id) {
        throw new Error('This lead already has an order');
      }

      // Get user profile name
      const { data: userProfile } = await supabase
        .from('profiles')
        .select('name')
        .eq('id', user.id)
        .single();

      // Calculate totals
      const totalQuantity = input.items.reduce((sum, item) => sum + item.quantity, 0);
      const firstProduct = input.items[0];

      // Create the order
      const { data: order, error: orderError } = await supabase
        .from('orders')
        .insert({
          lead_id: input.leadId,
          product_id: firstProduct.product_id, // Primary product for compatibility
          quantity: totalQuantity,
          amount: input.totalAmount,
          delivery_location: input.deliveryLocation,
          destination_branch: input.destinationBranch,
          full_address: input.fullAddress,
          is_cod: input.isCod ?? true,
          order_status: 'CONFIRMED',
          payment_status: input.isCod ? 'COD' : 'PAID',
          sales_person_id: user.id,
          created_by_staff_id: user.id,
          confirmed_by_user_id: user.id,
          confirmed_at: new Date().toISOString(),
          store_id: currentStore?.id || null,
        })
        .select()
        .single();

      if (orderError) throw orderError;

      // Create order items for each product
      const orderItems = input.items.map(item => ({
        order_id: order.id,
        product_id: item.product_id,
        product_name: item.product_name,
        quantity: item.quantity,
        unit_price: item.unit_price,
        discount: item.discount || 0,
        total_price: (item.quantity * item.unit_price) - (item.discount || 0),
      }));

      const { error: itemsError } = await supabase
        .from('order_items')
        .insert(orderItems);

      if (itemsError) {
        console.error('Failed to create order items:', itemsError);
      }

      // Update lead status
      const { error: leadError } = await supabase
        .from('leads')
        .update({
          status: 'CONFIRMED',
          order_id: order.id,
          confirmed_by_user_id: user.id,
          confirmed_at: new Date().toISOString(),
        })
        .eq('id', input.leadId);

      if (leadError) {
        console.error('Failed to update lead:', leadError);
      }

      // Log to order_history
      await supabase.from('order_history').insert({
        order_id: order.id,
        event_type: 'ORDER_CREATED',
        description: `Order created from lead by ${userProfile?.name || 'Staff'} with ${input.items.length} product(s)`,
        changed_by: user.id,
        new_value: 'CONFIRMED',
      });

      // Send notification - use order's store_id as it's guaranteed to be set
      try {
        const productNames = input.items.map(item => item.product_name).join(', ');
        const notificationStoreId = order.store_id || currentStore?.id;
        console.log('[ORDER_CONFIRMED] Notification store_id:', notificationStoreId, 'for order:', order.id);
        
        await notifyOrderConfirmed({
          orderId: order.id,
          productName: productNames,
          quantity: totalQuantity,
          customerName: existingLead?.client_name || 'Unknown',
          phone: existingLead?.contact_number || '',
          deliveryLocation: input.deliveryLocation,
          actorId: user.id,
          actorName: userProfile?.name || 'Staff',
          amount: input.totalAmount,
          storeId: notificationStoreId || undefined,
        });
      } catch (notifyError) {
        console.error('Failed to send notification:', notifyError);
      }

      return order;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['orders'] });
      queryClient.invalidateQueries({ queryKey: ['leads'] });
      toast.success('Lead confirmed as order successfully');
    },
    onError: (error) => {
      toast.error(`Failed to confirm order: ${error.message}`);
    },
  });
}
