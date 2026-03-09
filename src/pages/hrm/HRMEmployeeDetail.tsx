import { useState, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { format, startOfMonth, endOfMonth, subMonths, differenceInDays } from 'date-fns';
import { ArrowLeft, User, Calendar, FileText, Building2, Phone, Mail, Briefcase, DollarSign, CreditCard, Wallet, CheckCircle, XCircle, Clock, Shield, Package, Download } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Skeleton } from '@/components/ui/skeleton';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useAttendanceRecords } from '@/hooks/useAttendance';
import { useLeaveRequests, useDepartments, usePayrollRecords } from '@/hooks/useHRM';
import { EmployeeDocumentsTab } from '@/components/hrm/EmployeeDocumentsTab';
import { EmployeeBankAccountsCard } from '@/components/hrm/EmployeeBankAccountsCard';
import { EmployeeAssignedAssetsCard } from '@/components/hrm/EmployeeAssignedAssetsCard';
import { EmployeeLeaveQuotaCard } from '@/components/hrm/EmployeeLeaveQuotaCard';
import { useDateMode } from '@/contexts/DateModeContext';
import { getCurrentBSMonthRange, getPreviousBSMonthRange } from '@/lib/nepaliDate';
import { FormattedDate } from '@/components/FormattedDate';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

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
  store_id?: string | null;
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

// Generate month/year options
function getMonthYearOptions() {
  const options: { label: string; month: number; year: number }[] = [];
  const now = new Date();
  for (let i = 0; i < 24; i++) {
    const d = subMonths(now, i);
    options.push({
      label: format(d, 'MMMM yyyy'),
      month: d.getMonth(),
      year: d.getFullYear(),
    });
  }
  return options;
}

