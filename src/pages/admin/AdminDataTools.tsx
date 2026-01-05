import { useState, useRef } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Shield, Loader2, Cloud, ExternalLink, Clock, HardDrive, Upload, RotateCcw, AlertTriangle } from 'lucide-react';
import { format, formatDistanceToNow } from 'date-fns';
import { useBackupLogs, useLatestBackup, useTriggerBackup, useRestoreBackup } from '@/hooks/useBackupLogs';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { toast } from 'sonner';

export default function AdminDataTools() {
  const { profile } = useAuth();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [restoreDialogOpen, setRestoreDialogOpen] = useState(false);
  const [pendingBackupData, setPendingBackupData] = useState<any>(null);
  const [pendingFileName, setPendingFileName] = useState<string>('');

  // Backup hooks
  const { data: backupLogs = [], isLoading: logsLoading } = useBackupLogs();
  const { data: latestBackup } = useLatestBackup();
  const triggerBackup = useTriggerBackup();
  const restoreBackup = useRestoreBackup();

  // Handle file upload
  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (!file.name.endsWith('.json')) {
      toast.error('Invalid file', { description: 'Please upload a JSON backup file' });
      return;
    }

    try {
      const content = await file.text();
      const backupData = JSON.parse(content);

      if (!backupData.backup_info || !backupData.tables) {
        toast.error('Invalid backup file', { description: 'This file is not a valid Vedaz ERP backup' });
        return;
      }

      setPendingBackupData(backupData);
      setPendingFileName(file.name);
      setRestoreDialogOpen(true);
    } catch (error) {
      toast.error('Failed to read file', { description: 'Could not parse the backup file' });
    }

    // Reset input
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  // Confirm restore
  const handleConfirmRestore = () => {
    if (pendingBackupData) {
      restoreBackup.mutate({ backupData: pendingBackupData, restoreMode: 'merge' });
    }
    setRestoreDialogOpen(false);
    setPendingBackupData(null);
    setPendingFileName('');
  };

  // Only OWNER can access this
  if (profile?.role !== 'OWNER') {
    return (
      <div className="flex items-center justify-center h-96">
        <Alert variant="destructive" className="max-w-md">
          <Shield className="h-4 w-4" />
          <AlertTitle>Access Denied</AlertTitle>
          <AlertDescription>
            Only owners can access backup tools.
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h1 className="text-2xl font-bold">Backup & Restore</h1>
        <p className="text-muted-foreground">Daily automatic backup • Google Drive</p>
      </div>

      {/* Google Drive Auto Backup Section */}
      <Card className="border-primary/30">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Cloud className="w-5 h-5 text-primary" />
            Google Drive Backup
          </CardTitle>
          <CardDescription>
            Automatic daily backup at midnight Nepal time. Each backup creates a new file.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Status and Actions */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Last Backup Status */}
            <div className="p-4 border rounded-lg bg-muted/30">
              <div className="flex items-center gap-2 mb-2">
                <Clock className="w-4 h-4 text-muted-foreground" />
                <span className="text-sm font-medium">Last Successful Backup</span>
              </div>
              {latestBackup ? (
                <div className="space-y-1">
                  <p className="text-lg font-bold text-green-600">
                    {formatDistanceToNow(new Date(latestBackup.created_at), { addSuffix: true })}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {format(new Date(latestBackup.created_at), 'PPpp')}
                  </p>
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <span>{latestBackup.tables_backed_up} tables</span>
                    <span>•</span>
                    <span>{latestBackup.total_rows?.toLocaleString()} rows</span>
                    <span>•</span>
                    <span>{((latestBackup.file_size || 0) / 1024 / 1024).toFixed(2)} MB</span>
                  </div>
                </div>
              ) : (
                <p className="text-muted-foreground">No backups yet</p>
              )}
            </div>

            {/* Manual Backup Button */}
            <div className="p-4 border rounded-lg bg-primary/5 flex flex-col justify-center">
              <div className="flex items-center gap-2 mb-2">
                <HardDrive className="w-4 h-4 text-primary" />
                <span className="text-sm font-medium">Manual Backup</span>
              </div>
              <p className="text-xs text-muted-foreground mb-3">
                Create immediate backup to Google Drive
              </p>
              <Button 
                onClick={() => triggerBackup.mutate()} 
                disabled={triggerBackup.isPending}
                className="gap-2"
              >
                {triggerBackup.isPending ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Cloud className="w-4 h-4" />
                )}
                {triggerBackup.isPending ? 'Backing up...' : 'Backup Now'}
              </Button>
            </div>

            {/* Restore Section */}
            <div className="p-4 border rounded-lg bg-orange-500/5 flex flex-col justify-center">
              <div className="flex items-center gap-2 mb-2">
                <RotateCcw className="w-4 h-4 text-orange-600" />
                <span className="text-sm font-medium">Restore from Backup</span>
              </div>
              <p className="text-xs text-muted-foreground mb-3">
                Upload a backup file to restore data
              </p>
              <input
                ref={fileInputRef}
                type="file"
                accept=".json"
                onChange={handleFileUpload}
                className="hidden"
              />
              <Button 
                variant="outline"
                onClick={() => fileInputRef.current?.click()} 
                disabled={restoreBackup.isPending}
                className="gap-2 border-orange-300 text-orange-700 hover:bg-orange-50"
              >
                {restoreBackup.isPending ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Upload className="w-4 h-4" />
                )}
                {restoreBackup.isPending ? 'Restoring...' : 'Upload & Restore'}
              </Button>
            </div>
          </div>

          {/* Backup History Table */}
          <div>
            <h4 className="text-sm font-medium mb-2">Backup History</h4>
            <div className="border rounded-lg overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Date</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Size</TableHead>
                    <TableHead>Rows</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {logsLoading ? (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center py-4">
                        <Loader2 className="w-4 h-4 animate-spin mx-auto" />
                      </TableCell>
                    </TableRow>
                  ) : backupLogs.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center py-4 text-muted-foreground">
                        No backups recorded yet
                      </TableCell>
                    </TableRow>
                  ) : (
                    backupLogs.slice(0, 10).map((log) => (
                      <TableRow key={log.id}>
                        <TableCell className="text-sm">
                          {format(new Date(log.created_at), 'MMM d, HH:mm')}
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline" className="text-xs">
                            {log.backup_type}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <Badge 
                            variant="outline" 
                            className={
                              log.status === 'success' ? 'bg-green-500/10 text-green-600' :
                              log.status === 'failed' ? 'bg-red-500/10 text-red-600' :
                              'bg-yellow-500/10 text-yellow-600'
                            }
                          >
                            {log.status}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-sm">
                          {log.file_size ? `${(log.file_size / 1024 / 1024).toFixed(2)} MB` : '-'}
                        </TableCell>
                        <TableCell className="text-sm">
                          {log.total_rows?.toLocaleString() || '-'}
                        </TableCell>
                        <TableCell className="text-right">
                          {log.google_drive_url && (
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => window.open(log.google_drive_url!, '_blank')}
                              title="View in Google Drive"
                            >
                              <ExternalLink className="w-4 h-4" />
                            </Button>
                          )}
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Restore Confirmation Dialog */}
      <AlertDialog open={restoreDialogOpen} onOpenChange={setRestoreDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-orange-500" />
              Confirm Restore
            </AlertDialogTitle>
            <AlertDialogDescription className="space-y-2">
              <p>You are about to restore data from:</p>
              <p className="font-mono text-sm bg-muted p-2 rounded">{pendingFileName}</p>
              {pendingBackupData?.backup_info && (
                <div className="text-sm space-y-1 mt-2">
                  <p>• Backup date: {new Date(pendingBackupData.backup_info.timestamp).toLocaleString()}</p>
                  <p>• Tables: {pendingBackupData.backup_info.tables_count}</p>
                  <p>• Total rows: {pendingBackupData.backup_info.total_rows?.toLocaleString()}</p>
                </div>
              )}
              <p className="text-orange-600 font-medium mt-4">
                This will merge backup data with existing data. Existing records with same IDs will be updated.
              </p>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction 
              onClick={handleConfirmRestore}
              className="bg-orange-600 hover:bg-orange-700"
            >
              Restore Data
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
