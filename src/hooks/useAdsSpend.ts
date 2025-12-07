import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import type { Database } from "@/integrations/supabase/types";

type AdsSpend = Database["public"]["Tables"]["ads_spend"]["Row"];
type AdsSpendInsert = Database["public"]["Tables"]["ads_spend"]["Insert"];
type AdsSpendUpdate = Database["public"]["Tables"]["ads_spend"]["Update"];

export type { AdsSpend };

export interface AdsSpendCalculated extends AdsSpend {
  rto_percentage_actual: number;
  estimated_delivered_orders: number;
  total_revenue: number;
  total_expense_without_ads: number;
  total_expense_with_ads: number;
  cost_per_order_without_ads: number;
  cost_per_order_with_ads: number;
  per_product_margin_no_ads: number;
  per_product_margin_with_ads: number;
  roi_multiple: number;
  profit_loss: number;
  achievement_percentage: number;
}

export const calculateMetrics = (row: AdsSpend): AdsSpendCalculated => {
  const confirmed_orders = row.confirmed_orders || 0;
  const delivered_orders = row.delivered_orders || 0;
  const rto_orders = row.rto_orders || 0;
  const selling_price = row.selling_price || 0;
  const delivery_cost_per_order = row.delivery_cost_per_order || 0;
  const npr_amount = row.npr_amount || 0;
  const target_orders = row.target_orders || 0;

  const delivered = confirmed_orders - rto_orders;
  const rto_percentage_actual = confirmed_orders > 0 
    ? (rto_orders / confirmed_orders) * 100 
    : 0;
  
  const total_revenue = delivered * selling_price;
  const total_expense_without_ads = delivered * delivery_cost_per_order;
  const total_expense_with_ads = total_expense_without_ads + npr_amount;
  
  const cost_per_order_without_ads = delivered > 0 
    ? total_expense_without_ads / delivered 
    : 0;
  const cost_per_order_with_ads = delivered > 0 
    ? total_expense_with_ads / delivered 
    : 0;
  
  const per_product_margin_no_ads = selling_price - delivery_cost_per_order;
  const per_product_margin_with_ads = selling_price - 
    (delivery_cost_per_order + (npr_amount / Math.max(delivered, 1)));
  
  const roi_multiple = npr_amount > 0 
    ? total_revenue / npr_amount 
    : 0;
  
  const profit_loss = total_revenue - total_expense_with_ads;
  
  const achievement_percentage = target_orders > 0 
    ? (delivered / target_orders) * 100 
    : 0;

  return {
    ...row,
    rto_percentage_actual,
    estimated_delivered_orders: delivered,
    total_revenue,
    total_expense_without_ads,
    total_expense_with_ads,
    cost_per_order_without_ads,
    cost_per_order_with_ads,
    per_product_margin_no_ads,
    per_product_margin_with_ads,
    roi_multiple,
    profit_loss,
    achievement_percentage,
  };
};

export const useAdsSpend = (filters?: {
  dateFrom?: string;
  dateTo?: string;
  product_id?: string;
  platform?: string;
}) => {
  return useQuery({
    queryKey: ["ads-spend", filters],
    queryFn: async () => {
      let query = supabase
        .from("ads_spend")
        .select("*, products(name)")
        .order("date", { ascending: false });

      if (filters?.dateFrom) {
        query = query.gte("date", filters.dateFrom);
      }
      if (filters?.dateTo) {
        query = query.lte("date", filters.dateTo);
      }
      if (filters?.product_id && filters.product_id !== "All") {
        query = query.eq("product_id", filters.product_id);
      }
      if (filters?.platform && filters.platform !== "All") {
        query = query.eq("platform", filters.platform);
      }

      const { data, error } = await query;
      if (error) throw error;
      
      return (data as any[]).map(row => calculateMetrics(row as AdsSpend));
    },
  });
};

export const useCreateAdsSpend = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (input: AdsSpendInsert) => {
      // Calculate NPR amount
      const usd_amount = input.usd_amount || 0;
      const usd_to_npr_rate = input.usd_to_npr_rate || 133.5;
      const npr_amount = usd_amount > 0
        ? usd_amount * usd_to_npr_rate
        : input.npr_amount || 0;

      const { data, error } = await supabase
        .from("ads_spend")
        .insert({
          ...input,
          npr_amount,
        })
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["ads-spend"] });
      toast.success("Ad spend record created");
    },
    onError: (error: Error) => {
      toast.error("Failed to create record: " + error.message);
    },
  });
};

export const useUpdateAdsSpend = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...input }: AdsSpendUpdate & { id: string }) => {
      // Recalculate NPR amount if USD amount or rate changed
      const usd_amount = input.usd_amount || 0;
      const usd_to_npr_rate = input.usd_to_npr_rate || 133.5;
      const npr_amount = usd_amount > 0
        ? usd_amount * usd_to_npr_rate
        : input.npr_amount;

      const { data, error } = await supabase
        .from("ads_spend")
        .update({
          ...input,
          npr_amount,
        })
        .eq("id", id)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["ads-spend"] });
      toast.success("Ad spend record updated");
    },
    onError: (error: Error) => {
      toast.error("Failed to update record: " + error.message);
    },
  });
};

export const useDeleteAdsSpend = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("ads_spend").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["ads-spend"] });
      toast.success("Ad spend record deleted");
    },
    onError: (error: Error) => {
      toast.error("Failed to delete record: " + error.message);
    },
  });
};
