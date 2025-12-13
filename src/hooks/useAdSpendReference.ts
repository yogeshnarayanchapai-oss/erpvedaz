import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useCurrentStoreId } from './useCurrentStoreId';
import { useToast } from './use-toast';
import { useAuth } from '@/contexts/AuthContext';

export interface AdSpendReference {
  id: string;
  store_id: string;
  product_id: string;
  spend_date: string;
  amount: number;
  notes: string | null;
  created_by: string | null;
  updated_by: string | null;
  created_at: string;
  updated_at: string;
  product?: {
    name: string;
  };
  creator?: {
    name: string;
  };
  updater?: {
    name: string;
  };
}

interface UseAdSpendReferenceParams {
  startDate?: string;
  endDate?: string;
  productId?: string;
}

export function useAdSpendReference(params?: UseAdSpendReferenceParams) {
  const storeId = useCurrentStoreId();

  return useQuery({
    queryKey: ['ad-spend-reference', storeId, params?.startDate, params?.endDate, params?.productId],
    queryFn: async () => {
      if (!storeId) return [];

      let query = supabase
        .from('ad_spend_reference')
        .select(`
          *,
          product:products(name)
        `)
        .eq('store_id', storeId)
        .order('spend_date', { ascending: false });

      if (params?.startDate) {
        query = query.gte('spend_date', params.startDate);
      }
      if (params?.endDate) {
        query = query.lte('spend_date', params.endDate);
      }
      if (params?.productId) {
        query = query.eq('product_id', params.productId);
      }

      const { data, error } = await query;

      if (error) throw error;

      // Fetch user names separately
      const userIds = [...new Set([
        ...(data || []).map(d => d.created_by).filter(Boolean),
        ...(data || []).map(d => d.updated_by).filter(Boolean),
      ])] as string[];

      let userMap: Record<string, string> = {};
      if (userIds.length > 0) {
        const { data: profiles } = await supabase
          .from('profiles')
          .select('id, name')
          .in('id', userIds);
        
        (profiles || []).forEach(p => {
          userMap[p.id] = p.name || '';
        });
      }

      return (data || []).map(item => ({
        ...item,
        creator: item.created_by ? { name: userMap[item.created_by] || '' } : undefined,
        updater: item.updated_by ? { name: userMap[item.updated_by] || '' } : undefined,
      })) as AdSpendReference[];
    },
    enabled: !!storeId,
  });
}

interface UpsertAdSpendInput {
  product_id: string;
  spend_date: string;
  amount: number;
  notes?: string | null;
}

export function useUpsertAdSpendReference() {
  const storeId = useCurrentStoreId();
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: UpsertAdSpendInput) => {
      if (!storeId || !user) throw new Error('Missing store or user');

      // Check if record exists for this store/product/date
      const { data: existing } = await supabase
        .from('ad_spend_reference')
        .select('id')
        .eq('store_id', storeId)
        .eq('product_id', input.product_id)
        .eq('spend_date', input.spend_date)
        .maybeSingle();

      if (existing) {
        // Update existing record
        const { data, error } = await supabase
          .from('ad_spend_reference')
          .update({
            amount: input.amount,
            notes: input.notes,
            updated_by: user.id,
          })
          .eq('id', existing.id)
          .select()
          .single();

        if (error) throw error;
        return data;
      } else {
        // Insert new record
        const { data, error } = await supabase
          .from('ad_spend_reference')
          .insert({
            store_id: storeId,
            product_id: input.product_id,
            spend_date: input.spend_date,
            amount: input.amount,
            notes: input.notes,
            created_by: user.id,
            updated_by: user.id,
          })
          .select()
          .single();

        if (error) throw error;
        return data;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['ad-spend-reference'] });
      toast({ title: 'Ad spend saved successfully' });
    },
    onError: (error: Error) => {
      toast({ title: 'Error saving ad spend', description: error.message, variant: 'destructive' });
    },
  });
}

export function useDeleteAdSpendReference() {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('ad_spend_reference')
        .delete()
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['ad-spend-reference'] });
      toast({ title: 'Ad spend deleted' });
    },
    onError: (error: Error) => {
      toast({ title: 'Error deleting ad spend', description: error.message, variant: 'destructive' });
    },
  });
}
