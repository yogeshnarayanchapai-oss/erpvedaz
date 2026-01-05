import { useState, useRef, useMemo } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Shield, Loader2, Cloud, ExternalLink, HardDrive, Upload, RotateCcw, AlertTriangle, Trash2, FileDown, CheckCircle2, XCircle, Calendar, Bomb, Mail } from 'lucide-react';
import { useSendFactoryResetCode, useVerifyAndReset } from '@/hooks/useFactoryReset';
import { InputOTP, InputOTPGroup, InputOTPSlot } from '@/components/ui/input-otp';
import { format, formatDistanceToNow, subMonths, subYears } from 'date-fns';
import { useBackupLogs, useTriggerBackup, useRestoreBackup } from '@/hooks/useBackupLogs';
import { 
  useLeadCleanupPreview, 
  useExportAndDeleteLeadsFiltered, 
  LEAD_STATUSES, 
  LeadStatus,
  CleanupFilters,
  getMinCutoffDate,
  isValidCutoffDate
} from '@/hooks/useDataCleanup';
import { useCurrentStoreId } from '@/hooks/useCurrentStoreId';
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { formatStatusLabel } from '@/lib/statusColors';

type DatePreset = '3months' | '6months' | '1year' | 'custom';

export default function AdminDataTools() {
  const { profile } = useAuth();
  const storeId = useCurrentStoreId();
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  // Restore dialog state
  const [restoreDialogOpen, setRestoreDialogOpen] = useState(false);
  const [pendingBackupData, setPendingBackupData] = useState<any>(null);
  const [pendingFileName, setPendingFileName] = useState<string>('');
  
  // Cleanup filter state
  const [datePreset, setDatePreset] = useState<DatePreset>('3months');
  const [customDate, setCustomDate] = useState<string>('');
  const [statusFilter, setStatusFilter] = useState<LeadStatus | 'ALL'>('ALL');
  const [cleanupDialogOpen, setCleanupDialogOpen] = useState(false);
  const [deleteConfirmText, setDeleteConfirmText] = useState('');

  // Factory reset state
  const [factoryResetStep, setFactoryResetStep] = useState<'idle' | 'code-sent' | 'verifying'>('idle');
  const [resetCode, setResetCode] = useState('');
  const [factoryResetDialogOpen, setFactoryResetDialogOpen] = useState(false);

  // Backup hooks
  const { data: backupLogs = [] } = useBackupLogs();
  const latestBackup = backupLogs[0] || null;
  const triggerBackup = useTriggerBackup();
  const restoreBackup = useRestoreBackup();

  // Factory reset hooks
  const sendResetCode = useSendFactoryResetCode();
  const verifyAndReset = useVerifyAndReset();

  // Calculate cutoff date from preset or custom
  const cutoffDate = useMemo(() => {
    const now = new Date();
    switch (datePreset) {
      case '3months':
        return subMonths(now, 3);
      case '6months':
        return subMonths(now, 6);
      case '1year':
        return subYears(now, 1);
      case 'custom':
        if (customDate) {
          const date = new Date(customDate);
          // Validate custom date is at least 3 months old
          if (isValidCutoffDate(date)) {
            return date;
          }
        }
        return null;
      default:
        return subMonths(now, 3);
    }
  }, [datePreset, customDate]);

  // Build filters for preview
  const filters: CleanupFilters | null = useMemo(() => {
    if (!cutoffDate) return null;
    return { cutoffDate, status: statusFilter };
  }, [cutoffDate, statusFilter]);

  // Cleanup hooks
  const { data: previewCount = 0, isLoading: previewLoading } = useLeadCleanupPreview(filters);
  const exportAndDelete = useExportAndDeleteLeadsFiltered();

  // Max date for custom picker (3 months ago)
  const maxCustomDate = useMemo(() => {
    return format(getMinCutoffDate(), 'yyyy-MM-dd');
  }, []);

  // Handle file upload for restore
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

  const handleConfirmRestore = () => {
    if (pendingBackupData) {
      restoreBackup.mutate({ backupData: pendingBackupData, restoreMode: 'merge' });
    }
    setRestoreDialogOpen(false);
    setPendingBackupData(null);
    setPendingFileName('');
  };

  const openCleanupDialog = () => {
    if (!filters || previewCount === 0) {
      toast.error('No leads to delete', { description: 'Adjust your filters' });
      return;
    }
    setDeleteConfirmText('');
    setCleanupDialogOpen(true);
  };

  const handleConfirmCleanup = () => {
    if (filters && deleteConfirmText === 'DELETE') {
      exportAndDelete.mutate(filters);
    }
    setCleanupDialogOpen(false);
    setDeleteConfirmText('');
  };

  const openFactoryResetDialog = () => {
    setFactoryResetStep('idle');
    setResetCode('');
    setFactoryResetDialogOpen(true);
  };

  const handleSendResetCode = async () => {
    await sendResetCode.mutateAsync();
    setFactoryResetStep('code-sent');
  };

  const handleVerifyAndReset = async () => {
    if (resetCode.length !== 6) {
      toast.error('Please enter the 6-digit code');
      return;
    }
    setFactoryResetStep('verifying');
    try {
      await verifyAndReset.mutateAsync(resetCode);
      setFactoryResetDialogOpen(false);
      setFactoryResetStep('idle');
      setResetCode('');
    } catch {
      setFactoryResetStep('code-sent');
    }
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
  const canCleanup = storeId && filters && previewCount > 0 && !exportAndDelete.isPending;

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
            {/* Last Backup Status */}
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
        <CardContent className="space-y-6">
          {!storeId && (
            <Alert variant="destructive">
              <AlertTriangle className="h-4 w-4" />
              <AlertTitle>No Store Selected</AlertTitle>
              <AlertDescription>
                Please select a store from the store switcher to use data cleanup.
              </AlertDescription>
            </Alert>
          )}

          {/* Filters */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Date Filter */}
            <div className="space-y-2">
              <Label className="flex items-center gap-2">
                <Calendar className="w-4 h-4" />
                Date Filter (leads older than)
              </Label>
              <Select 
                value={datePreset} 
                onValueChange={(v) => setDatePreset(v as DatePreset)}
                disabled={!storeId}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select date range" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="3months">Older than 3 months</SelectItem>
                  <SelectItem value="6months">Older than 6 months</SelectItem>
                  <SelectItem value="1year">Older than 1 year</SelectItem>
                  <SelectItem value="custom">Custom date</SelectItem>
                </SelectContent>
              </Select>
              
              {datePreset === 'custom' && (
                <div className="mt-2">
                  <Input
                    type="date"
                    value={customDate}
                    onChange={(e) => setCustomDate(e.target.value)}
                    max={maxCustomDate}
                    disabled={!storeId}
                  />
                  <p className="text-xs text-muted-foreground mt-1">
                    Maximum date: {format(getMinCutoffDate(), 'PPP')} (3 months ago)
                  </p>
                </div>
              )}
            </div>

            {/* Status Filter */}
            <div className="space-y-2">
              <Label>Lead Status</Label>
              <Select 
                value={statusFilter} 
                onValueChange={(v) => setStatusFilter(v as LeadStatus | 'ALL')}
                disabled={!storeId}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ALL">All Statuses</SelectItem>
                  {LEAD_STATUSES.map((status) => (
                    <SelectItem key={status} value={status}>
                      {formatStatusLabel(status)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Preview Count */}
          <div className="p-4 border rounded-lg bg-muted/30">
            <div className="flex items-center justify-between">
              <div>
                <span className="text-sm font-medium">Matched Leads:</span>
                <p className="text-3xl font-bold text-destructive">
                  {previewLoading ? (
                    <Loader2 className="w-6 h-6 animate-spin inline" />
                  ) : (
                    previewCount.toLocaleString()
                  )}
                </p>
                {cutoffDate && (
                  <p className="text-xs text-muted-foreground mt-1">
                    Created before {format(cutoffDate, 'PPP')}
                    {statusFilter !== 'ALL' && ` • Status: ${formatStatusLabel(statusFilter)}`}
                  </p>
                )}
              </div>
              <Button
                variant="destructive"
                size="lg"
                className="gap-2"
                onClick={openCleanupDialog}
                disabled={!canCleanup}
              >
                {exportAndDelete.isPending ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <FileDown className="w-4 h-4" />
                )}
                {exportAndDelete.isPending ? 'Processing...' : 'Export & Delete'}
              </Button>
            </div>
          </div>

          <Alert>
            <AlertTriangle className="h-4 w-4" />
            <AlertTitle>Before cleanup</AlertTitle>
            <AlertDescription>
              Always create a backup before deleting data. Deleted leads cannot be recovered. 
              Leads newer than 3 months cannot be deleted for safety.
            </AlertDescription>
          </Alert>
        </CardContent>
      </Card>

      {/* Factory Reset Section */}
      <Card className="border-red-500/50 bg-red-500/5">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-red-600">
            <Bomb className="w-5 h-5" />
            Factory Reset
          </CardTitle>
          <CardDescription>
            Permanently delete ALL data from the system. This cannot be undone.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Alert variant="destructive">
            <AlertTriangle className="h-4 w-4" />
            <AlertTitle>Danger Zone</AlertTitle>
            <AlertDescription>
              Factory reset will permanently delete ALL data including orders, leads, customers, products, 
              employees, transactions, and backups. Only the system structure will remain.
            </AlertDescription>
          </Alert>
          
          <Button
            variant="destructive"
            size="lg"
            className="gap-2"
            onClick={openFactoryResetDialog}
          >
            <Bomb className="w-4 h-4" />
            Factory Reset
          </Button>
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
            <AlertDialogTitle className="flex items-center gap-2 text-destructive">
              <Trash2 className="w-5 h-5" />
              Confirm Delete
            </AlertDialogTitle>
            <AlertDialogDescription className="space-y-3">
              <p>You are about to permanently delete:</p>
              <div className="bg-destructive/10 border border-destructive/30 rounded-lg p-3 space-y-1">
                <p className="text-2xl font-bold text-destructive">
                  {previewCount.toLocaleString()} leads
                </p>
                <p className="text-sm">
                  {cutoffDate && `Created before ${format(cutoffDate, 'PPP')}`}
                </p>
                <p className="text-sm">
                  Status: {statusFilter === 'ALL' ? 'All Statuses' : formatStatusLabel(statusFilter)}
                </p>
              </div>
              <p className="text-sm text-muted-foreground">
                Leads will be exported to Excel before deletion.
              </p>
              <div className="mt-4">
                <Label className="text-foreground">
                  Type <span className="font-mono font-bold">DELETE</span> to confirm:
                </Label>
                <Input
                  value={deleteConfirmText}
                  onChange={(e) => setDeleteConfirmText(e.target.value.toUpperCase())}
                  placeholder="Type DELETE"
                  className="mt-2"
                />
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setDeleteConfirmText('')}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleConfirmCleanup}
              disabled={deleteConfirmText !== 'DELETE'}
              className="bg-destructive hover:bg-destructive/90"
            >
              Export & Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Factory Reset Dialog */}
      <AlertDialog open={factoryResetDialogOpen} onOpenChange={setFactoryResetDialogOpen}>
        <AlertDialogContent className="max-w-md">
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2 text-red-600">
              <Bomb className="w-5 h-5" />
              Factory Reset
            </AlertDialogTitle>
            <AlertDialogDescription className="space-y-4">
              {factoryResetStep === 'idle' && (
                <>
                  <p className="text-red-600 font-semibold">
                    ⚠️ This will permanently delete ALL data from the system!
                  </p>
                  <div className="bg-red-50 border border-red-200 rounded-lg p-3 text-sm space-y-1">
                    <p>• All orders and leads</p>
                    <p>• All customers</p>
                    <p>• All products and inventory</p>
                    <p>• All employees and HR data</p>
                    <p>• All transactions and accounting</p>
                    <p>• All backups</p>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    A verification code will be sent to your email. You must enter the code to proceed.
                  </p>
                </>
              )}

              {factoryResetStep === 'code-sent' && (
                <>
                  <div className="flex items-center gap-2 text-green-600">
                    <Mail className="w-4 h-4" />
                    <span className="font-medium">Verification code sent to your email</span>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    Enter the 6-digit code from your email to proceed with factory reset.
                  </p>
                  <div className="flex justify-center py-4">
                    <InputOTP
                      maxLength={6}
                      value={resetCode}
                      onChange={(value) => setResetCode(value)}
                    >
                      <InputOTPGroup>
                        <InputOTPSlot index={0} />
                        <InputOTPSlot index={1} />
                        <InputOTPSlot index={2} />
                        <InputOTPSlot index={3} />
                        <InputOTPSlot index={4} />
                        <InputOTPSlot index={5} />
                      </InputOTPGroup>
                    </InputOTP>
                  </div>
                </>
              )}

              {factoryResetStep === 'verifying' && (
                <div className="flex flex-col items-center gap-4 py-8">
                  <Loader2 className="w-8 h-8 animate-spin text-red-600" />
                  <p className="text-sm font-medium">Resetting system...</p>
                  <p className="text-xs text-muted-foreground">This may take a few minutes</p>
                </div>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            {factoryResetStep === 'idle' && (
              <>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <Button
                  variant="destructive"
                  onClick={handleSendResetCode}
                  disabled={sendResetCode.isPending}
                  className="gap-2"
                >
                  {sendResetCode.isPending ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Mail className="w-4 h-4" />
                  )}
                  Send Verification Code
                </Button>
              </>
            )}
            {factoryResetStep === 'code-sent' && (
              <>
                <AlertDialogCancel onClick={() => {
                  setFactoryResetStep('idle');
                  setResetCode('');
                }}>
                  Cancel
                </AlertDialogCancel>
                <Button
                  variant="destructive"
                  onClick={handleVerifyAndReset}
                  disabled={resetCode.length !== 6 || verifyAndReset.isPending}
                  className="gap-2"
                >
                  {verifyAndReset.isPending ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Bomb className="w-4 h-4" />
                  )}
                  Confirm Reset
                </Button>
              </>
            )}
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
