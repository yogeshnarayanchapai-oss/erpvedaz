import { useState } from 'react';
import { useLeaveRequests, useCreateLeaveRequest, useUpdateLeaveRequest, useEmployees, useLeaveTypes } from '@/hooks/useHRM';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Plus, Calendar, CheckCircle, XCircle } from 'lucide-react';
import { differenceInDays } from 'date-fns';
import { FormattedDate } from '@/components/FormattedDate';
import { NepaliDatePicker } from '@/components/NepaliDatePicker';

export default function HRMLeave() {
  const [statusFilter, setStatusFilter] = useState('all');
  const { data: requests = [], isLoading } = useLeaveRequests({ status: statusFilter === 'all' ? undefined : statusFilter });
  const { data: employees = [] } = useEmployees();
  const { data: leaveTypes = [] } = useLeaveTypes();
  const createRequest = useCreateLeaveRequest();
  const updateRequest = useUpdateLeaveRequest();

  const [isOpen, setIsOpen] = useState(false);
  const [form, setForm] = useState({
    employee_id: '',
    leave_type_id: '',
    from_date: '',
    to_date: '',
    reason: '',
  });

  const resetForm = () => setForm({ employee_id: '', leave_type_id: '', from_date: '', to_date: '', reason: '' });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const totalDays = differenceInDays(new Date(form.to_date), new Date(form.from_date)) + 1;
    await createRequest.mutateAsync({ ...form, total_days: totalDays, reason: form.reason || undefined });
    setIsOpen(false);
    resetForm();
  };

  const handleApprove = async (id: string) => {
    await updateRequest.mutateAsync({ id, status: 'Approved' });
  };

  const handleReject = async (id: string) => {
    await updateRequest.mutateAsync({ id, status: 'Rejected' });
  };

  const statusColors: Record<string, string> = {
    Pending: 'bg-warning/10 text-warning',
    Approved: 'bg-success/10 text-success',
    Rejected: 'bg-destructive/10 text-destructive',
    Cancelled: 'bg-muted text-muted-foreground',
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-bold">Leave Management</h1>
          <p className="text-muted-foreground">Manage employee leave requests</p>
        </div>
        <div className="flex gap-2">
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-[140px]"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Status</SelectItem>
              <SelectItem value="Pending">Pending</SelectItem>
              <SelectItem value="Approved">Approved</SelectItem>
              <SelectItem value="Rejected">Rejected</SelectItem>
            </SelectContent>
          </Select>
          <Dialog open={isOpen} onOpenChange={(open) => { setIsOpen(open); if (!open) resetForm(); }}>
            <DialogTrigger asChild><Button><Plus className="w-4 h-4 mr-2" />New Request</Button></DialogTrigger>
            <DialogContent>
              <DialogHeader><DialogTitle>Create Leave Request</DialogTitle></DialogHeader>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-2">
                  <Label>Employee *</Label>
                  <Select value={form.employee_id} onValueChange={(v) => setForm({ ...form, employee_id: v })}>
                    <SelectTrigger><SelectValue placeholder="Select employee" /></SelectTrigger>
                    <SelectContent>{employees.map((e) => <SelectItem key={e.id} value={e.id}>{e.full_name}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Leave Type *</Label>
                  <Select value={form.leave_type_id} onValueChange={(v) => setForm({ ...form, leave_type_id: v })}>
                    <SelectTrigger><SelectValue placeholder="Select type" /></SelectTrigger>
                    <SelectContent>{leaveTypes.map((t) => <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>)}</SelectContent>
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
                <div className="space-y-2"><Label>Reason</Label><Textarea value={form.reason} onChange={(e) => setForm({ ...form, reason: e.target.value })} rows={2} /></div>
                <Button type="submit" className="w-full" disabled={createRequest.isPending}>Submit Request</Button>
              </form>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      <Card>
        <CardHeader><CardTitle className="flex items-center gap-2"><Calendar className="w-5 h-5 text-primary" />Leave Requests</CardTitle></CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Employee</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>From</TableHead>
                <TableHead>To</TableHead>
                <TableHead>Days</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {requests.map((r) => (
                <TableRow key={r.id}>
                  <TableCell className="font-medium">{r.employees?.full_name || '-'}</TableCell>
                  <TableCell>{r.leave_types?.name || '-'}</TableCell>
                  <TableCell><FormattedDate date={r.from_date} /></TableCell>
                  <TableCell><FormattedDate date={r.to_date} /></TableCell>
                  <TableCell>{r.total_days}</TableCell>
                  <TableCell><Badge variant="outline" className={statusColors[r.status]}>{r.status}</Badge></TableCell>
                  <TableCell className="text-right">
                    {r.status === 'Pending' && (
                      <>
                        <Button variant="ghost" size="icon" onClick={() => handleApprove(r.id)} title="Approve"><CheckCircle className="w-4 h-4 text-success" /></Button>
                        <Button variant="ghost" size="icon" onClick={() => handleReject(r.id)} title="Reject"><XCircle className="w-4 h-4 text-destructive" /></Button>
                      </>
                    )}
                  </TableCell>
                </TableRow>
              ))}
              {requests.length === 0 && <TableRow><TableCell colSpan={7} className="text-center py-8 text-muted-foreground">{isLoading ? 'Loading...' : 'No requests'}</TableCell></TableRow>}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
