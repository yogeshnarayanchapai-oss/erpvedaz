import { supabase } from '@/integrations/supabase/client';

type OrderStatus = 'CONFIRMED' | 'PACKED' | 'DISPATCHED' | 'DELIVERED' | 'RETURNED' | 'CANCELLED' | 'PENDING';

interface StatusChangeResult {
  success: boolean;
  error?: string;
  salesRecordCreated?: boolean;
}

/**
 * Handles order status changes with event-driven sales tracking.
 * Implements idempotency and proper sales record management.
 */
export async function handleOrderStatusChange(
  orderId: string,
  newStatus: OrderStatus,
  options?: {
    cancellationReason?: string;
    note?: string;
  }
): Promise<StatusChangeResult> {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Not authenticated');

    // 1. Fetch current order state
    const { data: order, error: fetchError } = await supabase
      .from('orders')
      .select('id, order_status, is_counted_in_sales, amount, quantity, product_id, confirmed_at')
      .eq('id', orderId)
      .single() as { data: any; error: any };

    if (fetchError || !order) {
      return { success: false, error: 'Order not found' };
    }

    const oldStatus = order.order_status;
    
    // Idempotency check: if status is the same, do nothing
    if (oldStatus === newStatus) {
      return { success: true, salesRecordCreated: false };
    }

    const now = new Date().toISOString();
    let salesRecordCreated = false;

    // 2. Handle status-specific logic
    if (newStatus === 'CONFIRMED' && !order.is_counted_in_sales) {
      // CONFIRM: Set is_counted_in_sales = true, create invoice sales record
      const { error: updateError } = await supabase
        .from('orders')
        .update({
          order_status: newStatus,
          is_counted_in_sales: true,
          confirmed_at: now,
        })
        .eq('id', orderId);

      if (updateError) throw updateError;

      // Create sales record (invoice)
      const { error: salesError } = await supabase
        .from('sales_records')
        .insert({
          order_id: orderId,
          product_id: order.product_id,
          qty: order.quantity || 1,
          amount: order.amount || 0,
          type: 'invoice',
          note: 'Order confirmed',
          created_by: user.id,
        });

      if (salesError) throw salesError;
      salesRecordCreated = true;

      // Create order event for sales recorded
      await supabase.from('order_events').insert({
        order_id: orderId,
        event_type: 'sales_recorded',
        event_by: user.id,
        event_data: { amount: order.amount, qty: order.quantity },
      });

    } else if (newStatus === 'CANCELLED' && order.is_counted_in_sales) {
      // CANCEL: Set is_counted_in_sales = false, create reversal sales record
      const { error: updateError } = await supabase
        .from('orders')
        .update({
          order_status: newStatus,
          is_counted_in_sales: false,
          cancelled_at: now,
        })
        .eq('id', orderId);

      if (updateError) throw updateError;

      // Create sales record (reversal with negative amount)
      const { error: salesError } = await supabase
        .from('sales_records')
        .insert({
          order_id: orderId,
          product_id: order.product_id,
          qty: -(order.quantity || 1),
          amount: -(order.amount || 0),
          type: 'reversal',
          note: options?.cancellationReason || 'Order cancelled',
          created_by: user.id,
        });

      if (salesError) throw salesError;
      salesRecordCreated = true;

      // Create order event for sales reversed
      await supabase.from('order_events').insert({
        order_id: orderId,
        event_type: 'sales_reversed',
        event_by: user.id,
        event_data: { 
          amount: -(order.amount || 0), 
          reason: options?.cancellationReason 
        },
      });

      // Create cancellation event
      await supabase.from('order_events').insert({
        order_id: orderId,
        event_type: 'order_cancelled',
        event_by: user.id,
        event_data: { reason: options?.cancellationReason },
      });

    } else if (newStatus === 'CANCELLED' && !order.is_counted_in_sales) {
      // Cancel order that was never confirmed - just update status
      const { error: updateError } = await supabase
        .from('orders')
        .update({
          order_status: newStatus,
          cancelled_at: now,
        })
        .eq('id', orderId);

      if (updateError) throw updateError;

      // Create cancellation event
      await supabase.from('order_events').insert({
        order_id: orderId,
        event_type: 'order_cancelled',
        event_by: user.id,
        event_data: { reason: options?.cancellationReason },
      });

    } else {
      // Other transitions (PACKED, DISPATCHED, DELIVERED, etc.)
      // Only update status, don't touch sales records
      const updates: Record<string, any> = { order_status: newStatus };
      
      // If transitioning to CONFIRMED for first time
      if (newStatus === 'CONFIRMED' && !order.confirmed_at) {
        updates.confirmed_at = now;
        updates.is_counted_in_sales = true;

        // Create sales record for first-time confirmation
        await supabase.from('sales_records').insert({
          order_id: orderId,
          product_id: order.product_id,
          qty: order.quantity || 1,
          amount: order.amount || 0,
          type: 'invoice',
          note: 'Order confirmed',
          created_by: user.id,
        });
        salesRecordCreated = true;
      }

      const { error: updateError } = await supabase
        .from('orders')
        .update(updates)
        .eq('id', orderId);

      if (updateError) throw updateError;
    }

    // 3. Always create status change event
    await supabase.from('order_events').insert({
      order_id: orderId,
      event_type: 'status_changed',
      event_by: user.id,
      event_data: {
        old_status: oldStatus,
        new_status: newStatus,
        note: options?.note,
      },
    });

    return { success: true, salesRecordCreated };

  } catch (error: any) {
    console.error('Status change error:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Create partial reversal for partially refunded orders
 */
export async function createPartialReversal(
  orderId: string,
  amount: number,
  qty: number,
  reason: string
): Promise<StatusChangeResult> {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Not authenticated');

    const { data: order } = await supabase
      .from('orders')
      .select('product_id')
      .eq('id', orderId)
      .single();

    // Create partial reversal sales record
    const { error: salesError } = await supabase
      .from('sales_records')
      .insert({
        order_id: orderId,
        product_id: order?.product_id,
        qty: -Math.abs(qty),
        amount: -Math.abs(amount),
        type: 'reversal',
        note: `Partial reversal: ${reason}`,
        created_by: user.id,
      });

    if (salesError) throw salesError;

    // Create event
    await supabase.from('order_events').insert({
      order_id: orderId,
      event_type: 'sales_reversed',
      event_by: user.id,
      event_data: { amount: -Math.abs(amount), qty: -Math.abs(qty), reason, partial: true },
    });

    return { success: true, salesRecordCreated: true };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}
