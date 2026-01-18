import { useState, useRef, useMemo } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Loader2, Cloud, HardDrive, Upload, RotateCcw, AlertTriangle, Trash2, FileDown, CheckCircle2, XCircle, Calendar, Bomb, Mail } from 'lucide-react';
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

export default function DataToolsSettingsTab() {
  const { profile } = useAuth();
  const storeId = useCurrentStoreId();
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const [restoreDialogOpen, setRestoreDialogOpen] = useState(false);
  const [pendingBackupData, setPendingBackupData] = useState<any>(null);
  const [pendingFileName, setPendingFileName] = useState<string>('');
  
  const [datePreset, setDatePreset] = useState<DatePreset>('3months');
  const [customDate, setCustomDate] = useState<string>('');
  const [statusFilter, setStatusFilter] = useState<LeadStatus | 'ALL'>('ALL');
  const [cleanupDialogOpen, setCleanupDialogOpen] = useState(false);
  const [deleteConfirmText, setDeleteConfirmText] = useState('');

  const [factoryResetStep, setFactoryResetStep] = useState<'idle' | 'code-sent' | 'verifying'>('idle');
  const [resetCode, setResetCode] = useState('');
  const [factoryResetDialogOpen, setFactoryResetDialogOpen] = useState(false);

  const { data: backupLogs = [] } = useBackupLogs();
  const latestBackup = backupLogs[0] || null;
  const triggerBackup = useTriggerBackup();
  const restoreBackup = useRestoreBackup();

  const sendResetCode = useSendFactoryResetCode();
  const verifyAndReset = useVerifyAndReset();

  const cutoffDate = useMemo(() => {
    const now = new Date();
    switch (datePreset) {
      case '3months': return subMonths(now, 3);
      case '6months': return subMonths(now, 6);
      case '1year': return subYears(now, 1);
      case 'custom': return customDate ? new Date(customDate) : subMonths(now, 3);
      default: return subMonths(now, 3);
    }
  }, [datePreset, customDate]);

  const filters: CleanupFilters = {
    cutoffDate: cutoffDate,
    status: statusFilter === 'ALL' ? 'ALL' : statusFilter,
  };

  const { data: previewData, isLoading: previewLoading } = useLeadCleanupPreview(filters);
  const exportAndDelete = useExportAndDeleteLeadsFiltered();

  const handleCleanup = async () => {
    if (deleteConfirmText !== 'DELETE') {
      toast.error('Please type DELETE to confirm');
      return;
    }
    
    try {
      await exportAndDelete.mutateAsync(filters);
      setCleanupDialogOpen(false);
      setDeleteConfirmText('');
      toast.success('Leads exported and deleted successfully');
    } catch (error) {
      toast.error('Failed to cleanup leads');
    }
  };

  return (
    <div className="space-y-6">
      {/* Backup Section */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Cloud className="w-5 h-5" />
            Data Backup
          </CardTitle>
          <CardDescription>Create and manage backups of your data</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between p-4 border rounded-lg">
            <div>
              <p className="font-medium">Last Backup</p>
              <p className="text-sm text-muted-foreground">
                {latestBackup ? formatDistanceToNow(new Date(latestBackup.created_at), { addSuffix: true }) : 'No backups yet'}
              </p>
            </div>
            <Button onClick={() => triggerBackup.mutate()} disabled={triggerBackup.isPending}>
              {triggerBackup.isPending ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <HardDrive className="w-4 h-4 mr-2" />}
              Create Backup
            </Button>
          </div>

          {backupLogs.length > 0 && (
            <div className="space-y-2">
              <Label>Recent Backups</Label>
              <div className="max-h-40 overflow-y-auto space-y-2">
                {backupLogs.slice(0, 5).map((log) => (
                  <div key={log.id} className="flex items-center justify-between p-2 text-sm border rounded">
                    <span>{log.file_name || 'Backup'}</span>
                    <Badge variant={log.status === 'completed' ? 'default' : 'secondary'}>{log.status}</Badge>
                  </div>
                ))}
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Lead Cleanup Section */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Trash2 className="w-5 h-5" />
            Lead Data Cleanup
          </CardTitle>
          <CardDescription>Export and delete old leads to keep your database clean</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Delete leads older than</Label>
              <Select value={datePreset} onValueChange={(v) => setDatePreset(v as DatePreset)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="3months">3 months</SelectItem>
                  <SelectItem value="6months">6 months</SelectItem>
                  <SelectItem value="1year">1 year</SelectItem>
                  <SelectItem value="custom">Custom date</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Filter by status</Label>
              <Select value={statusFilter} onValueChange={(v) => setStatusFilter(v as LeadStatus | 'ALL')}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ALL">All statuses</SelectItem>
                  {LEAD_STATUSES.map(status => (
                    <SelectItem key={status} value={status}>{formatStatusLabel(status)}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {datePreset === 'custom' && (
            <div className="space-y-2">
              <Label>Custom cutoff date</Label>
              <Input type="date" value={customDate} onChange={(e) => setCustomDate(e.target.value)} max={format(getMinCutoffDate(), 'yyyy-MM-dd')} />
            </div>
          )}

          <div className="p-4 border rounded-lg bg-muted/50">
            <p className="text-sm">
              {previewLoading ? 'Calculating...' : (
                previewData ? `${previewData} leads will be affected` : 'No leads match the criteria'
              )}
            </p>
          </div>

          <Button 
            variant="destructive" 
            onClick={() => setCleanupDialogOpen(true)}
            disabled={!previewData || previewData === 0}
          >
            <FileDown className="w-4 h-4 mr-2" />
            Export & Delete Leads
          </Button>
        </CardContent>
      </Card>

      {/* Factory Reset Section */}
      <Card className="border-destructive">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-destructive">
            <Bomb className="w-5 h-5" />
            Factory Reset
          </CardTitle>
          <CardDescription>Permanently delete all data. This action cannot be undone.</CardDescription>
        </CardHeader>
        <CardContent>
          <Alert variant="destructive">
            <AlertTriangle className="h-4 w-4" />
            <AlertTitle>Danger Zone</AlertTitle>
            <AlertDescription>
              This will permanently delete all orders, leads, customers, and other data from this store.
            </AlertDescription>
          </Alert>
          <Button 
            variant="destructive" 
            className="mt-4"
            onClick={() => setFactoryResetDialogOpen(true)}
          >
            <Bomb className="w-4 h-4 mr-2" />
            Factory Reset
          </Button>
        </CardContent>
      </Card>

      <AlertDialog open={cleanupDialogOpen} onOpenChange={setCleanupDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirm Lead Cleanup</AlertDialogTitle>
            <AlertDialogDescription>
              This will export {previewData || 0} leads to a file and then permanently delete them. Type DELETE to confirm.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <Input 
            value={deleteConfirmText} 
            onChange={(e) => setDeleteConfirmText(e.target.value)}
            placeholder="Type DELETE to confirm"
          />
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleCleanup} disabled={deleteConfirmText !== 'DELETE' || exportAndDelete.isPending}>
              {exportAndDelete.isPending ? 'Processing...' : 'Export & Delete'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Factory Reset Dialog */}
      <AlertDialog open={factoryResetDialogOpen} onOpenChange={setFactoryResetDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Factory Reset</AlertDialogTitle>
            <AlertDialogDescription>
              {factoryResetStep === 'idle' && 'A verification code will be sent to your email.'}
              {factoryResetStep === 'code-sent' && 'Enter the 6-digit code sent to your email.'}
            </AlertDialogDescription>
          </AlertDialogHeader>
          
          {factoryResetStep === 'code-sent' && (
            <div className="flex justify-center py-4">
              <InputOTP maxLength={6} value={resetCode} onChange={setResetCode}>
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
          )}

          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => { setFactoryResetStep('idle'); setResetCode(''); }}>
              Cancel
            </AlertDialogCancel>
            {factoryResetStep === 'idle' && (
              <AlertDialogAction
                onClick={async () => {
                  try {
                    await sendResetCode.mutateAsync();
                    setFactoryResetStep('code-sent');
                    toast.success('Verification code sent to your email');
                  } catch (error) {
                    toast.error('Failed to send verification code');
                  }
                }}
                disabled={sendResetCode.isPending}
              >
                {sendResetCode.isPending ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Mail className="w-4 h-4 mr-2" />}
                Send Code
              </AlertDialogAction>
            )}
            {factoryResetStep === 'code-sent' && (
              <AlertDialogAction
                onClick={async () => {
                  try {
                    await verifyAndReset.mutateAsync(resetCode);
                    toast.success('Factory reset completed');
                    setFactoryResetDialogOpen(false);
                    setFactoryResetStep('idle');
                    setResetCode('');
                  } catch (error) {
                    toast.error('Invalid code or reset failed');
                  }
                }}
                disabled={resetCode.length !== 6 || verifyAndReset.isPending}
                className="bg-destructive hover:bg-destructive/90"
              >
                {verifyAndReset.isPending ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
                Confirm Reset
              </AlertDialogAction>
            )}
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
