import { useForm } from "react-hook-form";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useCreateCampaign, useUpdateCampaign, Campaign, CampaignInput } from "@/hooks/useCampaigns";

const OBJECTIVES = ["Sales", "Awareness", "Launch", "Festival Offer", "Retargeting", "Brand Building", "Other"];
const STATUSES = ["Planning", "Running", "Paused", "Completed", "Cancelled"];

interface CampaignFormProps {
  campaign?: Campaign | null;
  onClose: () => void;
}

export default function CampaignForm({ campaign, onClose }: CampaignFormProps) {
  const createCampaign = useCreateCampaign();
  const updateCampaign = useUpdateCampaign();
  
  const { register, handleSubmit, setValue, watch, formState: { errors } } = useForm<CampaignInput>({
    defaultValues: campaign ? {
      name: campaign.name,
      objective: campaign.objective || "",
      start_date: campaign.start_date || "",
      end_date: campaign.end_date || "",
      target_orders: campaign.target_orders || 0,
      target_revenue_npr: campaign.target_revenue_npr || 0,
      total_budget_npr: campaign.total_budget_npr || 0,
      ads_budget_npr: campaign.ads_budget_npr || 0,
      influencer_budget_npr: campaign.influencer_budget_npr || 0,
      production_budget_npr: campaign.production_budget_npr || 0,
      primary_product: campaign.primary_product || "",
      status: campaign.status || "Planning",
      owner: campaign.owner || "",
      notes: campaign.notes || "",
    } : {
      status: "Planning",
    },
  });

  const onSubmit = async (data: CampaignInput) => {
    try {
      if (campaign) {
        await updateCampaign.mutateAsync({ id: campaign.id, ...data });
      } else {
        await createCampaign.mutateAsync(data);
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
          <Label htmlFor="name">Campaign Name *</Label>
          <Input id="name" {...register("name", { required: "Name is required" })} />
          {errors.name && <p className="text-sm text-destructive">{errors.name.message}</p>}
        </div>

        <div className="space-y-2">
          <Label>Objective</Label>
          <Select value={watch("objective") || ""} onValueChange={(v) => setValue("objective", v)}>
            <SelectTrigger>
              <SelectValue placeholder="Select objective" />
            </SelectTrigger>
            <SelectContent>
              {OBJECTIVES.map((o) => (
                <SelectItem key={o} value={o}>{o}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label htmlFor="primary_product">Primary Product</Label>
          <Input id="primary_product" {...register("primary_product")} />
        </div>

        <div className="space-y-2">
          <Label htmlFor="start_date">Start Date</Label>
          <Input id="start_date" type="date" {...register("start_date")} />
        </div>

        <div className="space-y-2">
          <Label htmlFor="end_date">End Date</Label>
          <Input id="end_date" type="date" {...register("end_date")} />
        </div>

        <div className="space-y-2">
          <Label htmlFor="target_orders">Target Orders</Label>
          <Input id="target_orders" type="number" {...register("target_orders", { valueAsNumber: true })} />
        </div>

        <div className="space-y-2">
          <Label htmlFor="target_revenue_npr">Target Revenue (NPR)</Label>
          <Input id="target_revenue_npr" type="number" {...register("target_revenue_npr", { valueAsNumber: true })} />
        </div>

        <div className="space-y-2">
          <Label htmlFor="total_budget_npr">Total Budget (NPR)</Label>
          <Input id="total_budget_npr" type="number" {...register("total_budget_npr", { valueAsNumber: true })} />
        </div>

        <div className="space-y-2">
          <Label htmlFor="ads_budget_npr">Ads Budget (NPR)</Label>
          <Input id="ads_budget_npr" type="number" {...register("ads_budget_npr", { valueAsNumber: true })} />
        </div>

        <div className="space-y-2">
          <Label htmlFor="influencer_budget_npr">Influencer Budget (NPR)</Label>
          <Input id="influencer_budget_npr" type="number" {...register("influencer_budget_npr", { valueAsNumber: true })} />
        </div>

        <div className="space-y-2">
          <Label htmlFor="production_budget_npr">Production Budget (NPR)</Label>
          <Input id="production_budget_npr" type="number" {...register("production_budget_npr", { valueAsNumber: true })} />
        </div>

        <div className="space-y-2">
          <Label>Status</Label>
          <Select value={watch("status") || "Planning"} onValueChange={(v) => setValue("status", v)}>
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
          <Label htmlFor="notes">Notes</Label>
          <Textarea id="notes" {...register("notes")} rows={3} />
        </div>
      </div>

      <div className="flex justify-end gap-4 pt-4 border-t">
        <Button type="button" variant="outline" onClick={onClose}>
          Cancel
        </Button>
        <Button type="submit" disabled={createCampaign.isPending || updateCampaign.isPending}>
          {campaign ? "Save Changes" : "Create Campaign"}
        </Button>
      </div>
    </form>
  );
}
