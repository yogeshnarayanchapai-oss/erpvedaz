import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export interface Store {
  id: string;
  name: string;
  slug: string;
  default_subdomain: string | null;
  logo_url: string | null;
  primary_color: string;
  contact_email: string | null;
  contact_phone: string | null;
  address: string | null;
  is_active: boolean;
  timezone: string;
  currency: string;
  created_at: string;
  updated_at: string;
  total_orders?: number;
  total_revenue?: number;
}

export interface StoreDomain {
  id: string;
  store_id: string;
  domain: string;
  is_primary: boolean;
  verified_at: string | null;
  created_at: string;
}

export interface CreateStoreInput {
  name: string;
  slug: string;
  default_subdomain?: string;
  logo_url?: string;
  primary_color?: string;
  contact_email?: string;
  contact_phone?: string;
  address?: string;
  is_active?: boolean;
  admin_name?: string;
  admin_email?: string;
}

export interface UpdateStoreInput extends Partial<CreateStoreInput> {
  id: string;
}

export function useStores() {
  return useQuery({
    queryKey: ['stores'],
    queryFn: async () => {
      const { data: stores, error } = await supabase
        .from('stores')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;

      // Fetch aggregated stats for each store
      const storesWithStats = await Promise.all(
        stores.map(async (store) => {
          const thirtyDaysAgo = new Date();
          thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

          // Get orders count and revenue for last 30 days
          const { data: orders } = await supabase
            .from('orders')
            .select('amount')
            .eq('store_id', store.id)
            .gte('order_date', thirtyDaysAgo.toISOString())
            .in('order_status', ['CONFIRMED', 'DELIVERED']);

          const total_orders = orders?.length || 0;
          const total_revenue = orders?.reduce((sum, order) => sum + (order.amount || 0), 0) || 0;

          return {
            ...store,
            total_orders,
            total_revenue,
          };
        })
      );

      return storesWithStats as Store[];
    },
  });
}

export function useStore(id: string) {
  return useQuery({
    queryKey: ['store', id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('stores')
        .select('*')
        .eq('id', id)
        .single();

      if (error) throw error;

      // Get stats for this store
      const today = new Date();
      const sevenDaysAgo = new Date();
      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

      const { data: todayOrders } = await supabase
        .from('orders')
        .select('amount')
        .eq('store_id', id)
        .gte('order_date', today.toISOString().split('T')[0])
        .in('order_status', ['CONFIRMED', 'DELIVERED']);

      const { data: weekOrders } = await supabase
        .from('orders')
        .select('amount, order_date')
        .eq('store_id', id)
        .gte('order_date', sevenDaysAgo.toISOString())
        .in('order_status', ['CONFIRMED', 'DELIVERED']);

      const { count: customersCount } = await supabase
        .from('customers')
        .select('*', { count: 'exact', head: true })
        .eq('store_id', id);

      return {
        ...data,
        today_orders: todayOrders?.length || 0,
        today_revenue: todayOrders?.reduce((sum, order) => sum + (order.amount || 0), 0) || 0,
        week_orders: weekOrders?.length || 0,
        week_revenue: weekOrders?.reduce((sum, order) => sum + (order.amount || 0), 0) || 0,
        total_customers: customersCount || 0,
        week_chart_data: weekOrders || [],
      } as Store & {
        today_orders: number;
        today_revenue: number;
        week_orders: number;
        week_revenue: number;
        total_customers: number;
        week_chart_data: any[];
      };
    },
    enabled: !!id,
  });
}

export function useCreateStore() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: CreateStoreInput) => {
      const { data: { user } } = await supabase.auth.getUser();
      const { admin_name, admin_email, ...storeInput } = input;
      
      const { data, error } = await supabase
        .from('stores')
        .insert(storeInput)
        .select()
        .single();

      if (error) throw error;

      // Automatically assign the creator (OWNER) as admin of this store
      if (user) {
        await supabase.from('user_store_access').upsert({
          user_id: user.id,
          store_id: data.id,
          access_level: 'admin',
          is_active: true,
        }, {
          onConflict: 'user_id,store_id',
        });
      }

      // Create admin user for the store if provided
      if (admin_name && admin_email) {
        try {
          const { data: funcData, error: funcError } = await supabase.functions.invoke('create-user', {
            body: {
              email: admin_email,
              full_name: admin_name,
              role: 'ADMIN',
              store_id: data.id,
            },
          });
          
          if (funcError) {
            console.error('Failed to create admin user:', funcError);
          }
        } catch (err) {
          console.error('Error creating admin user:', err);
        }
      }

      // Create default subdomain entry
      if (input.default_subdomain) {
        await supabase.from('store_domains').insert({
          store_id: data.id,
          domain: `${input.default_subdomain}.techlaya.com`,
          is_primary: true,
        });
      }

      // Create empty branding record for this store
      await supabase.from('branding').insert({
        store_id: data.id,
        primary_color: input.primary_color || '#3B82F6',
      });

      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['stores'] });
      queryClient.invalidateQueries({ queryKey: ['user-store-access'] });
      queryClient.invalidateQueries({ queryKey: ['accessible-stores'] });
      toast.success('Store and admin created successfully');
    },
    onError: (error: any) => {
      toast.error(`Failed to create store: ${error.message}`);
    },
  });
}

