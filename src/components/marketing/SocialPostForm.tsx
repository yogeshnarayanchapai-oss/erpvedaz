import { useForm } from "react-hook-form";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useCreateSocialPost, useUpdateSocialPost, SocialPost, SocialPostInput } from "@/hooks/useSocialPosts";
import { useCampaigns } from "@/hooks/useCampaigns";
import { useVideoProjects } from "@/hooks/useVideoProjects";
import { format } from "date-fns";

const PLATFORMS = ["TikTok", "Instagram", "Facebook", "YouTube", "Other"];
const POST_TYPES = ["Reel", "Story", "Feed Post", "Short", "Community", "Ad Creative"];
const STATUSES = ["Idea", "To Script", "In Production", "Scheduled", "Posted", "Cancelled"];

interface SocialPostFormProps {
  post?: SocialPost | null;
  defaultDate?: Date | null;
  onClose: () => void;
}

export default function SocialPostForm({ post, defaultDate, onClose }: SocialPostFormProps) {
  const createPost = useCreateSocialPost();
  const updatePost = useUpdateSocialPost();
  const { data: campaigns } = useCampaigns();
  const { data: videoProjects } = useVideoProjects();
  
  const { register, handleSubmit, setValue, watch, formState: { errors } } = useForm<SocialPostInput>({
    defaultValues: post ? {
      platform: post.platform,
      post_type: post.post_type || "Reel",
      title: post.title || "",
      product: post.product || "",
      campaign_id: post.campaign_id || "",
      video_project_id: post.video_project_id || "",
      scheduled_date: post.scheduled_date || "",
      scheduled_time: post.scheduled_time || "",
      status: post.status || "Idea",
      caption: post.caption || "",
      hashtags: post.hashtags || "",
      post_link: post.post_link || "",
      thumbnail_link: post.thumbnail_link || "",
      owner: post.owner || "",
    } : {
      platform: "TikTok",
      post_type: "Reel",
      status: "Idea",
      scheduled_date: defaultDate ? format(defaultDate, "yyyy-MM-dd") : "",
    },
  });

  const onSubmit = async (data: SocialPostInput) => {
    try {
      const submitData = {
        ...data,
        campaign_id: data.campaign_id || null,
        video_project_id: data.video_project_id || null,
      };
      if (post) {
        await updatePost.mutateAsync({ id: post.id, ...submitData });
      } else {
        await createPost.mutateAsync(submitData);
      }
      onClose();
    } catch (error) {
      // Error handled by hooks
    }
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label>Platform *</Label>
          <Select value={watch("platform")} onValueChange={(v) => setValue("platform", v)}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {PLATFORMS.map((p) => (
                <SelectItem key={p} value={p}>{p}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label>Post Type</Label>
          <Select value={watch("post_type") || "Reel"} onValueChange={(v) => setValue("post_type", v)}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {POST_TYPES.map((t) => (
                <SelectItem key={t} value={t}>{t}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="col-span-2 space-y-2">
          <Label htmlFor="title">Title</Label>
          <Input id="title" {...register("title")} />
        </div>

        <div className="space-y-2">
          <Label htmlFor="product">Product</Label>
          <Input id="product" {...register("product")} />
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
          <Label>Linked Video Project</Label>
          <Select value={watch("video_project_id") || "__none__"} onValueChange={(v) => setValue("video_project_id", v === "__none__" ? "" : v)}>
            <SelectTrigger>
              <SelectValue placeholder="Select video project" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="__none__">No Video Project</SelectItem>
              {videoProjects?.map((p: any) => (
                <SelectItem key={p.id} value={p.id}>{p.title}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label htmlFor="scheduled_date">Scheduled Date</Label>
          <Input id="scheduled_date" type="date" {...register("scheduled_date")} />
        </div>

        <div className="space-y-2">
          <Label htmlFor="scheduled_time">Scheduled Time</Label>
          <Input id="scheduled_time" type="time" {...register("scheduled_time")} />
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

        <div className="space-y-2">
          <Label htmlFor="owner">Owner</Label>
          <Input id="owner" {...register("owner")} />
        </div>

        <div className="col-span-2 space-y-2">
          <Label htmlFor="caption">Caption</Label>
          <Textarea id="caption" {...register("caption")} rows={3} />
        </div>

        <div className="col-span-2 space-y-2">
          <Label htmlFor="hashtags">Hashtags</Label>
          <Input id="hashtags" placeholder="#example #marketing" {...register("hashtags")} />
        </div>

        <div className="space-y-2">
          <Label htmlFor="post_link">Post Link</Label>
          <Input id="post_link" {...register("post_link")} />
        </div>

        <div className="space-y-2">
          <Label htmlFor="thumbnail_link">Thumbnail Link</Label>
          <Input id="thumbnail_link" {...register("thumbnail_link")} />
        </div>
      </div>

      <div className="flex justify-end gap-4 pt-4 border-t">
        <Button type="button" variant="outline" onClick={onClose}>
          Cancel
        </Button>
        <Button type="submit" disabled={createPost.isPending || updatePost.isPending}>
          {post ? "Save Changes" : "Schedule Post"}
        </Button>
      </div>
    </form>
  );
}
