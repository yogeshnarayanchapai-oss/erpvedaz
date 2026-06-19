import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useCurrentStoreId } from '@/hooks/useCurrentStoreId';
import { CONSIGNMENT_STATUSES, STATUS_LABELS } from '@/hooks/useConsignments';
import { toast } from 'sonner';

export type SettingCategory = 'STATUS' | 'PAYMENT_CATEGORY';

export interface SettingOption {
  id: string;
  store_id: string;
  category: SettingCategory;
  code: string;
  label: string;
  sort_order: number;
  is_active: boolean;
}

const DEFAULT_PAYMENT_CATEGORIES = [
  'CUSTOMER', 'SUPPLIER', 'FREIGHT', 'CUSTOMS', 'AGENT', 'TRANSPORT', 'WAREHOUSE', 'PACKAGING', 'OTHER',
];

async function seedDefaults(storeId: string, category: SettingCategory) {
  const rows = category === 'STATUS'
    ? CONSIGNMENT_STATUSES.map((code, i) => ({
        store_id: storeId, category, code, label: STATUS_LABELS[code], sort_order: i, is_active: true,
      }))
    : DEFAULT_PAYMENT_CATEGORIES.map((code, i) => ({
        store_id: storeId, category, code, label: code, sort_order: i, is_active: true,
      }));
  await (supabase as any).from('consignment_setting_options').insert(rows);
}

export function useConsignmentSettings(category: SettingCategory) {
  const storeId = useCurrentStoreId();
  return useQuery({
    queryKey: ['consignment-settings', storeId, category],
    enabled: !!storeId,
    queryFn: async () => {
      let { data, error } = await (supabase as any)
        .from('consignment_setting_options')
        .select('*')
        .eq('store_id', storeId)
        .eq('category', category)
        .order('sort_order', { ascending: true });
      if (error) throw error;
      if (!data || data.length === 0) {
        await seedDefaults(storeId!, category);
        const res = await (supabase as any)
          .from('consignment_setting_options')
          .select('*')
          .eq('store_id', storeId)
          .eq('category', category)
          .order('sort_order', { ascending: true });
        data = res.data || [];
      }
      return (data || []) as SettingOption[];
    },
  });
}

export function useAddSettingOption() {
  const qc = useQueryClient();
  const storeId = useCurrentStoreId();
  return useMutation({
    mutationFn: async ({ category, label, code }: { category: SettingCategory; label: string; code?: string }) => {
      const finalCode = (code || label).trim().toUpperCase().replace(/\s+/g, '_').replace(/[^A-Z0-9_]/g, '');
      const { data: existing } = await (supabase as any)
        .from('consignment_setting_options').select('sort_order').eq('store_id', storeId).eq('category', category)
        .order('sort_order', { ascending: false }).limit(1).maybeSingle();
      const nextOrder = (existing?.sort_order ?? -1) + 1;
      const { error } = await (supabase as any).from('consignment_setting_options').insert({
        store_id: storeId, category, code: finalCode, label: label.trim(), sort_order: nextOrder, is_active: true,
      });
      if (error) throw error;
    },
    onSuccess: (_, vars) => {
      qc.invalidateQueries({ queryKey: ['consignment-settings', storeId, vars.category] });
      toast.success('Option added');
    },
    onError: (e: any) => toast.error(e.message || 'Failed to add'),
  });
}

export function useUpdateSettingOption() {
  const qc = useQueryClient();
  const storeId = useCurrentStoreId();
  return useMutation({
    mutationFn: async ({ id, patch }: { id: string; patch: Partial<SettingOption> }) => {
      const { error } = await (supabase as any).from('consignment_setting_options').update(patch).eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['consignment-settings', storeId] });
    },
    onError: (e: any) => toast.error(e.message || 'Failed to update'),
  });
}

export function useDeleteSettingOption() {
  const qc = useQueryClient();
  const storeId = useCurrentStoreId();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await (supabase as any).from('consignment_setting_options').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['consignment-settings', storeId] });
      toast.success('Option removed');
    },
    onError: (e: any) => toast.error(e.message || 'Failed to delete'),
  });
}
