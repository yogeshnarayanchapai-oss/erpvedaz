import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';

export interface BackupLog {
  id: string;
  backup_type: string;
  status: string;
  file_name: string | null;
  file_size: number | null;
  google_drive_id: string | null;
  google_drive_url: string | null;
  tables_backed_up: number | null;
  total_rows: number | null;
  error_message: string | null;
  started_at: string;
  completed_at: string | null;
  created_by: string | null;
  created_at: string;
}

export function useBackupLogs() {
  return useQuery({
    queryKey: ['backup-logs'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('backup_logs')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(20);
      
      if (error) throw error;
      return data as BackupLog[];
    },
  });
}

export function useLatestBackup() {
  return useQuery({
    queryKey: ['latest-backup'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('backup_logs')
        .select('*')
        .eq('status', 'success')
        .order('created_at', { ascending: false })
        .limit(1)
        .single();
      
      if (error && error.code !== 'PGRST116') throw error;
      return data as BackupLog | null;
    },
  });
}

export function useTriggerBackup() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async () => {
      const { data, error } = await supabase.functions.invoke('scheduled-backup', {
        body: { trigger: 'manual', user_id: user?.id },
      });

      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      toast.success('Backup completed successfully!', {
        description: `${data.tables_backed_up} tables, ${data.total_rows?.toLocaleString()} rows backed up`,
      });
      queryClient.invalidateQueries({ queryKey: ['backup-logs'] });
      queryClient.invalidateQueries({ queryKey: ['latest-backup'] });
    },
    onError: (error: Error) => {
      toast.error('Backup failed', { description: error.message });
    },
  });
}
