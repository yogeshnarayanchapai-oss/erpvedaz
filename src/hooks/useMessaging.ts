import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import type { 
  MessageChannel, 
  MessageTemplate, 
  MessageAutomationRule, 
  MessageLog,
  MessageChannelType,
  MessageProvider,
  MessageRecipientType,
  MessageStatus
} from '@/lib/messaging/types';

// ============ CHANNELS ============

export function useMessageChannels() {
  return useQuery({
    queryKey: ['message-channels'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('message_channels')
        .select('*')
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      return data as MessageChannel[];
    },
  });
}

export function useCreateMessageChannel() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (channel: Omit<MessageChannel, 'id' | 'created_at' | 'updated_at'>) => {
      const { data, error } = await supabase
        .from('message_channels')
        .insert(channel)
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['message-channels'] });
      toast.success('Channel created successfully');
    },
    onError: (error: any) => {
      toast.error(`Failed to create channel: ${error.message}`);
    },
  });
}

export function useUpdateMessageChannel() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ id, ...updates }: Partial<MessageChannel> & { id: string }) => {
      const { data, error } = await supabase
        .from('message_channels')
        .update(updates)
        .eq('id', id)
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['message-channels'] });
      toast.success('Channel updated successfully');
    },
    onError: (error: any) => {
      toast.error(`Failed to update channel: ${error.message}`);
    },
  });
}

export function useDeleteMessageChannel() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('message_channels')
        .delete()
        .eq('id', id);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['message-channels'] });
      toast.success('Channel deleted successfully');
    },
    onError: (error: any) => {
      toast.error(`Failed to delete channel: ${error.message}`);
    },
  });
}

// ============ TEMPLATES ============

export function useMessageTemplates(filters?: { channel_type?: MessageChannelType; language?: string }) {
  return useQuery({
    queryKey: ['message-templates', filters],
    queryFn: async () => {
      let query = supabase
        .from('message_templates')
        .select('*')
        .order('code', { ascending: true });
      
      if (filters?.channel_type) {
        query = query.eq('channel_type', filters.channel_type);
      }
      if (filters?.language) {
        query = query.eq('language', filters.language);
      }
      
      const { data, error } = await query;
      
      if (error) throw error;
      return data as MessageTemplate[];
    },
  });
}

export function useCreateMessageTemplate() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (template: Omit<MessageTemplate, 'id' | 'created_at' | 'updated_at'>) => {
      const { data, error } = await supabase
        .from('message_templates')
        .insert(template)
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['message-templates'] });
      toast.success('Template created successfully');
    },
    onError: (error: any) => {
      toast.error(`Failed to create template: ${error.message}`);
    },
  });
}

export function useUpdateMessageTemplate() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ id, ...updates }: Partial<MessageTemplate> & { id: string }) => {
      const { data, error } = await supabase
        .from('message_templates')
        .update(updates)
        .eq('id', id)
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['message-templates'] });
      toast.success('Template updated successfully');
    },
    onError: (error: any) => {
      toast.error(`Failed to update template: ${error.message}`);
    },
  });
}

export function useDeleteMessageTemplate() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('message_templates')
        .delete()
        .eq('id', id);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['message-templates'] });
      toast.success('Template deleted successfully');
    },
    onError: (error: any) => {
      toast.error(`Failed to delete template: ${error.message}`);
    },
  });
}

// ============ AUTOMATION RULES ============

export function useMessageAutomationRules(filters?: { event_name?: string; is_active?: boolean }) {
  return useQuery({
    queryKey: ['message-automation-rules', filters],
    queryFn: async () => {
      let query = supabase
        .from('message_automation_rules')
        .select(`
          *,
          channel:message_channels(*),
          template:message_templates(*)
        `)
        .order('event_name', { ascending: true });
      
      if (filters?.event_name) {
        query = query.eq('event_name', filters.event_name);
      }
      if (filters?.is_active !== undefined) {
        query = query.eq('is_active', filters.is_active);
      }
      
      const { data, error } = await query;
      
      if (error) throw error;
      return data as (MessageAutomationRule & { channel: MessageChannel; template: MessageTemplate })[];
    },
  });
}

export function useCreateMessageAutomationRule() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (rule: Omit<MessageAutomationRule, 'id' | 'created_at' | 'updated_at' | 'channel' | 'template'>) => {
      const { data, error } = await supabase
        .from('message_automation_rules')
        .insert(rule)
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['message-automation-rules'] });
      toast.success('Automation rule created successfully');
    },
    onError: (error: any) => {
      toast.error(`Failed to create rule: ${error.message}`);
    },
  });
}

export function useUpdateMessageAutomationRule() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ id, ...updates }: Partial<MessageAutomationRule> & { id: string }) => {
      const { data, error } = await supabase
        .from('message_automation_rules')
        .update(updates)
        .eq('id', id)
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['message-automation-rules'] });
      toast.success('Automation rule updated successfully');
    },
    onError: (error: any) => {
      toast.error(`Failed to update rule: ${error.message}`);
    },
  });
}

export function useDeleteMessageAutomationRule() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('message_automation_rules')
        .delete()
        .eq('id', id);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['message-automation-rules'] });
      toast.success('Automation rule deleted successfully');
    },
    onError: (error: any) => {
      toast.error(`Failed to delete rule: ${error.message}`);
    },
  });
}

// ============ LOGS ============

export function useMessageLogs(filters?: { 
  status?: MessageStatus; 
  channel_id?: string;
  dateFrom?: string;
  dateTo?: string;
  limit?: number;
}) {
  return useQuery({
    queryKey: ['message-logs', filters],
    queryFn: async () => {
      let query = supabase
        .from('message_logs')
        .select(`
          *,
          channel:message_channels(name, type),
          template:message_templates(code),
          rule:message_automation_rules(event_name)
        `)
        .order('created_at', { ascending: false })
        .limit(filters?.limit || 100);
      
      if (filters?.status) {
        query = query.eq('status', filters.status);
      }
      if (filters?.channel_id) {
        query = query.eq('channel_id', filters.channel_id);
      }
      if (filters?.dateFrom) {
        query = query.gte('created_at', filters.dateFrom);
      }
      if (filters?.dateTo) {
        query = query.lte('created_at', filters.dateTo);
      }
      
      const { data, error } = await query;
      
      if (error) throw error;
      return data as unknown as MessageLog[];
    },
  });
}
