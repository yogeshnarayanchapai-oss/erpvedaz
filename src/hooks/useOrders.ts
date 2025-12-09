import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { notifyOrderConfirmed, notifyInsideDeliveryUpdate, notifyLogisticsStatusUpdate, notifyOrderEdited } from '@/lib/notificationHelpers';
import { useCurrentStoreId } from '@/hooks/useCurrentStoreId';

type OrderStatus = 'CONFIRMED' | 'PACKED' | 'DISPATCHED' | 'DELIVERED' | 'RETURNED' | 'SENT_FOR_DELIVERY' | 'LOCATION_CNR' | 'PENDING' | 'CANCELLED' | 'REDIRECT' | 'SENT_FOR_NCM' | 'SENT_FOR_PATHAO';
type PaymentStatus = 'PENDING' | 'PAID' | 'COD';
type DeliveryLocation = 'INSIDE_VALLEY' | 'OUTSIDE_VALLEY';

export type InsideDeliveryStatus = 'PENDING' | 'DELIVERED' | 'REACHED_CNR' | 'CUSTOMER_CANCELLED';

export interface Order {
  id: string;
  order_date: string;
  lead_id: string | null;
  product_id: string | null;
  quantity: number;
  amount: number | null;
  destination_branch: string | null;
  branch_id: string | null;
  full_address: string | null;
  order_status: OrderStatus;
  payment_status: PaymentStatus;
  delivery_location: DeliveryLocation | null;
  is_cod: boolean;
  sent_to_logistics: boolean;
  sales_person_id: string | null;
  created_by_staff_id: string | null;
  created_at: string;
  shipping_partner: string | null;
  partner_order_id: string | null;
  partner_status: string | null;
  delivery_notes: string | null;
  inside_delivery_status: InsideDeliveryStatus | null;
  inside_delivery_remark: string | null;
  inside_delivery_updated_by: string | null;
  inside_delivery_updated_at: string | null;
  is_counted_in_sales: boolean;
  confirmed_at: string | null;
  confirmed_by_user_id: string | null;
  cancelled_at: string | null;
  store_id: string | null;
  logistic_order_id: string | null;
  // Meta fields for delivery status edit permissions
  called_by_user_id: string | null;
  called_by_role: string | null;
  assigned_to_user_id: string | null;
  leads?: {
    client_name: string;
    contact_number: string;
    alt_phone: string | null;
    full_address: string | null;
    assigned_to_user_id: string | null;
    assigned_user?: { name: string } | null;
  } | null;
  products?: { name: string } | null;
  sales_person?: { name: string } | null;
  created_by_staff?: { name: string } | null;
  confirmed_by_profile?: { name: string | null } | null;
  branches?: { branch_name: string; district: string | null } | null;
}

