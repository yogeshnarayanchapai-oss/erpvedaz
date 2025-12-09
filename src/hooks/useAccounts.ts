import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useCurrentStoreId } from './useCurrentStoreId';

export interface Account {
  id: string;
  name: string;
  type: 'cash' | 'bank' | 'wallet' | 'other';
  account_number: string | null;
  opening_balance: number;
  current_balance: number;
  currency: string;
  is_default: boolean;
  is_active: boolean;
  store_id: string | null;
  created_at: string;
  updated_at: string;
}

export function useAccounts() {
  const storeId = useCurrentStoreId();
  
  return useQuery({
    queryKey: ['accounts', storeId],
    queryFn: async () => {
      let query = supabase
        .from('accounts')
        .select('*')
        .order('is_default', { ascending: false })
        .order('name');
      
      if (storeId) {
        query = query.eq('store_id', storeId);
      }
      
      const { data, error } = await query;
      if (error) throw error;
      return data as Account[];
    },
    enabled: !!storeId,
  });
}

export function useActiveAccounts() {
  const storeId = useCurrentStoreId();
  
  return useQuery({
    queryKey: ['accounts', 'active', storeId],
    queryFn: async () => {
      let query = supabase
        .from('accounts')
        .select('*')
        .eq('is_active', true)
        .order('is_default', { ascending: false })
        .order('name');
      
      if (storeId) {
        query = query.eq('store_id', storeId);
      }
      
      const { data, error } = await query;
      if (error) throw error;
      return data as Account[];
    },
    enabled: !!storeId,
  });
}

export function useCreateAccount() {
  const queryClient = useQueryClient();
  const storeId = useCurrentStoreId();
  
  return useMutation({
    mutationFn: async (account: Omit<Account, 'id' | 'created_at' | 'updated_at' | 'store_id'>) => {
      const { data, error } = await supabase
        .from('accounts')
        .insert({ ...account, store_id: storeId })
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['accounts'] });
      toast.success('Account created successfully');
    },
    onError: (error: Error) => {
      toast.error(`Failed to create account: ${error.message}`);
    },
  });
}

export function useUpdateAccount() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ id, ...updates }: Partial<Account> & { id: string }) => {
      const { data, error } = await supabase
        .from('accounts')
        .update(updates)
        .eq('id', id)
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['accounts'] });
      toast.success('Account updated successfully');
    },
    onError: (error: Error) => {
      toast.error(`Failed to update account: ${error.message}`);
    },
  });
}

export function useDeleteAccount() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('accounts')
        .delete()
        .eq('id', id);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['accounts'] });
      toast.success('Account deleted successfully');
    },
    onError: (error: Error) => {
      toast.error(`Failed to delete account: ${error.message}`);
    },
  });
}
