import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Plus, ChevronLeft, ChevronRight, Edit, Calendar, List } from "lucide-react";
import { useSocialPosts } from "@/hooks/useSocialPosts";
import SocialPostForm from "@/components/marketing/SocialPostForm";
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameDay, addMonths, subMonths } from "date-fns";

const PLATFORMS = ["All", "TikTok", "Instagram", "Facebook", "YouTube", "Other"];
const STATUSES = ["All", "Idea", "To Script", "In Production", "Scheduled", "Posted", "Cancelled"];

const statusColors: Record<string, string> = {
  Idea: "bg-muted text-muted-foreground",
  "To Script": "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300",
  "In Production": "bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-300",
  Scheduled: "bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-300",
  Posted: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300",
  Cancelled: "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300",
};

const platformColors: Record<string, string> = {
  TikTok: "bg-pink-500",
  Instagram: "bg-purple-500",
  Facebook: "bg-blue-600",
  YouTube: "bg-red-600",
  Other: "bg-gray-500",
};

export default function ContentCalendar() {
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [platform, setPlatform] = useState("All");
  const [status, setStatus] = useState("All");
  const [view, setView] = useState<"calendar" | "list">("calendar");
  const [editingPost, setEditingPost] = useState<any>(null);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);

  const monthStr = format(currentMonth, "yyyy-MM");
  const { data: posts, isLoading } = useSocialPosts({
    platform: platform !== "All" ? platform : undefined,
    status: status !== "All" ? status : undefined,
    month: monthStr,
  });

  const daysInMonth = eachDayOfInterval({
    start: startOfMonth(currentMonth),
    end: endOfMonth(currentMonth),
  });

  const handleOpenForm = (post?: any, date?: Date) => {
    setEditingPost(post || null);
    setSelectedDate(date || null);
    setIsFormOpen(true);
  };

  const handleCloseForm = () => {
    setEditingPost(null);
    setSelectedDate(null);
    setIsFormOpen(false);
  };

  const getPostsForDay = (day: Date) => {
    return posts?.filter((post: any) => 
      post.scheduled_date && isSameDay(new Date(post.scheduled_date), day)
    ) || [];
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Content Calendar</h1>
          <p className="text-muted-foreground">Plan and schedule your social media content</p>
        </div>
        <Dialog open={isFormOpen} onOpenChange={setIsFormOpen}>
          <DialogTrigger asChild>
            <Button onClick={() => handleOpenForm()}>
              <Plus className="mr-2 h-4 w-4" />
              Add Post
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>{editingPost ? "Edit Post" : "Schedule New Post"}</DialogTitle>
            </DialogHeader>
            <SocialPostForm post={editingPost} defaultDate={selectedDate} onClose={handleCloseForm} />
          </DialogContent>
        </Dialog>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-wrap items-center gap-4">
            <div className="flex items-center gap-2">
              <Button variant="outline" size="icon" onClick={() => setCurrentMonth(subMonths(currentMonth, 1))}>
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <span className="font-semibold min-w-[140px] text-center">
                {format(currentMonth, "MMMM yyyy")}
              </span>
              <Button variant="outline" size="icon" onClick={() => setCurrentMonth(addMonths(currentMonth, 1))}>
                <ChevronRight className="h-4 w-4" />
              </Button>
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
            <div className="flex gap-1 ml-auto">
              <Button
                variant={view === "calendar" ? "default" : "outline"}
                size="icon"
                onClick={() => setView("calendar")}
              >
                <Calendar className="h-4 w-4" />
              </Button>
              <Button
                variant={view === "list" ? "default" : "outline"}
                size="icon"
                onClick={() => setView("list")}
              >
                <List className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {view === "calendar" ? (
        <Card>
          <CardContent className="p-4">
            <div className="grid grid-cols-7 gap-1">
              {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((day) => (
                <div key={day} className="text-center font-semibold py-2 text-muted-foreground">
                  {day}
                </div>
              ))}
              {Array.from({ length: startOfMonth(currentMonth).getDay() }).map((_, i) => (
                <div key={`empty-${i}`} className="min-h-[100px] bg-muted/30 rounded" />
              ))}
              {daysInMonth.map((day) => {
                const dayPosts = getPostsForDay(day);
                return (
                  <div
                    key={day.toISOString()}
                    className="min-h-[100px] border rounded p-1 hover:bg-muted/50 cursor-pointer"
                    onClick={() => handleOpenForm(undefined, day)}
                  >
                    <div className="font-semibold text-sm mb-1">{format(day, "d")}</div>
                    <div className="space-y-1">
                      {dayPosts.slice(0, 3).map((post: any) => (
                        <div
                          key={post.id}
                          className={`text-xs p-1 rounded text-white truncate ${platformColors[post.platform] || "bg-gray-500"}`}
                          onClick={(e) => {
                            e.stopPropagation();
                            handleOpenForm(post);
                          }}
                        >
                          {post.title || post.platform}
                        </div>
                      ))}
                      {dayPosts.length > 3 && (
                        <div className="text-xs text-muted-foreground">+{dayPosts.length - 3} more</div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date & Time</TableHead>
                  <TableHead>Platform</TableHead>
                  <TableHead>Title</TableHead>
                  <TableHead>Product</TableHead>
                  <TableHead>Campaign</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Owner</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  <TableRow>
                    <TableCell colSpan={8} className="text-center py-8">Loading...</TableCell>
                  </TableRow>
                ) : posts?.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={8} className="text-center py-8 text-muted-foreground">
                      No posts scheduled
                    </TableCell>
                  </TableRow>
                ) : (
                  posts?.map((post: any) => (
                    <TableRow key={post.id} className="cursor-pointer hover:bg-muted/50" onClick={() => handleOpenForm(post)}>
                      <TableCell>
                        {post.scheduled_date ? format(new Date(post.scheduled_date), "MMM d, yyyy") : "-"}
                        {post.scheduled_time && <span className="text-muted-foreground ml-1">{post.scheduled_time}</span>}
                      </TableCell>
                      <TableCell>
                        <Badge className={`${platformColors[post.platform]} text-white`}>
                          {post.platform}
                        </Badge>
                      </TableCell>
                      <TableCell className="font-medium">{post.title || "-"}</TableCell>
                      <TableCell>{post.product || "-"}</TableCell>
                      <TableCell>{post.campaigns?.name || "-"}</TableCell>
                      <TableCell>
                        <Badge className={statusColors[post.status || "Idea"]}>
                          {post.status || "Idea"}
                        </Badge>
                      </TableCell>
                      <TableCell>{post.owner || "-"}</TableCell>
                      <TableCell className="text-right" onClick={(e) => e.stopPropagation()}>
                        <Button variant="ghost" size="icon" onClick={() => handleOpenForm(post)}>
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
      )}
    </div>
  );
}
