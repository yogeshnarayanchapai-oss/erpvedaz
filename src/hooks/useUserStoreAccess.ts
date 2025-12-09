import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import type { Database } from '@/integrations/supabase/types';

type AppRole = Database['public']['Enums']['app_role'];

interface UserStoreAccess {
  id: string;
  user_id: string;
  store_id: string;
  access_level: string;
  store_role: AppRole | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  store?: {
    id: string;
    name: string;
    slug: string;
    logo_url: string | null;
  };
  user?: {
    id: string;
    name: string;
    email: string;
  };
}

export function useUserStoreAccess(userId?: string) {
  return useQuery({
    queryKey: ['user-store-access', userId],
    queryFn: async () => {
      let query = supabase
        .from('user_store_access')
        .select(`
          *,
          store:stores(id, name, slug, logo_url),
          user:profiles(id, name, email)
        `)
        .eq('is_active', true);

      if (userId) {
        query = query.eq('user_id', userId);
      }

      const { data, error } = await query.order('created_at', { ascending: false });

      if (error) throw error;
      return data as UserStoreAccess[];
    },
    enabled: true,
  });
}

export function useStoreUsers(storeId?: string) {
  return useQuery({
    queryKey: ['store-users', storeId],
    queryFn: async () => {
      if (!storeId) return [];

      const { data, error } = await supabase
        .from('user_store_access')
        .select(`
          *,
          user:profiles(id, name, email, role)
        `)
        .eq('store_id', storeId)
        .eq('is_active', true)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data as (UserStoreAccess & { user: { id: string; name: string; email: string; role: AppRole } })[];
    },
    enabled: !!storeId,
  });
}

interface AssignStoreInput {
  user_id: string;
  store_id: string;
  access_level?: string;
  store_role?: AppRole | null;
}

export function useAssignUserToStore() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (input: AssignStoreInput) => {
      const { data, error } = await supabase
        .from('user_store_access')
        .upsert({
          user_id: input.user_id,
          store_id: input.store_id,
          access_level: input.access_level || 'staff',
          store_role: input.store_role || null,
          is_active: true,
        }, {
          onConflict: 'user_id,store_id',
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['user-store-access'] });
      queryClient.invalidateQueries({ queryKey: ['store-users'] });
      toast({
        title: 'Success',
        description: 'User assigned to store successfully',
      });
    },
    onError: (error: Error) => {
      toast({
        title: 'Error',
        description: error.message,
        variant: 'destructive',
      });
    },
  });
}

export function useRemoveUserFromStore() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async ({ userId, storeId }: { userId: string; storeId: string }) => {
      const { error } = await supabase
        .from('user_store_access')
        .update({ is_active: false })
        .eq('user_id', userId)
        .eq('store_id', storeId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['user-store-access'] });
      queryClient.invalidateQueries({ queryKey: ['store-users'] });
      toast({
        title: 'Success',
        description: 'User removed from store',
      });
    },
    onError: (error: Error) => {
      toast({
        title: 'Error',
        description: error.message,
        variant: 'destructive',
      });
    },
  });
}

interface UpdateStoreAccessInput {
  id?: string;
  access_level?: string;
  store_role?: AppRole | null;
  userId?: string;
  storeId?: string;
}

export function useUpdateUserStoreAccess() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async ({ id, access_level, store_role, userId, storeId }: UpdateStoreAccessInput) => {
      const updateData: Record<string, unknown> = {};
      if (access_level !== undefined) updateData.access_level = access_level;
      if (store_role !== undefined) updateData.store_role = store_role;

      let query = supabase
        .from('user_store_access')
        .update(updateData);

      if (id) {
        query = query.eq('id', id);
      } else if (userId && storeId) {
        query = query.eq('user_id', userId).eq('store_id', storeId);
      } else {
        throw new Error('Either id or userId+storeId must be provided');
      }

      const { data, error } = await query.select().single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['user-store-access'] });
      queryClient.invalidateQueries({ queryKey: ['store-users'] });
      toast({
        title: 'Success',
        description: 'Store access updated',
      });
    },
    onError: (error: Error) => {
      toast({
        title: 'Error',
        description: error.message,
        variant: 'destructive',
      });
    },
  });
}
