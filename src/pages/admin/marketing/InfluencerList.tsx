import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Plus, Search, Phone, MessageCircle, Edit, Trash2, Users, UserCheck, CalendarClock, Video } from "lucide-react";
import { useInfluencers, useInfluencerStats, useDeleteInfluencer } from "@/hooks/useInfluencers";
import InfluencerForm from "@/components/marketing/InfluencerForm";

const PLATFORMS = ["All", "TikTok", "Instagram", "Facebook", "YouTube", "Other"];
const STATUSES = ["All", "New", "Interested", "In Discussion", "Confirmed", "Video Pending", "Video Delivered", "Not Interested", "Blocked"];
const PRIORITIES = ["All", "High", "Medium", "Low"];

const statusColors: Record<string, string> = {
  New: "bg-muted text-muted-foreground",
  Interested: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300",
  "In Discussion": "bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-300",
  Confirmed: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300",
  "Video Pending": "bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-300",
  "Video Delivered": "bg-emerald-100 text-emerald-800 dark:bg-emerald-900 dark:text-emerald-300",
  "Not Interested": "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300",
  Blocked: "bg-red-200 text-red-900 dark:bg-red-950 dark:text-red-300",
};

export default function InfluencerList() {
  const [search, setSearch] = useState("");
  const [platform, setPlatform] = useState("All");
  const [status, setStatus] = useState("All");
  const [priority, setPriority] = useState("All");
  const [todayFollowups, setTodayFollowups] = useState(false);
  const [thisWeekFollowups, setThisWeekFollowups] = useState(false);
  const [editingInfluencer, setEditingInfluencer] = useState<any>(null);
  const [isFormOpen, setIsFormOpen] = useState(false);

  const { data: influencers, isLoading } = useInfluencers({
    platform: platform !== "All" ? platform : undefined,
    status: status !== "All" ? status : undefined,
    priority: priority !== "All" ? priority : undefined,
    search: search || undefined,
    todayFollowups,
    thisWeekFollowups,
  });

  const { data: stats } = useInfluencerStats();
  const deleteInfluencer = useDeleteInfluencer();

  const handleOpenForm = (influencer?: any) => {
    setEditingInfluencer(influencer || null);
    setIsFormOpen(true);
  };

  const handleCloseForm = () => {
    setEditingInfluencer(null);
    setIsFormOpen(false);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Influencer List</h1>
          <p className="text-muted-foreground">
            Sabai influencer ko details ekai thau – belama call garna, video banwauna sajilo hos।
          </p>
        </div>
        <Dialog open={isFormOpen} onOpenChange={setIsFormOpen}>
          <DialogTrigger asChild>
            <Button onClick={() => handleOpenForm()}>
              <Plus className="mr-2 h-4 w-4" />
              Add Influencer
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>{editingInfluencer ? "Edit Influencer" : "Add New Influencer"}</DialogTitle>
            </DialogHeader>
            <InfluencerForm influencer={editingInfluencer} onClose={handleCloseForm} />
          </DialogContent>
        </Dialog>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Influencers</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.total || 0}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Influencers</CardTitle>
            <UserCheck className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.active || 0}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Today's Follow-ups</CardTitle>
            <CalendarClock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.todayFollowups || 0}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Confirmed for Video</CardTitle>
            <Video className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.confirmedOrPending || 0}</div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-wrap gap-4">
            <div className="flex-1 min-w-[200px]">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search by name, handle, phone, campaign..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
            <Select value={platform} onValueChange={setPlatform}>
              <SelectTrigger className="w-[140px]">
                <SelectValue placeholder="Platform" />
              </SelectTrigger>
              <SelectContent>
                {PLATFORMS.map((p) => (
                  <SelectItem key={p} value={p}>{p}</SelectItem>
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
            <Select value={priority} onValueChange={setPriority}>
              <SelectTrigger className="w-[130px]">
                <SelectValue placeholder="Priority" />
              </SelectTrigger>
              <SelectContent>
                {PRIORITIES.map((p) => (
                  <SelectItem key={p} value={p}>{p}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button
              variant={todayFollowups ? "default" : "outline"}
              onClick={() => {
                setTodayFollowups(!todayFollowups);
                setThisWeekFollowups(false);
              }}
            >
              Today Follow-ups
            </Button>
            <Button
              variant={thisWeekFollowups ? "default" : "outline"}
              onClick={() => {
                setThisWeekFollowups(!thisWeekFollowups);
                setTodayFollowups(false);
              }}
            >
              This Week
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Table */}
      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name & Handle</TableHead>
                <TableHead>Platform</TableHead>
                <TableHead>Followers</TableHead>
                <TableHead>Product / Campaign</TableHead>
                <TableHead>Phone & WhatsApp</TableHead>
                <TableHead>Best Call Time</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Next Follow-up</TableHead>
                <TableHead>Assigned To</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={10} className="text-center py-8">Loading...</TableCell>
                </TableRow>
              ) : influencers?.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={10} className="text-center py-8 text-muted-foreground">
                    No influencers found
                  </TableCell>
                </TableRow>
              ) : (
                influencers?.map((inf) => (
                  <TableRow key={inf.id} className="cursor-pointer hover:bg-muted/50" onClick={() => handleOpenForm(inf)}>
                    <TableCell>
                      <div className="font-medium">{inf.name}</div>
                      {inf.handle && <div className="text-sm text-muted-foreground">{inf.handle}</div>}
                    </TableCell>
                    <TableCell>{inf.platform}</TableCell>
                    <TableCell>{inf.followers_count?.toLocaleString() || "-"}</TableCell>
                    <TableCell>
                      <div>{inf.main_product || "-"}</div>
                      {inf.campaign_name && <div className="text-sm text-muted-foreground">{inf.campaign_name}</div>}
                    </TableCell>
                    <TableCell onClick={(e) => e.stopPropagation()}>
                      <div className="flex gap-2">
                        {inf.phone && (
                          <a href={`tel:${inf.phone}`} className="text-primary hover:underline">
                            <Phone className="h-4 w-4" />
                          </a>
                        )}
                        {inf.whatsapp_number && (
                          <a
                            href={`https://wa.me/${inf.whatsapp_number.replace(/\D/g, "")}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-green-600 hover:text-green-700"
                          >
                            <MessageCircle className="h-4 w-4" />
                          </a>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>{inf.best_call_time || "-"}</TableCell>
                    <TableCell>
                      <Badge className={statusColors[inf.status || "New"]}>{inf.status || "New"}</Badge>
                    </TableCell>
                    <TableCell>{inf.next_followup_date || "-"}</TableCell>
                    <TableCell>{inf.assigned_to || "-"}</TableCell>
                    <TableCell className="text-right" onClick={(e) => e.stopPropagation()}>
                      <div className="flex justify-end gap-2">
                        <Button variant="ghost" size="icon" onClick={() => handleOpenForm(inf)}>
                          <Edit className="h-4 w-4" />
                        </Button>
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button variant="ghost" size="icon">
                              <Trash2 className="h-4 w-4 text-destructive" />
                            </Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>Delete Influencer</AlertDialogTitle>
                              <AlertDialogDescription>
                                Are you sure you want to delete {inf.name}? This action cannot be undone.
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>Cancel</AlertDialogCancel>
                              <AlertDialogAction onClick={() => deleteInfluencer.mutate(inf.id)}>
                                Delete
                              </AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      </div>
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
