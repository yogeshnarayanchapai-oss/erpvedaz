import { useState, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { format, startOfMonth, endOfMonth, subMonths } from 'date-fns';
import { ArrowLeft, User, Calendar, FileText, Building2, Phone, Mail, Briefcase, DollarSign, CreditCard, Wallet, CheckCircle, XCircle, Clock, Shield, Package } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Skeleton } from '@/components/ui/skeleton';
import { useAttendanceRecords } from '@/hooks/useAttendance';
import { useLeaveRequests, useDepartments, usePayrollRecords } from '@/hooks/useHRM';
import { EmployeeDocumentsTab } from '@/components/hrm/EmployeeDocumentsTab';
import { EmployeeBankAccountsCard } from '@/components/hrm/EmployeeBankAccountsCard';
import { EmployeeAssignedAssetsCard } from '@/components/hrm/EmployeeAssignedAssetsCard';
import { EmployeeLeaveQuotaCard } from '@/components/hrm/EmployeeLeaveQuotaCard';

interface EmployeeDetail {
  id: string;
  user_id: string | null;
  full_name: string;
  email: string | null;
  phone: string | null;
  position: string | null;
  department_id: string | null;
  joining_date: string | null;
  status: string;
  base_salary: number | null;
  bank_account_id: string | null;
  notes: string | null;
  photo_url: string | null;
  designation: string | null;
  shift: string | null;
  created_at: string;
  guardian_name?: string | null;
  guardian_relation?: string | null;
  guardian_phone?: string | null;
  citizenship_number?: string | null;
  pan_number?: string | null;
  office_start_time?: string | null;
  office_end_time?: string | null;
  grace_minutes?: number | null;
  departments?: { name: string } | null;
  hr_bank_accounts?: { bank_name: string; account_number: string; branch: string | null } | null;
  profiles?: { name: string; email: string } | null;
}

