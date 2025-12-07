import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export interface VideoProject {
  id: string;
  created_at: string;
  updated_at: string;
  title: string;
  project_type: string | null;
  main_product: string | null;
  campaign_id: string | null;
  platforms: string | null;
  status: string | null;
  script_ready: boolean | null;
  shoot_date: string | null;
  edit_deadline: string | null;
  publish_date: string | null;
  assigned_team: string | null;
  editor_name: string | null;
  script_link: string | null;
  raw_footage_link: string | null;
  final_video_link: string | null;
  reference_link: string | null;
  notes: string | null;
}

export type VideoProjectInput = Omit<VideoProject, "id" | "created_at" | "updated_at">;

export const useVideoProjects = (filters?: {
  status?: string;
  project_type?: string;
  campaign_id?: string;
}) => {
  return useQuery({
    queryKey: ["video-projects", filters],
    queryFn: async () => {
      let query = supabase
        .from("video_projects")
        .select("*, campaigns(name)")
        .order("created_at", { ascending: false });

      if (filters?.status && filters.status !== "All") {
        query = query.eq("status", filters.status);
      }
      if (filters?.project_type && filters.project_type !== "All") {
        query = query.eq("project_type", filters.project_type);
      }
      if (filters?.campaign_id && filters.campaign_id !== "All") {
        query = query.eq("campaign_id", filters.campaign_id);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data;
    },
  });
};

export const useCreateVideoProject = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (input: VideoProjectInput) => {
      const { data, error } = await supabase
        .from("video_projects")
        .insert(input)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["video-projects"] });
      toast.success("Video project created successfully");
    },
    onError: (error: Error) => {
      toast.error("Failed to create video project: " + error.message);
    },
  });
};

export const useUpdateVideoProject = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...input }: Partial<VideoProject> & { id: string }) => {
      const { data, error } = await supabase
        .from("video_projects")
        .update(input)
        .eq("id", id)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["video-projects"] });
      toast.success("Video project updated successfully");
    },
    onError: (error: Error) => {
      toast.error("Failed to update video project: " + error.message);
    },
  });
};

export const useDeleteVideoProject = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("video_projects").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["video-projects"] });
      toast.success("Video project deleted");
    },
    onError: (error: Error) => {
      toast.error("Failed to delete video project: " + error.message);
    },
  });
};