export function useOrders(filters?: {
  dateFrom?: string;
  dateTo?: string;
  productId?: string;
  status?: OrderStatus;
  salesPersonId?: string;
  deliveryLocation?: DeliveryLocation | 'ALL';
  sentToLogistics?: boolean;
  storeId?: string;
}) {
  const currentStoreId = useCurrentStoreId();
  const storeId = filters?.storeId || currentStoreId;

  return useQuery({
    queryKey: ['orders', filters, storeId],
    queryFn: async () => {
      let query = supabase
        .from('orders')
        .select(`
          *,
          leads:lead_id(client_name, contact_number, alt_phone, full_address, assigned_to_user_id, assigned_user:profiles!leads_assigned_to_user_id_fkey(name)),
          products:product_id(name),
          sales_person:profiles!orders_sales_person_id_fkey(name),
          created_by_staff:profiles!orders_created_by_staff_id_fkey(name),
          confirmed_by_profile:profiles!orders_confirmed_by_user_id_fkey(name),
          branches:branch_id(branch_name, district),
          order_items(id, product_id, product_name, quantity, unit_price, discount, total_price)
        `)
        .eq('is_deleted', false)
        .order('order_date', { ascending: false });

      // Filter by store_id
      if (storeId) {
        query = query.eq('store_id', storeId);
      }

      if (filters?.dateFrom) {
        query = query.gte('order_date', filters.dateFrom + 'T00:00:00');
      }
      if (filters?.dateTo) {
        query = query.lte('order_date', filters.dateTo + 'T23:59:59');
      }
      if (filters?.productId) {
        query = query.eq('product_id', filters.productId);
      }
      if (filters?.status) {
        query = query.eq('order_status', filters.status);
      }
      if (filters?.salesPersonId) {
        query = query.eq('sales_person_id', filters.salesPersonId);
      }
      if (filters?.deliveryLocation && filters.deliveryLocation !== 'ALL') {
        query = query.eq('delivery_location', filters.deliveryLocation);
      }
      if (filters?.sentToLogistics !== undefined) {
        query = query.eq('sent_to_logistics', filters.sentToLogistics);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data as Order[];
    },
    enabled: !!storeId,
  });
}

export function useOrderDetail(orderId: string) {
  return useQuery({
    queryKey: ['order-detail', orderId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('orders')
        .select(`
          *,
          leads:lead_id(client_name, contact_number, alt_phone, full_address),
          products:product_id(name),
          customers:customer_id(customer_name, phone_number, email, city, full_address),
          branches:branch_id(branch_name, district),
          sales_person:profiles!orders_sales_person_id_fkey(name),
          created_by_staff:profiles!orders_created_by_staff_id_fkey(name)
        `)
        .eq('id', orderId)
        .single();

      if (error) throw error;
      return data;
    },
    enabled: !!orderId,
  });
}

export interface OrderItemInput {
  productId: string;
  productName: string;
  quantity: number;
  unitPrice: number;
  discount?: number;
}

export function useCreateOrder() {
  const queryClient = useQueryClient();
  const storeId = useCurrentStoreId();
  return useMutation({
    mutationFn: async (input: {
      leadId: string;
      productId: string;
      quantity: number;
      amount: number;
      destinationBranch?: string;
      branchId?: string;
      fullAddress?: string;
      deliveryLocation?: DeliveryLocation;
      isCod?: boolean;
      items?: OrderItemInput[];
    }) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      // Check if this lead already has an order (prevent duplicates)
      // Check both the leads table AND the orders table to catch race conditions
      const [leadCheck, orderCheck] = await Promise.all([
        supabase.from('leads').select('order_id').eq('id', input.leadId).single(),
        supabase.from('orders').select('id').eq('lead_id', input.leadId).maybeSingle(),
      ]);

      // If order exists in either place, return the existing order
      const existingOrderId = leadCheck.data?.order_id || orderCheck.data?.id;
      if (existingOrderId) {
        const { data: existingOrder, error: fetchError } = await supabase
          .from('orders')
          .select()
          .eq('id', existingOrderId)
          .single();
        
        if (fetchError) throw fetchError;
        
        // Also ensure lead.order_id is synced if it wasn't before
        if (!leadCheck.data?.order_id && orderCheck.data?.id) {
          await supabase.from('leads').update({ order_id: orderCheck.data.id }).eq('id', input.leadId);
        }
        
        return existingOrder;
      }

      // Fetch additional details for notification and role
      const [leadResult, productResult, actorResult, roleResult] = await Promise.all([
        supabase.from('leads').select('client_name, contact_number').eq('id', input.leadId).single(),
        supabase.from('products').select('name').eq('id', input.productId).single(),
        supabase.from('profiles').select('name, role').eq('id', user.id).single(),
        supabase.from('user_roles').select('role').eq('user_id', user.id).maybeSingle(),
      ]);

      // Get the user's role from user_roles table or profile
      const calledByRole = roleResult.data?.role || actorResult.data?.role || 'CALLING';

      const { data, error } = await supabase
        .from('orders')
        .insert({
          lead_id: input.leadId,
          product_id: input.productId,
          quantity: input.quantity,
          amount: input.amount,
          destination_branch: input.destinationBranch,
          branch_id: input.branchId,
          full_address: input.fullAddress,
          delivery_location: input.deliveryLocation,
          is_cod: input.isCod ?? true,
          sales_person_id: user.id,
          created_by_staff_id: user.id,
          order_status: 'CONFIRMED',
          payment_status: 'COD',
          // Set meta fields for delivery status permissions
          called_by_user_id: user.id,
          called_by_role: calledByRole,
          assigned_to_user_id: user.id, // Initially assigned to creator
          store_id: storeId,
        })
        .select()
        .single();

      if (error) throw error;

      // Create order_items - either from provided items or single product
      const orderItems = input.items && input.items.length > 0
        ? input.items.map(item => {
            const discount = item.discount || 0;
            const subtotal = item.quantity * item.unitPrice;
            return {
              order_id: data.id,
              product_id: item.productId,
              product_name: item.productName,
              quantity: item.quantity,
              unit_price: item.unitPrice,
              discount: discount,
              total_price: Math.max(0, subtotal - discount),
            };
          })
        : [{
            order_id: data.id,
            product_id: input.productId,
            product_name: productResult.data?.name || 'Product',
            quantity: input.quantity,
            unit_price: input.amount / input.quantity,
            discount: 0,
            total_price: input.amount,
          }];

      const { error: itemsError } = await supabase
        .from('order_items')
        .insert(orderItems);

      if (itemsError) {
        console.error('Failed to create order items:', itemsError);
      }

      // Update lead status and order_id
      await supabase
        .from('leads')
        .update({ status: 'CONFIRMED', order_id: data.id })
        .eq('id', input.leadId);

      // Send notification if delivery location is set
      if (input.deliveryLocation) {
        try {
          const productNames = input.items && input.items.length > 0
            ? input.items.map(i => i.productName).join(', ')
            : productResult.data?.name || 'Unknown Product';
          const totalQty = input.items && input.items.length > 0
            ? input.items.reduce((sum, i) => sum + i.quantity, 0)
            : input.quantity;
            
          await notifyOrderConfirmed({
            orderId: data.id,
            productName: productNames,
            quantity: totalQty,
            customerName: leadResult.data?.client_name || 'Unknown',
            phone: leadResult.data?.contact_number || '',
            deliveryLocation: input.deliveryLocation,
            actorId: user.id,
            actorName: actorResult.data?.name || 'Staff',
            amount: input.amount,
            storeId: storeId || undefined,
          });
        } catch (notifyError) {
          console.error('Failed to send order notification:', notifyError);
        }
      }

      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['orders'] });
      queryClient.invalidateQueries({ queryKey: ['leads'] });
      toast.success('Order created successfully');
    },
    onError: (error) => {
      toast.error(`Failed to create order: ${error.message}`);
    },
  });
}

