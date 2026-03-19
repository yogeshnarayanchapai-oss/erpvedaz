import { useState, useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Clock, LogIn, LogOut, Calendar, CalendarDays, List, Plus, CheckCircle, XCircle, Info, Timer } from 'lucide-react';
import { differenceInDays, differenceInMinutes, format, parseISO, startOfMonth, endOfMonth, subMonths } from 'date-fns';
import { FormattedDate } from '@/components/FormattedDate';
import { NepaliDatePicker } from '@/components/NepaliDatePicker';
import { NepaliCalendar, CalendarEvent } from '@/components/NepaliCalendar';
import { useTodayAttendance, useCheckIn, useCheckOut, useMyAttendance } from '@/hooks/useAttendance';
import { useMyEmployeeProfile } from '@/hooks/useEmployeeDocuments';
import { useLeaveRequests, useCreateLeaveRequest, useLeaveTypes } from '@/hooks/useHRM';
import { useMyLeaveQuota } from '@/hooks/useLeaveQuota';
import { useDateMode } from '@/contexts/DateModeContext';
import { getCurrentBSMonthRange, getPreviousBSMonthRange } from '@/lib/nepaliDate';

export default function MyHRAttendanceLeave() {
  const [searchParams, setSearchParams] = useSearchParams();
  const activeTab = searchParams.get('tab') || 'attendance';
  const setActiveTab = (tab: string) => setSearchParams({ tab });

  // Date mode for BS/AD filter logic
  const { dateMode } = useDateMode();

  // Attendance hooks
  const { data: todayAttendance, isLoading: loadingToday } = useTodayAttendance();
  const { data: myAttendance = [], isLoading: loadingAttendance } = useMyAttendance();
  const checkIn = useCheckIn();
  const checkOut = useCheckOut();
  const [selectedDate, setSelectedDate] = useState<Date | undefined>();
  const [monthFilter, setMonthFilter] = useState<'this' | 'last'>('this');

  // Leave hooks
  const { data: employee, isLoading: loadingEmployee } = useMyEmployeeProfile();
  const { data: requests = [], isLoading: loadingLeave } = useLeaveRequests({ employeeId: employee?.id });
  const { data: leaveTypes = [] } = useLeaveTypes();
  const { data: leaveQuota } = useMyLeaveQuota();
  const createRequest = useCreateLeaveRequest();

  const [isLeaveDialogOpen, setIsLeaveDialogOpen] = useState(false);
  const [leaveForm, setLeaveForm] = useState({
    leave_type_id: '',
    from_date: '',
    to_date: '',
    reason: '',
    work_assigned_to: '',
  });

  const calculateHours = (checkInTime: string | null, checkOutTime: string | null) => {
    if (!checkInTime || !checkOutTime) return '-';
    const minutes = differenceInMinutes(parseISO(checkOutTime), parseISO(checkInTime));
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return `${hours}h ${mins}m`;
  };

  const statusColors: Record<string, string> = {
    Present: 'bg-green-100 text-green-800',
    Absent: 'bg-red-100 text-red-800',
    'Half-day': 'bg-yellow-100 text-yellow-800',
    'Work From Home': 'bg-blue-100 text-blue-800',
    Leave: 'bg-purple-100 text-purple-800',
    Late: 'bg-amber-100 text-amber-800',
    Saturday: 'bg-slate-100 text-slate-800',
    Holiday: 'bg-indigo-100 text-indigo-800',
  };

  // Get date range based on filter and date mode (BS or AD)
  const dateRange = useMemo(() => {
    // If BS mode, use BS month boundaries
    if (dateMode === 'BS') {
      if (monthFilter === 'this') {
        return getCurrentBSMonthRange();
      } else {
        return getPreviousBSMonthRange();
      }
    }
    // AD mode - use standard AD months
    const now = new Date();
    if (monthFilter === 'this') {
      return { start: startOfMonth(now), end: endOfMonth(now) };
    } else {
      const lastMonth = subMonths(now, 1);
      return { start: startOfMonth(lastMonth), end: endOfMonth(lastMonth) };
    }
  }, [monthFilter, dateMode]);

  // Filter attendance based on month
  const filteredAttendance = useMemo(() => {
    return myAttendance.filter(a => {
      const recordDate = new Date(a.date);
      return recordDate >= dateRange.start && recordDate <= dateRange.end;
    });
  }, [myAttendance, dateRange]);

  const leaveStatusColors: Record<string, string> = {
    Pending: 'bg-warning/10 text-warning',
    Approved: 'bg-success/10 text-success',
    Rejected: 'bg-destructive/10 text-destructive',
    Cancelled: 'bg-muted text-muted-foreground',
  };

  // Convert attendance to calendar events
  const calendarEvents: CalendarEvent[] = useMemo(() => {
    return myAttendance.map(r => ({
      date: r.date,
      title: r.status,
      type: r.status === 'Present' || r.status === 'Work From Home' || r.status === 'Late' ? 'attendance' :
        r.status === 'Leave' ? 'leave' :
          r.status === 'Absent' ? 'holiday' : 'event',
    }));
  }, [myAttendance]);

  // Attendance stats - based on filtered month, include Late in present count
  const thisMonthPresent = filteredAttendance.filter(a =>
    a.status === 'Present' || a.status === 'Work From Home' || a.status === 'Late'
  ).length;
  const thisMonthAbsent = filteredAttendance.filter(a =>
    a.status === 'Absent'
  ).length;
  const thisMonthLeave = filteredAttendance.filter(a =>
    a.status === 'Leave'
  ).length;

  // Calculate total late minutes
  const totalLateMinutes = filteredAttendance.reduce((total, a) => {
    if (a.status === 'Late' && a.late_minutes) {
      return total + a.late_minutes;
    }
    return total;
  }, 0);

  const formatLateMinutes = (minutes: number) => {
    if (minutes === 0) return '0m';
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    if (hours > 0) {
      return `${hours}h ${mins}m`;
    }
    return `${mins}m`;
  };

  // Leave stats
  const approvedDays = requests
    .filter(r => r.status === 'Approved')
    .reduce((sum, r) => sum + r.total_days, 0);
  const remainingQuota = (leaveQuota?.max_days || 0) - approvedDays;

  const resetLeaveForm = () => setLeaveForm({ leave_type_id: '', from_date: '', to_date: '', reason: '' });

  const handleLeaveSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!employee) return;

    const totalDays = differenceInDays(new Date(leaveForm.to_date), new Date(leaveForm.from_date)) + 1;
    await createRequest.mutateAsync({
      employee_id: employee.id,
      ...leaveForm,
      total_days: totalDays,
      reason: leaveForm.reason || undefined
    });
    setIsLeaveDialogOpen(false);
    resetLeaveForm();
  };

  const getLeaveStatusIcon = (status: string) => {
    switch (status) {
      case 'Approved': return <CheckCircle className="w-4 h-4" />;
      case 'Rejected': return <XCircle className="w-4 h-4" />;
      default: return <Clock className="w-4 h-4" />;
    }
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h1 className="text-2xl font-bold">Attendance & Leave</h1>
        <p className="text-muted-foreground">Track your attendance and manage leave requests</p>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-2 md:w-auto md:inline-grid">
          <TabsTrigger value="attendance" className="gap-2">
            <Clock className="h-4 w-4" />
            Attendance
          </TabsTrigger>
          <TabsTrigger value="leave" className="gap-2">
            <Calendar className="h-4 w-4" />
            Leave
          </TabsTrigger>
        </TabsList>

        {/* ATTENDANCE TAB */}
        <TabsContent value="attendance" className="space-y-6 mt-6">
          {/* Today's Attendance Card */}
          <Card className="bg-gradient-to-r from-primary/10 to-primary/5">
            <CardContent className="p-6">
              <div className="flex items-center justify-between flex-wrap gap-4">
                <div>
                  <h2 className="text-lg font-semibold mb-2">Today's Attendance</h2>
                  <p className="text-sm text-muted-foreground">{format(new Date(), 'EEEE, MMMM d, yyyy')}</p>
                  {todayAttendance ? (
                    <div className="mt-3 space-y-1">
                      <p className="text-sm">
                        Check In: <strong>{todayAttendance.check_in_time ? format(parseISO(todayAttendance.check_in_time), 'hh:mm a') : '-'}</strong>
                      </p>
                      <p className="text-sm">
                        Check Out: <strong>{todayAttendance.check_out_time ? format(parseISO(todayAttendance.check_out_time), 'hh:mm a') : '-'}</strong>
                      </p>
                      {todayAttendance.check_in_time && todayAttendance.check_out_time && (
                        <p className="text-sm">
                          Hours: <strong>{calculateHours(todayAttendance.check_in_time, todayAttendance.check_out_time)}</strong>
                        </p>
                      )}
                    </div>
                  ) : (
                    <p className="mt-3 text-sm text-muted-foreground">Not checked in yet</p>
                  )}
                </div>
                <div className="flex gap-2">
                  {loadingToday ? (
                    <Button disabled>Loading...</Button>
                  ) : !todayAttendance ? (
                    <Button onClick={() => checkIn.mutate()} disabled={checkIn.isPending}>
                      <LogIn className="w-4 h-4 mr-2" />
                      Check In
                    </Button>
                  ) : !todayAttendance.check_in_time ? (
                    <Button onClick={() => checkIn.mutate()} disabled={checkIn.isPending}>
                      <LogIn className="w-4 h-4 mr-2" />
                      Check In
                    </Button>
                  ) : !todayAttendance.check_out_time ? (
                    <Button onClick={() => checkOut.mutate(todayAttendance.id)} disabled={checkOut.isPending}>
                      <LogOut className="w-4 h-4 mr-2" />
                      Check Out
                    </Button>
                  ) : (
                    <Badge className="bg-green-100 text-green-800 px-4 py-2">
                      <Clock className="w-4 h-4 mr-2" />
                      Completed
                    </Badge>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Month Filter */}
          <div className="flex justify-end">
            <Select value={monthFilter} onValueChange={(v: 'this' | 'last') => setMonthFilter(v)}>
              <SelectTrigger className="w-[150px]">
                <SelectValue placeholder="Select month" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="this">This Month</SelectItem>
                <SelectItem value="last">Last Month</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Monthly Stats */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <Card>
              <CardContent className="p-4 text-center">
                <div className="text-2xl font-bold text-green-600">{thisMonthPresent}</div>
                <div className="text-sm text-muted-foreground">Days Present</div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4 text-center">
                <div className="text-2xl font-bold text-red-600">{thisMonthAbsent}</div>
                <div className="text-sm text-muted-foreground">Days Absent</div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4 text-center">
                <div className="text-2xl font-bold text-purple-600">{thisMonthLeave}</div>
                <div className="text-sm text-muted-foreground">Leave Days</div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4 text-center">
                <div className="flex items-center justify-center gap-1">
                  <Timer className="w-5 h-5 text-amber-600" />
                  <span className="text-2xl font-bold text-amber-600">{formatLateMinutes(totalLateMinutes)}</span>
                </div>
                <div className="text-sm text-muted-foreground">Late Minutes</div>
              </CardContent>
            </Card>
          </div>

          {/* Attendance History */}
          <Tabs defaultValue="list" className="w-full">
            <TabsList>
              <TabsTrigger value="calendar" className="flex items-center gap-2">
                <CalendarDays className="w-4 h-4" />
                Calendar View
              </TabsTrigger>
              <TabsTrigger value="list" className="flex items-center gap-2">
                <List className="w-4 h-4" />
                List View
              </TabsTrigger>
            </TabsList>

            <TabsContent value="calendar" className="mt-4">
              <NepaliCalendar
                events={calendarEvents}
                selectedDate={selectedDate}
                onDateClick={(_, adDate) => setSelectedDate(adDate)}
              />
            </TabsContent>

            <TabsContent value="list" className="mt-4">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Calendar className="w-5 h-5 text-primary" />
                    Attendance History
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Date</TableHead>
                        <TableHead>Check In</TableHead>
                        <TableHead>Check Out</TableHead>
                        <TableHead>Hours</TableHead>
                        <TableHead>Status</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredAttendance.map((record) => (
                        <TableRow 
                          key={record.id}
                          className={record.status === 'Late' ? 'bg-amber-50 dark:bg-amber-950/20' : ''}
                        >
                          <TableCell><FormattedDate date={record.date} /></TableCell>
                          <TableCell>{record.check_in_time ? format(parseISO(record.check_in_time), 'hh:mm a') : '-'}</TableCell>
                          <TableCell>{record.check_out_time ? format(parseISO(record.check_out_time), 'hh:mm a') : '-'}</TableCell>
                          <TableCell>{calculateHours(record.check_in_time, record.check_out_time)}</TableCell>
                          <TableCell>
                            <Badge className={statusColors[record.status] || 'bg-muted'}>{record.status}</Badge>
                          </TableCell>
                        </TableRow>
                      ))}
                      {filteredAttendance.length === 0 && (
                        <TableRow>
                          <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                            {loadingAttendance ? 'Loading...' : 'No attendance records'}
                          </TableCell>
                        </TableRow>
                      )}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </TabsContent>

        {/* LEAVE TAB */}
        <TabsContent value="leave" className="space-y-6 mt-6">
          {loadingEmployee ? (
            <div className="p-6 text-center text-muted-foreground">Loading...</div>
          ) : !employee ? (
            <div className="p-6 text-center">
              <Info className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
              <h3 className="text-lg font-medium mb-2">No Employee Profile</h3>
              <p className="text-muted-foreground">Your account is not linked to an employee record. Please contact HR.</p>
            </div>
          ) : (
            <>
              {/* Leave Header with Apply Button */}
              <div className="flex items-center justify-end">
                <Dialog open={isLeaveDialogOpen} onOpenChange={(open) => { setIsLeaveDialogOpen(open); if (!open) resetLeaveForm(); }}>
                  <DialogTrigger asChild>
                    <Button><Plus className="w-4 h-4 mr-2" />Apply for Leave</Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader><DialogTitle>Apply for Leave</DialogTitle></DialogHeader>
                    <form onSubmit={handleLeaveSubmit} className="space-y-4">
                      <div className="space-y-2">
                        <Label>Leave Type *</Label>
                        <Select value={leaveForm.leave_type_id} onValueChange={(v) => setLeaveForm({ ...leaveForm, leave_type_id: v })}>
                          <SelectTrigger><SelectValue placeholder="Select type" /></SelectTrigger>
                          <SelectContent>
                            {leaveTypes.map((t) => <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>)}
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label>From *</Label>
                          <NepaliDatePicker value={leaveForm.from_date} onChange={(v) => setLeaveForm({ ...leaveForm, from_date: v })} placeholder="Select start date" />
                        </div>
                        <div className="space-y-2">
                          <Label>To *</Label>
                          <NepaliDatePicker value={leaveForm.to_date} onChange={(v) => setLeaveForm({ ...leaveForm, to_date: v })} placeholder="Select end date" />
                        </div>
                      </div>
                      {leaveForm.from_date && leaveForm.to_date && (
                        <p className="text-sm text-muted-foreground">
                          Total Days: <strong>{differenceInDays(new Date(leaveForm.to_date), new Date(leaveForm.from_date)) + 1}</strong>
                        </p>
                      )}
                      <div className="space-y-2">
                        <Label>Reason</Label>
                        <Textarea value={leaveForm.reason} onChange={(e) => setLeaveForm({ ...leaveForm, reason: e.target.value })} rows={2} placeholder="Optional: Describe reason for leave" />
                      </div>
                      <Button type="submit" className="w-full" disabled={createRequest.isPending || !leaveForm.leave_type_id || !leaveForm.from_date || !leaveForm.to_date}>
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
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Calendar className="w-5 h-5 text-primary" />
                    My Leave Requests
                  </CardTitle>
                </CardHeader>
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
                            <Badge variant="outline" className={leaveStatusColors[r.status]}>
                              {getLeaveStatusIcon(r.status)}
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
                            {loadingLeave ? 'Loading...' : 'No leave requests yet'}
                          </TableCell>
                        </TableRow>
                      )}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>
            </>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
