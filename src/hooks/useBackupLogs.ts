import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useCurrentStoreId } from '@/hooks/useCurrentStoreId';
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
  store_id: string | null;
}

export function useBackupLogs() {
  const storeId = useCurrentStoreId();

  return useQuery({
    queryKey: ['backup-logs', storeId],
    queryFn: async () => {
      let query = supabase
        .from('backup_logs')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(20);
      
      if (storeId) {
        query = query.eq('store_id', storeId);
      }
      
      const { data, error } = await query;
      
      if (error) throw error;
      return data as BackupLog[];
    },
    enabled: !!storeId,
  });
}

export function useLatestBackup() {
  const storeId = useCurrentStoreId();

  return useQuery({
    queryKey: ['latest-backup', storeId],
    queryFn: async () => {
      let query = supabase
        .from('backup_logs')
        .select('*')
        .eq('status', 'success')
        .order('created_at', { ascending: false })
        .limit(1);
      
      if (storeId) {
        query = query.eq('store_id', storeId);
      }
      
      const { data, error } = await query.single();
      
      if (error && error.code !== 'PGRST116') throw error;
      return data as BackupLog | null;
    },
    enabled: !!storeId,
  });
}

export function useTriggerBackup() {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const storeId = useCurrentStoreId();

  return useMutation({
    mutationFn: async () => {
      const { data, error } = await supabase.functions.invoke('scheduled-backup', {
        body: { trigger: 'manual', user_id: user?.id, store_id: storeId },
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

export function useRestoreBackup() {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const storeId = useCurrentStoreId();

  return useMutation({
    mutationFn: async ({ backupData, restoreMode }: { backupData: any; restoreMode: 'merge' | 'replace' }) => {
      const { data, error } = await supabase.functions.invoke('restore-backup', {
        body: { 
          backup_data: backupData, 
          restore_mode: restoreMode,
          user_id: user?.id,
          store_id: storeId
        },
      });

      if (error) throw error;
      if (!data.success) throw new Error(data.error);
      return data;
    },
    onSuccess: (data) => {
      toast.success('Restore completed successfully!', {
        description: `${data.tables_restored} tables, ${data.total_rows?.toLocaleString()} rows restored`,
      });
      queryClient.invalidateQueries({ queryKey: ['backup-logs'] });
    },
    onError: (error: Error) => {
      toast.error('Restore failed', { description: error.message });
    },
  });
}
