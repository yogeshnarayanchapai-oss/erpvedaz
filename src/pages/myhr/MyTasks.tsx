import React, { useState, useMemo } from 'react';
import { format, startOfMonth, endOfMonth, subMonths } from 'date-fns';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import {
  useMyTasks,
  useMyTaskStats,
  useUpdateTaskStatus,
  useAddTaskAttachment,
  TaskStatus,
  Task,
} from '@/hooks/useTasks';
import { TaskStatusBadge } from '@/components/tasks/TaskStatusBadge';
import { TaskPriorityBadge } from '@/components/tasks/TaskPriorityBadge';
import { AddRemarkDialog } from '@/components/tasks/AddRemarkDialog';
import { TaskDetailSheet } from '@/components/tasks/TaskDetailSheet';
import {
  ClipboardList,
  Clock,
  Loader2,
  CheckCircle2,
  MessageSquare,
  Link2,
  Plus,
  X,
  Eye,
} from 'lucide-react';
import { toast } from 'sonner';

type DatePreset = 'this_month' | 'last_month' | 'custom';

function getDateRange(preset: DatePreset): { from: string; to: string } {
  const now = new Date();
  if (preset === 'this_month') {
    return { from: format(startOfMonth(now), 'yyyy-MM-dd'), to: format(endOfMonth(now), 'yyyy-MM-dd') };
  }
  if (preset === 'last_month') {
    const last = subMonths(now, 1);
    return { from: format(startOfMonth(last), 'yyyy-MM-dd'), to: format(endOfMonth(last), 'yyyy-MM-dd') };
  }
  return { from: '', to: '' };
}

