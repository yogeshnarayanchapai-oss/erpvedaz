import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useCurrentStoreId } from "@/hooks/useCurrentStoreId";

export interface Influencer {
  id: string;
  created_at: string;
  updated_at: string;
  name: string;
  handle: string | null;
  platform: string;
  category: string | null;
  followers_count: number | null;
  contact_person: string | null;
  phone: string;
  alternate_phone: string | null;
  whatsapp_number: string | null;
  email: string | null;
  city: string | null;
  region: string | null;
  best_call_time: string | null;
  collaboration_type: string | null;
  main_product: string | null;
  campaign_name: string | null;
  per_video_charge_npr: number | null;
  per_story_charge_npr: number | null;
  currency: string | null;
  status: string | null;
  priority: string | null;
  last_contacted_date: string | null;
  next_followup_date: string | null;
  assigned_to: string | null;
  notes: string | null;
  tiktok_url: string | null;
  instagram_url: string | null;
  youtube_url: string | null;
  facebook_url: string | null;
  store_id: string | null;
}

export type InfluencerInput = Omit<Influencer, "id" | "created_at" | "updated_at" | "store_id">;

export const useInfluencers = (filters?: {
  platform?: string;
  status?: string;
  priority?: string;
  search?: string;
  todayFollowups?: boolean;
  thisWeekFollowups?: boolean;
}) => {
  const storeId = useCurrentStoreId();

  return useQuery({
    queryKey: ["influencers", filters, storeId],
    queryFn: async () => {
      let query = supabase
        .from("influencers")
        .select("*")
        .order("created_at", { ascending: false });

      if (storeId) {
        query = query.eq("store_id", storeId);
      }

      if (filters?.platform && filters.platform !== "All") {
        query = query.eq("platform", filters.platform);
      }
      if (filters?.status && filters.status !== "All") {
        query = query.eq("status", filters.status);
      }
      if (filters?.priority && filters.priority !== "All") {
        query = query.eq("priority", filters.priority);
      }
      if (filters?.search) {
        query = query.or(
          `name.ilike.%${filters.search}%,handle.ilike.%${filters.search}%,phone.ilike.%${filters.search}%,campaign_name.ilike.%${filters.search}%`
        );
      }
      if (filters?.todayFollowups) {
        const today = new Date().toISOString().split("T")[0];
        query = query
          .lte("next_followup_date", today)
          .not("status", "in", '("Not Interested","Blocked")');
      }
      if (filters?.thisWeekFollowups) {
        const today = new Date();
        const endOfWeek = new Date(today);
        endOfWeek.setDate(today.getDate() + (7 - today.getDay()));
        query = query
          .lte("next_followup_date", endOfWeek.toISOString().split("T")[0])
          .not("status", "in", '("Not Interested","Blocked")');
      }

      const { data, error } = await query;
      if (error) throw error;
      return data as Influencer[];
    },
    enabled: !!storeId,
  });
};

export const useInfluencerStats = () => {
  const storeId = useCurrentStoreId();

  return useQuery({
    queryKey: ["influencer-stats", storeId],
    queryFn: async () => {
      const today = new Date().toISOString().split("T")[0];
      
      let query = supabase
        .from("influencers")
        .select("id, status, next_followup_date");

      if (storeId) {
        query = query.eq("store_id", storeId);
      }

      const { data: all, error: allError } = await query;
      if (allError) throw allError;

      const total = all?.length || 0;
      const active = all?.filter(i => !["Not Interested", "Blocked"].includes(i.status || "")).length || 0;
      const todayFollowups = all?.filter(i => 
        i.next_followup_date && 
        i.next_followup_date <= today && 
        !["Not Interested", "Blocked"].includes(i.status || "")
      ).length || 0;
      const confirmedOrPending = all?.filter(i => 
        ["Confirmed", "Video Pending"].includes(i.status || "")
      ).length || 0;

      return { total, active, todayFollowups, confirmedOrPending };
    },
    enabled: !!storeId,
  });
};

export const useCreateInfluencer = () => {
  const queryClient = useQueryClient();
  const storeId = useCurrentStoreId();

  return useMutation({
    mutationFn: async (input: InfluencerInput) => {
      const { data, error } = await supabase
        .from("influencers")
        .insert({ ...input, store_id: storeId })
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["influencers"] });
      queryClient.invalidateQueries({ queryKey: ["influencer-stats"] });
      toast.success("Influencer added successfully");
    },
    onError: (error: Error) => {
      toast.error("Failed to add influencer: " + error.message);
    },
  });
};

export const useUpdateInfluencer = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...input }: Partial<Influencer> & { id: string }) => {
      const { data, error } = await supabase
        .from("influencers")
        .update(input)
        .eq("id", id)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["influencers"] });
      queryClient.invalidateQueries({ queryKey: ["influencer-stats"] });
      toast.success("Influencer updated successfully");
    },
    onError: (error: Error) => {
      toast.error("Failed to update influencer: " + error.message);
    },
  });
};

export const useDeleteInfluencer = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("influencers").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["influencers"] });
      queryClient.invalidateQueries({ queryKey: ["influencer-stats"] });
      toast.success("Influencer deleted");
    },
    onError: (error: Error) => {
      toast.error("Failed to delete influencer: " + error.message);
    },
  });
};
