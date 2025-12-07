import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Plus, Target, DollarSign, Megaphone, Edit } from "lucide-react";
import { useCampaigns, useCampaignStats } from "@/hooks/useCampaigns";
import CampaignForm from "@/components/marketing/CampaignForm";
import { format } from "date-fns";

const STATUSES = ["All", "Planning", "Running", "Paused", "Completed", "Cancelled"];

const statusColors: Record<string, string> = {
  Planning: "bg-muted text-muted-foreground",
  Running: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300",
  Paused: "bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-300",
  Completed: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300",
  Cancelled: "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300",
};

export default function Campaigns() {
  const [status, setStatus] = useState("All");
  const [editingCampaign, setEditingCampaign] = useState<any>(null);
  const [isFormOpen, setIsFormOpen] = useState(false);

  const { data: campaigns, isLoading } = useCampaigns({
    status: status !== "All" ? status : undefined,
  });
  const { data: stats } = useCampaignStats();

  const handleOpenForm = (campaign?: any) => {
    setEditingCampaign(campaign || null);
    setIsFormOpen(true);
  };

  const handleCloseForm = () => {
    setEditingCampaign(null);
    setIsFormOpen(false);
  };

  const formatCurrency = (amount: number | null) => {
    if (!amount) return "-";
    return `NPR ${amount.toLocaleString()}`;
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Campaigns</h1>
          <p className="text-muted-foreground">Manage your marketing campaigns</p>
        </div>
        <Dialog open={isFormOpen} onOpenChange={setIsFormOpen}>
          <DialogTrigger asChild>
            <Button onClick={() => handleOpenForm()}>
              <Plus className="mr-2 h-4 w-4" />
              New Campaign
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>{editingCampaign ? "Edit Campaign" : "Create New Campaign"}</DialogTitle>
            </DialogHeader>
            <CampaignForm campaign={editingCampaign} onClose={handleCloseForm} />
          </DialogContent>
        </Dialog>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Campaigns</CardTitle>
            <Megaphone className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.totalCampaigns || 0}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Campaigns</CardTitle>
            <Megaphone className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.activeCampaigns || 0}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Budget (Active)</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(stats?.totalBudget || 0)}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Target Orders (Active)</CardTitle>
            <Target className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.totalTargetOrders || 0}</div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex gap-4">
            <Select value={status} onValueChange={setStatus}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                {STATUSES.map((s) => (
                  <SelectItem key={s} value={s}>{s}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Table */}
      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Objective</TableHead>
                <TableHead>Primary Product</TableHead>
                <TableHead>Duration</TableHead>
                <TableHead>Total Budget</TableHead>
                <TableHead>Target Orders</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Owner</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={9} className="text-center py-8">Loading...</TableCell>
                </TableRow>
              ) : campaigns?.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={9} className="text-center py-8 text-muted-foreground">
                    No campaigns found
                  </TableCell>
                </TableRow>
              ) : (
                campaigns?.map((campaign) => (
                  <TableRow key={campaign.id} className="cursor-pointer hover:bg-muted/50" onClick={() => handleOpenForm(campaign)}>
                    <TableCell className="font-medium">{campaign.name}</TableCell>
                    <TableCell>{campaign.objective || "-"}</TableCell>
                    <TableCell>{campaign.primary_product || "-"}</TableCell>
                    <TableCell>
                      {campaign.start_date && campaign.end_date
                        ? `${format(new Date(campaign.start_date), "MMM d")} - ${format(new Date(campaign.end_date), "MMM d, yyyy")}`
                        : "-"}
                    </TableCell>
                    <TableCell>{formatCurrency(campaign.total_budget_npr)}</TableCell>
                    <TableCell>{campaign.target_orders || "-"}</TableCell>
                    <TableCell>
                      <Badge className={statusColors[campaign.status || "Planning"]}>
                        {campaign.status || "Planning"}
                      </Badge>
                    </TableCell>
                    <TableCell>{campaign.owner || "-"}</TableCell>
                    <TableCell className="text-right" onClick={(e) => e.stopPropagation()}>
                      <Button variant="ghost" size="icon" onClick={() => handleOpenForm(campaign)}>
                        <Edit className="h-4 w-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
