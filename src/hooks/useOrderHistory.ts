import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import type { Database } from '@/integrations/supabase/types';

type OrderHistoryRow = Database['public']['Tables']['order_history']['Row'];

export interface OrderHistoryEvent extends OrderHistoryRow {
  profiles?: {
    name: string;
    email: string;
  } | null;
}

// Keep old interface for compatibility
export interface OrderStatusHistory {
  id: string;
  order_id: string;
  previous_status: string | null;
  new_status: string;
  changed_by: string | null;
  changed_at: string;
  notes: string | null;
  changer_name?: string | null;
}

export function useOrderHistory(orderId: string | null) {
  return useQuery({
    queryKey: ['order-history', orderId],
    queryFn: async () => {
      if (!orderId) return [];
      
      // First get the history
      const { data: history, error: historyError } = await supabase
        .from('order_history')
        .select('*')
        .eq('order_id', orderId)
        .order('created_at', { ascending: false });

      if (historyError) throw historyError;
      if (!history) return [];

      // Then get profile info for each user
      const userIds = history.map(h => h.changed_by).filter(Boolean) as string[];
      if (userIds.length === 0) return history as OrderHistoryEvent[];

      const { data: profiles } = await supabase
        .from('profiles')
        .select('id, name, email')
        .in('id', userIds);

      // Combine the data
      return history.map(event => ({
        ...event,
        profiles: profiles?.find(p => p.id === event.changed_by) || null,
      })) as OrderHistoryEvent[];
    },
    enabled: !!orderId,
  });
}

// Separate hook for old order_status_history table (if still needed elsewhere)
export function useOrderStatusHistory(orderId: string | null) {
  return useQuery({
    queryKey: ['order-status-history', orderId],
    queryFn: async () => {
      if (!orderId) return [];
      
      const { data: historyData, error: historyError } = await supabase
        .from('order_status_history')
        .select('*')
        .eq('order_id', orderId)
        .order('changed_at', { ascending: false });

      if (historyError) throw historyError;
      
      const userIds = [...new Set(historyData?.map(h => h.changed_by).filter(Boolean))];
      
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
      
      return (historyData || []).map(entry => ({
        ...entry,
        changer_name: entry.changed_by ? profilesMap[entry.changed_by] : null,
      })) as OrderStatusHistory[];
    },
    enabled: !!orderId,
  });
}

// Export order history to CSV
export function exportOrderHistoryToCSV(history: OrderHistoryEvent[], orderId: string) {
  const headers = ['Date', 'Event Type', 'Changed By', 'Old Value', 'New Value', 'Description'];
  const rows = history.map((entry) => [
    new Date(entry.created_at).toLocaleString(),
    entry.event_type || '-',
    entry.profiles?.name || 'System',
    entry.old_value || '-',
    entry.new_value || '-',
    entry.description || '-',
  ]);

  const csvContent = [
    headers.join(','),
    ...rows.map((r) => r.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(',')),
  ].join('\n');

  const blob = new Blob([csvContent], { type: 'text/csv' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `order_${orderId.slice(0, 8)}_history.csv`;
  a.click();
  URL.revokeObjectURL(url);
}
