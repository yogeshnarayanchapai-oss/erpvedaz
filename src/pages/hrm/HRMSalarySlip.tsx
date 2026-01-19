import { useState } from 'react';
import { usePayrollRecords, useCompanyInfo, useEmployees, useBankAccounts } from '@/hooks/useHRM';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { FileText, Printer } from 'lucide-react';
import { format, startOfMonth } from 'date-fns';
import { useCurrentStore } from '@/contexts/CurrentStoreContext';
import { useStoreBranding } from '@/hooks/useStoreBranding';

export default function HRMSalarySlip() {
  const [selectedMonth, setSelectedMonth] = useState(format(startOfMonth(new Date()), 'yyyy-MM-01'));
  const { data: records = [], isLoading } = usePayrollRecords(selectedMonth);
  const { data: company } = useCompanyInfo();
  const { data: employees = [] } = useEmployees();
  const { data: bankAccounts = [] } = useBankAccounts();
  const { currentStore } = useCurrentStore();
  const { data: branding } = useStoreBranding(currentStore?.id || '');

  const [viewSlip, setViewSlip] = useState<any>(null);

  const getEmployee = (id: string) => employees.find((e) => e.id === id);
  const getBank = (id: string | null) => id ? bankAccounts.find((b) => b.id === id) : bankAccounts.find((b) => b.is_default);

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-bold">Salary Slips</h1>
          <p className="text-muted-foreground">Generate and view salary slips</p>
        </div>
        <Input type="month" value={selectedMonth.slice(0, 7)} onChange={(e) => setSelectedMonth(e.target.value + '-01')} className="w-40" />
      </div>

      <Card>
        <CardHeader><CardTitle className="flex items-center gap-2"><FileText className="w-5 h-5 text-primary" />Salary Slips for {format(new Date(selectedMonth), 'MMMM yyyy')}</CardTitle></CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Employee</TableHead>
                <TableHead className="text-right">Net Salary</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {records.map((r) => (
                <TableRow key={r.id}>
                  <TableCell className="font-medium">{r.employees?.full_name || '-'}</TableCell>
                  <TableCell className="text-right font-bold">₹{r.net_salary.toLocaleString()}</TableCell>
                  <TableCell><Badge variant={r.payment_status === 'Paid' ? 'default' : 'secondary'}>{r.payment_status}</Badge></TableCell>
                  <TableCell className="text-right">
                    <Button variant="outline" size="sm" onClick={() => setViewSlip(r)}>
                      <FileText className="w-4 h-4 mr-2" />View Slip
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
              {records.length === 0 && <TableRow><TableCell colSpan={4} className="text-center py-8 text-muted-foreground">{isLoading ? 'Loading...' : 'No payroll records'}</TableCell></TableRow>}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Dialog open={!!viewSlip} onOpenChange={(open) => !open && setViewSlip(null)}>
        <DialogContent className="max-w-2xl print:max-w-full print:m-0 print:shadow-none">
          <DialogHeader className="print:hidden">
            <DialogTitle>Salary Slip</DialogTitle>
          </DialogHeader>
          {viewSlip && (
            <div className="space-y-6 p-6 border rounded-lg bg-white print:border-none print:shadow-none" id="salary-slip">
              {/* Store Header with Logo */}
              <div className="flex items-center justify-between border-b pb-4">
                <div className="flex items-center gap-4">
                  {(branding?.logo_url || currentStore?.logo_url) && (
                    <img 
                      src={branding?.logo_url || currentStore?.logo_url || ''} 
                      alt="Store Logo" 
                      className="h-16 w-auto object-contain"
                    />
                  )}
                  <div>
                    <h2 className="text-2xl font-bold text-primary">{currentStore?.name || company?.company_name || 'Company Name'}</h2>
                    {company?.address && <p className="text-sm text-muted-foreground">{company.address}</p>}
                    {company?.phone && <p className="text-sm text-muted-foreground">Phone: {company.phone}</p>}
                    {company?.email && <p className="text-sm text-muted-foreground">Email: {company.email}</p>}
                  </div>
                </div>
                <div className="text-right">
                  <div className="inline-block px-4 py-2 bg-primary/10 rounded-lg">
                    <p className="text-xs text-muted-foreground uppercase tracking-wide">Slip No.</p>
                    <p className="font-mono font-bold text-primary">{viewSlip.id.slice(0, 8).toUpperCase()}</p>
                  </div>
                </div>
              </div>

              {/* Title Banner */}
              <div className="text-center py-3 bg-primary rounded-lg">
                <h3 className="text-lg font-bold text-primary-foreground uppercase tracking-widest">Salary Slip</h3>
                <p className="text-sm text-primary-foreground/80">For the month of {format(new Date(viewSlip.month), 'MMMM yyyy')}</p>
              </div>

              {/* Employee Info Card */}
              <div className="grid grid-cols-2 gap-6 p-4 bg-muted/50 rounded-lg">
                <div className="space-y-2">
                  <div className="flex gap-2">
                    <span className="text-muted-foreground text-sm w-32">Employee Name:</span>
                    <span className="font-semibold">{viewSlip.employees?.full_name}</span>
                  </div>
                  <div className="flex gap-2">
                    <span className="text-muted-foreground text-sm w-32">Position:</span>
                    <span className="font-medium">{getEmployee(viewSlip.employee_id)?.position || '-'}</span>
                  </div>
                  <div className="flex gap-2">
                    <span className="text-muted-foreground text-sm w-32">Department:</span>
                    <span className="font-medium">{getEmployee(viewSlip.employee_id)?.departments?.name || '-'}</span>
                  </div>
                </div>
                <div className="space-y-2 text-right">
                  <div className="flex justify-end gap-2">
                    <span className="text-muted-foreground text-sm">Payment Date:</span>
                    <span className="font-semibold">{viewSlip.paid_on ? format(new Date(viewSlip.paid_on), 'dd MMM yyyy') : 'Pending'}</span>
                  </div>
                  <div className="flex justify-end gap-2">
                    <span className="text-muted-foreground text-sm">Status:</span>
                    <Badge variant={viewSlip.payment_status === 'Paid' ? 'default' : 'secondary'} className="print:border print:border-current">
                      {viewSlip.payment_status}
                    </Badge>
                  </div>
                </div>
              </div>

              {/* Salary Breakdown */}
              <div className="border rounded-lg overflow-hidden shadow-sm">
                <table className="w-full text-sm">
                  <thead className="bg-primary text-primary-foreground">
                    <tr>
                      <th className="text-left p-4 font-semibold">Description</th>
                      <th className="text-right p-4 font-semibold">Amount (NPR)</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr className="border-t bg-white">
                      <td className="p-4">Basic Salary</td>
                      <td className="text-right p-4 font-medium">रू {viewSlip.basic_salary.toLocaleString()}</td>
                    </tr>
                    <tr className="border-t bg-muted/30">
                      <td className="p-4">Allowances</td>
                      <td className="text-right p-4 font-medium text-green-600">+ रू {(viewSlip.allowances || 0).toLocaleString()}</td>
                    </tr>
                    <tr className="border-t bg-white">
                      <td className="p-4">Deductions</td>
                      <td className="text-right p-4 font-medium text-destructive">- रू {(viewSlip.deductions || 0).toLocaleString()}</td>
                    </tr>
                    <tr className="border-t-2 border-primary bg-primary/5">
                      <td className="p-4 font-bold text-primary">Net Salary Payable</td>
                      <td className="text-right p-4 font-bold text-primary text-lg">रू {viewSlip.net_salary.toLocaleString()}</td>
                    </tr>
                  </tbody>
                </table>
              </div>

              {/* Bank Details */}
              {getBank(getEmployee(viewSlip.employee_id)?.bank_account_id || null) && (
                <div className="p-4 bg-muted/50 rounded-lg">
                  <p className="font-semibold mb-2 text-primary">Payment Details</p>
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <span className="text-muted-foreground">Bank Name:</span>
                      <p className="font-medium">{getBank(getEmployee(viewSlip.employee_id)?.bank_account_id || null)?.bank_name}</p>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Account Number:</span>
                      <p className="font-medium font-mono">{getBank(getEmployee(viewSlip.employee_id)?.bank_account_id || null)?.account_number}</p>
                    </div>
                  </div>
                </div>
              )}

              {/* Notes */}
              {viewSlip.notes && (
                <div className="p-4 border-l-4 border-primary/50 bg-primary/5 rounded-r-lg">
                  <p className="font-semibold text-sm text-primary">Remarks</p>
                  <p className="text-muted-foreground text-sm mt-1">{viewSlip.notes}</p>
                </div>
              )}

              {/* Footer */}
              <div className="border-t pt-4 mt-6">
                <div className="flex justify-between items-end">
                  <div className="text-xs text-muted-foreground">
                    <p>Generated on: {format(new Date(), 'dd MMM yyyy, hh:mm a')}</p>
                    <p className="mt-1">This is a computer-generated document. No signature required.</p>
                  </div>
                  <div className="text-right">
                    <div className="border-t border-dashed pt-2 w-40">
                      <p className="text-xs text-muted-foreground">Authorized Signature</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
          <div className="flex justify-end gap-2 print:hidden">
            <Button variant="outline" onClick={handlePrint}>
              <Printer className="w-4 h-4 mr-2" />Print
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