export function useUpdateOrderStatus() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      orderId,
      orderStatus,
      paymentStatus,
      shippingPartner,
      partnerOrderId,
      partnerStatus,
      deliveryNotes,
      deliveryLocation,
      notifyOwner = false,
    }: {
      orderId: string;
      orderStatus?: OrderStatus;
      paymentStatus?: PaymentStatus;
      shippingPartner?: string;
      partnerOrderId?: string;
      partnerStatus?: string;
      deliveryNotes?: string;
      deliveryLocation?: DeliveryLocation;
      notifyOwner?: boolean;
    }) => {
      const { data: { user } } = await supabase.auth.getUser();

      // First fetch order details for notification
      let orderDetails: any = null;
      if (notifyOwner && orderStatus) {
        const { data } = await supabase
          .from('orders')
          .select(`
            id, 
            sales_person_id,
            store_id,
            leads:leads!orders_lead_id_fkey (client_name, contact_number)
          `)
          .eq('id', orderId)
          .single();
        orderDetails = data;
      }

      const updates: Record<string, any> = {};
      if (orderStatus) updates.order_status = orderStatus;
      if (paymentStatus) updates.payment_status = paymentStatus;
      if (shippingPartner !== undefined) updates.shipping_partner = shippingPartner;
      if (partnerOrderId !== undefined) updates.partner_order_id = partnerOrderId;
      if (partnerStatus !== undefined) updates.partner_status = partnerStatus;
      if (deliveryNotes !== undefined) updates.delivery_notes = deliveryNotes;
      if (deliveryLocation) updates.delivery_location = deliveryLocation;

      const { data, error } = await supabase
        .from('orders')
        .update(updates)
        .eq('id', orderId)
        .select()
        .single();

      if (error) throw error;

      // Send notification to order owner if requested and status changed
      if (notifyOwner && orderStatus && orderDetails && user) {
        const customerName = orderDetails.leads?.client_name || 'Customer';
        const ownerUserId = orderDetails.sales_person_id;
        
        // Get actor name
        const { data: actorProfile } = await supabase
          .from('profiles')
          .select('name')
          .eq('id', user.id)
          .single();

        if (ownerUserId && ownerUserId !== user.id) {
          try {
            await notifyLogisticsStatusUpdate({
              orderId,
              customerName,
              newStatus: orderStatus,
              orderOwnerUserId: ownerUserId,
              actorId: user.id,
              actorName: actorProfile?.name || 'Logistics',
              storeId: orderDetails?.store_id || undefined,
            });
          } catch (notifyError) {
            console.error('Failed to send notification:', notifyError);
          }
        }
      }

      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['orders'] });
      toast.success('Order updated successfully');
    },
    onError: (error) => {
      toast.error(`Failed to update order: ${error.message}`);
    },
  });
}

