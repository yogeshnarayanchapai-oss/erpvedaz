import { createNotification, createNotifications, CreateNotificationParams } from '@/hooks/useNotifications';

// Helper to notify when new leads are created
export async function notifyNewLeadsCreated({
  count,
  productName,
  createdByName,
  createdById,
  portal,
}: {
  count: number;
  productName?: string;
  createdByName: string;
  createdById: string;
  portal: string;
}) {
  await createNotifications([
    {
      type: 'LEAD_TRANSFER',
      title: 'New Leads Created',
      message: `${createdByName} created ${count} new lead${count > 1 ? 's' : ''}${productName ? ` for ${productName}` : ''} via ${portal}`,
      actorId: createdById,
      actorName: createdByName,
      targetRole: 'ADMIN',
      portal: 'ADMIN',
      linkPath: '/admin/leads',
      meta: { count, productName, portal },
    },
  ]);
}

// Helper to create lead transfer notification
export async function notifyLeadTransfer({
  count,
  productName,
  targetUserId,
  targetUserName,
  actorId,
  actorName,
}: {
  count: number;
  productName?: string;
  targetUserId: string;
  targetUserName: string;
  actorId: string;
  actorName: string;
}) {
  const notifications: CreateNotificationParams[] = [];

  // Notification to the calling staff
  notifications.push({
    type: 'LEAD_TRANSFER',
    title: 'New Leads Assigned',
    message: `Assigned new ${count} lead${count > 1 ? 's' : ''} to you.`,
    actorId,
    actorName,
    targetUserId,
    portal: 'CALLING',
    linkPath: '/calling/leads',
    meta: { count, productName },
  });

  // Summary notification to Admin/Manager
  notifications.push({
    type: 'LEAD_TRANSFER',
    title: 'Leads transferred',
    message: `Transferred ${count} lead${count > 1 ? 's' : ''} to ${targetUserName}${productName ? ` for ${productName}` : ''}.`,
    actorId,
    actorName,
    targetRole: 'ADMIN',
    portal: 'ADMIN',
    linkPath: '/admin/leads',
    meta: { count, productName, targetUserName, targetUserId },
  });

  await createNotifications(notifications);
}

// Helper to notify LEADS role when CNR leads are returned
export async function notifyLeadReturnedToCNR({
  leadId,
  customerName,
  phone,
  productName,
  actorId,
  actorName,
}: {
  leadId: string;
  customerName: string;
  phone: string;
  productName?: string;
  actorId: string;
  actorName: string;
}) {
  const notifications: CreateNotificationParams[] = [
    // Notify LEADS role
    {
      type: 'LEAD_CNR',
      title: 'Lead returned as CNR',
      message: `${customerName} (${phone})${productName ? ` - ${productName}` : ''} returned to CNR pool by ${actorName}`,
      actorId,
      actorName,
      targetRole: 'LEADS',
      portal: 'LEADS',
      linkPath: '/leads/dashboard',
      meta: { leadId, customerName, phone, productName },
    },
    // Notify Admin
    {
      type: 'LEAD_CNR',
      title: 'Lead marked as CNR',
      message: `${customerName} (${phone}) marked as CNR by ${actorName}`,
      actorId,
      actorName,
      targetRole: 'ADMIN',
      portal: 'ADMIN',
      linkPath: '/admin/leads',
      meta: { leadId, customerName, phone, productName },
    },
  ];

  await createNotifications(notifications);
}

// Helper to create order confirmed notification
export async function notifyOrderConfirmed({
  orderId,
  productName,
  quantity,
  customerName,
  phone,
  deliveryLocation,
  actorId,
  actorName,
  amount,
}: {
  orderId: string;
  productName: string;
  quantity: number;
  customerName: string;
  phone: string;
  deliveryLocation: 'INSIDE_VALLEY' | 'OUTSIDE_VALLEY';
  actorId: string;
  actorName: string;
  amount: number;
}) {
  const isInside = deliveryLocation === 'INSIDE_VALLEY';
  const locationLabel = isInside ? 'Inside Valley' : 'Outside Valley';
  const logisticsPath = isInside ? '/logistics/orders/inside-valley' : '/logistics/orders/outside-valley';

  const notifications: CreateNotificationParams[] = [
    // Notify Logistics
    {
      type: 'ORDER_CONFIRMED',
      title: `New ${locationLabel.toLowerCase()} order`,
      message: `${productName} x${quantity} for ${customerName} (${phone}) - Rs.${amount}`,
      actorId,
      actorName,
      targetRole: 'LOGISTICS',
      portal: 'LOGISTICS',
      linkPath: logisticsPath,
      meta: { orderId, productName, quantity, customerName, phone, deliveryLocation, amount },
    },
    // Notify Admin
    {
      type: 'ORDER_CONFIRMED',
      title: `New ${locationLabel.toLowerCase()} order confirmed`,
      message: `${actorName} confirmed: ${productName} x${quantity} for ${customerName} - Rs.${amount}`,
      actorId,
      actorName,
      targetRole: 'ADMIN',
      portal: 'ADMIN',
      linkPath: '/admin/orders',
      meta: { orderId, productName, quantity, customerName, phone, deliveryLocation, amount },
    },
    // Notify Manager
    {
      type: 'ORDER_CONFIRMED',
      title: `New ${locationLabel.toLowerCase()} order confirmed`,
      message: `${actorName} confirmed: ${productName} x${quantity} for ${customerName} - Rs.${amount}`,
      actorId,
      actorName,
      targetRole: 'MANAGER',
      portal: 'ADMIN',
      linkPath: '/admin/orders',
      meta: { orderId, productName, quantity, customerName, phone, deliveryLocation, amount },
    },
  ];

  await createNotifications(notifications);
}

