import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import type { Database } from "@/integrations/supabase/types";

type SocialPostChannel = Database["public"]["Tables"]["social_post_channels"]["Row"];
type SocialPostChannelInsert = Database["public"]["Tables"]["social_post_channels"]["Insert"];
type SocialPostChannelUpdate = Database["public"]["Tables"]["social_post_channels"]["Update"];

export type { SocialPostChannel };

export const useSocialPostChannels = (post_id?: string) => {
  return useQuery({
    queryKey: ["social-post-channels", post_id],
    queryFn: async () => {
      let query = supabase
        .from("social_post_channels")
        .select("*, social_channels(display_name, handle), social_posts(title)")
        .order("created_at", { ascending: false });

      if (post_id) {
        query = query.eq("post_id", post_id);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data;
    },
    enabled: !!post_id,
  });
};

export const useCreateSocialPostChannel = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (input: SocialPostChannelInsert) => {
      const { data, error } = await supabase
        .from("social_post_channels")
        .insert(input)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["social-post-channels"] });
      toast.success("Post scheduled to channel");
    },
    onError: (error: Error) => {
      toast.error("Failed to schedule: " + error.message);
    },
  });
};

export const useUpdateSocialPostChannel = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...input }: SocialPostChannelUpdate & { id: string }) => {
      const { data, error } = await supabase
        .from("social_post_channels")
        .update(input)
        .eq("id", id)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["social-post-channels"] });
      toast.success("Post channel updated");
    },
    onError: (error: Error) => {
      toast.error("Failed to update: " + error.message);
    },
  });
};