export default function HRMEmployeeDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('profile');
  const [attendanceFilter, setAttendanceFilter] = useState<'this_month' | 'last_month'>('this_month');
  
  // Report month/year filter (default: current month)
  const now = new Date();
  const [reportMonth, setReportMonth] = useState(now.getMonth());
  const [reportYear, setReportYear] = useState(now.getFullYear());
  const monthYearOptions = useMemo(() => getMonthYearOptions(), []);

  const reportDateRange = useMemo(() => {
    const from = startOfMonth(new Date(reportYear, reportMonth));
    const to = endOfMonth(new Date(reportYear, reportMonth));
    return {
      from: format(from, 'yyyy-MM-dd'),
      to: format(to, 'yyyy-MM-dd'),
      label: format(from, 'MMMM yyyy'),
    };
  }, [reportMonth, reportYear]);

  // Date mode for BS/AD filter logic
  const { dateMode } = useDateMode();

  // Calculate date range for attendance filter based on date mode
  const attendanceDateRange = useMemo(() => {
    if (dateMode === 'BS') {
      const bsRange = attendanceFilter === 'this_month' 
        ? getCurrentBSMonthRange() 
        : getPreviousBSMonthRange();
      return {
        from: format(bsRange.start, 'yyyy-MM-dd'),
        to: format(bsRange.end, 'yyyy-MM-dd')
      };
    }
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
  }, [attendanceFilter, dateMode]);

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

  // ---- REPORT DATA: attendance for report month ----
  const { data: reportAttendance } = useAttendanceRecords(id, {
    from: reportDateRange.from,
    to: reportDateRange.to,
  });

  // ---- REPORT DATA: tasks for report month ----
  const { data: reportTasks } = useQuery({
    queryKey: ['employee-report-tasks', employee?.user_id, reportDateRange.from, reportDateRange.to],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('tasks')
        .select('*')
        .eq('assigned_to_user_id', employee!.user_id!)
        .gte('due_date', reportDateRange.from)
        .lte('due_date', reportDateRange.to);
      if (error) throw error;
      return data;
    },
    enabled: !!employee?.user_id,
  });

  // ---- REPORT DATA: leads/orders for report month (sales & conversion) ----
  const { data: reportLeads } = useQuery({
    queryKey: ['employee-report-leads', employee?.user_id, reportDateRange.from, reportDateRange.to],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('leads')
        .select('id, status, order_id')
        .eq('assigned_to_user_id', employee!.user_id!)
        .gte('date', reportDateRange.from)
        .lte('date', reportDateRange.to);
      if (error) throw error;
      return data;
    },
    enabled: !!employee?.user_id,
  });

  const { data: reportOrders } = useQuery({
    queryKey: ['employee-report-orders', employee?.user_id, reportDateRange.from, reportDateRange.to],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('orders')
        .select('id, amount, order_status')
        .eq('created_by_staff_id', employee!.user_id!)
        .gte('order_date', reportDateRange.from + 'T00:00:00')
        .lte('order_date', reportDateRange.to + 'T23:59:59');
      if (error) throw error;
      return data;
    },
    enabled: !!employee?.user_id,
  });

  // Compute report stats
  const reportStats = useMemo(() => {
    const att = reportAttendance || [];
    const present = att.filter(r => r.status === 'Present' || r.status === 'Work From Home' || r.status === 'Late').length;
    const late = att.filter(r => r.status === 'Late').length;
    const absent = att.filter(r => r.status === 'Absent').length;
    const leave = att.filter(r => r.status === 'Leave').length;
    const totalLateMinutes = att.reduce((sum, r) => sum + ((r as any).late_minutes || 0), 0);
    const totalDays = att.length;

    const tasks = reportTasks || [];
    const totalTasks = tasks.length;
    const completedTasks = tasks.filter(t => t.status === 'COMPLETED').length;
    const onTimeTasks = tasks.filter(t => {
      if (t.status !== 'COMPLETED' || !t.completed_date) return false;
      return new Date(t.completed_date) <= new Date(t.due_date);
    }).length;
    const overdueTasks = tasks.filter(t => {
      if (t.status === 'COMPLETED' && t.completed_date) {
        return new Date(t.completed_date) > new Date(t.due_date);
      }
      return t.status !== 'COMPLETED' && new Date(t.due_date) < new Date();
    }).length;

    const leads = reportLeads || [];
    const totalLeads = leads.length;
    const confirmedLeads = leads.filter(l => l.status === 'CONFIRMED' || l.order_id).length;
    const conversionRate = totalLeads > 0 ? ((confirmedLeads / totalLeads) * 100).toFixed(1) : '0';

    const orders = reportOrders || [];
    const totalSales = orders
      .filter(o => o.order_status && !['CANCELLED', 'RETURNED'].includes(o.order_status))
      .reduce((sum, o) => sum + (o.amount || 0), 0);
    const totalOrdersCount = orders.filter(o => o.order_status && !['CANCELLED', 'RETURNED'].includes(o.order_status)).length;

    return {
      totalDays, present, late, absent, leave, totalLateMinutes,
      totalTasks, completedTasks, onTimeTasks, overdueTasks,
      totalLeads, confirmedLeads, conversionRate,
      totalSales, totalOrdersCount,
    };
  }, [reportAttendance, reportTasks, reportLeads, reportOrders]);

  // Export PDF
  const handleExportReport = () => {
    if (!employee) return;

    const doc = new jsPDF('p', 'mm', 'a4');
    const pageWidth = doc.internal.pageSize.getWidth();
    let y = 15;

    // Title
    doc.setFontSize(16);
    doc.setFont('helvetica', 'bold');
    doc.text('Employee Monthly Report', pageWidth / 2, y, { align: 'center' });
    y += 8;

    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    doc.text(`Report Period: ${reportDateRange.label}`, pageWidth / 2, y, { align: 'center' });
    y += 10;

    // Employee Info
    doc.setFontSize(12);
    doc.setFont('helvetica', 'bold');
    doc.text('Staff Information', 14, y);
    y += 2;

    const deptName = employee.departments?.name || 'N/A';

    autoTable(doc, {
      startY: y,
      theme: 'grid',
      headStyles: { fillColor: [59, 130, 246] },
      body: [
        ['Name', employee.full_name, 'Position', employee.position || 'N/A'],
        ['Department', deptName, 'Status', employee.status],
        ['Phone', employee.phone || 'N/A', 'Email', employee.email || 'N/A'],
      ],
      columnStyles: {
        0: { fontStyle: 'bold', cellWidth: 30 },
        1: { cellWidth: 55 },
        2: { fontStyle: 'bold', cellWidth: 30 },
        3: { cellWidth: 55 },
      },
      margin: { left: 14, right: 14 },
    });

    y = (doc as any).lastAutoTable.finalY + 10;

    // Attendance Section
    doc.setFontSize(12);
    doc.setFont('helvetica', 'bold');
    doc.text('Attendance Summary', 14, y);
    y += 2;

    const lateHours = Math.floor(reportStats.totalLateMinutes / 60);
    const lateMins = reportStats.totalLateMinutes % 60;

    autoTable(doc, {
      startY: y,
      theme: 'grid',
      headStyles: { fillColor: [34, 197, 94] },
      head: [['Total Days', 'Present', 'Late', 'Absent', 'Leave', 'Total Late']],
      body: [[
        reportStats.totalDays,
        reportStats.present,
        reportStats.late,
        reportStats.absent,
        reportStats.leave,
        `${lateHours}h ${lateMins}m`,
      ]],
      margin: { left: 14, right: 14 },
    });

    y = (doc as any).lastAutoTable.finalY + 10;

    // Sales Section
    doc.setFontSize(12);
    doc.setFont('helvetica', 'bold');
    doc.text('Sales Performance', 14, y);
    y += 2;

    autoTable(doc, {
      startY: y,
      theme: 'grid',
      headStyles: { fillColor: [168, 85, 247] },
      head: [['Total Leads', 'Confirmed', 'Conversion Rate', 'Total Orders', 'Total Sales (Rs.)']],
      body: [[
        reportStats.totalLeads,
        reportStats.confirmedLeads,
        `${reportStats.conversionRate}%`,
        reportStats.totalOrdersCount,
        `Rs. ${reportStats.totalSales.toLocaleString()}`,
      ]],
      margin: { left: 14, right: 14 },
    });

    y = (doc as any).lastAutoTable.finalY + 10;

    // Tasks Section
    doc.setFontSize(12);
    doc.setFont('helvetica', 'bold');
    doc.text('Task Summary', 14, y);
    y += 2;

    autoTable(doc, {
      startY: y,
      theme: 'grid',
      headStyles: { fillColor: [249, 115, 22] },
      head: [['Total Tasks', 'Completed', 'On Time', 'Overdue/Late']],
      body: [[
        reportStats.totalTasks,
        reportStats.completedTasks,
        reportStats.onTimeTasks,
        reportStats.overdueTasks,
      ]],
      margin: { left: 14, right: 14 },
    });

    y = (doc as any).lastAutoTable.finalY + 10;

    // Task details if any
    if (reportTasks && reportTasks.length > 0) {
      doc.setFontSize(11);
      doc.setFont('helvetica', 'bold');
      doc.text('Task Details', 14, y);
      y += 2;

      autoTable(doc, {
        startY: y,
        theme: 'striped',
        headStyles: { fillColor: [100, 116, 139] },
        head: [['Title', 'Due Date', 'Status', 'Completed']],
        body: reportTasks.map(t => [
          t.title.substring(0, 40),
          format(new Date(t.due_date), 'MMM dd, yyyy'),
          t.status || 'PENDING',
          t.completed_date ? format(new Date(t.completed_date), 'MMM dd') : '-',
        ]),
        columnStyles: {
          0: { cellWidth: 60 },
        },
        margin: { left: 14, right: 14 },
      });
    }

    // Footer
    const pageHeight = doc.internal.pageSize.getHeight();
    doc.setFontSize(8);
    doc.setFont('helvetica', 'italic');
    doc.text(`Generated on ${format(new Date(), 'MMM dd, yyyy hh:mm a')}`, pageWidth / 2, pageHeight - 10, { align: 'center' });

    doc.save(`${employee.full_name.replace(/\s+/g, '_')}_Report_${reportDateRange.label.replace(/\s+/g, '_')}.pdf`);
  };

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
      case 'Saturday': return 'bg-slate-500/10 text-slate-600';
      case 'Holiday': return 'bg-indigo-500/10 text-indigo-600';
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

  const attendanceStats = {
    present: attendanceRecords?.filter(r => r.status === 'Present' || r.status === 'Work From Home' || r.status === 'Late').length || 0,
    late: attendanceRecords?.filter(r => r.status === 'Late').length || 0,
    absent: attendanceRecords?.filter(r => r.status === 'Absent').length || 0,
    halfDay: attendanceRecords?.filter(r => r.status === 'Half-day').length || 0,
    leave: attendanceRecords?.filter(r => r.status === 'Leave').length || 0,
    totalLateMinutes: attendanceRecords?.reduce((sum, r) => sum + ((r as any).late_minutes || 0), 0) || 0,
  };

  const selectedMonthYearKey = `${reportMonth}-${reportYear}`;

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-start gap-4 flex-wrap">
        <Button variant="ghost" size="icon" onClick={() => navigate('/hrm/employees')}>
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <h1 className="text-2xl font-bold">{employee.full_name}</h1>
            <Badge className={getStatusColor(employee.status)}>{employee.status}</Badge>
          </div>
          <p className="text-muted-foreground">{employee.position || 'No position'}</p>
        </div>

        {/* Report Month Filter + Export */}
        <div className="flex items-center gap-2 flex-wrap">
          <Select
            value={selectedMonthYearKey}
            onValueChange={(val) => {
              const [m, y] = val.split('-').map(Number);
              setReportMonth(m);
              setReportYear(y);
            }}
          >
            <SelectTrigger className="w-[180px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {monthYearOptions.map((opt) => (
                <SelectItem key={`${opt.month}-${opt.year}`} value={`${opt.month}-${opt.year}`}>
                  {opt.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button size="sm" onClick={handleExportReport}>
            <Download className="h-4 w-4 mr-1" />
            Export Report
          </Button>
        </div>
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
                      <TableRow key={record.id} className={record.status === 'Late' ? 'bg-amber-50 dark:bg-amber-950/20' : ''}>
                        <TableCell className="font-medium">
                          <FormattedDate date={record.date} />
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