// Helper to create order redirected notification
export async function notifyOrderRedirected({
  orderId,
  productName,
  customerName,
  amount,
  callingStaffId,
  actorId,
  actorName,
}: {
  orderId: string;
  productName: string;
  customerName: string;
  amount: number;
  callingStaffId: string;
  actorId: string;
  actorName: string;
}) {
  const notifications: CreateNotificationParams[] = [
    // Notify the original calling staff
    {
      type: 'ORDER_REDIRECTED',
      title: 'Your order was redirected',
      message: `Order for ${customerName} (${productName}) was redirected by follow-up team.`,
      actorId,
      actorName,
      targetUserId: callingStaffId,
      portal: 'CALLING',
      linkPath: '/calling/orders',
      meta: { orderId, productName, customerName, amount },
    },
    // Notify Admin
    {
      type: 'ORDER_REDIRECTED',
      title: 'Order redirected',
      message: `${actorName} redirected order for ${customerName} (${productName}, Rs.${amount})`,
      actorId,
      actorName,
      targetRole: 'ADMIN',
      portal: 'ADMIN',
      linkPath: '/admin/orders',
      meta: { orderId, productName, customerName, amount },
    },
    // Notify Manager
    {
      type: 'ORDER_REDIRECTED',
      title: 'Order redirected',
      message: `${actorName} redirected order for ${customerName} (${productName}, Rs.${amount})`,
      actorId,
      actorName,
      targetRole: 'MANAGER',
      portal: 'ADMIN',
      linkPath: '/admin/orders',
      meta: { orderId, productName, customerName, amount },
    },
  ];

  await createNotifications(notifications);
}

// Helper for delivery status updates
export async function notifyDeliveryUpdated({
  orderId,
  customerName,
  newStatus,
  deliveryLocation,
  callingStaffId,
  actorId,
  actorName,
}: {
  orderId: string;
  customerName: string;
  newStatus: string;
  deliveryLocation: string;
  callingStaffId?: string;
  actorId: string;
  actorName: string;
}) {
  const notifications: CreateNotificationParams[] = [];
  const statusLabel = newStatus.replace(/_/g, ' ').toLowerCase();

  // Notify original calling staff if available
  if (callingStaffId) {
    notifications.push({
      type: 'DELIVERY_UPDATED',
      title: 'Order delivery updated',
      message: `Order for ${customerName} marked as "${statusLabel}"`,
      actorId,
      actorName,
      targetUserId: callingStaffId,
      portal: 'CALLING',
      linkPath: '/calling/orders',
      meta: { orderId, customerName, newStatus, deliveryLocation },
    });
  }

  // Notify Admin
  notifications.push({
    type: 'DELIVERY_UPDATED',
    title: 'Delivery status updated',
    message: `${actorName} updated order for ${customerName} to "${statusLabel}"`,
    actorId,
    actorName,
    targetRole: 'ADMIN',
    portal: 'ADMIN',
    linkPath: '/admin/orders',
    meta: { orderId, customerName, newStatus, deliveryLocation },
  });

  // Notify Follow-up if outside valley
  if (deliveryLocation === 'OUTSIDE_VALLEY') {
    notifications.push({
      type: 'DELIVERY_UPDATED',
      title: 'Outside valley order updated',
      message: `Order for ${customerName} marked as "${statusLabel}"`,
      actorId,
      actorName,
      targetRole: 'FOLLOWUP',
      portal: 'FOLLOWUP',
      linkPath: '/followup/orders',
      meta: { orderId, customerName, newStatus, deliveryLocation },
    });
  }

  await createNotifications(notifications);
}

// Helper for inside valley delivery updates from calling staff
export async function notifyInsideDeliveryUpdate({
  orderId,
  customerName,
  deliveryStatus,
  remark,
  actorId,
  actorName,
}: {
  orderId: string;
  customerName: string;
  deliveryStatus: string;
  remark?: string;
  actorId: string;
  actorName: string;
}) {
  const statusLabel = deliveryStatus.replace(/_/g, ' ').toLowerCase();
  
  const notifications: CreateNotificationParams[] = [
    // Notify Admin
    {
      type: 'DELIVERY_UPDATED',
      title: 'Inside valley delivery update',
      message: `${actorName} updated ${customerName}'s order to "${statusLabel}"${remark ? ` - ${remark}` : ''}`,
      actorId,
      actorName,
      targetRole: 'ADMIN',
      portal: 'ADMIN',
      linkPath: '/admin/orders',
      meta: { orderId, customerName, deliveryStatus, remark },
    },
    // Notify Logistics
    {
      type: 'DELIVERY_UPDATED',
      title: 'Inside valley delivery update',
      message: `${actorName} updated ${customerName}'s order to "${statusLabel}"${remark ? ` - ${remark}` : ''}`,
      actorId,
      actorName,
      targetRole: 'LOGISTICS',
      portal: 'LOGISTICS',
      linkPath: '/logistics/orders/inside-valley',
      meta: { orderId, customerName, deliveryStatus, remark },
    },
  ];

  await createNotifications(notifications);
}

