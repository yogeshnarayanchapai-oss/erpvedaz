import { useState } from 'react';
import { usePayrollRecords, useCompanyInfo, useEmployees, useBankAccounts } from '@/hooks/useHRM';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { FileText, Printer, Download } from 'lucide-react';
import { format, startOfMonth } from 'date-fns';

export default function HRMSalarySlip() {
  const [selectedMonth, setSelectedMonth] = useState(format(startOfMonth(new Date()), 'yyyy-MM-01'));
  const { data: records = [], isLoading } = usePayrollRecords(selectedMonth);
  const { data: company } = useCompanyInfo();
  const { data: employees = [] } = useEmployees();
  const { data: bankAccounts = [] } = useBankAccounts();

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
            <div className="space-y-6 p-4 border rounded-lg print:border-none" id="salary-slip">
              {/* Company Header */}
              <div className="text-center border-b pb-4">
                <h2 className="text-xl font-bold">{company?.company_name || 'Company Name'}</h2>
                {company?.address && <p className="text-sm text-muted-foreground">{company.address}</p>}
                {company?.phone && <p className="text-sm text-muted-foreground">Phone: {company.phone}</p>}
              </div>

              {/* Title */}
              <div className="text-center">
                <h3 className="text-lg font-semibold">SALARY SLIP</h3>
                <p className="text-sm text-muted-foreground">For the month of {format(new Date(viewSlip.month), 'MMMM yyyy')}</p>
              </div>

              {/* Employee Info */}
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <p><span className="font-medium">Employee Name:</span> {viewSlip.employees?.full_name}</p>
                  <p><span className="font-medium">Position:</span> {getEmployee(viewSlip.employee_id)?.position || '-'}</p>
                </div>
                <div className="text-right">
                  <p><span className="font-medium">Payment Date:</span> {viewSlip.paid_on ? format(new Date(viewSlip.paid_on), 'dd MMM yyyy') : 'Pending'}</p>
                  <p><span className="font-medium">Status:</span> {viewSlip.payment_status}</p>
                </div>
              </div>

              {/* Salary Breakdown */}
              <div className="border rounded-lg overflow-hidden">
                <table className="w-full text-sm">
                  <thead className="bg-muted">
                    <tr>
                      <th className="text-left p-3">Earnings</th>
                      <th className="text-right p-3">Amount</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr className="border-t">
                      <td className="p-3">Basic Salary</td>
                      <td className="text-right p-3">₹{viewSlip.basic_salary.toLocaleString()}</td>
                    </tr>
                    <tr className="border-t">
                      <td className="p-3">Allowances</td>
                      <td className="text-right p-3 text-success">+₹{(viewSlip.allowances || 0).toLocaleString()}</td>
                    </tr>
                    <tr className="border-t">
                      <td className="p-3">Deductions</td>
                      <td className="text-right p-3 text-destructive">-₹{(viewSlip.deductions || 0).toLocaleString()}</td>
                    </tr>
                    <tr className="border-t bg-muted font-bold">
                      <td className="p-3">Net Salary</td>
                      <td className="text-right p-3">₹{viewSlip.net_salary.toLocaleString()}</td>
                    </tr>
                  </tbody>
                </table>
              </div>

              {/* Bank Details */}
              {getBank(getEmployee(viewSlip.employee_id)?.bank_account_id || null) && (
                <div className="text-sm">
                  <p className="font-medium mb-1">Payment Details:</p>
                  <p>Bank: {getBank(getEmployee(viewSlip.employee_id)?.bank_account_id || null)?.bank_name}</p>
                  <p>Account: {getBank(getEmployee(viewSlip.employee_id)?.bank_account_id || null)?.account_number}</p>
                </div>
              )}

              {/* Notes */}
              {viewSlip.notes && (
                <div className="text-sm">
                  <p className="font-medium">Notes:</p>
                  <p className="text-muted-foreground">{viewSlip.notes}</p>
                </div>
              )}

              {/* Footer */}
              <div className="text-center text-xs text-muted-foreground border-t pt-4">
                <p>This is a computer-generated document. No signature required.</p>
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
