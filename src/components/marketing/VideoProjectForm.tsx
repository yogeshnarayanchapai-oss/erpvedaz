import { useForm } from "react-hook-form";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { useCreateVideoProject, useUpdateVideoProject, VideoProject, VideoProjectInput } from "@/hooks/useVideoProjects";
import { useCampaigns } from "@/hooks/useCampaigns";

const PROJECT_TYPES = ["Ad", "Testimonial", "Product Review", "UGC", "Story", "Reel", "Longform", "Other"];
const STATUSES = ["Idea", "Script", "Shooting", "Editing", "Review", "Approved", "Scheduled", "Posted", "On Hold", "Cancelled"];

interface VideoProjectFormProps {
  project?: VideoProject | null;
  onClose: () => void;
}

export default function VideoProjectForm({ project, onClose }: VideoProjectFormProps) {
  const createProject = useCreateVideoProject();
  const updateProject = useUpdateVideoProject();
  const { data: campaigns } = useCampaigns();
  
  const { register, handleSubmit, setValue, watch, formState: { errors } } = useForm<VideoProjectInput>({
    defaultValues: project ? {
      title: project.title,
      project_type: project.project_type || "Ad",
      main_product: project.main_product || "",
      campaign_id: project.campaign_id || "",
      platforms: project.platforms || "",
      status: project.status || "Idea",
      script_ready: project.script_ready || false,
      shoot_date: project.shoot_date || "",
      edit_deadline: project.edit_deadline || "",
      publish_date: project.publish_date || "",
      assigned_team: project.assigned_team || "",
      editor_name: project.editor_name || "",
      script_link: project.script_link || "",
      raw_footage_link: project.raw_footage_link || "",
      final_video_link: project.final_video_link || "",
      reference_link: project.reference_link || "",
      notes: project.notes || "",
    } : {
      project_type: "Ad",
      status: "Idea",
      script_ready: false,
    },
  });

  const onSubmit = async (data: VideoProjectInput) => {
    try {
      const submitData = {
        ...data,
        campaign_id: data.campaign_id || null,
      };
      if (project) {
        await updateProject.mutateAsync({ id: project.id, ...submitData });
      } else {
        await createProject.mutateAsync(submitData);
      }
      onClose();
    } catch (error) {
      // Error handled by hooks
    }
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
      <div className="grid grid-cols-2 gap-4">
        <div className="col-span-2 space-y-2">
          <Label htmlFor="title">Title *</Label>
          <Input id="title" {...register("title", { required: "Title is required" })} />
          {errors.title && <p className="text-sm text-destructive">{errors.title.message}</p>}
        </div>

        <div className="space-y-2">
          <Label>Project Type</Label>
          <Select value={watch("project_type") || "Ad"} onValueChange={(v) => setValue("project_type", v)}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {PROJECT_TYPES.map((t) => (
                <SelectItem key={t} value={t}>{t}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label htmlFor="main_product">Main Product</Label>
          <Input id="main_product" {...register("main_product")} />
        </div>

        <div className="space-y-2">
          <Label>Campaign</Label>
          <Select value={watch("campaign_id") || "__none__"} onValueChange={(v) => setValue("campaign_id", v === "__none__" ? "" : v)}>
            <SelectTrigger>
              <SelectValue placeholder="Select campaign" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="__none__">No Campaign</SelectItem>
              {campaigns?.map((c) => (
                <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label htmlFor="platforms">Platforms</Label>
          <Input id="platforms" placeholder="TikTok, Instagram, Facebook" {...register("platforms")} />
        </div>

        <div className="space-y-2">
          <Label>Status</Label>
          <Select value={watch("status") || "Idea"} onValueChange={(v) => setValue("status", v)}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {STATUSES.map((s) => (
                <SelectItem key={s} value={s}>{s}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="flex items-center space-x-2 pt-6">
          <Checkbox
            id="script_ready"
            checked={watch("script_ready") || false}
            onCheckedChange={(checked) => setValue("script_ready", checked as boolean)}
          />
          <Label htmlFor="script_ready">Script Ready</Label>
        </div>

        <div className="space-y-2">
          <Label htmlFor="shoot_date">Shoot Date</Label>
          <Input id="shoot_date" type="date" {...register("shoot_date")} />
        </div>

        <div className="space-y-2">
          <Label htmlFor="edit_deadline">Edit Deadline</Label>
          <Input id="edit_deadline" type="date" {...register("edit_deadline")} />
        </div>

        <div className="space-y-2">
          <Label htmlFor="publish_date">Publish Date</Label>
          <Input id="publish_date" type="date" {...register("publish_date")} />
        </div>

        <div className="space-y-2">
          <Label htmlFor="assigned_team">Assigned Team</Label>
          <Input id="assigned_team" {...register("assigned_team")} />
        </div>

        <div className="space-y-2">
          <Label htmlFor="editor_name">Editor Name</Label>
          <Input id="editor_name" {...register("editor_name")} />
        </div>

        <div className="space-y-2">
          <Label htmlFor="script_link">Script Link</Label>
          <Input id="script_link" {...register("script_link")} />
        </div>

        <div className="space-y-2">
          <Label htmlFor="raw_footage_link">Raw Footage Link</Label>
          <Input id="raw_footage_link" {...register("raw_footage_link")} />
        </div>

        <div className="space-y-2">
          <Label htmlFor="final_video_link">Final Video Link</Label>
          <Input id="final_video_link" {...register("final_video_link")} />
        </div>

        <div className="space-y-2">
          <Label htmlFor="reference_link">Reference Link</Label>
          <Input id="reference_link" {...register("reference_link")} />
        </div>

        <div className="col-span-2 space-y-2">
          <Label htmlFor="notes">Notes</Label>
          <Textarea id="notes" {...register("notes")} rows={3} />
        </div>
      </div>

      <div className="flex justify-end gap-4 pt-4 border-t">
        <Button type="button" variant="outline" onClick={onClose}>
          Cancel
        </Button>
        <Button type="submit" disabled={createProject.isPending || updateProject.isPending}>
          {project ? "Save Changes" : "Create Project"}
        </Button>
      </div>
    </form>
  );
}
