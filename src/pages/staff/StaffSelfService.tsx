import { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { usePayrollRecords, useLeaveRequests, useLeaveTypes, useEmployees, useCreateLeaveRequest, useCompanyInfo, useBankAccounts } from '@/hooks/useHRM';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { FileText, Calendar, Plus, Download } from 'lucide-react';
import { format, differenceInDays, startOfMonth } from 'date-fns';
import { useCurrentStore } from '@/contexts/CurrentStoreContext';
import { useDateMode } from '@/contexts/DateModeContext';
import { adToBS, getBSMonthName, bsToAd, getBSYears, getBSMonths, formatBSDate } from '@/lib/nepaliDate';
import jsPDF from 'jspdf';

export default function StaffSelfService() {
  const { user } = useAuth();
  const { dateMode } = useDateMode();
  const { currentStore } = useCurrentStore();
  
  // BS date state for Nepali calendar filter
  const currentBS = adToBS(new Date());
  const [bsYear, setBsYear] = useState(currentBS.year);
  const [bsMonth, setBsMonth] = useState(currentBS.month);
  const [selectedMonth, setSelectedMonth] = useState(format(startOfMonth(new Date()), 'yyyy-MM-01'));
  
  const [dialogOpen, setDialogOpen] = useState(false);
  const [viewSlip, setViewSlip] = useState<any>(null);
  const [leaveForm, setLeaveForm] = useState({
    leave_type_id: '',
    from_date: '',
    to_date: '',
    reason: '',
  });

  const { data: employees = [] } = useEmployees();
  const { data: leaveTypes = [] } = useLeaveTypes();
  const { data: company } = useCompanyInfo();
  const { data: bankAccounts = [] } = useBankAccounts();
  const createLeaveRequest = useCreateLeaveRequest();

  // Find the employee record for the current user
  const currentEmployee = employees.find(e => e.user_id === user?.id);

  // Compute the actual month to query based on mode
  const getQueryMonth = () => {
    if (dateMode === 'BS') {
      const adDate = bsToAd(bsYear, bsMonth, 1);
      return format(adDate, 'yyyy-MM-01');
    }
    return selectedMonth;
  };

  // Fetch payroll records - RLS will filter to user's own records
  const { data: allPayrollRecords = [], isLoading: payrollLoading } = usePayrollRecords(getQueryMonth());
  
  // Filter to only show current employee's records
  const payrollRecords = currentEmployee 
    ? allPayrollRecords.filter(r => r.employee_id === currentEmployee.id)
    : [];
  
  // Fetch leave requests - filter to current employee
  const { data: allLeaveRequests = [], isLoading: leaveLoading } = useLeaveRequests();
  const leaveRequests = currentEmployee
    ? allLeaveRequests.filter(r => r.employee_id === currentEmployee.id)
    : [];

  // Get display month/year based on date mode
  const getDisplayMonthYear = (adDateStr: string) => {
    const adDate = new Date(adDateStr);
    if (dateMode === 'BS') {
      const bs = adToBS(adDate);
      return `${getBSMonthName(bs.month)} ${bs.year}`;
    }
    return format(adDate, 'MMMM yyyy');
  };

  // Get Nepali month/year for PDF
  const getNepaliMonthYear = (adDateStr: string) => {
    const adDate = new Date(adDateStr);
    const bs = adToBS(adDate);
    return `${getBSMonthName(bs.month)} ${bs.year}`;
  };

  // Get employee's linked bank account
  const getEmployeeBank = (bankAccountId: string | null | undefined) => {
    if (!bankAccountId) return null;
    return bankAccounts.find((b) => b.id === bankAccountId) || null;
  };

  const handleLeaveSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentEmployee) return;

    const totalDays = differenceInDays(new Date(leaveForm.to_date), new Date(leaveForm.from_date)) + 1;
    
    createLeaveRequest.mutate({
      employee_id: currentEmployee.id,
      leave_type_id: leaveForm.leave_type_id,
      from_date: leaveForm.from_date,
      to_date: leaveForm.to_date,
      total_days: totalDays,
      reason: leaveForm.reason,
    }, {
      onSuccess: () => {
        setDialogOpen(false);
        setLeaveForm({ leave_type_id: '', from_date: '', to_date: '', reason: '' });
      }
    });
  };

  const statusColors: Record<string, 'default' | 'secondary' | 'destructive' | 'outline'> = {
    Pending: 'secondary',
    Approved: 'default',
    Rejected: 'destructive',
    Cancelled: 'outline',
  };

  // PDF Download function
  const handleDownloadPDF = async () => {
    if (!viewSlip || !currentEmployee) return;

    const employeeBank = getEmployeeBank(currentEmployee?.bank_account_id);
    const companyName = currentStore?.name || company?.company_name || 'Company';
    const employeeName = currentEmployee.full_name || 'Employee';
    const monthYear = getNepaliMonthYear(viewSlip.month);

    const doc = new jsPDF();
    const pageWidth = doc.internal.pageSize.getWidth();
    let y = 20;

    // Header - Company Name
    doc.setFontSize(20);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(37, 99, 235);
    doc.text(companyName, pageWidth / 2, y, { align: 'center' });
    y += 8;

    // Company address/contact
    if (company?.address) {
      doc.setFontSize(10);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(100);
      doc.text(company.address, pageWidth / 2, y, { align: 'center' });
      y += 5;
    }
    if (company?.phone) {
      doc.text(`Phone: ${company.phone}`, pageWidth / 2, y, { align: 'center' });
      y += 5;
    }

    y += 5;
    doc.setDrawColor(37, 99, 235);
    doc.setLineWidth(0.5);
    doc.line(20, y, pageWidth - 20, y);
    y += 12;

    // Title
    doc.setFontSize(16);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(0);
    doc.text('SALARY SLIP', pageWidth / 2, y, { align: 'center' });
    y += 6;
    doc.setFontSize(11);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(100);
    doc.text(`For the month of ${monthYear}`, pageWidth / 2, y, { align: 'center' });
    y += 15;

    // Employee Details Box
    doc.setFillColor(248, 249, 250);
    doc.roundedRect(20, y, pageWidth - 40, 28, 3, 3, 'F');
    y += 8;

    doc.setFontSize(10);
    doc.setTextColor(60);

    // Left column
    doc.setFont('helvetica', 'bold');
    doc.text('Employee Name:', 25, y);
    doc.setFont('helvetica', 'normal');
    const nameLines = doc.splitTextToSize(employeeName, 55);
    doc.text(nameLines, 58, y);

    doc.setFont('helvetica', 'bold');
    doc.text('Position:', 25, y + 7);
    doc.setFont('helvetica', 'normal');
    doc.text(currentEmployee.position || '-', 50, y + 7);

    doc.setFont('helvetica', 'bold');
    doc.text('Department:', 25, y + 14);
    doc.setFont('helvetica', 'normal');
    doc.text(currentEmployee.department_id ? 'Department' : '-', 55, y + 14);

    // Right column
    doc.setFont('helvetica', 'bold');
    doc.text('Payment Status:', pageWidth - 80, y);
    doc.setFont('helvetica', 'normal');
    doc.text(viewSlip.payment_status || 'Pending', pageWidth - 43, y);

    doc.setFont('helvetica', 'bold');
    doc.text('Payment Date:', pageWidth - 80, y + 7);
    doc.setFont('helvetica', 'normal');
    const paidDateDisplay = viewSlip.paid_on ? formatBSDate(viewSlip.paid_on, 'full') : 'Pending';
    doc.text(paidDateDisplay, pageWidth - 45, y + 7);

    y += 35;

    // Salary Details Table
    const tableStartY = y;
    doc.setFillColor(37, 99, 235);
    doc.rect(20, y, pageWidth - 40, 10, 'F');
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(11);
    doc.setTextColor(255);
    doc.text('Description', 25, y + 7);
    doc.text('Amount (Rs.)', pageWidth - 25, y + 7, { align: 'right' });
    y += 10;

    doc.setTextColor(60);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(10);

    // Basic Salary
    doc.setFillColor(255, 255, 255);
    doc.rect(20, y, pageWidth - 40, 10, 'F');
    doc.text('Basic Salary', 25, y + 7);
    doc.text(`Rs. ${viewSlip.basic_salary.toLocaleString()}`, pageWidth - 25, y + 7, { align: 'right' });
    y += 10;

    // Allowances
    doc.setFillColor(248, 249, 250);
    doc.rect(20, y, pageWidth - 40, 10, 'F');
    doc.setTextColor(34, 197, 94);
    doc.text('Allowances', 25, y + 7);
    doc.text(`+ Rs. ${(viewSlip.allowances || 0).toLocaleString()}`, pageWidth - 25, y + 7, { align: 'right' });
    y += 10;

    // Deductions
    doc.setFillColor(255, 255, 255);
    doc.rect(20, y, pageWidth - 40, 10, 'F');
    doc.setTextColor(239, 68, 68);
    doc.text('Deductions', 25, y + 7);
    doc.text(`- Rs. ${(viewSlip.deductions || 0).toLocaleString()}`, pageWidth - 25, y + 7, { align: 'right' });
    y += 10;

    // Net Salary
    doc.setFillColor(219, 234, 254);
    doc.rect(20, y, pageWidth - 40, 12, 'F');
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(11);
    doc.setTextColor(37, 99, 235);
    doc.text('Net Salary Payable', 25, y + 8);
    doc.text(`Rs. ${viewSlip.net_salary.toLocaleString()}`, pageWidth - 25, y + 8, { align: 'right' });
    y += 12;

    // Table border
    doc.setDrawColor(200);
    doc.setLineWidth(0.3);
    doc.rect(20, tableStartY, pageWidth - 40, y - tableStartY);

    y += 12;

    // Bank Details - Only show if employee has linked bank account
    if (employeeBank) {
      doc.setFillColor(248, 249, 250);
      doc.roundedRect(20, y, pageWidth - 40, 22, 3, 3, 'F');
      y += 8;
      
      doc.setFontSize(10);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(59, 130, 246);
      doc.text('Payment Details', 25, y);
      y += 8;
      
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(80);
      doc.text(`Bank: ${employeeBank.bank_name}`, 25, y);
      doc.text(`A/C No: ${employeeBank.account_number}`, pageWidth / 2, y);
      y += 18;
    }

    // Notes
    if (viewSlip.notes) {
      doc.setFontSize(9);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(59, 130, 246);
      doc.text('Remarks:', 20, y);
      y += 5;
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(80);
      doc.text(viewSlip.notes, 20, y);
      y += 12;
    }

    // Footer
    y = Math.max(y + 10, 250);
    doc.setDrawColor(200);
    doc.setLineWidth(0.3);
    doc.line(20, y, pageWidth - 20, y);
    y += 8;

    doc.setFontSize(8);
    doc.setTextColor(120);
    doc.text(`Generated on: ${format(new Date(), 'dd MMM yyyy, hh:mm a')}`, 20, y);
    y += 4;
    doc.text('This is a computer-generated document. No signature required.', 20, y);

    // Authorized Signature
    doc.setDrawColor(150);
    doc.setLineWidth(0.2);
    doc.setLineDashPattern([2, 1], 0);
    doc.line(pageWidth - 70, y - 8, pageWidth - 20, y - 8);
    doc.setFontSize(8);
    doc.setTextColor(120);
    doc.text('Authorized Signature', pageWidth - 45, y, { align: 'center' });

    // Save PDF
    const bs = adToBS(new Date(viewSlip.month));
    const fileName = `Salary_Slip_${employeeName.replace(/\s+/g, '_')}_${getBSMonthName(bs.month)}_${bs.year}.pdf`;
    doc.save(fileName);
  };

  // Get current display month for card title
  const getCurrentDisplayMonth = () => {
    if (dateMode === 'BS') {
      return `${getBSMonthName(bsMonth)} ${bsYear}`;
    }
    return format(new Date(selectedMonth), 'MMMM yyyy');
  };

  if (!currentEmployee) {
    return (
      <div className="space-y-6 animate-fade-in">
        <div>
          <h1 className="text-2xl font-bold">Self Service</h1>
          <p className="text-muted-foreground">View your payslips and manage leave requests</p>
        </div>
        <Card>
          <CardContent className="py-12 text-center text-muted-foreground">
            Your employee profile is not set up yet. Please contact your administrator.
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h1 className="text-2xl font-bold">Self Service</h1>
        <p className="text-muted-foreground">View your payslips and manage leave requests</p>
      </div>

      <Tabs defaultValue="payslips" className="space-y-4">
        <TabsList>
          <TabsTrigger value="payslips" className="flex items-center gap-2">
            <FileText className="w-4 h-4" />My Payslips
          </TabsTrigger>
          <TabsTrigger value="leave" className="flex items-center gap-2">
            <Calendar className="w-4 h-4" />Leave Requests
          </TabsTrigger>
        </TabsList>

        <TabsContent value="payslips" className="space-y-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between flex-wrap gap-2">
              <CardTitle className="flex items-center gap-2">
                <FileText className="w-5 h-5 text-primary" />My Salary Slips
              </CardTitle>
              
              {/* Date Mode Filter */}
              {dateMode === 'BS' ? (
                <div className="flex items-center gap-2">
                  <Select value={bsYear.toString()} onValueChange={(v) => setBsYear(parseInt(v))}>
                    <SelectTrigger className="w-24">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {getBSYears().map((y) => (
                        <SelectItem key={y.value} value={y.value.toString()}>{y.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Select value={bsMonth.toString()} onValueChange={(v) => setBsMonth(parseInt(v))}>
                    <SelectTrigger className="w-32">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {getBSMonths().map((m) => (
                        <SelectItem key={m.value} value={m.value.toString()}>{m.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              ) : (
                <Input
                  type="month"
                  value={selectedMonth.slice(0, 7)}
                  onChange={(e) => setSelectedMonth(e.target.value + '-01')}
                  className="w-40"
                />
              )}
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
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
                  {payrollRecords.map((record) => (
                    <TableRow key={record.id}>
                      <TableCell>{getDisplayMonthYear(record.month)}</TableCell>
                      <TableCell className="text-right">Rs.{record.basic_salary.toLocaleString()}</TableCell>
                      <TableCell className="text-right text-green-600">+Rs.{(record.allowances || 0).toLocaleString()}</TableCell>
                      <TableCell className="text-right text-red-600">-Rs.{(record.deductions || 0).toLocaleString()}</TableCell>
                      <TableCell className="text-right font-bold">Rs.{record.net_salary.toLocaleString()}</TableCell>
                      <TableCell>
                        <Badge variant={record.payment_status === 'Paid' ? 'default' : 'secondary'}>
                          {record.payment_status}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <Button variant="outline" size="sm" onClick={() => setViewSlip(record)}>
                          <FileText className="w-4 h-4 mr-2" />View
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                  {payrollRecords.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                        {payrollLoading ? 'Loading...' : 'No payslips found for this period'}
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="leave" className="space-y-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="flex items-center gap-2">
                <Calendar className="w-5 h-5 text-primary" />My Leave Requests
              </CardTitle>
              <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
                <DialogTrigger asChild>
                  <Button><Plus className="w-4 h-4 mr-2" />Request Leave</Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Request Leave</DialogTitle>
                  </DialogHeader>
                  <form onSubmit={handleLeaveSubmit} className="space-y-4">
                    <div className="space-y-2">
                      <Label>Leave Type</Label>
                      <Select value={leaveForm.leave_type_id} onValueChange={(v) => setLeaveForm({ ...leaveForm, leave_type_id: v })}>
                        <SelectTrigger><SelectValue placeholder="Select type" /></SelectTrigger>
                        <SelectContent>
                          {leaveTypes.map((type) => (
                            <SelectItem key={type.id} value={type.id}>{type.name}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label>From Date</Label>
                        <Input type="date" value={leaveForm.from_date} onChange={(e) => setLeaveForm({ ...leaveForm, from_date: e.target.value })} required />
                      </div>
                      <div className="space-y-2">
                        <Label>To Date</Label>
                        <Input type="date" value={leaveForm.to_date} onChange={(e) => setLeaveForm({ ...leaveForm, to_date: e.target.value })} required />
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label>Reason</Label>
                      <Textarea value={leaveForm.reason} onChange={(e) => setLeaveForm({ ...leaveForm, reason: e.target.value })} placeholder="Enter reason for leave..." />
                    </div>
                    <Button type="submit" className="w-full" disabled={createLeaveRequest.isPending}>
                      {createLeaveRequest.isPending ? 'Submitting...' : 'Submit Request'}
                    </Button>
                  </form>
                </DialogContent>
              </Dialog>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Type</TableHead>
                    <TableHead>From</TableHead>
                    <TableHead>To</TableHead>
                    <TableHead className="text-center">Days</TableHead>
                    <TableHead>Reason</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {leaveRequests.map((request) => (
                    <TableRow key={request.id}>
                      <TableCell className="font-medium">{request.leave_types?.name || '-'}</TableCell>
                      <TableCell>{format(new Date(request.from_date), 'dd MMM yyyy')}</TableCell>
                      <TableCell>{format(new Date(request.to_date), 'dd MMM yyyy')}</TableCell>
                      <TableCell className="text-center">{request.total_days}</TableCell>
                      <TableCell className="max-w-[200px] truncate">{request.reason || '-'}</TableCell>
                      <TableCell>
                        <Badge variant={statusColors[request.status] || 'secondary'}>{request.status}</Badge>
                      </TableCell>
                    </TableRow>
                  ))}
                  {leaveRequests.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                        {leaveLoading ? 'Loading...' : 'No leave requests found'}
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Salary Slip Dialog with PDF Download */}
      <Dialog open={!!viewSlip} onOpenChange={(open) => !open && setViewSlip(null)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Salary Slip - {viewSlip && getDisplayMonthYear(viewSlip.month)}</DialogTitle>
          </DialogHeader>
          {viewSlip && (
            <div className="space-y-6 p-4 border rounded-lg" id="salary-slip">
              <div className="text-center border-b pb-4">
                <h2 className="text-xl font-bold">{currentStore?.name || company?.company_name || 'Company Name'}</h2>
                {company?.address && <p className="text-sm text-muted-foreground">{company.address}</p>}
                {company?.phone && <p className="text-sm text-muted-foreground">Phone: {company.phone}</p>}
              </div>

              <div className="text-center">
                <h3 className="text-lg font-semibold">SALARY SLIP</h3>
                <p className="text-sm text-muted-foreground">For the month of {getNepaliMonthYear(viewSlip.month)}</p>
              </div>

              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <p><span className="font-medium">Employee Name:</span> {currentEmployee.full_name}</p>
                  <p><span className="font-medium">Position:</span> {currentEmployee.position || '-'}</p>
                </div>
                <div className="text-right">
                  <p><span className="font-medium">Payment Date:</span> {viewSlip.paid_on ? formatBSDate(viewSlip.paid_on, 'full') : 'Pending'}</p>
                  <p><span className="font-medium">Status:</span> {viewSlip.payment_status}</p>
                </div>
              </div>

              <div className="border rounded-lg overflow-hidden">
                <table className="w-full text-sm">
                  <thead className="bg-muted">
                    <tr>
                      <th className="text-left p-3">Description</th>
                      <th className="text-right p-3">Amount</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr className="border-t">
                      <td className="p-3">Basic Salary</td>
                      <td className="text-right p-3">Rs.{viewSlip.basic_salary.toLocaleString()}</td>
                    </tr>
                    <tr className="border-t">
                      <td className="p-3">Allowances</td>
                      <td className="text-right p-3 text-green-600">+Rs.{(viewSlip.allowances || 0).toLocaleString()}</td>
                    </tr>
                    <tr className="border-t">
                      <td className="p-3">Deductions</td>
                      <td className="text-right p-3 text-red-600">-Rs.{(viewSlip.deductions || 0).toLocaleString()}</td>
                    </tr>
                    <tr className="border-t bg-muted font-bold">
                      <td className="p-3">Net Salary</td>
                      <td className="text-right p-3">Rs.{viewSlip.net_salary.toLocaleString()}</td>
                    </tr>
                  </tbody>
                </table>
              </div>

              {/* Bank Details */}
              {currentEmployee.bank_account_id && getEmployeeBank(currentEmployee.bank_account_id) && (
                <div className="bg-muted/50 rounded-lg p-3 text-sm">
                  <p className="font-medium text-primary mb-1">Payment Details</p>
                  <p>Bank: {getEmployeeBank(currentEmployee.bank_account_id)?.bank_name}</p>
                  <p>A/C No: {getEmployeeBank(currentEmployee.bank_account_id)?.account_number}</p>
                </div>
              )}

              <div className="text-center text-xs text-muted-foreground border-t pt-4">
                <p>This is a computer-generated document. No signature required.</p>
              </div>
            </div>
          )}
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setViewSlip(null)}>Close</Button>
            <Button onClick={handleDownloadPDF}>
              <Download className="w-4 h-4 mr-2" />Download PDF
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
