import { useState, useMemo, useRef } from 'react';
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
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { useTasks, useTaskStats, useDeleteTask, useUpdateTaskStatus, getTaskPerformance, getTaskPerformanceScore, TaskStatus, TaskPriority, Task, TaskPerformance } from '@/hooks/useTasks';
import { useStaff } from '@/hooks/useStaff';
import { CreateTaskDialog } from '@/components/tasks/CreateTaskDialog';
import { TaskStatusBadge } from '@/components/tasks/TaskStatusBadge';
import { TaskPriorityBadge } from '@/components/tasks/TaskPriorityBadge';
import { TaskPerformanceBadge } from '@/components/tasks/TaskPerformanceBadge';
import { TaskDetailSheet } from '@/components/tasks/TaskDetailSheet';
import { AddRemarkDialog } from '@/components/tasks/AddRemarkDialog';
import { FormattedDate } from '@/components/FormattedDate';
import { useAuth } from '@/contexts/AuthContext';
import { useEffectiveRole } from '@/hooks/useEffectiveRole';
import { cn } from '@/lib/utils';
import {
  ClipboardList,
  Clock,
  Loader2,
  CheckCircle2,
  AlertCircle,
  Eye,
  Filter,
  MoreHorizontal,
  Pencil,
  Trash2,
  MessageSquare,
  Zap,
  Timer,
  AlertTriangle,
  TrendingUp,
  Award,
  ArrowLeftRight,
} from 'lucide-react';

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

function getRowBgClass(perf: TaskPerformance): string {
  switch (perf) {
    case 'OVERDUE': return 'bg-red-50/60 dark:bg-red-950/20';
    case 'LATE': return 'bg-orange-50/60 dark:bg-orange-950/20';
    case 'ON_TIME':
    case 'EARLY': return 'bg-emerald-50/40 dark:bg-emerald-950/15';
    case 'ON_TRACK': return 'bg-blue-50/40 dark:bg-blue-950/15';
    default: return '';
  }
}

