import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useCurrentStoreId } from "@/hooks/useCurrentStoreId";

export interface Campaign {
  id: string;
  created_at: string;
  updated_at: string;
  name: string;
  objective: string | null;
  start_date: string | null;
  end_date: string | null;
  target_orders: number | null;
  target_revenue_npr: number | null;
  total_budget_npr: number | null;
  ads_budget_npr: number | null;
  influencer_budget_npr: number | null;
  production_budget_npr: number | null;
  primary_product: string | null;
  status: string | null;
  owner: string | null;
  notes: string | null;
  store_id: string | null;
}

export type CampaignInput = Omit<Campaign, "id" | "created_at" | "updated_at" | "store_id">;

export const useCampaigns = (filters?: { status?: string }) => {
  const storeId = useCurrentStoreId();

  return useQuery({
    queryKey: ["campaigns", filters, storeId],
    queryFn: async () => {
      let query = supabase
        .from("campaigns")
        .select("*")
        .order("created_at", { ascending: false });

      if (filters?.status && filters.status !== "All") {
        query = query.eq("status", filters.status);
      }

      if (storeId) {
        query = query.eq("store_id", storeId);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data as Campaign[];
    },
    enabled: !!storeId,
  });
};

export const useCampaignStats = () => {
  const storeId = useCurrentStoreId();

  return useQuery({
    queryKey: ["campaign-stats", storeId],
    queryFn: async () => {
      let query = supabase
        .from("campaigns")
        .select("id, status, total_budget_npr, target_orders");

      if (storeId) {
        query = query.eq("store_id", storeId);
      }

      const { data, error } = await query;
      if (error) throw error;

      const active = data?.filter(c => c.status === "Running") || [];
      const totalBudget = active.reduce((sum, c) => sum + (c.total_budget_npr || 0), 0);
      const totalTargetOrders = active.reduce((sum, c) => sum + (c.target_orders || 0), 0);

      return {
        activeCampaigns: active.length,
        totalBudget,
        totalTargetOrders,
        totalCampaigns: data?.length || 0,
      };
    },
    enabled: !!storeId,
  });
};

export const useCreateCampaign = () => {
  const queryClient = useQueryClient();
  const storeId = useCurrentStoreId();

  return useMutation({
    mutationFn: async (input: CampaignInput) => {
      const { data, error } = await supabase
        .from("campaigns")
        .insert({ ...input, store_id: storeId })
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["campaigns"] });
      queryClient.invalidateQueries({ queryKey: ["campaign-stats"] });
      toast.success("Campaign created successfully");
    },
    onError: (error: Error) => {
      toast.error("Failed to create campaign: " + error.message);
    },
  });
};

export const useUpdateCampaign = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...input }: Partial<Campaign> & { id: string }) => {
      const { data, error } = await supabase
        .from("campaigns")
        .update(input)
        .eq("id", id)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["campaigns"] });
      queryClient.invalidateQueries({ queryKey: ["campaign-stats"] });
      toast.success("Campaign updated successfully");
    },
    onError: (error: Error) => {
      toast.error("Failed to update campaign: " + error.message);
    },
  });
};

export const useDeleteCampaign = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("campaigns").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["campaigns"] });
      queryClient.invalidateQueries({ queryKey: ["campaign-stats"] });
      toast.success("Campaign deleted");
    },
    onError: (error: Error) => {
      toast.error("Failed to delete campaign: " + error.message);
    },
  });
};
