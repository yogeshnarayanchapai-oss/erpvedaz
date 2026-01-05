import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useCurrentStoreId } from '@/hooks/useCurrentStoreId';
import { toast } from 'sonner';

export type TaskPriority = 'LOW' | 'MEDIUM' | 'HIGH';
export type TaskStatus = 'PENDING' | 'IN_PROGRESS' | 'COMPLETED';

export interface Task {
  id: string;
  title: string;
  description: string | null;
  priority: TaskPriority;
  status: TaskStatus;
  due_date: string;
  assigned_to_user_id: string | null;
  assigned_by_user_id: string | null;
  attachment_url: string | null;
  store_id: string | null;
  created_at: string;
  updated_at: string;
  assigned_to?: { id: string; name: string } | null;
  assigned_by?: { id: string; name: string } | null;
  has_issues?: boolean;
}

export interface TaskRemark {
  id: string;
  task_id: string;
  created_by_user_id: string | null;
  remark: string;
  is_issue: boolean;
  created_at: string;
  created_by?: { id: string; name: string } | null;
}

export interface TaskStatusHistory {
  id: string;
  task_id: string;
  old_status: TaskStatus | null;
  new_status: TaskStatus;
  changed_by_user_id: string | null;
  changed_at: string;
  notes: string | null;
  changed_by?: { id: string; name: string } | null;
}

interface TaskFilters {
  status?: TaskStatus | 'ALL';
  priority?: TaskPriority | 'ALL';
  assignedTo?: string;
  dateFrom?: string;
  dateTo?: string;
}

export function useTasks(filters?: TaskFilters) {
  const storeId = useCurrentStoreId();

  return useQuery({
    queryKey: ['tasks', storeId, filters],
    queryFn: async () => {
      let query = supabase
        .from('tasks')
        .select(`
          *,
          assigned_to:profiles!tasks_assigned_to_user_id_fkey(id, name),
          assigned_by:profiles!tasks_assigned_by_user_id_fkey(id, name)
        `)
        .order('created_at', { ascending: false });

      if (storeId) {
        query = query.eq('store_id', storeId);
      }

      if (filters?.status && filters.status !== 'ALL') {
        query = query.eq('status', filters.status);
      }

      if (filters?.priority && filters.priority !== 'ALL') {
        query = query.eq('priority', filters.priority);
      }

      if (filters?.assignedTo) {
        query = query.eq('assigned_to_user_id', filters.assignedTo);
      }

      if (filters?.dateFrom) {
        query = query.gte('due_date', filters.dateFrom);
      }

      if (filters?.dateTo) {
        query = query.lte('due_date', filters.dateTo);
      }

      const { data, error } = await query;

      if (error) throw error;

      // Check for issues in each task
      const tasksWithIssues = await Promise.all(
        (data || []).map(async (task) => {
          const { count } = await supabase
            .from('task_remarks')
            .select('*', { count: 'exact', head: true })
            .eq('task_id', task.id)
            .eq('is_issue', true);

          return { ...task, has_issues: (count || 0) > 0 };
        })
      );

      return tasksWithIssues as Task[];
    },
    enabled: !!storeId,
  });
}

export function useMyTasks() {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['my-tasks', user?.id],
    queryFn: async () => {
      if (!user?.id) return [];

      const { data, error } = await supabase
        .from('tasks')
        .select(`
          *,
          assigned_by:profiles!tasks_assigned_by_user_id_fkey(id, name)
        `)
        .eq('assigned_to_user_id', user.id)
        .order('due_date', { ascending: true });

      if (error) throw error;
      return data as Task[];
    },
    enabled: !!user?.id,
  });
}

export function useTaskStats(dateFrom?: string, dateTo?: string) {
  const storeId = useCurrentStoreId();

  return useQuery({
    queryKey: ['task-stats', storeId, dateFrom, dateTo],
    queryFn: async () => {
      let query = supabase.from('tasks').select('status');

      if (storeId) {
        query = query.eq('store_id', storeId);
      }

      if (dateFrom) {
        query = query.gte('due_date', dateFrom);
      }

      if (dateTo) {
        query = query.lte('due_date', dateTo);
      }

      const { data, error } = await query;

      if (error) throw error;

      const stats = {
        total: data?.length || 0,
        pending: data?.filter((t) => t.status === 'PENDING').length || 0,
        inProgress: data?.filter((t) => t.status === 'IN_PROGRESS').length || 0,
        completed: data?.filter((t) => t.status === 'COMPLETED').length || 0,
      };

      return stats;
    },
    enabled: !!storeId,
  });
}

export function useMyTaskStats() {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['my-task-stats', user?.id],
    queryFn: async () => {
      if (!user?.id) return { total: 0, pending: 0, inProgress: 0, completed: 0 };

      const { data, error } = await supabase
        .from('tasks')
        .select('status')
        .eq('assigned_to_user_id', user.id);

      if (error) throw error;

      return {
        total: data?.length || 0,
        pending: data?.filter((t) => t.status === 'PENDING').length || 0,
        inProgress: data?.filter((t) => t.status === 'IN_PROGRESS').length || 0,
        completed: data?.filter((t) => t.status === 'COMPLETED').length || 0,
      };
    },
    enabled: !!user?.id,
  });
}