export default function HRMEmployeeDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('profile');
  const [attendanceFilter, setAttendanceFilter] = useState<'this_month' | 'last_month'>('this_month');

  // Calculate date range for attendance filter
  const attendanceDateRange = useMemo(() => {
    const today = new Date();
    if (attendanceFilter === 'this_month') {
      return {
        from: format(startOfMonth(today), 'yyyy-MM-dd'),
        to: format(endOfMonth(today), 'yyyy-MM-dd')
      };
    } else {
      const lastMonth = subMonths(today, 1);
      return {
        from: format(startOfMonth(lastMonth), 'yyyy-MM-dd'),
        to: format(endOfMonth(lastMonth), 'yyyy-MM-dd')
      };
    }
  }, [attendanceFilter]);

  const { data: employee, isLoading: employeeLoading } = useQuery({
    queryKey: ['employee-detail', id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('employees')
        .select(`
          *,
          departments:department_id(name),
          hr_bank_accounts:bank_account_id(bank_name, account_number, branch),
          profiles:user_id(name, email)
        `)
        .eq('id', id)
        .single();
      if (error) throw error;
      return data as EmployeeDetail;
    },
    enabled: !!id,
  });

  const { data: attendanceRecords, isLoading: attendanceLoading } = useAttendanceRecords(id, attendanceDateRange);
  const { data: leaveRequests, isLoading: leaveLoading } = useLeaveRequests({ employeeId: id });
  const { data: departments } = useDepartments();

  // Fetch payroll records for this employee
  const { data: payrollRecords, isLoading: payrollLoading } = useQuery({
    queryKey: ['employee-payroll', id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('payroll_records')
        .select('*')
        .eq('employee_id', id)
        .order('month', { ascending: false });
      if (error) throw error;
      return data;
    },
    enabled: !!id,
  });

  const getStatusColor = (status: string) => {
    switch (status.toLowerCase()) {
      case 'active': return 'bg-green-500/10 text-green-600 border-green-500/20';
      case 'inactive': return 'bg-red-500/10 text-red-600 border-red-500/20';
      default: return 'bg-muted text-muted-foreground';
    }
  };

  const getAttendanceStatusColor = (status: string) => {
    switch (status) {
      case 'Present': return 'bg-green-500/10 text-green-600';
      case 'Late': return 'bg-orange-500/10 text-orange-600';
      case 'Absent': return 'bg-red-500/10 text-red-600';
      case 'Half-day': return 'bg-yellow-500/10 text-yellow-600';
      case 'Work From Home': return 'bg-blue-500/10 text-blue-600';
      case 'Leave': return 'bg-purple-500/10 text-purple-600';
      default: return 'bg-muted text-muted-foreground';
    }
  };

  const getLeaveStatusColor = (status: string) => {
    switch (status) {
      case 'Approved': return 'bg-green-500/10 text-green-600';
      case 'Pending': return 'bg-yellow-500/10 text-yellow-600';
      case 'Rejected': return 'bg-red-500/10 text-red-600';
      case 'Cancelled': return 'bg-muted text-muted-foreground';
      default: return 'bg-muted text-muted-foreground';
    }
  };

  const getPaymentStatusColor = (status: string) => {
    switch (status) {
      case 'Paid': return 'bg-green-500/10 text-green-600';
      case 'Pending': return 'bg-yellow-500/10 text-yellow-600';
      default: return 'bg-muted text-muted-foreground';
    }
  };

  if (employeeLoading) {
    return (
      <div className="p-6 space-y-6">
        <Skeleton className="h-10 w-48" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  if (!employee) {
    return (
      <div className="p-6">
        <div className="text-center py-12">
          <p className="text-muted-foreground">Employee not found</p>
          <Button variant="link" onClick={() => navigate('/hrm/employees')}>
            Back to Employees
          </Button>
        </div>
      </div>
    );
  }

  const departmentName = employee.departments?.name || 
    departments?.find(d => d.id === employee.department_id)?.name || 
    'Not assigned';

  // Calculate attendance stats - use actual status from DB
  // "Late" employees are also counted as "Present" (they attended office, just late)
  const attendanceStats = {
    present: attendanceRecords?.filter(r => r.status === 'Present' || r.status === 'Work From Home' || r.status === 'Late').length || 0,
    late: attendanceRecords?.filter(r => r.status === 'Late').length || 0,
    absent: attendanceRecords?.filter(r => r.status === 'Absent').length || 0,
    halfDay: attendanceRecords?.filter(r => r.status === 'Half-day').length || 0,
    leave: attendanceRecords?.filter(r => r.status === 'Leave').length || 0,
    totalLateMinutes: attendanceRecords?.reduce((sum, r) => sum + ((r as any).late_minutes || 0), 0) || 0,
  };

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={() => navigate('/hrm/employees')}>
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div className="flex-1">
          <h1 className="text-2xl font-bold">{employee.full_name}</h1>
          <p className="text-muted-foreground">{employee.position || 'No position'}</p>
        </div>
        <Badge className={getStatusColor(employee.status)}>{employee.status}</Badge>
      </div>

      {/* Attendance Summary Stats */}
      <div className="grid grid-cols-2 md:grid-cols-6 gap-4">
        <Card className="p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-green-500/10">
              <CheckCircle className="h-5 w-5 text-green-600" />
            </div>
            <div>
              <p className="text-2xl font-bold">{attendanceStats.present}</p>
              <p className="text-xs text-muted-foreground">Present</p>
            </div>
          </div>
        </Card>
        <Card className="p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-orange-500/10">
              <Clock className="h-5 w-5 text-orange-600" />
            </div>
            <div>
              <p className="text-2xl font-bold">{attendanceStats.late}</p>
              <p className="text-xs text-muted-foreground">Late Days</p>
            </div>
          </div>
        </Card>
        <Card className="p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-red-500/10">
              <XCircle className="h-5 w-5 text-red-600" />
            </div>
            <div>
              <p className="text-2xl font-bold">{attendanceStats.absent}</p>
              <p className="text-xs text-muted-foreground">Absent</p>
            </div>
          </div>
        </Card>
        <Card className="p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-yellow-500/10">
              <Calendar className="h-5 w-5 text-yellow-600" />
            </div>
            <div>
              <p className="text-2xl font-bold">{attendanceStats.halfDay}</p>
              <p className="text-xs text-muted-foreground">Half Days</p>
            </div>
          </div>
        </Card>
        <Card className="p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-purple-500/10">
              <FileText className="h-5 w-5 text-purple-600" />
            </div>
            <div>
              <p className="text-2xl font-bold">{attendanceStats.leave}</p>
              <p className="text-xs text-muted-foreground">On Leave</p>
            </div>
          </div>
        </Card>
        <Card className="p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-amber-500/10">
              <Clock className="h-5 w-5 text-amber-600" />
            </div>
            <div>
              <p className="text-2xl font-bold">{attendanceStats.totalLateMinutes}</p>
              <p className="text-xs text-muted-foreground">Late Minutes</p>
            </div>
          </div>
        </Card>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="profile" className="gap-2">
            <User className="h-4 w-4" />
            Profile
          </TabsTrigger>
          <TabsTrigger value="documents" className="gap-2">
            <Shield className="h-4 w-4" />
            Documents & KYC
          </TabsTrigger>
          <TabsTrigger value="attendance" className="gap-2">
            <Calendar className="h-4 w-4" />
            Attendance
          </TabsTrigger>
          <TabsTrigger value="leave" className="gap-2">
            <FileText className="h-4 w-4" />
            Leave Records
          </TabsTrigger>
          <TabsTrigger value="payroll" className="gap-2">
            <Wallet className="h-4 w-4" />
            Payroll
          </TabsTrigger>
          <TabsTrigger value="assets" className="gap-2">
            <Package className="h-4 w-4" />
            Assets
          </TabsTrigger>
        </TabsList>

        {/* Profile Tab */}
        <TabsContent value="profile" className="space-y-6">
          <div className="grid gap-6 md:grid-cols-2">
            {/* Personal Information */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Personal Information</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center gap-3">
                  <Mail className="h-4 w-4 text-muted-foreground" />
                  <div>
                    <p className="text-sm text-muted-foreground">Email</p>
                    <p className="font-medium">{employee.email || 'Not provided'}</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <Phone className="h-4 w-4 text-muted-foreground" />
                  <div>
                    <p className="text-sm text-muted-foreground">Phone</p>
                    <p className="font-medium">{employee.phone || 'Not provided'}</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <User className="h-4 w-4 text-muted-foreground" />
                  <div>
                    <p className="text-sm text-muted-foreground">Linked User</p>
                    <p className="font-medium">
                      {employee.profiles ? (
                        <span className="text-primary">{employee.profiles.name} ({employee.profiles.email})</span>
                      ) : (
                        <span className="text-muted-foreground">Not linked</span>
                      )}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Work Information */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Work Information</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center gap-3">
                  <Building2 className="h-4 w-4 text-muted-foreground" />
                  <div>
                    <p className="text-sm text-muted-foreground">Department</p>
                    <p className="font-medium">{departmentName}</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <Briefcase className="h-4 w-4 text-muted-foreground" />
                  <div>
                    <p className="text-sm text-muted-foreground">Position / Designation</p>
                    <p className="font-medium">
                      {employee.position || employee.designation || 'Not assigned'}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <Calendar className="h-4 w-4 text-muted-foreground" />
                  <div>
                    <p className="text-sm text-muted-foreground">Joining Date</p>
                    <p className="font-medium">
                      {employee.joining_date 
                        ? format(new Date(employee.joining_date), 'MMM dd, yyyy')
                        : 'Not set'}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <Calendar className="h-4 w-4 text-muted-foreground" />
                  <div>
                    <p className="text-sm text-muted-foreground">Shift</p>
                    <p className="font-medium">{employee.shift || 'Day'}</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Office Time Settings */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Office Time Settings</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center gap-3">
                  <Clock className="h-4 w-4 text-muted-foreground" />
                  <div>
                    <p className="text-sm text-muted-foreground">Office Hours</p>
                    <p className="font-medium">
                      {employee.office_start_time?.substring(0, 5) || '09:00'} - {employee.office_end_time?.substring(0, 5) || '17:00'}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <Clock className="h-4 w-4 text-muted-foreground" />
                  <div>
                    <p className="text-sm text-muted-foreground">Grace Period</p>
                    <p className="font-medium">{employee.grace_minutes || 30} minutes</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Salary Details */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Salary Details</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center gap-3">
                  <DollarSign className="h-4 w-4 text-muted-foreground" />
                  <div>
                    <p className="text-sm text-muted-foreground">Base Salary</p>
                    <p className="font-medium">
                      {employee.base_salary 
                        ? `Rs. ${employee.base_salary.toLocaleString()}`
                        : 'Not set'}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Employee Bank Accounts */}
            <EmployeeBankAccountsCard employeeId={employee.id} />

            {/* Leave Quota */}
            <EmployeeLeaveQuotaCard employeeId={employee.id} />

            {/* Notes */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Notes</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground">
                  {employee.notes || 'No notes added'}
                </p>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Documents Tab */}
        <TabsContent value="documents">
          <EmployeeDocumentsTab employeeId={employee.id} employee={employee} />
        </TabsContent>

        {/* Attendance Tab */}
        <TabsContent value="attendance">
          <Card>
            <CardHeader>
              <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
                <div>
                  <CardTitle>Attendance History</CardTitle>
                  <CardDescription>
                    {attendanceRecords?.length || 0} records found
                  </CardDescription>
                </div>
                <div className="flex gap-2">
                  <Button 
                    variant={attendanceFilter === 'this_month' ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setAttendanceFilter('this_month')}
                  >
                    <Calendar className="h-4 w-4 mr-1" />
                    This Month
                  </Button>
                  <Button 
                    variant={attendanceFilter === 'last_month' ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setAttendanceFilter('last_month')}
                  >
                    <Calendar className="h-4 w-4 mr-1" />
                    Last Month
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {attendanceLoading ? (
                <div className="space-y-2">
                  <Skeleton className="h-10 w-full" />
                  <Skeleton className="h-10 w-full" />
                  <Skeleton className="h-10 w-full" />
                </div>
              ) : attendanceRecords && attendanceRecords.length > 0 ? (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Date</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Check In</TableHead>
                      <TableHead>Check Out</TableHead>
                      <TableHead>Late (mins)</TableHead>
                      <TableHead>Notes</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {attendanceRecords.map((record) => (
                      <TableRow key={record.id}>
                        <TableCell className="font-medium">
                          {format(new Date(record.date), 'MMM dd, yyyy')}
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline" className={getAttendanceStatusColor(record.status)}>
                            {record.status}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          {record.check_in_time 
                            ? format(new Date(record.check_in_time), 'hh:mm a')
                            : '-'}
                        </TableCell>
                        <TableCell>
                          {record.check_out_time 
                            ? format(new Date(record.check_out_time), 'hh:mm a')
                            : '-'}
                        </TableCell>
                        <TableCell>
                          {(record as any).late_minutes ? (
                            <span className="text-orange-600 font-medium">
                              {(record as any).late_minutes} min
                            </span>
                          ) : '-'}
                        </TableCell>
                        <TableCell className="text-muted-foreground max-w-[200px] truncate">
                          {record.notes || '-'}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  No attendance records found
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Leave Tab */}
        <TabsContent value="leave">
          <Card>
            <CardHeader>
              <CardTitle>Leave Records</CardTitle>
              <CardDescription>
                {leaveRequests?.length || 0} leave requests found
              </CardDescription>
            </CardHeader>
            <CardContent>
              {leaveLoading ? (
                <div className="space-y-2">
                  <Skeleton className="h-10 w-full" />
                  <Skeleton className="h-10 w-full" />
                  <Skeleton className="h-10 w-full" />
                </div>
              ) : leaveRequests && leaveRequests.length > 0 ? (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Leave Type</TableHead>
                      <TableHead>From</TableHead>
                      <TableHead>To</TableHead>
                      <TableHead>Days</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Reason</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {leaveRequests.map((leave) => (
                      <TableRow key={leave.id}>
                        <TableCell className="font-medium">
                          {leave.leave_types?.name || 'Unknown'}
                        </TableCell>
                        <TableCell>
                          {format(new Date(leave.from_date), 'MMM dd, yyyy')}
                        </TableCell>
                        <TableCell>
                          {format(new Date(leave.to_date), 'MMM dd, yyyy')}
                        </TableCell>
                        <TableCell>{leave.total_days}</TableCell>
                        <TableCell>
                          <Badge variant="outline" className={getLeaveStatusColor(leave.status)}>
                            {leave.status}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-muted-foreground max-w-[200px] truncate">
                          {leave.reason || '-'}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  No leave records found
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Payroll Tab */}
        <TabsContent value="payroll">
          <Card>
            <CardHeader>
              <CardTitle>Payroll History</CardTitle>
              <CardDescription>
                {payrollRecords?.length || 0} salary records found
              </CardDescription>
            </CardHeader>
            <CardContent>
              {payrollLoading ? (
                <div className="space-y-2">
                  <Skeleton className="h-10 w-full" />
                  <Skeleton className="h-10 w-full" />
                  <Skeleton className="h-10 w-full" />
                </div>
              ) : payrollRecords && payrollRecords.length > 0 ? (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Month</TableHead>
                      <TableHead className="text-right">Basic Salary</TableHead>
                      <TableHead className="text-right">Allowances</TableHead>
                      <TableHead className="text-right">Deductions</TableHead>
                      <TableHead className="text-right">Net Salary</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Paid On</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {payrollRecords.map((record: any) => (
                      <TableRow key={record.id}>
                        <TableCell className="font-medium">
                          {format(new Date(record.month), 'MMM yyyy')}
                        </TableCell>
                        <TableCell className="text-right">
                          Rs. {record.basic_salary?.toLocaleString() || 0}
                        </TableCell>
                        <TableCell className="text-right">
                          Rs. {record.allowances?.toLocaleString() || 0}
                        </TableCell>
                        <TableCell className="text-right">
                          Rs. {record.deductions?.toLocaleString() || 0}
                        </TableCell>
                        <TableCell className="text-right font-medium">
                          Rs. {record.net_salary?.toLocaleString() || 0}
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline" className={getPaymentStatusColor(record.payment_status)}>
                            {record.payment_status}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-muted-foreground">
                          {record.paid_on 
                            ? format(new Date(record.paid_on), 'MMM dd, yyyy')
                            : '-'}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  No payroll records found
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Assets Tab */}
        <TabsContent value="assets">
          <EmployeeAssignedAssetsCard employeeId={employee.id} />
        </TabsContent>
      </Tabs>
    </div>
  );
}