export default function HRMTasks() {
  const [showStaffPerf, setShowStaffPerf] = useState(false);
  const { user } = useAuth();
  const { effectiveRole } = useEffectiveRole();
  const isManager = effectiveRole === 'MANAGER';
  const isAdminOrOwner = effectiveRole === 'ADMIN' || effectiveRole === 'OWNER';
  const canManageTasks = ['ADMIN', 'MANAGER', 'OWNER'].includes(effectiveRole);
  // Managers/admins can change status on tasks assigned TO them OR tasks they created
  const canUpdateOwnTaskStatus = canManageTasks;
  
  const [remarkDialogOpen, setRemarkDialogOpen] = useState(false);
  const [remarkDialogTaskId, setRemarkDialogTaskId] = useState<string>('');
  const [remarkDialogDefaultIsIssue, setRemarkDialogDefaultIsIssue] = useState(false);
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [editTask, setEditTask] = useState<Task | null>(null);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [deleteTask, setDeleteTask] = useState<Task | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [activeTab, setActiveTab] = useState('active');
  const [datePreset, setDatePreset] = useState<DatePreset>('this_month');
  const defaultRange = getDateRange('this_month');
  const [customFrom, setCustomFrom] = useState('');
  const [customTo, setCustomTo] = useState('');
  const [filters, setFilters] = useState({
    status: 'ALL' as TaskStatus | 'ALL',
    priority: 'ALL' as TaskPriority | 'ALL',
    assignedTo: '',
    dateFrom: defaultRange.from,
    dateTo: defaultRange.to,
  });

  const { data: tasksRaw, isLoading } = useTasks(filters);
  const { data: stats } = useTaskStats(filters.dateFrom, filters.dateTo);
  const { data: staff } = useStaff();
  const deleteTaskMutation = useDeleteTask();
  const updateTaskStatus = useUpdateTaskStatus();

  const handleDatePresetChange = (preset: DatePreset) => {
    setDatePreset(preset);
    if (preset !== 'custom') {
      const range = getDateRange(preset);
      setFilters(f => ({ ...f, dateFrom: range.from, dateTo: range.to }));
    } else {
      setFilters(f => ({ ...f, dateFrom: customFrom, dateTo: customTo }));
    }
  };

  const handleCustomDateApply = () => {
    setFilters(f => ({ ...f, dateFrom: customFrom, dateTo: customTo }));
  };

  // Sort tasks: Manager's pending tasks first
  const allTasks = useMemo(() => {
    if (!tasksRaw) return [];
    return [...tasksRaw].sort((a, b) => {
      const aIsMyPending = a.assigned_to?.id === user?.id && a.status !== 'COMPLETED';
      const bIsMyPending = b.assigned_to?.id === user?.id && b.status !== 'COMPLETED';
      if (aIsMyPending && !bIsMyPending) return -1;
      if (!aIsMyPending && bIsMyPending) return 1;
      return 0;
    });
  }, [tasksRaw, user?.id]);

  const activeTasks = useMemo(() => allTasks.filter(t => t.status !== 'COMPLETED'), [allTasks]);
  const completedTasks = useMemo(() => allTasks.filter(t => t.status === 'COMPLETED'), [allTasks]);
  const currentTasks = activeTab === 'active' ? activeTasks : completedTasks;

  // Staff performance scoring with breakdown
  const staffPerformance = useMemo(() => {
    if (!allTasks.length) return [];
    const staffMap = new Map<string, { name: string; totalPoints: number; totalTasks: number; completed: number; onTime: number; early: number; late: number; overdue: number; onTrack: number }>();
    
    allTasks.forEach(task => {
      const staffId = task.assigned_to_user_id;
      const staffName = task.assigned_to?.name || 'Unknown';
      if (!staffId) return;
      
      if (!staffMap.has(staffId)) {
        staffMap.set(staffId, { name: staffName, totalPoints: 0, totalTasks: 0, completed: 0, onTime: 0, early: 0, late: 0, overdue: 0, onTrack: 0 });
      }
      const entry = staffMap.get(staffId)!;
      entry.totalTasks++;
      
      const perf = getTaskPerformance(task);
      switch (perf.type) {
        case 'ON_TIME': entry.onTime++; break;
        case 'EARLY': entry.early++; break;
        case 'LATE': entry.late++; break;
        case 'OVERDUE': entry.overdue++; break;
        case 'ON_TRACK': entry.onTrack++; break;
      }

      if (task.status === 'COMPLETED') {
        entry.completed++;
        entry.totalPoints += getTaskPerformanceScore(perf.type);
      }
    });

    return Array.from(staffMap.entries())
      .map(([id, data]) => ({
        id,
        ...data,
        maxPoints: data.totalTasks * 10,
        percentage: data.totalTasks > 0 ? Math.round((data.totalPoints / (data.totalTasks * 10)) * 100) : 0,
      }))
      .sort((a, b) => b.percentage - a.percentage);
  }, [allTasks]);

  // Allow status change for tasks assigned to the user OR tasks they manage (admin/owner can change any)
  const canChangeTaskStatus = (task: Task) => {
    if (isAdminOrOwner) return task.status !== 'COMPLETED';
    return task.assigned_to?.id === user?.id && task.status !== 'COMPLETED';
  };
  const isMyPendingTask = (task: Task) => task.assigned_to?.id === user?.id && task.status !== 'COMPLETED';

  const handleStatusChange = async (task: Task, newStatus: TaskStatus) => {
    await updateTaskStatus.mutateAsync({ taskId: task.id, newStatus });
  };

  const handleViewTask = (task: Task) => { setSelectedTask(task); setSheetOpen(true); };
  const openRemarkDialog = (taskId: string, defaultIsIssue = false) => {
    setRemarkDialogTaskId(taskId); setRemarkDialogDefaultIsIssue(defaultIsIssue); setRemarkDialogOpen(true);
  };
  const handleEditTask = (task: Task) => { setEditTask(task); setEditDialogOpen(true); };
  const handleDeleteTask = (task: Task) => { setDeleteTask(task); setDeleteDialogOpen(true); };
  const confirmDelete = async () => {
    if (deleteTask) { await deleteTaskMutation.mutateAsync(deleteTask.id); setDeleteDialogOpen(false); setDeleteTask(null); }
  };

  const statCards = [
    { title: 'Total Tasks', value: stats?.total || 0, icon: ClipboardList, color: 'text-primary', bg: 'bg-primary/10' },
    { title: 'Pending', value: stats?.pending || 0, icon: Clock, color: 'text-slate-600', bg: 'bg-slate-500/10' },
    { title: 'In Progress', value: stats?.inProgress || 0, icon: Loader2, color: 'text-blue-600', bg: 'bg-blue-500/10' },
    { title: 'Completed', value: stats?.completed || 0, icon: CheckCircle2, color: 'text-emerald-600', bg: 'bg-emerald-500/10' },
    { title: 'Issues', value: stats?.issueCount || 0, icon: AlertCircle, color: 'text-red-600', bg: 'bg-red-500/10' },
  ];

  return (
    <div className="space-y-3 p-3 sm:p-4">
      {/* Header Row: Title + Date Filter (middle) + Create Task (right) */}
      <div className="flex flex-wrap items-center gap-2">
        <h1 className="text-lg font-bold">Task Management</h1>
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
        <div className="ml-auto">
          <CreateTaskDialog />
        </div>
      </div>

      {/* Stats Cards with toggle to Staff Performance */}
      <div className="flex items-center gap-2">
        <div className="flex-1 grid grid-cols-3 lg:grid-cols-5 gap-2.5">
          {!showStaffPerf ? (
            statCards.map((stat) => (
              <Card key={stat.title}>
                <CardContent className="p-4">
                  <div className="flex items-center gap-3">
                    <div className={`p-2.5 rounded-lg ${stat.bg}`}>
                      <stat.icon className={`h-5 w-5 ${stat.color}`} />
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">{stat.title}</p>
                      <p className="text-2xl font-bold">{stat.value}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))
          ) : (
            staffPerformance.length > 0 ? staffPerformance.map((sp) => (
              <Popover key={sp.id}>
                <PopoverTrigger asChild>
                  <Card className="cursor-pointer hover:bg-muted/50 transition-colors">
                    <CardContent className="p-4">
                      <div className="flex items-center gap-3">
                        <div className="p-2.5 rounded-lg bg-primary/10">
                          <Award className="h-5 w-5 text-primary" />
                        </div>
                        <div className="min-w-0">
                          <p className="text-xs text-muted-foreground truncate">{sp.name}</p>
                          <p className={cn(
                            "text-2xl font-bold",
                            sp.percentage >= 80 ? 'text-emerald-600' : sp.percentage >= 50 ? 'text-amber-600' : 'text-red-600'
                          )}>
                            {sp.percentage}%
                          </p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </PopoverTrigger>
                <PopoverContent className="w-52 p-3" side="bottom">
                  <p className="text-xs font-semibold mb-2">{sp.name} — {sp.completed}/{sp.totalTasks} tasks</p>
                  <div className="space-y-1.5 text-xs">
                    <div className="flex justify-between"><span className="text-emerald-600">✓ On Time</span><span className="font-medium">{sp.onTime + sp.early}</span></div>
                    <div className="flex justify-between"><span className="text-orange-600">⏱ Late</span><span className="font-medium">{sp.late}</span></div>
                    <div className="flex justify-between"><span className="text-red-600">⚠ Overdue</span><span className="font-medium">{sp.overdue}</span></div>
                    <div className="flex justify-between"><span className="text-blue-600">📈 On Track</span><span className="font-medium">{sp.onTrack}</span></div>
                  </div>
                </PopoverContent>
              </Popover>
            )) : (
              <div className="col-span-full text-center text-xs text-muted-foreground py-4">No staff performance data</div>
            )
          )}
        </div>
        <Button
          variant="ghost"
          size="icon"
          className="h-9 w-9 shrink-0"
          onClick={() => setShowStaffPerf(!showStaffPerf)}
          title={showStaffPerf ? 'Show Stats' : 'Show Staff Performance'}
        >
          <ArrowLeftRight className="h-4 w-4" />
        </Button>
      </div>

      {/* Filters - Right aligned */}
      <div className="flex flex-wrap items-center justify-end gap-2">
        <Filter className="h-3.5 w-3.5 text-muted-foreground" />
        <Select value={filters.status} onValueChange={(value) => setFilters({ ...filters, status: value as TaskStatus | 'ALL' })}>
          <SelectTrigger className="w-[120px] h-7 text-xs"><SelectValue placeholder="Status" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="ALL">All Status</SelectItem>
            <SelectItem value="PENDING">Pending</SelectItem>
            <SelectItem value="IN_PROGRESS">In Progress</SelectItem>
            <SelectItem value="COMPLETED">Completed</SelectItem>
          </SelectContent>
        </Select>

        <Select value={filters.priority} onValueChange={(value) => setFilters({ ...filters, priority: value as TaskPriority | 'ALL' })}>
          <SelectTrigger className="w-[120px] h-7 text-xs"><SelectValue placeholder="Priority" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="ALL">All Priority</SelectItem>
            <SelectItem value="LOW">Low</SelectItem>
            <SelectItem value="MEDIUM">Medium</SelectItem>
            <SelectItem value="HIGH">High</SelectItem>
          </SelectContent>
        </Select>

        <Select value={filters.assignedTo || 'all'} onValueChange={(value) => setFilters({ ...filters, assignedTo: value === 'all' ? '' : value })}>
          <SelectTrigger className="w-[130px] h-7 text-xs"><SelectValue placeholder="Assigned To" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Staff</SelectItem>
            {staff?.map((s) => (
              <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Tabs + Task Table */}
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
            <TaskTable tasks={activeTasks} isLoading={isLoading} user={user} canChangeTaskStatus={canChangeTaskStatus}
              isMyPendingTask={isMyPendingTask} handleStatusChange={handleStatusChange} updateTaskStatus={updateTaskStatus}
              openRemarkDialog={openRemarkDialog} handleViewTask={handleViewTask} handleEditTask={handleEditTask} handleDeleteTask={handleDeleteTask} />
          </TabsContent>
          <TabsContent value="completed" className="m-0">
            <TaskTable tasks={completedTasks} isLoading={isLoading} user={user} canChangeTaskStatus={canChangeTaskStatus}
              isMyPendingTask={isMyPendingTask} handleStatusChange={handleStatusChange} updateTaskStatus={updateTaskStatus}
              openRemarkDialog={openRemarkDialog} handleViewTask={handleViewTask} handleEditTask={handleEditTask} handleDeleteTask={handleDeleteTask} />
          </TabsContent>
        </Tabs>
      </Card>

      <TaskDetailSheet task={selectedTask} open={sheetOpen} onOpenChange={setSheetOpen} />

      <AddRemarkDialog
        taskId={remarkDialogTaskId}
        open={remarkDialogOpen}
        onOpenChange={(open) => { setRemarkDialogOpen(open); if (!open) setRemarkDialogTaskId(''); }}
        defaultIsIssue={remarkDialogDefaultIsIssue}
      />

      <CreateTaskDialog
        editTask={editTask}
        open={editDialogOpen}
        onOpenChange={(open) => { setEditDialogOpen(open); if (!open) setEditTask(null); }}
      />

      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Task</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete "{deleteTask?.title}"? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

// Extracted table component to avoid duplication
function TaskTable({ tasks, isLoading, user, canChangeTaskStatus, isMyPendingTask, handleStatusChange, updateTaskStatus, openRemarkDialog, handleViewTask, handleEditTask, handleDeleteTask }: {
  tasks: Task[];
  isLoading: boolean;
  user: any;
  canChangeTaskStatus: (task: Task) => boolean;
  isMyPendingTask: (task: Task) => boolean;
  handleStatusChange: (task: Task, newStatus: TaskStatus) => Promise<void>;
  updateTaskStatus: any;
  openRemarkDialog: (taskId: string, isIssue?: boolean) => void;
  handleViewTask: (task: Task) => void;
  handleEditTask: (task: Task) => void;
  handleDeleteTask: (task: Task) => void;
}) {
  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-48">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (tasks.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-48 text-muted-foreground">
        <ClipboardList className="h-10 w-10 mb-2" />
        <p>No tasks found</p>
      </div>
    );
  }

  return (
    <div className="overflow-x-auto">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Title</TableHead>
            <TableHead>Assigned To</TableHead>
            <TableHead>Status</TableHead>
            <TableHead className="hidden md:table-cell">Due Date</TableHead>
            <TableHead className="hidden lg:table-cell">Created</TableHead>
            <TableHead className="hidden lg:table-cell">Completed</TableHead>
            <TableHead className="hidden sm:table-cell">Performance</TableHead>
            <TableHead className="hidden md:table-cell">Remark</TableHead>
            <TableHead className="text-right">Action</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {tasks.map((task) => {
            const perf = getTaskPerformance(task);
            return (
              <TableRow
                key={task.id}
                className={cn(
                  getRowBgClass(perf.type),
                  'hover:opacity-80 transition-opacity',
                  isMyPendingTask(task) && 'border-l-4 border-l-amber-500'
                )}
              >
                <TableCell className="font-medium max-w-[120px] sm:max-w-[200px] truncate">
                  <div className="flex items-center gap-2">
                    {task.title}
                    {isMyPendingTask(task) && (
                      <span className="text-xs bg-amber-100 dark:bg-amber-900 text-amber-700 dark:text-amber-300 px-1.5 py-0.5 rounded">
                        You
                      </span>
                    )}
                  </div>
                </TableCell>
                <TableCell className="max-w-[80px] sm:max-w-[120px] truncate">
                  {task.assigned_to?.name || 'N/A'}
                </TableCell>
                <TableCell>
                  <div className="flex items-center gap-1.5">
                    {canChangeTaskStatus(task) ? (
                      <Select value={task.status} onValueChange={(value) => handleStatusChange(task, value as TaskStatus)} disabled={updateTaskStatus.isPending}>
                        <SelectTrigger className="w-[130px] h-8">
                          <TaskStatusBadge status={task.status} />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="PENDING"><TaskStatusBadge status="PENDING" /></SelectItem>
                          <SelectItem value="IN_PROGRESS"><TaskStatusBadge status="IN_PROGRESS" /></SelectItem>
                          <SelectItem value="COMPLETED"><TaskStatusBadge status="COMPLETED" /></SelectItem>
                        </SelectContent>
                      </Select>
                    ) : (
                      <TaskStatusBadge status={task.status} />
                    )}
                    <TaskPriorityBadge priority={task.priority} className="text-[10px] px-1.5 py-0" />
                  </div>
                </TableCell>
                <TableCell className="hidden md:table-cell">
                  <FormattedDate date={task.due_date} />
                </TableCell>
                <TableCell className="hidden lg:table-cell">
                  <FormattedDate date={task.created_at} />
                </TableCell>
                <TableCell className="hidden lg:table-cell">
                  {task.completed_date ? <FormattedDate date={task.completed_date} /> : '-'}
                </TableCell>
                <TableCell className="hidden sm:table-cell">
                  <TaskPerformanceBadge type={perf.type} label={perf.label} />
                </TableCell>
                <TableCell className="hidden md:table-cell">
                  <Button variant="ghost" size="sm" onClick={() => openRemarkDialog(task.id, false)}
                    title={task.has_issues ? 'View remarks' : 'Add remark'}
                    className={cn('h-8 w-8 p-0', task.has_issues ? 'text-destructive' : 'text-muted-foreground')}>
                    <MessageSquare className="h-4 w-4" />
                  </Button>
                </TableCell>
                <TableCell className="text-right">
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="sm"><MoreHorizontal className="h-4 w-4" /></Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onClick={() => handleViewTask(task)}>
                        <Eye className="h-4 w-4 mr-2" />View
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => handleEditTask(task)}>
                        <Pencil className="h-4 w-4 mr-2" />Edit
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => handleDeleteTask(task)} className="text-destructive focus:text-destructive">
                        <Trash2 className="h-4 w-4 mr-2" />Delete
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </div>
  );
}