// Helper for lead status changes (CNR, Follow-up, Cancelled)
export async function notifyLeadStatusChange({
  leadId,
  customerName,
  phone,
  newStatus,
  actorId,
  actorName,
}: {
  leadId: string;
  customerName: string;
  phone: string;
  newStatus: 'CALL_NOT_RECEIVED' | 'FOLLOW_UP' | 'CANCELLED';
  actorId: string;
  actorName: string;
}) {
  const typeMap: Record<string, string> = {
    CALL_NOT_RECEIVED: 'LEAD_CNR',
    FOLLOW_UP: 'LEAD_FOLLOWUP',
    CANCELLED: 'LEAD_CANCELLED',
  };

  const labelMap: Record<string, string> = {
    CALL_NOT_RECEIVED: 'CNR (Call Not Received)',
    FOLLOW_UP: 'Follow-up',
    CANCELLED: 'Cancelled',
  };

  await createNotifications([
    {
      type: typeMap[newStatus],
      title: `Lead status: ${labelMap[newStatus]}`,
      message: `${customerName} (${phone}) marked as ${labelMap[newStatus]} by ${actorName}`,
      actorId,
      actorName,
      targetRole: 'ADMIN',
      portal: 'ADMIN',
      linkPath: '/admin/leads',
      meta: { leadId, customerName, phone, newStatus },
    },
  ]);
}

// Helper for logistics export
export async function notifyLogisticsExport({
  count,
  partnerName,
  actorId,
  actorName,
}: {
  count: number;
  partnerName: string;
  actorId: string;
  actorName: string;
}) {
  await createNotifications([
    {
      type: 'LOGISTICS_EXPORTED',
      title: 'Orders exported to partner',
      message: `${actorName} exported ${count} order${count > 1 ? 's' : ''} to ${partnerName}`,
      actorId,
      actorName,
      targetRole: 'ADMIN',
      portal: 'ADMIN',
      linkPath: '/admin/orders',
      meta: { count, partnerName },
    },
    {
      type: 'LOGISTICS_EXPORTED',
      title: 'Orders exported to partner',
      message: `Exported ${count} order${count > 1 ? 's' : ''} to ${partnerName}`,
      actorId,
      actorName,
      targetRole: 'MANAGER',
      portal: 'ADMIN',
      linkPath: '/admin/orders',
      meta: { count, partnerName },
    },
  ]);
}

// Helper for logistics order status updates - notify order owner
export async function notifyLogisticsStatusUpdate({
  orderId,
  customerName,
  newStatus,
  orderOwnerUserId,
  actorId,
  actorName,
}: {
  orderId: string;
  customerName: string;
  newStatus: string;
  orderOwnerUserId?: string;
  actorId: string;
  actorName: string;
}) {
  const statusLabel = newStatus.replace(/_/g, ' ').toLowerCase();
  const notifications: CreateNotificationParams[] = [];

  // Notify the order owner (sales person/calling staff)
  if (orderOwnerUserId) {
    notifications.push({
      type: 'DELIVERY_UPDATED',
      title: 'Your order status updated',
      message: `Order for ${customerName} updated to "${statusLabel}" by logistics`,
      actorId,
      actorName,
      targetUserId: orderOwnerUserId,
      portal: 'CALLING',
      linkPath: '/calling/orders',
      meta: { orderId, customerName, newStatus },
    });
  }

  if (notifications.length > 0) {
    await createNotifications(notifications);
  }
}

// Helper to notify admins when an order is edited
export async function notifyOrderEdited({
  orderId,
  customerName,
  changeCount,
  actorId,
  actorName,
}: {
  orderId: string;
  customerName: string;
  changeCount: number;
  actorId: string;
  actorName: string;
}) {
  await createNotifications([
    {
      type: 'ORDER_EDITED',
      title: 'Order edited',
      message: `${actorName} edited order for ${customerName} (${changeCount} field${changeCount > 1 ? 's' : ''} changed)`,
      actorId,
      actorName,
      targetRole: 'ADMIN',
      portal: 'ADMIN',
      linkPath: `/admin/orders/${orderId}`,
      meta: { orderId, customerName, changeCount },
    },
    {
      type: 'ORDER_EDITED',
      title: 'Order edited',
      message: `${actorName} edited order for ${customerName} (${changeCount} field${changeCount > 1 ? 's' : ''} changed)`,
      actorId,
      actorName,
      targetRole: 'MANAGER',
      portal: 'ADMIN',
      linkPath: `/admin/orders/${orderId}`,
      meta: { orderId, customerName, changeCount },
    },
  ]);
}
