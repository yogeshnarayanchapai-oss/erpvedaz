import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import type { Database } from "@/integrations/supabase/types";

type SocialChannel = Database["public"]["Tables"]["social_channels"]["Row"];
type SocialChannelInsert = Database["public"]["Tables"]["social_channels"]["Insert"];
type SocialChannelUpdate = Database["public"]["Tables"]["social_channels"]["Update"];

export type { SocialChannel };

export const useSocialChannels = (filters?: { platform?: string; is_active?: boolean }) => {
  return useQuery({
    queryKey: ["social-channels", filters],
    queryFn: async () => {
      let query = supabase
        .from("social_channels")
        .select("*")
        .order("created_at", { ascending: false });

      if (filters?.platform && filters.platform !== "All") {
        query = query.eq("platform", filters.platform as any);
      }
      if (filters?.is_active !== undefined) {
        query = query.eq("is_active", filters.is_active);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data as SocialChannel[];
    },
  });
};

export const useCreateSocialChannel = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (input: SocialChannelInsert) => {
      const { data: { user } } = await supabase.auth.getUser();
      const { data, error } = await supabase
        .from("social_channels")
        .insert({
          ...input,
          created_by_user_id: user?.id,
        })
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["social-channels"] });
      toast.success("Channel connected successfully");
    },
    onError: (error: Error) => {
      toast.error("Failed to connect channel: " + error.message);
    },
  });
};

export const useUpdateSocialChannel = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...input }: SocialChannelUpdate & { id: string }) => {
      const { data, error } = await supabase
        .from("social_channels")
        .update(input)
        .eq("id", id)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["social-channels"] });
      toast.success("Channel updated successfully");
    },
    onError: (error: Error) => {
      toast.error("Failed to update channel: " + error.message);
    },
  });
};

export const useDeleteSocialChannel = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("social_channels").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["social-channels"] });
      toast.success("Channel disconnected");
    },
    onError: (error: Error) => {
      toast.error("Failed to disconnect channel: " + error.message);
    },
  });
};
