import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useCurrentStoreId } from './useCurrentStoreId';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';

export interface DailyRecord {
  id: string;
  store_id: string;
  warehouse_id: string | null;
  record_date: string;
  sell: number;
  ads_spent_npr: number;
  rto: number;
  rto_cost: number;
  staff_office_cost: number;
  actual_sell: number;
  product_cost: number;
  actual_product_cost: number;
  product_value: number;
  delivery_charge: number;
  redirect_cost: number;
  actual_product_value: number;
  profit_loss: number;
  rto_percent: number;
  total_orders: number;
  created_by: string | null;
  created_at: string;
  updated_by: string | null;
  updated_at: string;
  warehouse?: { name: string } | null;
}

export interface DailyRecordInput {
  record_date: string;
  warehouse_id?: string | null;
  sell: number;
  ads_spent_npr: number;
  rto: number;
  rto_cost: number;
  staff_office_cost: number;
  actual_sell: number;
  product_cost: number;
  actual_product_cost: number;
  product_value: number;
  delivery_charge: number;
  redirect_cost: number;
  actual_product_value: number;
  profit_loss: number;
  rto_percent: number;
  total_orders: number;
}

interface UseDailyRecordsParams {
  startDate?: string;
  endDate?: string;
  warehouseId?: string;
  limit?: number;
}

export function useDailyRecords(params?: UseDailyRecordsParams) {
  const storeId = useCurrentStoreId();

  return useQuery({
    queryKey: ['daily_records', storeId, params?.startDate, params?.endDate, params?.warehouseId, params?.limit],
    queryFn: async () => {
      if (!storeId) return [];

      let query = supabase
        .from('daily_records')
        .select(`*, warehouse:warehouses(name)`)
        .eq('store_id', storeId)
        .order('record_date', { ascending: false });

      if (params?.startDate) {
        query = query.gte('record_date', params.startDate);
      }
      if (params?.endDate) {
        query = query.lte('record_date', params.endDate);
      }
      // Filter by warehouse only if specific warehouse is selected (not 'all')
      if (params?.warehouseId && params.warehouseId !== 'all') {
        query = query.eq('warehouse_id', params.warehouseId);
      }
      // When 'all' is selected, don't filter by warehouse - show all records
      if (params?.limit) {
        query = query.limit(params.limit);
      }

      const { data, error } = await query;

      if (error) throw error;
      return data as DailyRecord[];
    },
    enabled: !!storeId,
  });
}

export function useSaveDailyRecord() {
  const storeId = useCurrentStoreId();
  const { user } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: DailyRecordInput) => {
      if (!storeId || !user) throw new Error('Missing store or user');

      const recordData = {
        store_id: storeId,
        warehouse_id: input.warehouse_id || null,
        record_date: input.record_date,
        sell: input.sell,
        ads_spent_npr: input.ads_spent_npr,
        rto: input.rto,
        rto_cost: input.rto_cost,
        staff_office_cost: input.staff_office_cost,
        actual_sell: input.actual_sell,
        product_cost: input.product_cost,
        actual_product_cost: input.actual_product_cost,
        product_value: input.product_value,
        delivery_charge: input.delivery_charge,
        redirect_cost: input.redirect_cost,
        actual_product_value: input.actual_product_value,
        profit_loss: input.profit_loss,
        rto_percent: input.rto_percent,
        total_orders: input.total_orders,
        created_by: user.id,
        updated_by: user.id,
      };

      // Check if record exists for this date/store/warehouse
      let existingQuery = supabase
        .from('daily_records')
        .select('id')
        .eq('store_id', storeId)
        .eq('record_date', input.record_date);

      if (input.warehouse_id) {
        existingQuery = existingQuery.eq('warehouse_id', input.warehouse_id);
      } else {
        existingQuery = existingQuery.is('warehouse_id', null);
      }

      const { data: existing } = await existingQuery.maybeSingle();

      if (existing) {
        // Update existing record
        const { data, error } = await supabase
          .from('daily_records')
          .update({
            ...recordData,
            created_by: undefined, // Don't update created_by
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
          .from('daily_records')
          .insert(recordData)
          .select()
          .single();

        if (error) throw error;
        return data;
      }
    },
    onSuccess: () => {
      // Invalidate all daily_records queries to refresh data instantly
      queryClient.invalidateQueries({ queryKey: ['daily_records'] });
      queryClient.refetchQueries({ queryKey: ['daily_records'] });
      toast.success('Daily record saved');
    },
    onError: (error: Error) => {
      toast.error(`Failed to save: ${error.message}`);
    },
  });
}

export function useDeleteDailyRecord() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('daily_records')
        .delete()
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['daily_records'] });
      toast.success('Daily record deleted');
    },
    onError: (error: Error) => {
      toast.error(`Failed to delete: ${error.message}`);
    },
  });
}
