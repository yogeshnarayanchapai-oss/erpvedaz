import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export interface CustomerNote {
  id: string;
  customer_id: string;
  note: string;
  note_type: string | null;
  created_by: string | null;
  created_at: string | null;
  updated_at: string | null;
  profiles?: {
    name: string;
  } | null;
}

export function useCustomerNotes(customerId: string | undefined) {
  return useQuery({
    queryKey: ['customer-notes', customerId],
    queryFn: async () => {
      if (!customerId) return [];
      
      const { data, error } = await supabase
        .from('customer_notes')
        .select('*')
        .eq('customer_id', customerId)
        .order('created_at', { ascending: false });

      if (error) throw error;

      // Fetch user names separately
      const userIds = [...new Set(data.map(n => n.created_by).filter(Boolean))];
      if (userIds.length > 0) {
        const { data: profiles } = await supabase
          .from('profiles')
          .select('id, name')
          .in('id', userIds);

        return data.map(note => ({
          ...note,
          profiles: profiles?.find(p => p.id === note.created_by) || null,
        })) as CustomerNote[];
      }

      return data as CustomerNote[];
    },
    enabled: !!customerId,
  });
}

export function useCreateCustomerNote() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      customerId,
      note,
      noteType = 'GENERAL',
    }: {
      customerId: string;
      note: string;
      noteType?: string;
    }) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const { data, error } = await supabase
        .from('customer_notes')
        .insert({
          customer_id: customerId,
          note,
          note_type: noteType,
          created_by: user.id,
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['customer-notes', variables.customerId] });
      queryClient.invalidateQueries({ queryKey: ['customer-activity', variables.customerId] });
      toast.success('Note added successfully');
    },
    onError: (error: Error) => {
      toast.error(`Failed to add note: ${error.message}`);
    },
  });
}

export function useDeleteCustomerNote() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ noteId, customerId }: { noteId: string; customerId: string }) => {
      const { error } = await supabase
        .from('customer_notes')
        .delete()
        .eq('id', noteId);

      if (error) throw error;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['customer-notes', variables.customerId] });
      toast.success('Note deleted successfully');
    },
    onError: (error: Error) => {
      toast.error(`Failed to delete note: ${error.message}`);
    },
  });
}
