import { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { usePayrollRecords, useLeaveRequests, useLeaveTypes, useEmployees, useCreateLeaveRequest, useCompanyInfo } from '@/hooks/useHRM';
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
import { FileText, Calendar, Plus, Printer } from 'lucide-react';
import { format, differenceInDays, startOfMonth } from 'date-fns';

export default function StaffSelfService() {
  const { user } = useAuth();
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
  const createLeaveRequest = useCreateLeaveRequest();

  // Find the employee record for the current user
  const currentEmployee = employees.find(e => e.user_id === user?.id);

  // Fetch payroll records - RLS will filter to user's own records
  const { data: payrollRecords = [], isLoading: payrollLoading } = usePayrollRecords(selectedMonth);
  
  // Fetch leave requests - RLS will filter to user's own records
  const { data: leaveRequests = [], isLoading: leaveLoading } = useLeaveRequests();

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

  const handlePrint = () => {
    window.print();
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
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="flex items-center gap-2">
                <FileText className="w-5 h-5 text-primary" />My Salary Slips
              </CardTitle>
              <Input
                type="month"
                value={selectedMonth.slice(0, 7)}
                onChange={(e) => setSelectedMonth(e.target.value + '-01')}
                className="w-40"
              />
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
                      <TableCell>{format(new Date(record.month), 'MMMM yyyy')}</TableCell>
                      <TableCell className="text-right">₹{record.basic_salary.toLocaleString()}</TableCell>
                      <TableCell className="text-right text-green-600">+₹{(record.allowances || 0).toLocaleString()}</TableCell>
                      <TableCell className="text-right text-red-600">-₹{(record.deductions || 0).toLocaleString()}</TableCell>
                      <TableCell className="text-right font-bold">₹{record.net_salary.toLocaleString()}</TableCell>
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

      {/* Salary Slip Dialog */}
      <Dialog open={!!viewSlip} onOpenChange={(open) => !open && setViewSlip(null)}>
        <DialogContent className="max-w-2xl print:max-w-full print:m-0 print:shadow-none">
          <DialogHeader className="print:hidden">
            <DialogTitle>Salary Slip</DialogTitle>
          </DialogHeader>
          {viewSlip && (
            <div className="space-y-6 p-4 border rounded-lg print:border-none" id="salary-slip">
              <div className="text-center border-b pb-4">
                <h2 className="text-xl font-bold">{company?.company_name || 'Company Name'}</h2>
                {company?.address && <p className="text-sm text-muted-foreground">{company.address}</p>}
                {company?.phone && <p className="text-sm text-muted-foreground">Phone: {company.phone}</p>}
              </div>

              <div className="text-center">
                <h3 className="text-lg font-semibold">SALARY SLIP</h3>
                <p className="text-sm text-muted-foreground">For the month of {format(new Date(viewSlip.month), 'MMMM yyyy')}</p>
              </div>

              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <p><span className="font-medium">Employee Name:</span> {currentEmployee.full_name}</p>
                  <p><span className="font-medium">Position:</span> {currentEmployee.position || '-'}</p>
                </div>
                <div className="text-right">
                  <p><span className="font-medium">Payment Date:</span> {viewSlip.paid_on ? format(new Date(viewSlip.paid_on), 'dd MMM yyyy') : 'Pending'}</p>
                  <p><span className="font-medium">Status:</span> {viewSlip.payment_status}</p>
                </div>
              </div>

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
                      <td className="text-right p-3 text-green-600">+₹{(viewSlip.allowances || 0).toLocaleString()}</td>
                    </tr>
                    <tr className="border-t">
                      <td className="p-3">Deductions</td>
                      <td className="text-right p-3 text-red-600">-₹{(viewSlip.deductions || 0).toLocaleString()}</td>
                    </tr>
                    <tr className="border-t bg-muted font-bold">
                      <td className="p-3">Net Salary</td>
                      <td className="text-right p-3">₹{viewSlip.net_salary.toLocaleString()}</td>
                    </tr>
                  </tbody>
                </table>
              </div>

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