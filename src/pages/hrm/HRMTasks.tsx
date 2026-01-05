import { useState } from 'react';
import { format } from 'date-fns';
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
import { useTasks, useTaskStats, useDeleteTask, useUpdateTaskStatus, TaskStatus, TaskPriority, Task } from '@/hooks/useTasks';
import { useStaff } from '@/hooks/useStaff';
import { CreateTaskDialog } from '@/components/tasks/CreateTaskDialog';
import { TaskStatusBadge } from '@/components/tasks/TaskStatusBadge';
import { TaskPriorityBadge } from '@/components/tasks/TaskPriorityBadge';
import { TaskDetailSheet } from '@/components/tasks/TaskDetailSheet';
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
  Calendar,
  Filter,
  MoreHorizontal,
  Pencil,
  Trash2,
} from 'lucide-react';

export default function HRMTasks() {
  const { user } = useAuth();
  const { effectiveRole } = useEffectiveRole();
  const isManager = effectiveRole === 'MANAGER';
  const isAdminOrOwner = effectiveRole === 'ADMIN' || effectiveRole === 'OWNER';
  
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [editTask, setEditTask] = useState<Task | null>(null);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [deleteTask, setDeleteTask] = useState<Task | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [filters, setFilters] = useState({
    status: 'ALL' as TaskStatus | 'ALL',
    priority: 'ALL' as TaskPriority | 'ALL',
    assignedTo: '',
    dateFrom: '',
    dateTo: '',
  });

  const { data: tasks, isLoading } = useTasks(filters);
  const { data: stats } = useTaskStats(filters.dateFrom, filters.dateTo);
  const { data: staff } = useStaff();
  const deleteTaskMutation = useDeleteTask();
  const updateTaskStatus = useUpdateTaskStatus();

  // Check if task is assigned to current user and not completed
  const isMyPendingTask = (task: Task) => {
    return task.assigned_to?.id === user?.id && task.status !== 'COMPLETED';
  };

  // Handle status change for manager's own tasks
  const handleStatusChange = async (task: Task, newStatus: TaskStatus) => {
    await updateTaskStatus.mutateAsync({ taskId: task.id, newStatus });
  };

  const getAvailableStatuses = (currentStatus: TaskStatus): TaskStatus[] => {
    switch (currentStatus) {
      case 'PENDING':
        return ['IN_PROGRESS'];
      case 'IN_PROGRESS':
        return ['COMPLETED'];
      default:
        return [];
    }
  };

  const handleViewTask = (task: Task) => {
    setSelectedTask(task);
    setSheetOpen(true);
  };

  const handleEditTask = (task: Task) => {
    setEditTask(task);
    setEditDialogOpen(true);
  };

  const handleDeleteTask = (task: Task) => {
    setDeleteTask(task);
    setDeleteDialogOpen(true);
  };

  const confirmDelete = async () => {
    if (deleteTask) {
      await deleteTaskMutation.mutateAsync(deleteTask.id);
      setDeleteDialogOpen(false);
      setDeleteTask(null);
    }
  };

  const statCards = [
    {
      title: 'Total Tasks',
      value: stats?.total || 0,
      icon: ClipboardList,
      color: 'text-primary',
      bg: 'bg-primary/10',
    },
    {
      title: 'Pending',
      value: stats?.pending || 0,
      icon: Clock,
      color: 'text-amber-600',
      bg: 'bg-amber-500/10',
    },
    {
      title: 'In Progress',
      value: stats?.inProgress || 0,
      icon: Loader2,
      color: 'text-blue-600',
      bg: 'bg-blue-500/10',
    },
    {
      title: 'Completed',
      value: stats?.completed || 0,
      icon: CheckCircle2,
      color: 'text-emerald-600',
      bg: 'bg-emerald-500/10',
    },
    {
      title: 'Issues',
      value: stats?.issueCount || 0,
      icon: AlertCircle,
      color: 'text-red-600',
      bg: 'bg-red-500/10',
    },
  ];

  return (
    <div className="space-y-4 sm:space-y-6 p-4 sm:p-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold">Task Management</h1>
          <p className="text-sm text-muted-foreground">
            Create and monitor tasks for your team
          </p>
        </div>
        <CreateTaskDialog />
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-3 sm:gap-4">
        {statCards.map((stat) => (
          <Card key={stat.title}>
            <CardContent className="p-4 sm:p-6">
              <div className="flex items-center gap-3">
                <div className={`p-2 sm:p-3 rounded-lg ${stat.bg}`}>
                  <stat.icon className={`h-4 w-4 sm:h-5 sm:w-5 ${stat.color}`} />
                </div>
                <div>
                  <p className="text-xs sm:text-sm text-muted-foreground">
                    {stat.title}
                  </p>
                  <p className="text-lg sm:text-2xl font-bold">{stat.value}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Filters */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Filter className="h-4 w-4" />
            Filters
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
            <Select
              value={filters.status}
              onValueChange={(value) =>
                setFilters({ ...filters, status: value as TaskStatus | 'ALL' })
              }
            >
              <SelectTrigger>
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">All Status</SelectItem>
                <SelectItem value="PENDING">Pending</SelectItem>
                <SelectItem value="IN_PROGRESS">In Progress</SelectItem>
                <SelectItem value="COMPLETED">Completed</SelectItem>
              </SelectContent>
            </Select>

            <Select
              value={filters.priority}
              onValueChange={(value) =>
                setFilters({ ...filters, priority: value as TaskPriority | 'ALL' })
              }
            >
              <SelectTrigger>
                <SelectValue placeholder="Priority" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">All Priority</SelectItem>
                <SelectItem value="LOW">Low</SelectItem>
                <SelectItem value="MEDIUM">Medium</SelectItem>
                <SelectItem value="HIGH">High</SelectItem>
              </SelectContent>
            </Select>

            <Select
              value={filters.assignedTo || 'all'}
              onValueChange={(value) =>
                setFilters({ ...filters, assignedTo: value === 'all' ? '' : value })
              }
            >
              <SelectTrigger>
                <SelectValue placeholder="Assigned To" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Staff</SelectItem>
                {staff?.map((s) => (
                  <SelectItem key={s.id} value={s.id}>
                    {s.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <div className="flex items-center gap-2">
              <Calendar className="h-4 w-4 text-muted-foreground hidden sm:block" />
              <Input
                type="date"
                value={filters.dateFrom}
                onChange={(e) =>
                  setFilters({ ...filters, dateFrom: e.target.value })
                }
                className="text-sm"
              />
            </div>

            <div className="flex items-center gap-2">
              <span className="text-muted-foreground hidden sm:block">to</span>
              <Input
                type="date"
                value={filters.dateTo}
                onChange={(e) =>
                  setFilters({ ...filters, dateTo: e.target.value })
                }
                className="text-sm"
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Task Table */}
      <Card>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="flex items-center justify-center h-48">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : tasks?.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-48 text-muted-foreground">
              <ClipboardList className="h-10 w-10 mb-2" />
              <p>No tasks found</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Title</TableHead>
                    <TableHead>Assigned To</TableHead>
                    <TableHead className="hidden sm:table-cell">Priority</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="hidden md:table-cell">Due Date</TableHead>
                    <TableHead className="hidden lg:table-cell">Created</TableHead>
                    <TableHead className="hidden md:table-cell">Issue</TableHead>
                    <TableHead className="text-right">Action</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {tasks?.map((task) => (
                    <TableRow 
                      key={task.id}
                      className={cn(
                        isMyPendingTask(task) && 'bg-amber-50 dark:bg-amber-950/30 border-l-4 border-l-amber-500'
                      )}
                    >
                      <TableCell className="font-medium max-w-[120px] sm:max-w-[200px] truncate">
                        <div className="flex items-center gap-2">
                          {task.title}
                          {isMyPendingTask(task) && (
                            <span className="text-xs bg-amber-100 dark:bg-amber-900 text-amber-700 dark:text-amber-300 px-1.5 py-0.5 rounded">
                              Assigned to you
                            </span>
                          )}
                        </div>
                      </TableCell>
                      <TableCell className="max-w-[80px] sm:max-w-[120px] truncate">
                        {task.assigned_to?.name || 'N/A'}
                      </TableCell>
                      <TableCell className="hidden sm:table-cell">
                        <TaskPriorityBadge priority={task.priority} />
                      </TableCell>
                      <TableCell>
                        {/* Manager can update status of their own tasks */}
                        {isManager && isMyPendingTask(task) && getAvailableStatuses(task.status).length > 0 ? (
                          <Select
                            value={task.status}
                            onValueChange={(value) => handleStatusChange(task, value as TaskStatus)}
                          >
                            <SelectTrigger className="w-[130px] h-8">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value={task.status}>
                                <TaskStatusBadge status={task.status} />
                              </SelectItem>
                              {getAvailableStatuses(task.status).map((status) => (
                                <SelectItem key={status} value={status}>
                                  <TaskStatusBadge status={status} />
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        ) : (
                          <TaskStatusBadge status={task.status} />
                        )}
                      </TableCell>
                      <TableCell className="hidden md:table-cell">
                        {format(new Date(task.due_date), 'MMM dd')}
                      </TableCell>
                      <TableCell className="hidden lg:table-cell">
                        {format(new Date(task.created_at), 'MMM dd')}
                      </TableCell>
                      <TableCell className="hidden md:table-cell">
                        {task.has_issues && (
                          <AlertCircle className="h-4 w-4 text-red-500" />
                        )}
                      </TableCell>
                      <TableCell className="text-right">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="sm">
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => handleViewTask(task)}>
                              <Eye className="h-4 w-4 mr-2" />
                              View
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => handleEditTask(task)}>
                              <Pencil className="h-4 w-4 mr-2" />
                              Edit
                            </DropdownMenuItem>
                            <DropdownMenuItem 
                              onClick={() => handleDeleteTask(task)}
                              className="text-destructive focus:text-destructive"
                            >
                              <Trash2 className="h-4 w-4 mr-2" />
                              Delete
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      <TaskDetailSheet
        task={selectedTask}
        open={sheetOpen}
        onOpenChange={setSheetOpen}
      />

      {/* Edit Task Dialog */}
      <CreateTaskDialog
        editTask={editTask}
        open={editDialogOpen}
        onOpenChange={(open) => {
          setEditDialogOpen(open);
          if (!open) setEditTask(null);
        }}
      />

      {/* Delete Confirmation */}
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
            <AlertDialogAction
              onClick={confirmDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