export function useSendToLogistics() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (orderIds: string[]) => {
      // First, fetch orders to check delivery_location
      const { data: orders, error: fetchError } = await supabase
        .from('orders')
        .select('id, delivery_location')
        .in('id', orderIds);

      if (fetchError) throw fetchError;

      // Check for orders without delivery_location
      const ordersWithoutLocation = orders?.filter(o => !o.delivery_location) || [];
      if (ordersWithoutLocation.length > 0) {
        throw new Error(`${ordersWithoutLocation.length} order(s) missing delivery location. Please set Inside/Outside Valley before sending.`);
      }

      // Separate orders by delivery location
      const insideValleyIds = orders?.filter(o => o.delivery_location === 'INSIDE_VALLEY').map(o => o.id) || [];
      const outsideValleyIds = orders?.filter(o => o.delivery_location === 'OUTSIDE_VALLEY').map(o => o.id) || [];

      // Update Inside Valley orders - set to PACKED
      if (insideValleyIds.length > 0) {
        const { error: insideError } = await supabase
          .from('orders')
          .update({
            sent_to_logistics: true,
            order_status: 'PACKED',
          })
          .in('id', insideValleyIds);

        if (insideError) throw insideError;
      }

      // Update Outside Valley orders - set to CONFIRMED (will become DISPATCHED when exported to logistics partner)
      if (outsideValleyIds.length > 0) {
        const { error: outsideError } = await supabase
          .from('orders')
          .update({
            sent_to_logistics: true,
            order_status: 'CONFIRMED',
          })
          .in('id', outsideValleyIds);

        if (outsideError) throw outsideError;
      }

      return { count: orderIds.length };
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['orders'] });
      toast.success(`${data.count} order(s) sent to logistics`);
    },
    onError: (error) => {
      toast.error(`Failed to send to logistics: ${error.message}`);
    },
  });
}