export function useCreateTask() {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const storeId = useCurrentStoreId();

  return useMutation({
    mutationFn: async (task: {
      title: string;
      description?: string;
      priority: TaskPriority;
      due_date: string;
      assigned_to_user_id: string;
      attachment_url?: string;
    }) => {
      const { data, error } = await supabase
        .from('tasks')
        .insert({
          ...task,
          assigned_by_user_id: user?.id,
          store_id: storeId,
        })
        .select()
        .single();

      if (error) throw error;

      // Create notification for assigned user
      if (task.assigned_to_user_id && user?.id) {
        const { data: profile } = await supabase
          .from('profiles')
          .select('name')
          .eq('id', user.id)
          .single();

        await supabase.from('notifications').insert({
          target_user_id: task.assigned_to_user_id,
          title: 'New Task Assigned',
          message: `"${task.title}" assigned by ${profile?.name || 'Manager'}`,
          type: 'TASK_ASSIGNED',
          store_id: storeId,
          actor_id: user.id,
        });
      }

      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tasks'] });
      queryClient.invalidateQueries({ queryKey: ['my-tasks'] });
      queryClient.invalidateQueries({ queryKey: ['task-stats'] });
      toast.success('Task created successfully');
    },
    onError: (error) => {
      toast.error('Failed to create task: ' + error.message);
    },
  });
}

export function useUpdateTaskStatus() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async ({
      taskId,
      newStatus,
      notes,
    }: {
      taskId: string;
      newStatus: TaskStatus;
      notes?: string;
    }) => {
      // Get current task
      const { data: task, error: fetchError } = await supabase
        .from('tasks')
        .select('status, title, assigned_by_user_id, store_id')
        .eq('id', taskId)
        .single();

      if (fetchError) throw fetchError;

      // Update task status
      const { error: updateError } = await supabase
        .from('tasks')
        .update({ status: newStatus })
        .eq('id', taskId);

      if (updateError) throw updateError;

      // Insert status history
      await supabase.from('task_status_history').insert({
        task_id: taskId,
        old_status: task.status,
        new_status: newStatus,
        changed_by_user_id: user?.id,
        notes,
      });

      // Notify admin/manager when status changes
      if (task.assigned_by_user_id && user?.id) {
        const { data: profile } = await supabase
          .from('profiles')
          .select('name')
          .eq('id', user.id)
          .single();

        await supabase.from('notifications').insert({
          target_user_id: task.assigned_by_user_id,
          title: newStatus === 'COMPLETED' ? 'Task Completed' : 'Task Status Updated',
          message: `${profile?.name || 'Staff'} updated "${task.title}" to ${newStatus.replace('_', ' ')}`,
          type: newStatus === 'COMPLETED' ? 'TASK_COMPLETED' : 'TASK_STATUS_UPDATED',
          store_id: task.store_id,
          actor_id: user.id,
        });
      }

      return { taskId, newStatus };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tasks'] });
      queryClient.invalidateQueries({ queryKey: ['my-tasks'] });
      queryClient.invalidateQueries({ queryKey: ['task-stats'] });
      queryClient.invalidateQueries({ queryKey: ['my-task-stats'] });
      toast.success('Task status updated');
    },
    onError: (error) => {
      toast.error('Failed to update status: ' + error.message);
    },
  });
}

export function useAddTaskRemark() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async ({
      taskId,
      remark,
      isIssue,
    }: {
      taskId: string;
      remark: string;
      isIssue: boolean;
    }) => {
      const { data, error } = await supabase
        .from('task_remarks')
        .insert({
          task_id: taskId,
          remark,
          is_issue: isIssue,
          created_by_user_id: user?.id,
        })
        .select()
        .single();

      if (error) throw error;

      // If issue, notify admin/manager
      if (isIssue) {
        const { data: task } = await supabase
          .from('tasks')
          .select('title, assigned_by_user_id, store_id')
          .eq('id', taskId)
          .single();

        if (task?.assigned_by_user_id && user?.id) {
          const { data: profile } = await supabase
            .from('profiles')
            .select('name')
            .eq('id', user.id)
            .single();

          await supabase.from('notifications').insert({
            target_user_id: task.assigned_by_user_id,
            title: 'Task Issue Reported',
            message: `${profile?.name || 'Staff'} reported issue on "${task.title}"`,
            type: 'TASK_ISSUE',
            store_id: task.store_id,
            actor_id: user.id,
          });
        }
      }

      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tasks'] });
      queryClient.invalidateQueries({ queryKey: ['task-remarks'] });
      toast.success('Remark added');
    },
    onError: (error) => {
      toast.error('Failed to add remark: ' + error.message);
    },
  });
}

export function useTaskRemarks(taskId: string) {
  return useQuery({
    queryKey: ['task-remarks', taskId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('task_remarks')
        .select(`
          *,
          created_by:profiles!task_remarks_created_by_user_id_fkey(id, name)
        `)
        .eq('task_id', taskId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data as TaskRemark[];
    },
    enabled: !!taskId,
  });
}

export function useTaskStatusHistory(taskId: string) {
  return useQuery({
    queryKey: ['task-status-history', taskId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('task_status_history')
        .select(`
          *,
          changed_by:profiles!task_status_history_changed_by_user_id_fkey(id, name)
        `)
        .eq('task_id', taskId)
        .order('changed_at', { ascending: false });

      if (error) throw error;
      return data as TaskStatusHistory[];
    },
    enabled: !!taskId,
  });
}

export function useDeleteTask() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (taskId: string) => {
      const { error } = await supabase.from('tasks').delete().eq('id', taskId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tasks'] });
      queryClient.invalidateQueries({ queryKey: ['task-stats'] });
      toast.success('Task deleted');
    },
    onError: (error) => {
      toast.error('Failed to delete task: ' + error.message);
    },
  });
}

export function useTaskBadgeCount() {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['task-badge-count', user?.id],
    queryFn: async () => {
      if (!user?.id) return 0;

      const { count, error } = await supabase
        .from('tasks')
        .select('*', { count: 'exact', head: true })
        .eq('assigned_to_user_id', user.id)
        .in('status', ['PENDING', 'IN_PROGRESS']);

      if (error) throw error;
      return count || 0;
    },
    enabled: !!user?.id,
  });
}
