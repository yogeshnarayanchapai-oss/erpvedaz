import { supabase } from '@/integrations/supabase/client';

export type OrderStatus = 'CONFIRMED' | 'PACKED' | 'DISPATCHED' | 'DELIVERED' | 'RETURNED' | 'SENT_FOR_DELIVERY' | 'LOCATION_CNR' | 'PENDING' | 'CANCELLED' | 'REDIRECT';
export type PaymentStatus = 'PENDING' | 'PAID' | 'COD';

interface UpdateOrderStatusParams {
  orderId: string;
  orderStatus?: OrderStatus;
  paymentStatus?: PaymentStatus;
  portal?: 'ADMIN' | 'CALLING' | 'LOGISTICS' | 'FOLLOWUP';
}

interface AssignCourierParams {
  orderId: string;
  courierProvider: string;
  awbNumber?: string;
  trackingCode?: string;
  notes?: string;
  portal?: 'ADMIN' | 'CALLING' | 'LOGISTICS';
}

interface OrderHistoryEntry {
  order_id: string;
  changed_by: string;
  portal: string;
  action_type: string;
  field_name?: string;
  old_value?: string;
  new_value?: string;
  description: string;
  event_type: string;
}

async function logOrderHistory(entry: OrderHistoryEntry) {
  const { error } = await supabase
    .from('order_history')
    .insert(entry);
  
  if (error) {
    console.error('Failed to log order history:', error);
  }
}

export async function updateOrderStatus({ 
  orderId, 
  orderStatus, 
  paymentStatus,
  portal = 'ADMIN'
}: UpdateOrderStatusParams) {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Not authenticated');

  // Get current order state
  const { data: currentOrder } = await supabase
    .from('orders')
    .select('order_status, payment_status')
    .eq('id', orderId)
    .single();

  const updates: Record<string, any> = {};
  // Only add valid enum values to prevent "NULL" string errors
  const orderStatusStr = String(orderStatus || '');
  const paymentStatusStr = String(paymentStatus || '');
  
  if (orderStatus && orderStatusStr && !['null', 'NULL', 'undefined', ''].includes(orderStatusStr)) {
    updates.order_status = orderStatus;
  }
  if (paymentStatus && paymentStatusStr && !['null', 'NULL', 'undefined', ''].includes(paymentStatusStr)) {
    updates.payment_status = paymentStatus;
  }
  
  if (Object.keys(updates).length === 0) {
    throw new Error('No valid status values provided');
  }

  const { data, error } = await supabase
    .from('orders')
    .update(updates)
    .eq('id', orderId)
    .select()
    .single();

  if (error) throw error;

  // Log history for status change
  if (orderStatus && currentOrder) {
    await logOrderHistory({
      order_id: orderId,
      changed_by: user.id,
      portal,
      action_type: 'STATUS_UPDATE',
      field_name: 'order_status',
      old_value: currentOrder.order_status,
      new_value: orderStatus,
      description: `Order status changed from ${currentOrder.order_status} to ${orderStatus}`,
      event_type: 'STATUS_CHANGE',
    });
  }

  // Log history for payment change
  if (paymentStatus && currentOrder) {
    await logOrderHistory({
      order_id: orderId,
      changed_by: user.id,
      portal,
      action_type: 'PAYMENT_UPDATE',
      field_name: 'payment_status',
      old_value: currentOrder.payment_status,
      new_value: paymentStatus,
      description: `Payment status changed from ${currentOrder.payment_status} to ${paymentStatus}`,
      event_type: 'PAYMENT_CHANGE',
    });
  }

  return data;
}

export async function assignCourier({
  orderId,
  courierProvider,
  awbNumber,
  trackingCode,
  notes,
  portal = 'ADMIN',
}: AssignCourierParams) {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Not authenticated');

  const updates: Record<string, any> = {
    courier_provider: courierProvider,
    courier_submitted_at: new Date().toISOString(),
  };

  if (awbNumber) updates.courier_awb = awbNumber;
  if (trackingCode) updates.courier_tracking_code = trackingCode;
  if (notes) updates.delivery_notes = notes;

  const { data, error } = await supabase
    .from('orders')
    .update(updates)
    .eq('id', orderId)
    .select()
    .single();

  if (error) throw error;

  // Log history
  await logOrderHistory({
    order_id: orderId,
    changed_by: user.id,
    portal,
    action_type: 'COURIER_ASSIGNED',
    field_name: 'courier_provider',
    new_value: courierProvider,
    description: `Courier assigned: ${courierProvider}${awbNumber ? ` (AWB: ${awbNumber})` : ''}`,
    event_type: 'COURIER_UPDATE',
  });

  return data;
}

export async function addOrderComment(orderId: string, comment: string, portal = 'ADMIN') {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Not authenticated');

  await logOrderHistory({
    order_id: orderId,
    changed_by: user.id,
    portal,
    action_type: 'COMMENT_ADDED',
    description: comment,
    event_type: 'COMMENT_ADDED',
  });
}

export async function exportOrderHistoryToCSV(orderId: string): Promise<string> {
  const { data: history } = await supabase
    .from('order_history')
    .select('*')
    .eq('order_id', orderId)
    .order('created_at', { ascending: false });

  if (!history || history.length === 0) {
    throw new Error('No history available for this order');
  }

  // Fetch user profiles separately
  const userIds = [...new Set(history.map(h => h.changed_by).filter(Boolean))] as string[];
  let profilesMap: Record<string, string> = {};
  
  if (userIds.length > 0) {
    const { data: profiles } = await supabase
      .from('profiles')
      .select('id, name')
      .in('id', userIds);
    
    profilesMap = (profiles || []).reduce((acc, p) => {
      acc[p.id] = p.name;
      return acc;
    }, {} as Record<string, string>);
  }

  const headers = ['Date', 'Portal', 'User', 'Action Type', 'Field', 'Old Value', 'New Value', 'Description'];
  const rows = history.map(h => {
    const portal = (h as any).portal || 'ADMIN';
    const actionType = (h as any).action_type || h.event_type;
    const fieldName = (h as any).field_name || '';
    const oldValue = (h as any).old_value || '';
    const newValue = (h as any).new_value || '';
    
    return [
      new Date(h.created_at).toLocaleString(),
      portal,
      h.changed_by ? profilesMap[h.changed_by] || 'System' : 'System',
      actionType,
      fieldName,
      oldValue,
      newValue,
      h.description,
    ];
  });

  const csv = [
    headers.join(','),
    ...rows.map(row => row.map(cell => `"${cell}"`).join(',')),
  ].join('\n');

  return csv;
}