export function useUpdateInsideDeliveryStatus() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      orderId,
      insideDeliveryStatus,
      insideDeliveryRemark,
    }: {
      orderId: string;
      insideDeliveryStatus: InsideDeliveryStatus;
      insideDeliveryRemark?: string;
    }) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      // Fetch order details for notification and permission check
      const [orderResult, actorResult, userRoleResult] = await Promise.all([
        supabase.from('orders').select('leads(client_name), called_by_role, assigned_to_user_id, store_id').eq('id', orderId).single(),
        supabase.from('profiles').select('name, role').eq('id', user.id).single(),
        supabase.from('user_roles').select('role').eq('user_id', user.id).maybeSingle(),
      ]);

      // Check permissions for editing delivery status
      const orderData = orderResult.data as any;
      const calledByRole = orderData?.called_by_role;
      const assignedToUserId = orderData?.assigned_to_user_id;
      const currentUserRole = userRoleResult.data?.role || actorResult.data?.role;
      const isAdmin = currentUserRole === 'ADMIN';

      // Rule 1: If called_by_role == "ADMIN", only ADMIN can edit
      if (calledByRole === 'ADMIN' && !isAdmin) {
        throw new Error('Only Admin users can update delivery status for admin-created orders');
      }

      // Rule 2: If called_by_role is not ADMIN, only assigned_to_user_id can edit
      if (calledByRole && calledByRole !== 'ADMIN' && assignedToUserId !== user.id) {
        throw new Error('Only the assigned staff can update delivery status for this order');
      }

      const { data, error } = await supabase
        .from('orders')
        .update({
          inside_delivery_status: insideDeliveryStatus,
          inside_delivery_remark: insideDeliveryRemark,
          inside_delivery_updated_by: user.id,
          inside_delivery_updated_at: new Date().toISOString(),
        })
        .eq('id', orderId)
        .select()
        .single();

      if (error) throw error;

      // Send notification
      try {
        const customerName = (orderResult.data?.leads as any)?.client_name || 'Unknown';
        await notifyInsideDeliveryUpdate({
          orderId,
          customerName,
          deliveryStatus: insideDeliveryStatus,
          remark: insideDeliveryRemark,
          actorId: user.id,
          actorName: actorResult.data?.name || 'Staff',
          storeId: (orderResult.data as any)?.store_id || undefined,
        });
      } catch (notifyError) {
        console.error('Failed to send delivery notification:', notifyError);
      }

      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['orders'] });
      toast.success('Delivery status updated');
    },
    onError: (error) => {
      toast.error(`Failed to update: ${error.message}`);
    },
  });
}

// Helper function to check if user can edit delivery status
export function canEditDeliveryStatus(
  order: { called_by_role: string | null; assigned_to_user_id: string | null },
  currentUserId: string | undefined,
  currentUserRole: string | null | undefined
): boolean {
  if (!currentUserId) return false;
  
  const calledByRole = order.called_by_role;
  const assignedToUserId = order.assigned_to_user_id;
  const isAdmin = currentUserRole === 'ADMIN';

  // Rule 1: If called_by_role == "ADMIN", only ADMIN can edit
  if (calledByRole === 'ADMIN') {
    return isAdmin;
  }

  // Rule 2: If called_by_role is not ADMIN, only assigned_to_user_id can edit
  if (calledByRole && calledByRole !== 'ADMIN') {
    return assignedToUserId === currentUserId;
  }

  // Legacy orders without called_by_role: allow based on existing logic
  return true;
}

