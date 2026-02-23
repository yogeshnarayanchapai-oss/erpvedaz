import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useCurrentStoreId } from '@/hooks/useCurrentStoreId';
import { useIsModuleStoreWise } from '@/hooks/useModuleStoreSettings';

export interface Asset {
  id: string;
  asset_code: string;
  name: string;
  category: string;
  description: string | null;
  purchase_date: string | null;
  purchase_cost: number | null;
  status: 'Available' | 'Assigned' | 'Repair' | 'Lost' | 'Disposed';
  created_at: string;
  updated_at: string;
  store_id?: string | null;
}

export interface AssetAssignment {
  id: string;
  asset_id: string;
  employee_id: string;
  assigned_on: string;
  returned_on: string | null;
  condition_on_assign: string | null;
  condition_on_return: string | null;
  notes: string | null;
  created_at: string;
  store_id?: string | null;
  assets?: Asset;
  employees?: { full_name: string };
}

export function useAssets(status?: string, category?: string) {
  const storeId = useCurrentStoreId();
  const filterByStore = useIsModuleStoreWise('hrm');

  return useQuery({
    queryKey: ['assets', storeId, filterByStore, status, category],
    queryFn: async () => {
      let query = supabase.from('assets' as any).select('*').order('created_at', { ascending: false });

      if (filterByStore && storeId) query = query.eq('store_id', storeId);
      if (status) query = query.eq('status', status);
      if (category) query = query.eq('category', category);

      const { data, error } = await query;
      if (error) throw error;
      return (data || []) as unknown as Asset[];
    },
    enabled: !!storeId,
  });
}

export function useAssetAssignments(employeeId?: string) {
  const storeId = useCurrentStoreId();
  const filterByStore = useIsModuleStoreWise('hrm');

  return useQuery({
    queryKey: ['asset-assignments', storeId, filterByStore, employeeId],
    queryFn: async () => {
      let query = supabase
        .from('asset_assignments' as any)
        .select('*, assets(*), employees(full_name)')
        .order('assigned_on', { ascending: false });

      if (filterByStore && storeId) query = query.eq('store_id', storeId);
      if (employeeId) query = query.eq('employee_id', employeeId);

      const { data, error } = await query;
      if (error) throw error;
      return (data || []) as unknown as AssetAssignment[];
    },
    enabled: !!storeId,
  });
}

export function useMyAssets() {
  return useQuery({
    queryKey: ['my-assets'],
    queryFn: async () => {
      const { data: employee } = await supabase
        .from('employees')
        .select('id')
        .eq('user_id', (await supabase.auth.getUser()).data.user?.id)
        .maybeSingle();

      if (!employee) return [];

      const { data, error } = await supabase
        .from('asset_assignments' as any)
        .select('*, assets(*)')
        .eq('employee_id', employee.id)
        .order('assigned_on', { ascending: false });

      if (error) throw error;
      return (data || []) as unknown as AssetAssignment[];
    },
  });
}

export function useCreateAsset() {
  const queryClient = useQueryClient();
  const storeId = useCurrentStoreId();
  
  return useMutation({
    mutationFn: async (data: Partial<Asset>) => {
      const { data: result, error } = await supabase
        .from('assets' as any)
        .insert({ ...data, store_id: storeId } as any)
        .select()
        .single();

      if (error) throw error;
      return result;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['assets'] });
      toast.success('Asset created successfully');
    },
    onError: (error: any) => {
      toast.error(error.message || 'Failed to create asset');
    },
  });
}

export function useUpdateAsset() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ id, ...data }: Partial<Asset> & { id: string }) => {
      const { data: result, error } = await supabase
        .from('assets' as any)
        .update(data as any)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return result;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['assets'] });
      toast.success('Asset updated successfully');
    },
    onError: (error: any) => {
      toast.error(error.message || 'Failed to update asset');
    },
  });
}

export function useDeleteAsset() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('assets' as any).delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['assets'] });
      toast.success('Asset deleted successfully');
    },
    onError: (error: any) => {
      toast.error(error.message || 'Failed to delete asset');
    },
  });
}

export function useAssignAsset() {
  const queryClient = useQueryClient();
  const storeId = useCurrentStoreId();
  
  return useMutation({
    mutationFn: async (data: Partial<AssetAssignment>) => {
      // First update asset status
      await supabase.from('assets' as any).update({ status: 'Assigned' } as any).eq('id', data.asset_id);

      const { data: result, error } = await supabase
        .from('asset_assignments' as any)
        .insert({ ...data, store_id: storeId } as any)
        .select()
        .single();

      if (error) throw error;
      return result;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['assets'] });
      queryClient.invalidateQueries({ queryKey: ['asset-assignments'] });
      toast.success('Asset assigned successfully');
    },
    onError: (error: any) => {
      toast.error(error.message || 'Failed to assign asset');
    },
  });
}

export function useReturnAsset() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ assignmentId, assetId, conditionOnReturn }: { assignmentId: string; assetId: string; conditionOnReturn?: string }) => {
      // Update assignment
      await supabase
        .from('asset_assignments' as any)
        .update({ 
          returned_on: new Date().toISOString().split('T')[0],
          condition_on_return: conditionOnReturn 
        } as any)
        .eq('id', assignmentId);

      // Update asset status
      const { error } = await supabase
        .from('assets' as any)
        .update({ status: 'Available' } as any)
        .eq('id', assetId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['assets'] });
      queryClient.invalidateQueries({ queryKey: ['asset-assignments'] });
      toast.success('Asset returned successfully');
    },
    onError: (error: any) => {
      toast.error(error.message || 'Failed to return asset');
    },
  });
}
