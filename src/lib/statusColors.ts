// Consistent status badge colors across all portals
// Confirmed → Green (#22c55e)
// Follow Up → Blue (#3b82f6)
// CNR → Orange (#f97316)
// Cancelled → Red (#ef4444)
// Pending/Assigned → Gray (#9ca3af)

export const getLeadStatusBadgeClass = (status: string): string => {
  switch (status) {
    case 'CONFIRMED':
      return 'bg-emerald-500/15 text-emerald-600 border-emerald-500/30 dark:text-emerald-400';
    case 'FOLLOW_UP':
      return 'bg-blue-500/15 text-blue-600 border-blue-500/30 dark:text-blue-400';
    case 'CALL_NOT_RECEIVED':
      return 'bg-orange-500/15 text-orange-600 border-orange-500/30 dark:text-orange-400';
    case 'CANCELLED':
      return 'bg-red-500/15 text-red-600 border-red-500/30 dark:text-red-400';
    case 'REDIRECT':
      return 'bg-purple-500/15 text-purple-600 border-purple-500/30 dark:text-purple-400';
    case 'PENDING':
      return 'bg-gray-500/15 text-gray-600 border-gray-500/30 dark:text-gray-400';
    case 'NEW':
    case 'ASSIGNED':
      return 'bg-slate-500/15 text-slate-600 border-slate-500/30 dark:text-slate-400';
    case 'IN_PROGRESS':
      return 'bg-primary/10 text-primary border-primary/20';
    default:
      return 'bg-muted text-muted-foreground border-border';
  }
};

export const getOrderStatusBadgeClass = (status: string): string => {
  switch (status) {
    case 'CONFIRMED':
      return 'bg-emerald-500/15 text-emerald-600 border-emerald-500/30 dark:text-emerald-400';
    case 'DELIVERED':
      return 'bg-green-700/15 text-green-700 border-green-700/30 dark:text-green-500';
    case 'PACKED':
      return 'bg-cyan-500/15 text-cyan-600 border-cyan-500/30 dark:text-cyan-400';
    case 'DISPATCHED':
    case 'SENT_FOR_DELIVERY':
    case 'SENT_FOR_NCM':
    case 'SENT_FOR_PATHAO':
      return 'bg-blue-500/15 text-blue-600 border-blue-500/30 dark:text-blue-400';
    case 'LOCATION_CNR':
      return 'bg-orange-500/15 text-orange-600 border-orange-500/30 dark:text-orange-400';
    case 'RETURNED':
    case 'CANCELLED':
      return 'bg-red-500/15 text-red-600 border-red-500/30 dark:text-red-400';
    case 'PENDING':
      return 'bg-gray-500/15 text-gray-600 border-gray-500/30 dark:text-gray-400';
    default:
      return 'bg-muted text-muted-foreground border-border';
  }
};

export const formatStatusLabel = (status: string): string => {
  switch (status) {
    case 'CALL_NOT_RECEIVED':
      return 'CNR';
    case 'FOLLOW_UP':
      return 'Follow Up';
    case 'LOCATION_CNR':
      return 'Location CNR';
    case 'SENT_FOR_DELIVERY':
      return 'Sent For Delivery';
    default:
      return status.replace(/_/g, ' ');
  }
};