// Admin update order - full edit capability with history logging
export function useAdminUpdateOrder() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: {
      orderId: string;
      leadId?: string;
      clientName?: string;
      contactNumber?: string;
      altPhone?: string;
      fullAddress?: string;
      destinationBranch?: string;
      branchId?: string;
      deliveryLocation?: 'INSIDE_VALLEY' | 'OUTSIDE_VALLEY';
      orderStatus?: OrderStatus;
      paymentStatus?: PaymentStatus;
      deliveryNotes?: string;
      orderDate?: string;
      logisticOrderId?: string;
      items: {
        productId: string;
        productName: string;
        quantity: number;
        unitPrice: number;
        discount?: number;
      }[];
      grandTotal: number;
    }) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      // Fetch current order state for comparison
      const { data: currentOrder } = await supabase
        .from('orders')
        .select(`
          *,
          leads:leads!orders_lead_id_fkey (client_name, contact_number, alt_phone, full_address, destination_branch),
          products:products!orders_product_id_fkey (name)
        `)
        .eq('id', input.orderId)
        .single();

      // Get actor profile
      const { data: actorProfile } = await supabase
        .from('profiles')
        .select('name')
        .eq('id', user.id)
        .single();

      const actorName = actorProfile?.name || 'Staff';

      // Build list of changes for history
      const changes: { field: string; oldValue: string; newValue: string }[] = [];

      if (currentOrder) {
        // Check order field changes
        if (input.fullAddress !== undefined && input.fullAddress !== currentOrder.full_address) {
          changes.push({ field: 'Address', oldValue: currentOrder.full_address || '-', newValue: input.fullAddress || '-' });
        }
        if (input.destinationBranch !== undefined && input.destinationBranch !== currentOrder.destination_branch) {
          changes.push({ field: 'Branch', oldValue: currentOrder.destination_branch || '-', newValue: input.destinationBranch || '-' });
        }
        if (input.deliveryLocation !== undefined && input.deliveryLocation !== currentOrder.delivery_location) {
          changes.push({ field: 'Delivery Location', oldValue: currentOrder.delivery_location || '-', newValue: input.deliveryLocation || '-' });
        }
        if (input.orderStatus !== undefined && input.orderStatus !== currentOrder.order_status) {
          changes.push({ field: 'Order Status', oldValue: currentOrder.order_status || '-', newValue: input.orderStatus || '-' });
        }
        if (input.paymentStatus !== undefined && input.paymentStatus !== currentOrder.payment_status) {
          changes.push({ field: 'Payment Status', oldValue: currentOrder.payment_status || '-', newValue: input.paymentStatus || '-' });
        }
        if (input.deliveryNotes !== undefined && input.deliveryNotes !== currentOrder.delivery_notes) {
          changes.push({ field: 'Delivery Notes', oldValue: currentOrder.delivery_notes || '-', newValue: input.deliveryNotes || '-' });
        }
        if (input.orderDate !== undefined && input.orderDate !== currentOrder.order_date?.split('T')[0]) {
          changes.push({ field: 'Order Date', oldValue: currentOrder.order_date?.split('T')[0] || '-', newValue: input.orderDate || '-' });
        }
        if (input.grandTotal !== currentOrder.amount) {
          changes.push({ field: 'Amount', oldValue: `Rs. ${currentOrder.amount || 0}`, newValue: `Rs. ${input.grandTotal}` });
        }

        // Check lead field changes
        const lead = currentOrder.leads as any;
        if (lead) {
          if (input.clientName !== undefined && input.clientName !== lead.client_name) {
            changes.push({ field: 'Customer Name', oldValue: lead.client_name || '-', newValue: input.clientName || '-' });
          }
          if (input.contactNumber !== undefined && input.contactNumber !== lead.contact_number) {
            changes.push({ field: 'Contact Number', oldValue: lead.contact_number || '-', newValue: input.contactNumber || '-' });
          }
          if (input.altPhone !== undefined && input.altPhone !== lead.alt_phone) {
            changes.push({ field: 'Alt Phone', oldValue: lead.alt_phone || '-', newValue: input.altPhone || '-' });
          }
        }
      }

      // 1. Update the order row
      const orderUpdates: Record<string, any> = {
        amount: input.grandTotal,
      };
      
      if (input.fullAddress !== undefined) orderUpdates.full_address = input.fullAddress;
      if (input.destinationBranch !== undefined) orderUpdates.destination_branch = input.destinationBranch;
      if (input.branchId !== undefined) orderUpdates.branch_id = input.branchId || null;
      if (input.deliveryLocation !== undefined) orderUpdates.delivery_location = input.deliveryLocation;
      if (input.orderStatus !== undefined) orderUpdates.order_status = input.orderStatus;
      if (input.paymentStatus !== undefined) orderUpdates.payment_status = input.paymentStatus;
      if (input.deliveryNotes !== undefined) orderUpdates.delivery_notes = input.deliveryNotes;
      if (input.orderDate !== undefined) orderUpdates.order_date = input.orderDate;
      if (input.logisticOrderId !== undefined) orderUpdates.logistic_order_id = input.logisticOrderId;
      
      // Update primary product_id to first item
      if (input.items.length > 0) {
        orderUpdates.product_id = input.items[0].productId;
        orderUpdates.quantity = input.items.reduce((sum, i) => sum + i.quantity, 0);
      }

      const { error: orderError } = await supabase
        .from('orders')
        .update(orderUpdates)
        .eq('id', input.orderId);

      if (orderError) throw orderError;

      // 2. Delete all existing order_items for this order
      const { error: deleteError } = await supabase
        .from('order_items')
        .delete()
        .eq('order_id', input.orderId);

      if (deleteError) throw deleteError;

      // 3. Insert new order_items from the current product list
      const newItems = input.items.map(item => {
        const discount = item.discount || 0;
        const subtotal = item.quantity * item.unitPrice;
        return {
          order_id: input.orderId,
          product_id: item.productId,
          product_name: item.productName,
          quantity: item.quantity,
          unit_price: item.unitPrice,
          discount: discount,
          total_price: Math.max(0, subtotal - discount),
        };
      });

      const { error: insertError } = await supabase
        .from('order_items')
        .insert(newItems);

      if (insertError) throw insertError;

      // 4. Update lead info if lead exists
      if (input.leadId) {
        const leadUpdates: Record<string, any> = {};
        if (input.clientName !== undefined) leadUpdates.client_name = input.clientName;
        if (input.contactNumber !== undefined) leadUpdates.contact_number = input.contactNumber;
        if (input.altPhone !== undefined) leadUpdates.alt_phone = input.altPhone || null;
        if (input.fullAddress !== undefined) leadUpdates.full_address = input.fullAddress;
        if (input.destinationBranch !== undefined) leadUpdates.destination_branch = input.destinationBranch;
        if (input.branchId !== undefined) leadUpdates.branch_id = input.branchId || null;

        if (Object.keys(leadUpdates).length > 0) {
          await supabase
            .from('leads')
            .update(leadUpdates)
            .eq('id', input.leadId);
        }
      }

      // 5. Log changes to order_history
      if (changes.length > 0) {
        const historyEntries = changes.map(change => ({
          order_id: input.orderId,
          event_type: 'ORDER_EDITED',
          description: `${change.field} changed from "${change.oldValue}" to "${change.newValue}"`,
          old_value: change.oldValue,
          new_value: change.newValue,
          changed_by: user.id,
        }));

        await supabase.from('order_history').insert(historyEntries);

      // 6. Notify admins about the edit
        try {
          const customerName = input.clientName || (currentOrder?.leads as any)?.client_name || 'Customer';
          
          // Explicitly fetch store_id from order to ensure it's passed correctly
          const { data: orderForStore } = await supabase
            .from('orders')
            .select('store_id')
            .eq('id', input.orderId)
            .single();
          
          const orderStoreId = orderForStore?.store_id;
          console.log('[ORDER_EDIT] Notification store_id:', orderStoreId, 'for order:', input.orderId);
          
          await notifyOrderEdited({
            orderId: input.orderId,
            customerName,
            changeCount: changes.length,
            actorId: user.id,
            actorName,
            storeId: orderStoreId || undefined,
          });
        } catch (notifyError) {
          console.error('Failed to send order edit notification:', notifyError);
        }
      }

      return { success: true };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['orders'] });
      queryClient.invalidateQueries({ queryKey: ['order-history'] });
      queryClient.invalidateQueries({ queryKey: ['leads'] });
      toast.success('Order updated successfully');
    },
    onError: (error) => {
      toast.error(`Failed to update order: ${error.message}`);
    },
  });
}
