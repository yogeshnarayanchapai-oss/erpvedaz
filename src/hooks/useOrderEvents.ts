import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface OrderEvent {
  id: string;
  order_id: string;
  event_type: string;
  event_by: string | null;
  event_data: Record<string, any> | null;
  created_at: string;
  profiles?: {
    name: string;
    email: string;
  } | null;
}

export type OrderEventType = 
  | 'order_created'
  | 'status_changed'
  | 'payment_received'
  | 'note_added'
  | 'courier_assigned'
  | 'sales_recorded'
  | 'sales_reversed'
  | 'order_cancelled'
  | 'field_updated';

export function useOrderEvents(orderId: string | null) {
  return useQuery({
    queryKey: ['order-events', orderId],
    queryFn: async () => {
      if (!orderId) return [];

      const { data: events, error } = await supabase
        .from('order_events')
        .select('*')
        .eq('order_id', orderId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      if (!events || events.length === 0) return [];

      // Get profile info for event creators
      const userIds = [...new Set(events.map(e => e.event_by).filter(Boolean))] as string[];
      
      let profiles: Record<string, { name: string; email: string }> = {};
      if (userIds.length > 0) {
        const { data: profileData } = await supabase
          .from('profiles')
          .select('id, name, email')
          .in('id', userIds);

        profiles = (profileData || []).reduce((acc, p) => {
          acc[p.id] = { name: p.name, email: p.email };
          return acc;
        }, {} as Record<string, { name: string; email: string }>);
      }

      return events.map(event => ({
        ...event,
        profiles: event.event_by ? profiles[event.event_by] || null : null,
      })) as OrderEvent[];
    },
    enabled: !!orderId,
  });
}

export function useCreateOrderEvent() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: {
      orderId: string;
      eventType: OrderEventType;
      eventData?: Record<string, any>;
    }) => {
      const { data: { user } } = await supabase.auth.getUser();

      const { data, error } = await supabase
        .from('order_events')
        .insert({
          order_id: input.orderId,
          event_type: input.eventType,
          event_by: user?.id,
          event_data: input.eventData || null,
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['order-events', variables.orderId] });
    },
  });
}

// Helper to format event for display
export function formatOrderEventDescription(event: OrderEvent): string {
  const data = event.event_data || {};
  
  switch (event.event_type) {
    case 'order_created':
      return 'Order was created';
    case 'status_changed':
      return `Status changed from ${data.old_status || 'N/A'} to ${data.new_status || 'N/A'}`;
    case 'payment_received':
      return `Payment received: Rs. ${data.amount || 0}`;
    case 'note_added':
      return `Note added: ${data.note || ''}`;
    case 'courier_assigned':
      return `Assigned to courier: ${data.courier || 'Unknown'}`;
    case 'sales_recorded':
      return `Sales recorded: Rs. ${data.amount || 0}`;
    case 'sales_reversed':
      return `Sales reversed: Rs. ${Math.abs(data.amount || 0)} - ${data.reason || 'No reason'}`;
    case 'order_cancelled':
      return `Order cancelled - Reason: ${data.reason || 'Not specified'}`;
    case 'field_updated':
      return `${data.field || 'Field'} updated from "${data.old_value || 'N/A'}" to "${data.new_value || 'N/A'}"`;
    default:
      return event.event_type.replace(/_/g, ' ');
  }
}