export function useUpdateStore() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, ...input }: UpdateStoreInput) => {
      const { data, error } = await supabase
        .from('stores')
        .update(input)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['stores'] });
      queryClient.invalidateQueries({ queryKey: ['store', data.id] });
      toast.success('Store updated successfully');
    },
    onError: (error: any) => {
      toast.error(`Failed to update store: ${error.message}`);
    },
  });
}

export function useStoreDomains(storeId: string) {
  return useQuery({
    queryKey: ['storeDomains', storeId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('store_domains')
        .select('*')
        .eq('store_id', storeId)
        .order('is_primary', { ascending: false });

      if (error) throw error;
      return data as StoreDomain[];
    },
    enabled: !!storeId,
  });
}

export function useAddStoreDomain() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      storeId,
      domain,
      is_primary = false,
    }: {
      storeId: string;
      domain: string;
      is_primary?: boolean;
    }) => {
      // If setting as primary, unset other primary domains first
      if (is_primary) {
        await supabase
          .from('store_domains')
          .update({ is_primary: false })
          .eq('store_id', storeId);
      }

      const { data, error } = await supabase
        .from('store_domains')
        .insert({
          store_id: storeId,
          domain,
          is_primary,
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['storeDomains', variables.storeId] });
      toast.success('Domain added successfully');
    },
    onError: (error: any) => {
      toast.error(`Failed to add domain: ${error.message}`);
    },
  });
}

export function useUpdateStoreDomain() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      id,
      storeId,
      is_primary,
      verified_at,
    }: {
      id: string;
      storeId: string;
      is_primary?: boolean;
      verified_at?: string | null;
    }) => {
      // If setting as primary, unset other primary domains first
      if (is_primary) {
        await supabase
          .from('store_domains')
          .update({ is_primary: false })
          .eq('store_id', storeId);
      }

      const updateData: any = {};
      if (is_primary !== undefined) updateData.is_primary = is_primary;
      if (verified_at !== undefined) updateData.verified_at = verified_at;

      const { data, error } = await supabase
        .from('store_domains')
        .update(updateData)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['storeDomains', variables.storeId] });
      toast.success('Domain updated successfully');
    },
    onError: (error: any) => {
      toast.error(`Failed to update domain: ${error.message}`);
    },
  });
}

export function useDeleteStoreDomain() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, storeId }: { id: string; storeId: string }) => {
      const { error } = await supabase
        .from('store_domains')
        .delete()
        .eq('id', id);

      if (error) throw error;
      return { storeId };
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['storeDomains', data.storeId] });
      toast.success('Domain deleted successfully');
    },
    onError: (error: any) => {
      toast.error(`Failed to delete domain: ${error.message}`);
    },
  });
}

export function useDeleteStore() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (storeId: string) => {
      // Delete related records first
      await supabase.from('store_domains').delete().eq('store_id', storeId);
      await supabase.from('branding').delete().eq('store_id', storeId);
      await supabase.from('user_store_access').delete().eq('store_id', storeId);
      
      // Delete the store
      const { error } = await supabase
        .from('stores')
        .delete()
        .eq('id', storeId);

      if (error) throw error;
      return storeId;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['stores'] });
      queryClient.invalidateQueries({ queryKey: ['accessible-stores'] });
      toast.success('Store deleted successfully');
    },
    onError: (error: any) => {
      toast.error(`Failed to delete store: ${error.message}`);
    },
  });
}

// Helper function to get store by domain (for multi-tenant routing)
export async function getStoreByHost(host: string): Promise<Store | null> {
  const { data: domain } = await supabase
    .from('store_domains')
    .select('store_id, stores(*)')
    .eq('domain', host)
    .not('verified_at', 'is', null)
    .single();

  if (!domain) return null;
  return domain.stores as any;
}