export default function MyTasks() {
  const [remarkDialogOpen, setRemarkDialogOpen] = useState(false);
  const [selectedTaskId, setSelectedTaskId] = useState<string>('');
  const [addLinkTaskId, setAddLinkTaskId] = useState<string | null>(null);
  const [newLinkUrl, setNewLinkUrl] = useState('');
  const [newLinkName, setNewLinkName] = useState('');
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [detailSheetOpen, setDetailSheetOpen] = useState(false);
  const [activeTab, setActiveTab] = useState('active');
  const [datePreset, setDatePreset] = useState<DatePreset>('this_month');
  const defaultRange = getDateRange('this_month');
  const [customFrom, setCustomFrom] = useState('');
  const [customTo, setCustomTo] = useState('');
  const [dateFrom, setDateFrom] = useState(defaultRange.from);
  const [dateTo, setDateTo] = useState(defaultRange.to);

  const { data: tasks, isLoading } = useMyTasks(dateFrom, dateTo);
  const { data: stats } = useMyTaskStats(dateFrom, dateTo);
  const updateStatus = useUpdateTaskStatus();
  const addAttachment = useAddTaskAttachment();

  const handleDatePresetChange = (preset: DatePreset) => {
    setDatePreset(preset);
    if (preset !== 'custom') {
      const range = getDateRange(preset);
      setDateFrom(range.from);
      setDateTo(range.to);
    } else {
      setDateFrom(customFrom);
      setDateTo(customTo);
    }
  };

  const handleCustomDateApply = () => {
    setDateFrom(customFrom);
    setDateTo(customTo);
  };

  const activeTasks = useMemo(() => tasks?.filter(t => t.status !== 'COMPLETED') || [], [tasks]);
  const completedTasks = useMemo(() => tasks?.filter(t => t.status === 'COMPLETED') || [], [tasks]);
  const currentTasks = activeTab === 'active' ? activeTasks : completedTasks;

  const handleStatusChange = async (taskId: string, newStatus: TaskStatus) => {
    await updateStatus.mutateAsync({ taskId, newStatus });
  };

  const handleAddRemark = (taskId: string) => {
    setSelectedTaskId(taskId);
    setRemarkDialogOpen(true);
  };

  const handleViewTask = (task: Task) => {
    setSelectedTask(task);
    setDetailSheetOpen(true);
  };

  const handleAddLink = async (taskId: string) => {
    if (!newLinkUrl.trim()) {
      toast.error('Please enter a URL');
      return;
    }

    try {
      await addAttachment.mutateAsync({
        taskId,
        url: newLinkUrl.trim(),
        fileName: newLinkName.trim() || newLinkUrl.trim(),
      });
      setNewLinkUrl('');
      setNewLinkName('');
      setAddLinkTaskId(null);
      toast.success('Link added');
    } catch (error) {
      // Error handled by hook
    }
  };

  const getAvailableStatuses = (currentStatus: TaskStatus): TaskStatus[] => {
    switch (currentStatus) {
      case 'PENDING':
        return ['IN_PROGRESS'];
      case 'IN_PROGRESS':
        return ['COMPLETED'];
      case 'COMPLETED':
        return [];
      default:
        return [];
    }
  };

  const statCards = [
    { title: 'Total Tasks', value: stats?.total || 0, icon: ClipboardList, color: 'text-primary', bg: 'bg-primary/10' },
    { title: 'Pending', value: stats?.pending || 0, icon: Clock, color: 'text-amber-600', bg: 'bg-amber-500/10' },
    { title: 'In Progress', value: stats?.inProgress || 0, icon: Loader2, color: 'text-blue-600', bg: 'bg-blue-500/10' },
    { title: 'Completed', value: stats?.completed || 0, icon: CheckCircle2, color: 'text-emerald-600', bg: 'bg-emerald-500/10' },
  ];

  const renderTaskTable = (taskList: Task[]) => (
    <>
      {isLoading ? (
        <div className="flex items-center justify-center h-48">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      ) : taskList.length === 0 ? (
        <div className="flex flex-col items-center justify-center h-48 text-muted-foreground">
          <ClipboardList className="h-10 w-10 mb-2" />
          <p>No tasks</p>
        </div>
      ) : (
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Title</TableHead>
                <TableHead>Priority</TableHead>
                <TableHead className="hidden sm:table-cell">Due Date</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {taskList.map((task) => {
                const availableStatuses = getAvailableStatuses(task.status);
                const isCompleted = task.status === 'COMPLETED';

                return (
                  <React.Fragment key={task.id}>
                    <TableRow>
                      <TableCell>
                        <div>
                          <p className="font-medium max-w-[200px] truncate">{task.title}</p>
                          {task.description && (
                            <p className="text-xs text-muted-foreground truncate max-w-[200px]">{task.description}</p>
                          )}
                        </div>
                      </TableCell>
                      <TableCell><TaskPriorityBadge priority={task.priority} /></TableCell>
                      <TableCell className="hidden sm:table-cell">
                        {format(new Date(task.due_date), 'MMM dd, yyyy')}
                      </TableCell>
                      <TableCell>
                        {isCompleted ? (
                          <TaskStatusBadge status={task.status} />
                        ) : (
                          <Select value={task.status} onValueChange={(value) => handleStatusChange(task.id, value as TaskStatus)} disabled={updateStatus.isPending}>
                            <SelectTrigger className="w-[130px]">
                              <SelectValue><TaskStatusBadge status={task.status} /></SelectValue>
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value={task.status} disabled><TaskStatusBadge status={task.status} /></SelectItem>
                              {availableStatuses.map((status) => (
                                <SelectItem key={status} value={status}><TaskStatusBadge status={status} /></SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        )}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-1">
                          <Button variant="ghost" size="sm" onClick={() => handleViewTask(task)} title="View details">
                            <Eye className="h-4 w-4" />
                          </Button>
                          <Button variant="ghost" size="sm" onClick={() => {
                            if (addLinkTaskId === task.id) { setAddLinkTaskId(null); } else { setAddLinkTaskId(task.id); setNewLinkUrl(''); setNewLinkName(''); }
                          }} title="Add link">
                            <Link2 className="h-4 w-4" />
                          </Button>
                          <Button variant="ghost" size="sm" onClick={() => handleAddRemark(task.id)} title="Open ticket">
                            <MessageSquare className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                    {addLinkTaskId === task.id && (
                      <TableRow>
                        <TableCell colSpan={5}>
                          <div className="flex items-center gap-2 p-2 bg-muted/50 rounded-lg">
                            <Input placeholder="URL (e.g., https://...)" value={newLinkUrl} onChange={(e) => setNewLinkUrl(e.target.value)} className="flex-1" />
                            <Input placeholder="Name (optional)" value={newLinkName} onChange={(e) => setNewLinkName(e.target.value)} className="w-32 sm:w-40" />
                            <Button size="sm" onClick={() => handleAddLink(task.id)} disabled={addAttachment.isPending}><Plus className="h-4 w-4" /></Button>
                            <Button size="sm" variant="ghost" onClick={() => setAddLinkTaskId(null)}><X className="h-4 w-4" /></Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    )}
                  </React.Fragment>
                );
              })}
            </TableBody>
          </Table>
        </div>
      )}
    </>
  );

  return (
    <div className="space-y-4 sm:space-y-6 p-4 sm:p-6">
      {/* Header with Date Filter */}
      <div className="flex flex-wrap items-center gap-2">
        <h1 className="text-xl sm:text-2xl font-bold">My Tasks</h1>
        <div className="flex flex-wrap items-center gap-1.5 ml-2">
          <Button size="sm" variant={datePreset === 'this_month' ? 'default' : 'outline'} className="h-7 text-xs px-2" onClick={() => handleDatePresetChange('this_month')}>
            This Month
          </Button>
          <Button size="sm" variant={datePreset === 'last_month' ? 'default' : 'outline'} className="h-7 text-xs px-2" onClick={() => handleDatePresetChange('last_month')}>
            Last Month
          </Button>
          <Button size="sm" variant={datePreset === 'custom' ? 'default' : 'outline'} className="h-7 text-xs px-2" onClick={() => handleDatePresetChange('custom')}>
            Custom
          </Button>
          {datePreset === 'custom' && (
            <>
              <Input type="date" value={customFrom} onChange={(e) => setCustomFrom(e.target.value)} className="text-xs w-[120px] h-7" />
              <span className="text-muted-foreground text-xs">–</span>
              <Input type="date" value={customTo} onChange={(e) => setCustomTo(e.target.value)} className="text-xs w-[120px] h-7" />
              <Button size="sm" variant="secondary" className="h-7 text-xs px-2" onClick={handleCustomDateApply}>Apply</Button>
            </>
          )}
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        {statCards.map((stat) => (
          <Card key={stat.title}>
            <CardContent className="p-4 sm:p-6">
              <div className="flex items-center gap-3">
                <div className={`p-2 sm:p-3 rounded-lg ${stat.bg}`}>
                  <stat.icon className={`h-4 w-4 sm:h-5 sm:w-5 ${stat.color}`} />
                </div>
                <div>
                  <p className="text-xs sm:text-sm text-muted-foreground">{stat.title}</p>
                  <p className="text-lg sm:text-2xl font-bold">{stat.value}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Task Table with Tabs */}
      <Card>
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <div className="px-4 pt-4">
            <TabsList>
              <TabsTrigger value="active" className="gap-2">
                Active
                <Badge variant="secondary" className="ml-1 text-xs px-1.5 py-0">{activeTasks.length}</Badge>
              </TabsTrigger>
              <TabsTrigger value="completed" className="gap-2">
                Completed
                <Badge variant="secondary" className="ml-1 text-xs px-1.5 py-0">{completedTasks.length}</Badge>
              </TabsTrigger>
            </TabsList>
          </div>
          <TabsContent value="active" className="m-0">
            <CardContent className="p-0">{renderTaskTable(activeTasks)}</CardContent>
          </TabsContent>
          <TabsContent value="completed" className="m-0">
            <CardContent className="p-0">{renderTaskTable(completedTasks)}</CardContent>
          </TabsContent>
        </Tabs>
      </Card>

      <AddRemarkDialog
        taskId={selectedTaskId}
        open={remarkDialogOpen}
        onOpenChange={setRemarkDialogOpen}
        taskAssignedTo={tasks?.find(t => t.id === selectedTaskId)?.assigned_to_user_id}
        taskAssignedBy={tasks?.find(t => t.id === selectedTaskId)?.assigned_by_user_id}
      />
      <TaskDetailSheet task={selectedTask} open={detailSheetOpen} onOpenChange={setDetailSheetOpen} />
    </div>
  );
}
