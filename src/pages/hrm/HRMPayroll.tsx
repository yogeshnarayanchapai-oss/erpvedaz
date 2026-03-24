import { useState, useMemo } from 'react';
import { usePayrollRecords, useUpdatePayrollRecord, useGenerateMonthlyPayroll, useDeletePayrollRecord } from '@/hooks/useHRM';
import { useEmployeeBankAccounts } from '@/hooks/useEmployeeBankAccounts';
import { getCurrentBSDate, getBSMonthName, getBSYearRange, bsToAd, adToBS } from '@/lib/nepaliDate';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Badge } from '@/components/ui/badge';
import { DollarSign, Download, Play, CheckCircle, Pencil, MoreHorizontal, Trash2, CreditCard, AlertCircle, ArrowUpDown, FileText } from 'lucide-react';
import { format, startOfMonth } from 'date-fns';

export default function HRMPayroll() {
  const currentBS = getCurrentBSDate();
  const bsYearOptions = getBSYearRange();

  // Always use BS month for payroll
  const [bsYear, setBsYear] = useState(currentBS.year);
  const [bsMonth, setBsMonth] = useState(currentBS.month);

  // Convert BS year/month to AD date for database query
  const selectedMonth = useMemo(() => {
    const adDate = bsToAd(bsYear, bsMonth, 1);
    const year = adDate.getFullYear();
    const month = String(adDate.getMonth() + 1).padStart(2, '0');
    return `${year}-${month}-01`;
  }, [bsYear, bsMonth]);

  // Display label always in BS
  const monthDisplayLabel = useMemo(() => {
    return `${getBSMonthName(bsMonth)} ${bsYear}`;
  }, [bsYear, bsMonth]);

  const { data: records = [], isLoading } = usePayrollRecords(selectedMonth);
  const generatePayroll = useGenerateMonthlyPayroll();
  const updatePayroll = useUpdatePayrollRecord();
  const deletePayroll = useDeletePayrollRecord();

  const [editingRecord, setEditingRecord] = useState<any>(null);
  const [editForm, setEditForm] = useState({ allowances: '', deductions: '', notes: '' });
  const [sortBy, setSortBy] = useState<'newest' | 'name'>('newest');
  const [viewRecord, setViewRecord] = useState<any>(null);
  
  // Payment confirmation state
  const [paymentConfirmRecord, setPaymentConfirmRecord] = useState<any>(null);

  // Sort records
  const sortedRecords = useMemo(() => {
    const sorted = [...records];
    if (sortBy === 'name') {
      sorted.sort((a, b) => (a.employees?.full_name || '').localeCompare(b.employees?.full_name || ''));
    }
    return sorted;
  }, [records, sortBy]);

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

  const confirmPayment = async () => {
    if (!paymentConfirmRecord) return;
    await updatePayroll.mutateAsync({
      id: paymentConfirmRecord.id,
      payment_status: 'Paid',
      paid_on: new Date().toISOString().split('T')[0],
    });
    setPaymentConfirmRecord(null);
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
        <div className="flex gap-2 items-center">
          <Select value={bsMonth.toString()} onValueChange={(v) => setBsMonth(parseInt(v))}>
            <SelectTrigger className="w-32">
              <SelectValue placeholder="Month" />
            </SelectTrigger>
            <SelectContent>
              {Array.from({ length: 12 }, (_, i) => i + 1).map((m) => (
                <SelectItem key={m} value={m.toString()}>{getBSMonthName(m)}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={bsYear.toString()} onValueChange={(v) => setBsYear(parseInt(v))}>
            <SelectTrigger className="w-24">
              <SelectValue placeholder="Year" />
            </SelectTrigger>
            <SelectContent>
              {bsYearOptions.map((y) => (
                <SelectItem key={y} value={y.toString()}>{y}</SelectItem>
              ))}
            </SelectContent>
          </Select>
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
            <div className="text-2xl font-bold text-success">रू {totalNet.toLocaleString()}</div>
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
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <DollarSign className="w-5 h-5 text-primary" />
              Payroll for {monthDisplayLabel}
            </CardTitle>
            <Select value={sortBy} onValueChange={(v) => setSortBy(v as 'newest' | 'name')}>
              <SelectTrigger className="w-36">
                <ArrowUpDown className="w-3.5 h-3.5 mr-1.5" />
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="newest">Newest First</SelectItem>
                <SelectItem value="name">By Name</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Employee</TableHead>
                <TableHead>Month</TableHead>
                <TableHead className="text-right">Basic</TableHead>
                <TableHead className="text-right">Allowances</TableHead>
                <TableHead className="text-right">Deductions</TableHead>
                <TableHead className="text-right">Net Salary</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {sortedRecords.map((r) => (
                <TableRow key={r.id}>
                  <TableCell className="font-medium">{r.employees?.full_name || '-'}</TableCell>
                  <TableCell className="text-muted-foreground text-sm">{monthDisplayLabel}</TableCell>
                  <TableCell className="text-right">रू {r.basic_salary.toLocaleString()}</TableCell>
                  <TableCell className="text-right text-success">+रू {(r.allowances || 0).toLocaleString()}</TableCell>
                  <TableCell className="text-right text-destructive">-रू {(r.deductions || 0).toLocaleString()}</TableCell>
                  <TableCell className="text-right font-bold">रू {r.net_salary.toLocaleString()}</TableCell>
                  <TableCell>
                    <Badge variant={r.payment_status === 'Paid' ? 'default' : 'secondary'}>{r.payment_status}</Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon">
                          <MoreHorizontal className="w-4 h-4" />
                        </Button>
                      </DropdownMenuTrigger>
                       <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => setViewRecord(r)}>
                          <FileText className="w-4 h-4 mr-2" />
                          View
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => openEdit(r)}>
                          <Pencil className="w-4 h-4 mr-2" />
                          Edit
                        </DropdownMenuItem>
                        {r.payment_status !== 'Paid' && (
                          <DropdownMenuItem onClick={() => setPaymentConfirmRecord(r)}>
                            <CheckCircle className="w-4 h-4 mr-2 text-success" />
                            Mark as Paid
                          </DropdownMenuItem>
                        )}
                        <DropdownMenuItem 
                          onClick={() => deletePayroll.mutate(r.id)}
                          className="text-destructive focus:text-destructive"
                        >
                          <Trash2 className="w-4 h-4 mr-2" />
                          Delete
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))}
              {records.length === 0 && (
                <TableRow>
                  <TableCell colSpan={8} className="text-center py-8 text-muted-foreground">
                    {isLoading ? 'Loading...' : 'No records. Click Generate to create payroll.'}
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Edit Payroll Dialog */}
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

      {/* View Payroll Detail Dialog */}
      <Dialog open={!!viewRecord} onOpenChange={(open) => !open && setViewRecord(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle className="flex items-center gap-2"><FileText className="w-5 h-5 text-primary" />Payroll Details</DialogTitle></DialogHeader>
          {viewRecord && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div><span className="text-muted-foreground">Employee:</span><p className="font-medium">{viewRecord.employees?.full_name || '-'}</p></div>
                <div><span className="text-muted-foreground">Month:</span><p className="font-medium">{monthDisplayLabel}</p></div>
                <div><span className="text-muted-foreground">Basic Salary:</span><p className="font-medium">रू {viewRecord.basic_salary.toLocaleString()}</p></div>
                <div><span className="text-muted-foreground">Allowances:</span><p className="font-medium text-success">+रू {(viewRecord.allowances || 0).toLocaleString()}</p></div>
                <div><span className="text-muted-foreground">Deductions:</span><p className="font-medium text-destructive">-रू {(viewRecord.deductions || 0).toLocaleString()}</p></div>
                <div><span className="text-muted-foreground">Net Salary:</span><p className="font-bold text-lg">रू {viewRecord.net_salary.toLocaleString()}</p></div>
                <div><span className="text-muted-foreground">Status:</span><p><Badge variant={viewRecord.payment_status === 'Paid' ? 'default' : 'secondary'}>{viewRecord.payment_status}</Badge></p></div>
                {viewRecord.notes && <div className="col-span-2"><span className="text-muted-foreground">Notes:</span><p className="font-medium">{viewRecord.notes}</p></div>}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Payment Confirmation Dialog */}
      <PaymentConfirmationDialog
        record={paymentConfirmRecord}
        onClose={() => setPaymentConfirmRecord(null)}
        onConfirm={confirmPayment}
        isPending={updatePayroll.isPending}
      />
    </div>
  );
}

// Separate component for payment confirmation with bank details
function PaymentConfirmationDialog({ 
  record, 
  onClose, 
  onConfirm, 
  isPending 
}: { 
  record: any; 
  onClose: () => void; 
  onConfirm: () => void; 
  isPending: boolean;
}) {
  const { data: bankAccounts = [], isLoading } = useEmployeeBankAccounts(record?.employee_id);
  
  if (!record) return null;

  const defaultBank = bankAccounts.find(b => b.is_default) || bankAccounts[0];

  return (
    <Dialog open={!!record} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <CheckCircle className="w-5 h-5 text-success" />
            Confirm Payment
          </DialogTitle>
          <DialogDescription>
            Review payment details before marking as paid
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Employee Info */}
          <div className="p-4 bg-muted rounded-lg space-y-2">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Employee</span>
              <span className="font-medium">{record.employees?.full_name || '-'}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Net Salary</span>
              <span className="font-bold text-lg text-success">रू {record.net_salary?.toLocaleString()}</span>
            </div>
          </div>

          {/* Bank Account Info */}
          <div className="p-4 border rounded-lg space-y-2">
            <div className="flex items-center gap-2 text-sm font-medium mb-2">
              <CreditCard className="w-4 h-4 text-primary" />
              Bank Account Details
            </div>
            {isLoading ? (
              <p className="text-sm text-muted-foreground">Loading bank details...</p>
            ) : defaultBank ? (
              <div className="space-y-1 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Bank</span>
                  <span className="font-medium">{defaultBank.bank_name}</span>
                </div>
                {defaultBank.branch && (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Branch</span>
                    <span>{defaultBank.branch}</span>
                  </div>
                )}
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Account No.</span>
                  <span className="font-mono">{defaultBank.account_number}</span>
                </div>
                {defaultBank.account_name && (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Account Name</span>
                    <span>{defaultBank.account_name}</span>
                  </div>
                )}
              </div>
            ) : (
              <div className="flex items-center gap-2 text-amber-600 text-sm">
                <AlertCircle className="w-4 h-4" />
                No bank account linked
              </div>
            )}
          </div>
        </div>

        <DialogFooter className="gap-2 sm:gap-0">
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button onClick={onConfirm} disabled={isPending}>
            {isPending ? 'Processing...' : 'Confirm Payment'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
