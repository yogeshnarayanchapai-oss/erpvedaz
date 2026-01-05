import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Shield, Loader2, Cloud, ExternalLink, Clock, HardDrive } from 'lucide-react';
import { format, formatDistanceToNow } from 'date-fns';
import { useBackupLogs, useLatestBackup, useTriggerBackup } from '@/hooks/useBackupLogs';

export default function AdminDataTools() {
  const { profile } = useAuth();

  // Backup hooks
  const { data: backupLogs = [], isLoading: logsLoading } = useBackupLogs();
  const { data: latestBackup } = useLatestBackup();
  const triggerBackup = useTriggerBackup();

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
        <h1 className="text-2xl font-bold">Backup</h1>
        <p className="text-muted-foreground">Google Drive backup management</p>
      </div>

      {/* Google Drive Auto Backup Section */}
      <Card className="border-primary/30">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Cloud className="w-5 h-5 text-primary" />
            Google Drive Backup
          </CardTitle>
          <CardDescription>
            Automatic daily backup to Google Drive. Manual backup also available.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Status and Manual Backup */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
                Trigger an immediate backup to Google Drive
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
    </div>
  );
}
