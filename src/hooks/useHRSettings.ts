import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export interface HRSettings {
  id: string;
  date_display_mode: 'AD' | 'BS' | 'AD+BS';
  updated_at: string;
}

export function useHRSettings() {
  return useQuery({
    queryKey: ['hr-settings'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('hr_settings' as any)
        .select('*')
        .limit(1)
        .maybeSingle();

      if (error) throw error;
      return data as unknown as HRSettings | null;
    },
  });
}

export function useUpdateHRSettings() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (data: Partial<HRSettings>) => {
      const { data: existing } = await supabase.from('hr_settings' as any).select('id').limit(1).maybeSingle();
      
      if (existing) {
        const { data: result, error } = await supabase
          .from('hr_settings' as any)
          .update(data as any)
          .eq('id', (existing as any).id)
          .select()
          .single();

        if (error) throw error;
        return result;
      } else {
        const { data: result, error } = await supabase
          .from('hr_settings' as any)
          .insert(data as any)
          .select()
          .single();

        if (error) throw error;
        return result;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['hr-settings'] });
      toast.success('HR settings updated');
    },
    onError: (error: any) => {
      toast.error(error.message || 'Failed to update HR settings');
    },
  });
}
