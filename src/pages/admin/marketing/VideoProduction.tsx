import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Plus, Edit, Video } from "lucide-react";
import { useVideoProjects, useUpdateVideoProject } from "@/hooks/useVideoProjects";
import { useCampaigns } from "@/hooks/useCampaigns";
import VideoProjectForm from "@/components/marketing/VideoProjectForm";
import { format } from "date-fns";

const PROJECT_TYPES = ["All", "Ad", "Testimonial", "Product Review", "UGC", "Story", "Reel", "Longform", "Other"];
const STATUSES = ["All", "Idea", "Script", "Shooting", "Editing", "Review", "Approved", "Scheduled", "Posted", "On Hold", "Cancelled"];

const statusColors: Record<string, string> = {
  Idea: "bg-muted text-muted-foreground",
  Script: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300",
  Shooting: "bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-300",
  Editing: "bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-300",
  Review: "bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-300",
  Approved: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300",
  Scheduled: "bg-cyan-100 text-cyan-800 dark:bg-cyan-900 dark:text-cyan-300",
  Posted: "bg-emerald-100 text-emerald-800 dark:bg-emerald-900 dark:text-emerald-300",
  "On Hold": "bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-300",
  Cancelled: "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300",
};

export default function VideoProduction() {
  const [projectType, setProjectType] = useState("All");
  const [status, setStatus] = useState("All");
  const [campaignId, setCampaignId] = useState("All");
  const [editingProject, setEditingProject] = useState<any>(null);
  const [isFormOpen, setIsFormOpen] = useState(false);

  const { data: projects, isLoading } = useVideoProjects({
    project_type: projectType !== "All" ? projectType : undefined,
    status: status !== "All" ? status : undefined,
    campaign_id: campaignId !== "All" ? campaignId : undefined,
  });
  const { data: campaigns } = useCampaigns();
  const updateProject = useUpdateVideoProject();

  const handleOpenForm = (project?: any) => {
    setEditingProject(project || null);
    setIsFormOpen(true);
  };

  const handleCloseForm = () => {
    setEditingProject(null);
    setIsFormOpen(false);
  };

  const handleQuickStatusChange = async (projectId: string, newStatus: string) => {
    await updateProject.mutateAsync({ id: projectId, status: newStatus });
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Video Production</h1>
          <p className="text-muted-foreground">
            Concept bata posting samma सबै video project यहाँ manage हुन्छ।
          </p>
        </div>
        <Dialog open={isFormOpen} onOpenChange={setIsFormOpen}>
          <DialogTrigger asChild>
            <Button onClick={() => handleOpenForm()}>
              <Plus className="mr-2 h-4 w-4" />
              New Video Project
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>{editingProject ? "Edit Video Project" : "Create Video Project"}</DialogTitle>
            </DialogHeader>
            <VideoProjectForm project={editingProject} onClose={handleCloseForm} />
          </DialogContent>
        </Dialog>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-wrap gap-4">
            <Select value={projectType} onValueChange={setProjectType}>
              <SelectTrigger className="w-[160px]">
                <SelectValue placeholder="Project Type" />
              </SelectTrigger>
              <SelectContent>
                {PROJECT_TYPES.map((t) => (
                  <SelectItem key={t} value={t}>{t}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={status} onValueChange={setStatus}>
              <SelectTrigger className="w-[160px]">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                {STATUSES.map((s) => (
                  <SelectItem key={s} value={s}>{s}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={campaignId} onValueChange={setCampaignId}>
              <SelectTrigger className="w-[200px]">
                <SelectValue placeholder="Campaign" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="All">All Campaigns</SelectItem>
                {campaigns?.map((c) => (
                  <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
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
                <TableHead>Title</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Product</TableHead>
                <TableHead>Campaign</TableHead>
                <TableHead>Platforms</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Shoot Date</TableHead>
                <TableHead>Publish Date</TableHead>
                <TableHead>Team / Editor</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={10} className="text-center py-8">Loading...</TableCell>
                </TableRow>
              ) : projects?.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={10} className="text-center py-8 text-muted-foreground">
                    No video projects found
                  </TableCell>
                </TableRow>
              ) : (
                projects?.map((project: any) => (
                  <TableRow key={project.id} className="cursor-pointer hover:bg-muted/50" onClick={() => handleOpenForm(project)}>
                    <TableCell className="font-medium">{project.title}</TableCell>
                    <TableCell>{project.project_type || "-"}</TableCell>
                    <TableCell>{project.main_product || "-"}</TableCell>
                    <TableCell>{project.campaigns?.name || "-"}</TableCell>
                    <TableCell>{project.platforms || "-"}</TableCell>
                    <TableCell onClick={(e) => e.stopPropagation()}>
                      <Select
                        value={project.status || "Idea"}
                        onValueChange={(v) => handleQuickStatusChange(project.id, v)}
                      >
                        <SelectTrigger className="w-[130px] h-8">
                          <Badge className={statusColors[project.status || "Idea"]}>
                            {project.status || "Idea"}
                          </Badge>
                        </SelectTrigger>
                        <SelectContent>
                          {STATUSES.filter(s => s !== "All").map((s) => (
                            <SelectItem key={s} value={s}>{s}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </TableCell>
                    <TableCell>
                      {project.shoot_date ? format(new Date(project.shoot_date), "MMM d, yyyy") : "-"}
                    </TableCell>
                    <TableCell>
                      {project.publish_date ? format(new Date(project.publish_date), "MMM d, yyyy") : "-"}
                    </TableCell>
                    <TableCell>
                      <div>{project.assigned_team || "-"}</div>
                      {project.editor_name && (
                        <div className="text-sm text-muted-foreground">{project.editor_name}</div>
                      )}
                    </TableCell>
                    <TableCell className="text-right" onClick={(e) => e.stopPropagation()}>
                      <Button variant="ghost" size="icon" onClick={() => handleOpenForm(project)}>
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
