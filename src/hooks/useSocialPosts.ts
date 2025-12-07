import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export interface SocialPost {
  id: string;
  created_at: string;
  updated_at: string;
  campaign_id: string | null;
  video_project_id: string | null;
  platform: string;
  post_type: string | null;
  title: string | null;
  product: string | null;
  scheduled_date: string | null;
  scheduled_time: string | null;
  status: string | null;
  caption: string | null;
  hashtags: string | null;
  post_link: string | null;
  thumbnail_link: string | null;
  owner: string | null;
}

export type SocialPostInput = Omit<SocialPost, "id" | "created_at" | "updated_at">;

export const useSocialPosts = (filters?: {
  platform?: string;
  status?: string;
  month?: string; // YYYY-MM format
}) => {
  return useQuery({
    queryKey: ["social-posts", filters],
    queryFn: async () => {
      let query = supabase
        .from("social_posts")
        .select("*, campaigns(name), video_projects(title)")
        .order("scheduled_date", { ascending: true });

      if (filters?.platform && filters.platform !== "All") {
        query = query.eq("platform", filters.platform);
      }
      if (filters?.status && filters.status !== "All") {
        query = query.eq("status", filters.status);
      }
      if (filters?.month) {
        const startDate = `${filters.month}-01`;
        const [year, month] = filters.month.split("-").map(Number);
        const endDate = new Date(year, month, 0).toISOString().split("T")[0];
        query = query.gte("scheduled_date", startDate).lte("scheduled_date", endDate);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data;
    },
  });
};

export const useCreateSocialPost = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (input: SocialPostInput) => {
      const { data, error } = await supabase
        .from("social_posts")
        .insert(input)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["social-posts"] });
      toast.success("Post scheduled successfully");
    },
    onError: (error: Error) => {
      toast.error("Failed to schedule post: " + error.message);
    },
  });
};

export const useUpdateSocialPost = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...input }: Partial<SocialPost> & { id: string }) => {
      const { data, error } = await supabase
        .from("social_posts")
        .update(input)
        .eq("id", id)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["social-posts"] });
      toast.success("Post updated successfully");
    },
    onError: (error: Error) => {
      toast.error("Failed to update post: " + error.message);
    },
  });
};

export const useDeleteSocialPost = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("social_posts").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["social-posts"] });
      toast.success("Post deleted");
    },
    onError: (error: Error) => {
      toast.error("Failed to delete post: " + error.message);
    },
  });
};
