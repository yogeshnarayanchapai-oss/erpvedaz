import { useState } from 'react';
import { usePayrollRecords, useCreatePayrollRecord, useUpdatePayrollRecord, useGenerateMonthlyPayroll, useEmployees } from '@/hooks/useHRM';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { DollarSign, Download, Play, CheckCircle, Pencil } from 'lucide-react';
import { format, startOfMonth } from 'date-fns';

export default function HRMPayroll() {
  const [selectedMonth, setSelectedMonth] = useState(format(startOfMonth(new Date()), 'yyyy-MM-01'));
  const { data: records = [], isLoading } = usePayrollRecords(selectedMonth);
  const { data: employees = [] } = useEmployees();
  const generatePayroll = useGenerateMonthlyPayroll();
  const updatePayroll = useUpdatePayrollRecord();

  const [editingRecord, setEditingRecord] = useState<any>(null);
  const [editForm, setEditForm] = useState({ allowances: '', deductions: '', notes: '' });

  const handleGenerate = () => generatePayroll.mutate(selectedMonth);

  const openEdit = (record: any) => {
    setEditingRecord(record);
    setEditForm({
      allowances: record.allowances?.toString() || '',
      deductions: record.deductions?.toString() || '',
      notes: record.notes || '',
    });
  };

  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await updatePayroll.mutateAsync({
      id: editingRecord.id,
      allowances: editForm.allowances ? parseFloat(editForm.allowances) : 0,
      deductions: editForm.deductions ? parseFloat(editForm.deductions) : 0,
      notes: editForm.notes || undefined,
    });
    setEditingRecord(null);
  };

  const markAsPaid = async (id: string) => {
    await updatePayroll.mutateAsync({
      id,
      payment_status: 'Paid',
      paid_on: new Date().toISOString().split('T')[0],
    });
  };

  const exportCSV = () => {
    const headers = ['Employee', 'Basic', 'Allowances', 'Deductions', 'Net Salary', 'Status', 'Paid On'];
    const rows = records.map((r) => [
      r.employees?.full_name || '',
      r.basic_salary,
      r.allowances || 0,
      r.deductions || 0,
      r.net_salary,
      r.payment_status,
      r.paid_on || '',
    ]);
    const csv = [headers, ...rows].map((r) => r.map((c) => `"${c}"`).join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `payroll-${selectedMonth}.csv`;
    a.click();
  };

  const totalNet = records.reduce((sum, r) => sum + (r.net_salary || 0), 0);
  const paidCount = records.filter((r) => r.payment_status === 'Paid').length;

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-bold">Payroll</h1>
          <p className="text-muted-foreground">Manage monthly payroll records</p>
        </div>
        <div className="flex gap-2">
          <Input type="month" value={selectedMonth.slice(0, 7)} onChange={(e) => setSelectedMonth(e.target.value + '-01')} className="w-40" />
          <Button variant="outline" onClick={handleGenerate} disabled={generatePayroll.isPending}>
            <Play className="w-4 h-4 mr-2" />Generate
          </Button>
          <Button variant="outline" onClick={exportCSV}>
            <Download className="w-4 h-4 mr-2" />Export
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="text-sm text-muted-foreground">Total Records</div>
            <div className="text-2xl font-bold">{records.length}</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-sm text-muted-foreground">Total Net Salary</div>
            <div className="text-2xl font-bold text-success">₹{totalNet.toLocaleString()}</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-sm text-muted-foreground">Paid</div>
            <div className="text-2xl font-bold">{paidCount} / {records.length}</div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader><CardTitle className="flex items-center gap-2"><DollarSign className="w-5 h-5 text-primary" />Payroll for {format(new Date(selectedMonth), 'MMMM yyyy')}</CardTitle></CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Employee</TableHead>
                <TableHead className="text-right">Basic</TableHead>
                <TableHead className="text-right">Allowances</TableHead>
                <TableHead className="text-right">Deductions</TableHead>
                <TableHead className="text-right">Net Salary</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {records.map((r) => (
                <TableRow key={r.id}>
                  <TableCell className="font-medium">{r.employees?.full_name || '-'}</TableCell>
                  <TableCell className="text-right">₹{r.basic_salary.toLocaleString()}</TableCell>
                  <TableCell className="text-right text-success">+₹{(r.allowances || 0).toLocaleString()}</TableCell>
                  <TableCell className="text-right text-destructive">-₹{(r.deductions || 0).toLocaleString()}</TableCell>
                  <TableCell className="text-right font-bold">₹{r.net_salary.toLocaleString()}</TableCell>
                  <TableCell>
                    <Badge variant={r.payment_status === 'Paid' ? 'default' : 'secondary'}>{r.payment_status}</Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    <Button variant="ghost" size="icon" onClick={() => openEdit(r)}><Pencil className="w-4 h-4" /></Button>
                    {r.payment_status !== 'Paid' && (
                      <Button variant="ghost" size="icon" onClick={() => markAsPaid(r.id)}><CheckCircle className="w-4 h-4 text-success" /></Button>
                    )}
                  </TableCell>
                </TableRow>
              ))}
              {records.length === 0 && <TableRow><TableCell colSpan={7} className="text-center py-8 text-muted-foreground">{isLoading ? 'Loading...' : 'No records. Click Generate to create payroll.'}</TableCell></TableRow>}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Dialog open={!!editingRecord} onOpenChange={(open) => !open && setEditingRecord(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>Edit Payroll</DialogTitle></DialogHeader>
          <form onSubmit={handleEditSubmit} className="space-y-4">
            <div className="space-y-2"><Label>Allowances</Label><Input type="number" value={editForm.allowances} onChange={(e) => setEditForm({ ...editForm, allowances: e.target.value })} /></div>
            <div className="space-y-2"><Label>Deductions</Label><Input type="number" value={editForm.deductions} onChange={(e) => setEditForm({ ...editForm, deductions: e.target.value })} /></div>
            <div className="space-y-2"><Label>Notes</Label><Input value={editForm.notes} onChange={(e) => setEditForm({ ...editForm, notes: e.target.value })} /></div>
            <Button type="submit" className="w-full" disabled={updatePayroll.isPending}>Update</Button>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
