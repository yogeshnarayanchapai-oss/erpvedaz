import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Plus, Calendar, CheckCircle, XCircle, Clock, Info } from 'lucide-react';
import { differenceInDays, format } from 'date-fns';
import { FormattedDate } from '@/components/FormattedDate';
import { NepaliDatePicker } from '@/components/NepaliDatePicker';
import { useMyEmployeeProfile } from '@/hooks/useEmployeeDocuments';
import { useLeaveRequests, useCreateLeaveRequest, useLeaveTypes } from '@/hooks/useHRM';
import { useMyLeaveQuota } from '@/hooks/useLeaveQuota';

export default function MyHRLeave() {
  const { data: employee, isLoading: loadingEmployee } = useMyEmployeeProfile();
  const { data: requests = [], isLoading } = useLeaveRequests({ employeeId: employee?.id });
  const { data: leaveTypes = [] } = useLeaveTypes();
  const { data: leaveQuota } = useMyLeaveQuota();
  const createRequest = useCreateLeaveRequest();

  const [isOpen, setIsOpen] = useState(false);
  const [form, setForm] = useState({
    leave_type_id: '',
    from_date: '',
    to_date: '',
    reason: '',
  });

  const resetForm = () => setForm({ leave_type_id: '', from_date: '', to_date: '', reason: '' });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!employee) return;
    
    const totalDays = differenceInDays(new Date(form.to_date), new Date(form.from_date)) + 1;
    await createRequest.mutateAsync({ 
      employee_id: employee.id,
      ...form, 
      total_days: totalDays, 
      reason: form.reason || undefined 
    });
    setIsOpen(false);
    resetForm();
  };

  const statusColors: Record<string, string> = {
    Pending: 'bg-warning/10 text-warning',
    Approved: 'bg-success/10 text-success',
    Rejected: 'bg-destructive/10 text-destructive',
    Cancelled: 'bg-muted text-muted-foreground',
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'Approved': return <CheckCircle className="w-4 h-4" />;
      case 'Rejected': return <XCircle className="w-4 h-4" />;
      default: return <Clock className="w-4 h-4" />;
    }
  };

  // Calculate leave stats
  const approvedDays = requests
    .filter(r => r.status === 'Approved')
    .reduce((sum, r) => sum + r.total_days, 0);
  const pendingRequests = requests.filter(r => r.status === 'Pending').length;
  const remainingQuota = (leaveQuota?.max_days || 0) - approvedDays;

  if (loadingEmployee) {
    return <div className="p-6 text-center text-muted-foreground">Loading...</div>;
  }

  if (!employee) {
    return (
      <div className="p-6 text-center">
        <Info className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
        <h3 className="text-lg font-medium mb-2">No Employee Profile</h3>
        <p className="text-muted-foreground">Your account is not linked to an employee record. Please contact HR.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-bold">My Leave Requests</h1>
          <p className="text-muted-foreground">Apply for leave and track your requests</p>
        </div>
        <Dialog open={isOpen} onOpenChange={(open) => { setIsOpen(open); if (!open) resetForm(); }}>
          <DialogTrigger asChild><Button><Plus className="w-4 h-4 mr-2" />Apply for Leave</Button></DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>Apply for Leave</DialogTitle></DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label>Leave Type *</Label>
                <Select value={form.leave_type_id} onValueChange={(v) => setForm({ ...form, leave_type_id: v })}>
                  <SelectTrigger><SelectValue placeholder="Select type" /></SelectTrigger>
                  <SelectContent>
                    {leaveTypes.map((t) => <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>From *</Label>
                  <NepaliDatePicker value={form.from_date} onChange={(v) => setForm({ ...form, from_date: v })} placeholder="Select start date" />
                </div>
                <div className="space-y-2">
                  <Label>To *</Label>
                  <NepaliDatePicker value={form.to_date} onChange={(v) => setForm({ ...form, to_date: v })} placeholder="Select end date" />
                </div>
              </div>
              {form.from_date && form.to_date && (
                <p className="text-sm text-muted-foreground">
                  Total Days: <strong>{differenceInDays(new Date(form.to_date), new Date(form.from_date)) + 1}</strong>
                </p>
              )}
              <div className="space-y-2"><Label>Reason</Label><Textarea value={form.reason} onChange={(e) => setForm({ ...form, reason: e.target.value })} rows={2} placeholder="Optional: Describe reason for leave" /></div>
              <Button type="submit" className="w-full" disabled={createRequest.isPending || !form.leave_type_id || !form.from_date || !form.to_date}>
                Submit Request
              </Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Leave Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-primary/10 rounded-lg">
                <Calendar className="w-5 h-5 text-primary" />
              </div>
              <div>
                <div className="text-2xl font-bold">{leaveQuota?.max_days || '-'}</div>
                <div className="text-xs text-muted-foreground">Monthly Quota</div>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-green-100 rounded-lg">
                <CheckCircle className="w-5 h-5 text-green-600" />
              </div>
              <div>
                <div className="text-2xl font-bold">{approvedDays}</div>
                <div className="text-xs text-muted-foreground">Days Taken</div>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-100 rounded-lg">
                <Clock className="w-5 h-5 text-blue-600" />
              </div>
              <div>
                <div className="text-2xl font-bold">{remainingQuota > 0 ? remainingQuota : 0}</div>
                <div className="text-xs text-muted-foreground">Remaining</div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Leave Requests Table */}
      <Card>
        <CardHeader><CardTitle className="flex items-center gap-2"><Calendar className="w-5 h-5 text-primary" />My Leave Requests</CardTitle></CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Type</TableHead>
                <TableHead>From</TableHead>
                <TableHead>To</TableHead>
                <TableHead>Days</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Applied On</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {requests.map((r) => (
                <TableRow key={r.id}>
                  <TableCell className="font-medium">{r.leave_types?.name || '-'}</TableCell>
                  <TableCell><FormattedDate date={r.from_date} /></TableCell>
                  <TableCell><FormattedDate date={r.to_date} /></TableCell>
                  <TableCell>{r.total_days}</TableCell>
                  <TableCell>
                    <Badge variant="outline" className={statusColors[r.status]}>
                      {getStatusIcon(r.status)}
                      <span className="ml-1">{r.status}</span>
                    </Badge>
                  </TableCell>
                  <TableCell className="text-muted-foreground text-sm">
                    {format(new Date(r.created_at), 'MMM dd, yyyy')}
                  </TableCell>
                </TableRow>
              ))}
              {requests.length === 0 && (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                    {isLoading ? 'Loading...' : 'No leave requests yet'}
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}