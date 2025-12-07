import { useForm } from "react-hook-form";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useCreateInfluencer, useUpdateInfluencer, Influencer, InfluencerInput } from "@/hooks/useInfluencers";

const PLATFORMS = ["TikTok", "Instagram", "Facebook", "YouTube", "Other"];
const CATEGORIES = ["Beauty", "Hair Care", "Health", "Fitness", "Lifestyle", "Fashion", "Food", "Tech", "Other"];
const CALL_TIMES = ["Morning", "Afternoon", "Evening", "Anytime"];
const COLLAB_TYPES = ["Paid", "Barter", "Affiliate", "Gift Review"];
const STATUSES = ["New", "Interested", "In Discussion", "Confirmed", "Video Pending", "Video Delivered", "Not Interested", "Blocked"];
const PRIORITIES = ["High", "Medium", "Low"];

interface InfluencerFormProps {
  influencer?: Influencer | null;
  onClose: () => void;
}

export default function InfluencerForm({ influencer, onClose }: InfluencerFormProps) {
  const createInfluencer = useCreateInfluencer();
  const updateInfluencer = useUpdateInfluencer();
  
  const { register, handleSubmit, setValue, watch, formState: { errors } } = useForm<InfluencerInput>({
    defaultValues: influencer ? {
      name: influencer.name,
      handle: influencer.handle || "",
      platform: influencer.platform,
      category: influencer.category || "",
      followers_count: influencer.followers_count || 0,
      contact_person: influencer.contact_person || "",
      phone: influencer.phone,
      alternate_phone: influencer.alternate_phone || "",
      whatsapp_number: influencer.whatsapp_number || "",
      email: influencer.email || "",
      city: influencer.city || "",
      region: influencer.region || "",
      best_call_time: influencer.best_call_time || "Anytime",
      collaboration_type: influencer.collaboration_type || "Paid",
      main_product: influencer.main_product || "",
      campaign_name: influencer.campaign_name || "",
      per_video_charge_npr: influencer.per_video_charge_npr || 0,
      per_story_charge_npr: influencer.per_story_charge_npr || 0,
      currency: influencer.currency || "NPR",
      status: influencer.status || "New",
      priority: influencer.priority || "Medium",
      last_contacted_date: influencer.last_contacted_date || "",
      next_followup_date: influencer.next_followup_date || "",
      assigned_to: influencer.assigned_to || "",
      notes: influencer.notes || "",
      tiktok_url: influencer.tiktok_url || "",
      instagram_url: influencer.instagram_url || "",
      youtube_url: influencer.youtube_url || "",
      facebook_url: influencer.facebook_url || "",
    } : {
      platform: "TikTok",
      best_call_time: "Anytime",
      collaboration_type: "Paid",
      currency: "NPR",
      status: "New",
      priority: "Medium",
    },
  });

  const onSubmit = async (data: InfluencerInput) => {
    try {
      if (influencer) {
        await updateInfluencer.mutateAsync({ id: influencer.id, ...data });
      } else {
        await createInfluencer.mutateAsync(data);
      }
      onClose();
    } catch (error) {
      // Error handled by hooks
    }
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
      {/* Section 1 - Basic Info */}
      <div className="space-y-4">
        <h3 className="font-semibold text-lg border-b pb-2">Basic Info</h3>
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="name">Name *</Label>
            <Input id="name" {...register("name", { required: "Name is required" })} />
            {errors.name && <p className="text-sm text-destructive">{errors.name.message}</p>}
          </div>
          <div className="space-y-2">
            <Label htmlFor="handle">Handle</Label>
            <Input id="handle" placeholder="@username" {...register("handle")} />
          </div>
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
            <Label>Category</Label>
            <Select value={watch("category") || ""} onValueChange={(v) => setValue("category", v)}>
              <SelectTrigger>
                <SelectValue placeholder="Select category" />
              </SelectTrigger>
              <SelectContent>
                {CATEGORIES.map((c) => (
                  <SelectItem key={c} value={c}>{c}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="followers_count">Followers Count</Label>
            <Input id="followers_count" type="number" {...register("followers_count", { valueAsNumber: true })} />
          </div>
        </div>
      </div>

      {/* Section 2 - Contact & Call */}
      <div className="space-y-4">
        <h3 className="font-semibold text-lg border-b pb-2">Contact & Call</h3>
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="contact_person">Contact Person</Label>
            <Input id="contact_person" {...register("contact_person")} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="phone">Phone *</Label>
            <Input id="phone" {...register("phone", { required: "Phone is required" })} />
            {errors.phone && <p className="text-sm text-destructive">{errors.phone.message}</p>}
          </div>
          <div className="space-y-2">
            <Label htmlFor="alternate_phone">Alternate Phone</Label>
            <Input id="alternate_phone" {...register("alternate_phone")} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="whatsapp_number">WhatsApp Number</Label>
            <Input id="whatsapp_number" {...register("whatsapp_number")} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input id="email" type="email" {...register("email")} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="city">City</Label>
            <Input id="city" {...register("city")} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="region">Region</Label>
            <Input id="region" {...register("region")} />
          </div>
          <div className="space-y-2">
            <Label>Best Call Time</Label>
            <Select value={watch("best_call_time") || "Anytime"} onValueChange={(v) => setValue("best_call_time", v)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {CALL_TIMES.map((t) => (
                  <SelectItem key={t} value={t}>{t}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
      </div>

      {/* Section 3 - Collaboration */}
      <div className="space-y-4">
        <h3 className="font-semibold text-lg border-b pb-2">Collaboration</h3>
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label>Collaboration Type</Label>
            <Select value={watch("collaboration_type") || "Paid"} onValueChange={(v) => setValue("collaboration_type", v)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {COLLAB_TYPES.map((t) => (
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
            <Label htmlFor="campaign_name">Campaign Name</Label>
            <Input id="campaign_name" {...register("campaign_name")} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="per_video_charge_npr">Per Video Charge (NPR)</Label>
            <Input id="per_video_charge_npr" type="number" {...register("per_video_charge_npr", { valueAsNumber: true })} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="per_story_charge_npr">Per Story Charge (NPR)</Label>
            <Input id="per_story_charge_npr" type="number" {...register("per_story_charge_npr", { valueAsNumber: true })} />
          </div>
        </div>
      </div>

      {/* Section 4 - Status & Follow-up */}
      <div className="space-y-4">
        <h3 className="font-semibold text-lg border-b pb-2">Status & Follow-up</h3>
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label>Status</Label>
            <Select value={watch("status") || "New"} onValueChange={(v) => setValue("status", v)}>
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
            <Label>Priority</Label>
            <Select value={watch("priority") || "Medium"} onValueChange={(v) => setValue("priority", v)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {PRIORITIES.map((p) => (
                  <SelectItem key={p} value={p}>{p}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="last_contacted_date">Last Contacted Date</Label>
            <Input id="last_contacted_date" type="date" {...register("last_contacted_date")} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="next_followup_date">Next Follow-up Date</Label>
            <Input id="next_followup_date" type="date" {...register("next_followup_date")} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="assigned_to">Assigned To</Label>
            <Input id="assigned_to" {...register("assigned_to")} />
          </div>
          <div className="col-span-2 space-y-2">
            <Label htmlFor="notes">Notes</Label>
            <Textarea id="notes" {...register("notes")} rows={3} />
          </div>
        </div>
      </div>

      {/* Section 5 - Social Links */}
      <div className="space-y-4">
        <h3 className="font-semibold text-lg border-b pb-2">Social Links</h3>
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="tiktok_url">TikTok URL</Label>
            <Input id="tiktok_url" {...register("tiktok_url")} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="instagram_url">Instagram URL</Label>
            <Input id="instagram_url" {...register("instagram_url")} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="youtube_url">YouTube URL</Label>
            <Input id="youtube_url" {...register("youtube_url")} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="facebook_url">Facebook URL</Label>
            <Input id="facebook_url" {...register("facebook_url")} />
          </div>
        </div>
      </div>

      <div className="flex justify-end gap-4 pt-4 border-t">
        <Button type="button" variant="outline" onClick={onClose}>
          Cancel
        </Button>
        <Button type="submit" disabled={createInfluencer.isPending || updateInfluencer.isPending}>
          {influencer ? "Save Changes" : "Add Influencer"}
        </Button>
      </div>
    </form>
  );
}
