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
import { useTasks, useTaskStats, TaskStatus, TaskPriority, Task } from '@/hooks/useTasks';
import { useStaff } from '@/hooks/useStaff';
import { CreateTaskDialog } from '@/components/tasks/CreateTaskDialog';
import { TaskStatusBadge } from '@/components/tasks/TaskStatusBadge';
import { TaskPriorityBadge } from '@/components/tasks/TaskPriorityBadge';
import { TaskDetailSheet } from '@/components/tasks/TaskDetailSheet';
import {
  ClipboardList,
  Clock,
  Loader2,
  CheckCircle2,
  AlertCircle,
  Eye,
  Calendar,
  Filter,
} from 'lucide-react';

export default function HRMTasks() {
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [sheetOpen, setSheetOpen] = useState(false);
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

  const handleViewTask = (task: Task) => {
    setSelectedTask(task);
    setSheetOpen(true);
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
                    <TableHead className="hidden sm:table-cell">Assigned To</TableHead>
                    <TableHead>Priority</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="hidden md:table-cell">Due Date</TableHead>
                    <TableHead className="hidden lg:table-cell">Created</TableHead>
                    <TableHead className="hidden md:table-cell">Issue</TableHead>
                    <TableHead className="text-right">Action</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {tasks?.map((task) => (
                    <TableRow key={task.id}>
                      <TableCell className="font-medium max-w-[200px] truncate">
                        {task.title}
                      </TableCell>
                      <TableCell className="hidden sm:table-cell">
                        {task.assigned_to?.name || 'N/A'}
                      </TableCell>
                      <TableCell>
                        <TaskPriorityBadge priority={task.priority} />
                      </TableCell>
                      <TableCell>
                        <TaskStatusBadge status={task.status} />
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
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleViewTask(task)}
                        >
                          <Eye className="h-4 w-4" />
                        </Button>
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
    </div>
  );
}
