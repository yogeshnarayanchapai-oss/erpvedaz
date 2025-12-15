import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export interface DailyPL {
  id: string;
  date: string;
  total_units_sold: number;
  gross_sales_value: number;
  product_cost: number;
  delivery_cost: number;
  delivery_cost_per_order: number;
  rto_units: number;
  rto_rate_percent: number;
  rto_cost_per_order: number;
  rto_orders: number;
  rto_cost: number;
  ads_spent_usd: number;
  ads_spent_npr: number;
  usd_rate: number;
  staff_office_cost: number;
  other_expenses: number;
  total_expense: number;
  actual_sales: number;
  actual_profit: number;
  roi_ads: number;
  target_profit: number;
  target_orders: number;
  warehouse_id: string | null;
  created_at: string;
  updated_at: string;
}

export interface DailyPLInput {
  date: string;
  warehouse_id?: string | null;
  // From sales
  total_units_sold: number;
  gross_sales_value: number;
  product_cost: number;
  // Editable fields
  delivery_cost_per_order: number;
  rto_rate_percent: number;
  rto_cost_per_order: number;
  ads_spent_usd: number;
  usd_rate: number;
  ads_spent_npr: number;
  staff_office_cost: number;
  other_expenses: number;
  target_profit: number;
  target_orders: number;
}

export function useDailyPL(date: string) {
  return useQuery({
    queryKey: ['daily_pl', date],
    queryFn: async () => {
      // First check if daily_pl record exists
      const { data: existing, error: fetchError } = await supabase
        .from('daily_pl')
        .select('*')
        .eq('date', date)
        .maybeSingle();

      if (fetchError) throw fetchError;

      // Get aggregated data from stock_movements for that date (exclude deleted)
      const { data: movements, error: movErr } = await supabase
        .from('stock_movements')
        .select('movement_type, qty, total_cost, total_value')
        .eq('movement_date', date)
        .or('is_deleted.is.null,is_deleted.eq.false');

      if (movErr) throw movErr;

      let total_units_sold = 0;
      let gross_sales_value = 0;
      let product_cost = 0;
      let rto_units = 0;

      movements?.forEach((m: any) => {
        if (m.movement_type === 'OUT') {
          total_units_sold += m.qty || 0;
          gross_sales_value += m.total_value || 0;
          product_cost += m.total_cost || 0;
        }
        if (m.movement_type === 'RTO_IN' || m.movement_type === 'RTO_OUT') {
          rto_units += m.qty || 0;
        }
      });

      if (existing) {
        // Return existing with calculated sales data
        return {
          ...existing,
          total_units_sold,
          gross_sales_value,
          product_cost,
          rto_units,
        } as DailyPL;
      }

      // Return a new record (not saved yet)
      return {
        id: '',
        date,
        total_units_sold,
        gross_sales_value,
        product_cost,
        delivery_cost: 0,
        delivery_cost_per_order: 400,
        rto_units,
        rto_rate_percent: 0,
        rto_cost_per_order: 0,
        rto_orders: 0,
        rto_cost: 0,
        ads_spent_usd: 0,
        ads_spent_npr: 0,
        usd_rate: 150,
        staff_office_cost: 0,
        other_expenses: 0,
        total_expense: 0,
        actual_sales: 0,
        actual_profit: 0,
        roi_ads: 0,
        target_profit: 0,
        target_orders: 0,
        warehouse_id: null,
        created_at: '',
        updated_at: '',
      } as DailyPL;
    },
  });
}

export function useSaveDailyPL() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (input: DailyPLInput) => {
      const {
        date,
        warehouse_id,
        total_units_sold,
        gross_sales_value,
        product_cost,
        delivery_cost_per_order,
        rto_rate_percent,
        rto_cost_per_order,
        ads_spent_usd,
        usd_rate,
        ads_spent_npr,
        staff_office_cost,
        other_expenses,
        target_profit,
        target_orders,
      } = input;

      // Calculate all derived values using the new formulas
      // RTO Orders = Units × (RTO% / 100)
      const rto_orders = Math.round(total_units_sold * (rto_rate_percent / 100));
      
      // RTO Cost = RTO Orders × RTO Cost/Order
      const rto_cost = rto_orders * rto_cost_per_order;
      
      // Actual Sales = Gross Sales - (Gross Sales × RTO% / 100)
      const actual_sales = gross_sales_value - (gross_sales_value * rto_rate_percent / 100);
      
      // Total Delivery Cost = Units × Delivery Cost/Order
      const delivery_cost = total_units_sold * delivery_cost_per_order;
      
      // Total Expense = Product Cost + Delivery Cost + RTO Cost + Staff + Ads NPR + Other
      const total_expense = 
        product_cost + 
        delivery_cost + 
        rto_cost + 
        staff_office_cost + 
        ads_spent_npr + 
        other_expenses;
      
      // Actual Profit = Actual Sales - Total Expense
      const actual_profit = actual_sales - total_expense;
      
      // ROI = Actual Profit / Ads NPR (avoid division by zero)
      const roi_ads = ads_spent_npr > 0 ? actual_profit / ads_spent_npr : 0;

      const saveData = {
        date,
        warehouse_id: warehouse_id || null,
        total_units_sold,
        gross_sales_value,
        product_cost,
        delivery_cost,
        delivery_cost_per_order,
        rto_units: rto_orders, // Use calculated RTO orders
        rto_rate_percent,
        rto_cost_per_order,
        rto_orders,
        rto_cost,
        ads_spent_usd,
        usd_rate,
        ads_spent_npr,
        staff_office_cost,
        other_expenses,
        total_expense,
        actual_sales,
        actual_profit,
        roi_ads,
        target_profit,
        target_orders,
      };

      // Upsert by date
      const { data, error } = await supabase
        .from('daily_pl')
        .upsert(saveData, { onConflict: 'date' })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['daily_pl', variables.date] });
      queryClient.invalidateQueries({ queryKey: ['pl_summary_range'] });
      queryClient.invalidateQueries({ queryKey: ['pl_trend'] });
      queryClient.invalidateQueries({ queryKey: ['daily_pl_records'] });
      toast.success('Daily P/L saved');
    },
    onError: (error) => toast.error(`Failed: ${error.message}`),
  });
}

export function useDailySalesByProduct(date: string) {
  return useQuery({
    queryKey: ['daily_sales_by_product', date],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('stock_movements')
        .select(`
          product_id,
          qty,
          total_cost,
          total_value,
          products:product_id(name)
        `)
        .eq('movement_date', date)
        .eq('movement_type', 'OUT')
        .or('is_deleted.is.null,is_deleted.eq.false');

      if (error) throw error;

      // Group by product
      const byProduct: Record<string, { name: string; units: number; sales: number; cost: number; profit: number }> = {};
      data?.forEach((m: any) => {
        const pid = m.product_id;
        if (!byProduct[pid]) {
          byProduct[pid] = { name: m.products?.name || 'Unknown', units: 0, sales: 0, cost: 0, profit: 0 };
        }
        byProduct[pid].units += m.qty || 0;
        byProduct[pid].sales += m.total_value || 0;
        byProduct[pid].cost += m.total_cost || 0;
        byProduct[pid].profit = byProduct[pid].sales - byProduct[pid].cost;
      });

      return Object.values(byProduct);
    },
  });
}

// New hook to fetch saved daily records for the table
export function useDailyPLRecords(limit: number = 30) {
  return useQuery({
    queryKey: ['daily_pl_records', limit],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('daily_pl')
        .select('*')
        .order('date', { ascending: false })
        .limit(limit);

      if (error) throw error;
      return data as DailyPL[];
    },
  });
}
