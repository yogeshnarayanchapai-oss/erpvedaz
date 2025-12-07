import { supabase } from '@/integrations/supabase/client';

interface SubmitOrdersToCourierParams {
  orderIds: string[];
  courierId: string;
  deliveryInstruction?: string;
}

interface SubmissionResult {
  orderId: string;
  success: boolean;
  awbNumber?: string;
  error?: string;
}

export async function submitOrdersToCourier({
  orderIds,
  courierId,
  deliveryInstruction,
}: SubmitOrdersToCourierParams) {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Not authenticated');

  // Fetch courier details
  const { data: courier, error: courierError } = await supabase
    .from('couriers')
    .select('*')
    .eq('id', courierId)
    .single();

  if (courierError) throw courierError;
  if (!courier.is_api_connected) {
    throw new Error('Courier API is not connected');
  }

  // Fetch orders with all details
  const { data: orders, error: ordersError } = await supabase
    .from('orders')
    .select(`
      *,
      leads(client_name, contact_number, alt_phone, full_address),
      customers(customer_name, phone_number, full_address, city),
      products(name),
      branches(branch_name)
    `)
    .in('id', orderIds);

  if (ordersError) throw ordersError;

  const results: SubmissionResult[] = [];

  for (const order of orders || []) {
    try {
      // Build courier payload
      const customerName = order.leads?.client_name || order.customers?.customer_name || 'N/A';
      const phone = order.leads?.contact_number || order.customers?.phone_number || 'N/A';
      const altPhone = order.leads?.alt_phone || '';
      const address = order.full_address || order.leads?.full_address || order.customers?.full_address || 'N/A';
      const city = order.customers?.city || '';
      
      // For now, simulate API call (replace with actual API integration later)
      // const awbNumber = await callCourierAPI(courier, order, ...);
      const awbNumber = `AWB${Date.now().toString().slice(-8)}`;

      // Create order_courier record
      const { error: courierRecordError } = await supabase
        .from('order_courier')
        .insert({
          order_id: order.id,
          courier_id: courierId,
          courier_name: courier.name,
          awb_number: awbNumber,
          status: 'SENT',
        });

      if (courierRecordError) throw courierRecordError;

      // Update order
      const { error: orderUpdateError } = await supabase
        .from('orders')
        .update({
          courier_provider: courier.name,
          courier_awb: awbNumber,
          courier_submitted_at: new Date().toISOString(),
          order_status: 'DISPATCHED',
        })
        .eq('id', order.id);

      if (orderUpdateError) throw orderUpdateError;

      // Log to order history
      await supabase.from('order_history').insert({
        order_id: order.id,
        changed_by: user.id,
        portal: 'ADMIN',
        action_type: 'COURIER_SUBMITTED',
        new_value: courier.name,
        description: `Submitted to ${courier.display_name} (AWB: ${awbNumber})${deliveryInstruction ? `. Note: ${deliveryInstruction}` : ''}`,
        event_type: 'COURIER_UPDATE',
      });

      results.push({
        orderId: order.id,
        success: true,
        awbNumber,
      });
    } catch (error) {
      results.push({
        orderId: order.id,
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }

  return {
    courierName: courier.display_name,
    results,
  };
}
