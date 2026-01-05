import { useState, useRef } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Shield, Loader2, Cloud, ExternalLink, HardDrive, Upload, RotateCcw, AlertTriangle, Trash2, FileDown, PhoneOff, XCircle, CheckCircle2, Calendar } from 'lucide-react';
import { format, formatDistanceToNow } from 'date-fns';
import { useBackupLogs, useTriggerBackup, useRestoreBackup } from '@/hooks/useBackupLogs';
import { useLeadCleanupCounts, useExportAndDeleteLeads } from '@/hooks/useDataCleanup';
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

type CleanupType = 'cnr' | 'cancelled' | 'confirmed' | 'old6Months' | 'old1Year';

export default function AdminDataTools() {
  const { profile } = useAuth();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [restoreDialogOpen, setRestoreDialogOpen] = useState(false);
  const [pendingBackupData, setPendingBackupData] = useState<any>(null);
  const [pendingFileName, setPendingFileName] = useState<string>('');
  const [cleanupDialogOpen, setCleanupDialogOpen] = useState(false);
  const [pendingCleanupType, setPendingCleanupType] = useState<CleanupType | null>(null);

  // Backup hooks - fetch latest backup (any status)
  const { data: backupLogs = [] } = useBackupLogs();
  const latestBackup = backupLogs[0] || null;
  const triggerBackup = useTriggerBackup();
  const restoreBackup = useRestoreBackup();

  // Cleanup hooks
  const { data: cleanupCounts, isLoading: countsLoading } = useLeadCleanupCounts();
  const exportAndDelete = useExportAndDeleteLeads();

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

  // Cleanup actions
  const openCleanupDialog = (type: CleanupType) => {
    setPendingCleanupType(type);
    setCleanupDialogOpen(true);
  };

  const handleConfirmCleanup = () => {
    if (pendingCleanupType) {
      exportAndDelete.mutate(pendingCleanupType);
    }
    setCleanupDialogOpen(false);
    setPendingCleanupType(null);
  };

  const getCleanupCount = (type: CleanupType) => {
    if (!cleanupCounts) return 0;
    return cleanupCounts[type];
  };

  const getCleanupLabel = (type: CleanupType) => {
    const labels: Record<CleanupType, string> = {
      cnr: 'CNR (Call Not Received)',
      cancelled: 'Cancelled',
      confirmed: 'Confirmed (with Order)',
      old6Months: 'Older than 6 months',
      old1Year: 'Older than 1 year',
    };
    return labels[type];
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

  const isBackupSuccess = latestBackup?.status === 'success';

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h1 className="text-2xl font-bold">Backup & Data Tools</h1>
        <p className="text-muted-foreground">Backup, restore, and cleanup your data</p>
      </div>

      {/* Backup Section */}
      <Card className="border-primary/30">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Cloud className="w-5 h-5 text-primary" />
            Google Drive Backup
          </CardTitle>
          <CardDescription>
            Automatic daily backup at midnight Nepal time
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Last Backup Status - Shows success/failure */}
            <div className={`p-4 border rounded-lg ${isBackupSuccess ? 'bg-green-500/5 border-green-200' : latestBackup ? 'bg-red-500/5 border-red-200' : 'bg-muted/30'}`}>
              <div className="flex items-center gap-2 mb-2">
                {isBackupSuccess ? (
                  <CheckCircle2 className="w-4 h-4 text-green-600" />
                ) : latestBackup ? (
                  <XCircle className="w-4 h-4 text-red-600" />
                ) : (
                  <Cloud className="w-4 h-4 text-muted-foreground" />
                )}
                <span className="text-sm font-medium">Last Backup Status</span>
              </div>
              {latestBackup ? (
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <Badge 
                      variant="outline" 
                      className={isBackupSuccess ? 'bg-green-500/10 text-green-600' : 'bg-red-500/10 text-red-600'}
                    >
                      {latestBackup.status.toUpperCase()}
                    </Badge>
                    <span className="text-sm text-muted-foreground">
                      {formatDistanceToNow(new Date(latestBackup.created_at), { addSuffix: true })}
                    </span>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {format(new Date(latestBackup.created_at), 'PPpp')}
                  </p>
                  {isBackupSuccess ? (
                    <div className="flex items-center gap-2 text-xs text-muted-foreground mt-1">
                      <span>{latestBackup.tables_backed_up} tables</span>
                      <span>•</span>
                      <span>{latestBackup.total_rows?.toLocaleString()} rows</span>
                      <span>•</span>
                      <span>{((latestBackup.file_size || 0) / 1024 / 1024).toFixed(2)} MB</span>
                    </div>
                  ) : (
                    <p className="text-xs text-red-600 mt-1">
                      {latestBackup.error_message || 'Backup failed'}
                    </p>
                  )}
                  {latestBackup.google_drive_url && (
                    <Button
                      variant="link"
                      size="sm"
                      className="h-auto p-0 text-xs"
                      onClick={() => window.open(latestBackup.google_drive_url!, '_blank')}
                    >
                      <ExternalLink className="w-3 h-3 mr-1" />
                      View in Drive
                    </Button>
                  )}
                </div>
              ) : (
                <p className="text-muted-foreground text-sm">No backups yet</p>
              )}
            </div>

            {/* Manual Backup */}
            <div className="p-4 border rounded-lg bg-primary/5 flex flex-col justify-center">
              <div className="flex items-center gap-2 mb-2">
                <HardDrive className="w-4 h-4 text-primary" />
                <span className="text-sm font-medium">Manual Backup</span>
              </div>
              <p className="text-xs text-muted-foreground mb-3">
                Create immediate backup
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

            {/* Restore */}
            <div className="p-4 border rounded-lg bg-orange-500/5 flex flex-col justify-center">
              <div className="flex items-center gap-2 mb-2">
                <RotateCcw className="w-4 h-4 text-orange-600" />
                <span className="text-sm font-medium">Restore from Backup</span>
              </div>
              <p className="text-xs text-muted-foreground mb-3">
                Upload a backup file
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
        </CardContent>
      </Card>

      {/* Data Cleanup Section */}
      <Card className="border-destructive/30">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Trash2 className="w-5 h-5 text-destructive" />
            Data Cleanup
          </CardTitle>
          <CardDescription>
            Export leads to Excel and delete them to improve system performance
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {/* CNR Leads */}
            <div className="p-4 border rounded-lg hover:border-primary/50 transition-colors">
              <div className="flex items-center gap-2 mb-2">
                <PhoneOff className="w-4 h-4 text-orange-500" />
                <span className="text-sm font-medium">CNR Leads</span>
              </div>
              <p className="text-2xl font-bold text-orange-600 mb-1">
                {countsLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : cleanupCounts?.cnr.toLocaleString()}
              </p>
              <p className="text-xs text-muted-foreground mb-3">Call Not Received</p>
              <Button
                variant="outline"
                size="sm"
                className="w-full gap-2"
                onClick={() => openCleanupDialog('cnr')}
                disabled={exportAndDelete.isPending || !cleanupCounts?.cnr}
              >
                <FileDown className="w-4 h-4" />
                Export & Delete
              </Button>
            </div>

            {/* Cancelled Leads */}
            <div className="p-4 border rounded-lg hover:border-primary/50 transition-colors">
              <div className="flex items-center gap-2 mb-2">
                <XCircle className="w-4 h-4 text-red-500" />
                <span className="text-sm font-medium">Cancelled Leads</span>
              </div>
              <p className="text-2xl font-bold text-red-600 mb-1">
                {countsLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : cleanupCounts?.cancelled.toLocaleString()}
              </p>
              <p className="text-xs text-muted-foreground mb-3">Status: Cancelled</p>
              <Button
                variant="outline"
                size="sm"
                className="w-full gap-2"
                onClick={() => openCleanupDialog('cancelled')}
                disabled={exportAndDelete.isPending || !cleanupCounts?.cancelled}
              >
                <FileDown className="w-4 h-4" />
                Export & Delete
              </Button>
            </div>

            {/* Confirmed Leads (with Order) */}
            <div className="p-4 border rounded-lg hover:border-primary/50 transition-colors">
              <div className="flex items-center gap-2 mb-2">
                <CheckCircle2 className="w-4 h-4 text-green-500" />
                <span className="text-sm font-medium">Confirmed Leads</span>
              </div>
              <p className="text-2xl font-bold text-green-600 mb-1">
                {countsLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : cleanupCounts?.confirmed.toLocaleString()}
              </p>
              <p className="text-xs text-muted-foreground mb-3">Already has Order</p>
              <Button
                variant="outline"
                size="sm"
                className="w-full gap-2"
                onClick={() => openCleanupDialog('confirmed')}
                disabled={exportAndDelete.isPending || !cleanupCounts?.confirmed}
              >
                <FileDown className="w-4 h-4" />
                Export & Delete
              </Button>
            </div>

            {/* 6 Months Old */}
            <div className="p-4 border rounded-lg hover:border-primary/50 transition-colors">
              <div className="flex items-center gap-2 mb-2">
                <Calendar className="w-4 h-4 text-purple-500" />
                <span className="text-sm font-medium">6+ Months Old</span>
              </div>
              <p className="text-2xl font-bold text-purple-600 mb-1">
                {countsLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : cleanupCounts?.old6Months.toLocaleString()}
              </p>
              <p className="text-xs text-muted-foreground mb-3">Excludes active leads</p>
              <Button
                variant="outline"
                size="sm"
                className="w-full gap-2"
                onClick={() => openCleanupDialog('old6Months')}
                disabled={exportAndDelete.isPending || !cleanupCounts?.old6Months}
              >
                <FileDown className="w-4 h-4" />
                Export & Delete
              </Button>
            </div>

            {/* 1 Year Old */}
            <div className="p-4 border rounded-lg hover:border-primary/50 transition-colors">
              <div className="flex items-center gap-2 mb-2">
                <Calendar className="w-4 h-4 text-gray-500" />
                <span className="text-sm font-medium">1+ Year Old</span>
              </div>
              <p className="text-2xl font-bold text-gray-600 mb-1">
                {countsLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : cleanupCounts?.old1Year.toLocaleString()}
              </p>
              <p className="text-xs text-muted-foreground mb-3">Excludes active leads</p>
              <Button
                variant="outline"
                size="sm"
                className="w-full gap-2"
                onClick={() => openCleanupDialog('old1Year')}
                disabled={exportAndDelete.isPending || !cleanupCounts?.old1Year}
              >
                <FileDown className="w-4 h-4" />
                Export & Delete
              </Button>
            </div>
          </div>

          <Alert className="mt-4">
            <AlertTriangle className="h-4 w-4" />
            <AlertTitle>Before cleanup</AlertTitle>
            <AlertDescription>
              Always create a backup before deleting data. Deleted leads cannot be recovered.
            </AlertDescription>
          </Alert>
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
                This will merge backup data with existing data.
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

      {/* Cleanup Confirmation Dialog */}
      <AlertDialog open={cleanupDialogOpen} onOpenChange={setCleanupDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <Trash2 className="w-5 h-5 text-destructive" />
              Confirm Export & Delete
            </AlertDialogTitle>
            <AlertDialogDescription className="space-y-2">
              <p>You are about to export and permanently delete:</p>
              <p className="text-2xl font-bold text-foreground">
                {pendingCleanupType && getCleanupCount(pendingCleanupType).toLocaleString()} leads
              </p>
              <p className="text-sm">
                Category: <strong>{pendingCleanupType && getCleanupLabel(pendingCleanupType)}</strong>
              </p>
              <div className="mt-4 p-3 bg-destructive/10 rounded-lg border border-destructive/20">
                <p className="text-destructive font-medium text-sm">
                  ⚠️ This action cannot be undone. The leads will be exported to Excel first, then permanently deleted.
                </p>
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction 
              onClick={handleConfirmCleanup}
              className="bg-destructive hover:bg-destructive/90"
              disabled={exportAndDelete.isPending}
            >
              {exportAndDelete.isPending ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin mr-2" />
                  Processing...
                </>
              ) : (
                'Export & Delete'
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
