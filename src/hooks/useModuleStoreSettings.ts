import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useCurrentStoreId } from '@/hooks/useCurrentStoreId';
import { toast } from 'sonner';

export interface ModuleStoreSetting {
  id: string;
  module_name: string;
  is_store_wise: boolean;
  updated_at: string;
  updated_by: string | null;
}

export function useModuleStoreSettings() {
  return useQuery({
    queryKey: ['module_store_settings'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('module_store_settings')
        .select('*')
        .order('module_name');
      if (error) throw error;
      return (data || []) as ModuleStoreSetting[];
    },
    staleTime: 5 * 60 * 1000, // 5 min cache
  });
}

export function useIsModuleStoreWise(moduleName: string): boolean {
  const { data: settings } = useModuleStoreSettings();
  const setting = settings?.find(s => s.module_name === moduleName);
  // Default true if not found
  return setting?.is_store_wise ?? true;
}

export function useToggleModuleStoreWise() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ moduleName, isStoreWise }: { moduleName: string; isStoreWise: boolean }) => {
      const { error } = await supabase
        .from('module_store_settings')
        .update({ is_store_wise: isStoreWise })
        .eq('module_name', moduleName);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['module_store_settings'] });
      toast.success('Module setting updated');
    },
    onError: (err: any) => {
      toast.error('Failed to update: ' + err.message);
    },
  });
}

/**
 * Returns storeId and whether to filter by it.
 * When module is global (OFF), filterByStore=false so queries skip store_id filter.
 * storeId is always the current store (for enabled checks).
 */
export function useModuleStoreFilter(module: string): { storeId: string | null; filterByStore: boolean } {
  const storeId = useCurrentStoreId();
  const isStoreWise = useIsModuleStoreWise(module);
  return { storeId, filterByStore: isStoreWise };
}
