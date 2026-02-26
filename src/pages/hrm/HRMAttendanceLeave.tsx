import { useState, useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Plus, Edit, CalendarDays, List, LogIn, LogOut, Clock, Calendar, CheckCircle, XCircle, Eye, ClipboardList, Settings } from 'lucide-react';
import { Switch } from '@/components/ui/switch';
import { useAttendanceRecords, useCreateAttendance, useUpdateAttendance, useTodayAttendance, useCheckIn, useCheckOut, AttendanceRecord } from '@/hooks/useAttendance';
import { useLeaveRequests, useCreateLeaveRequest, useUpdateLeaveRequest, useEmployees, useLeaveTypes } from '@/hooks/useHRM';
import { useLeaveQuotas, useLeaveSettings, useCreateLeaveQuota, useUpdateLeaveQuota, useDeleteLeaveQuota, useUpdateLeaveSettings, LeaveQuota } from '@/hooks/useLeaveQuota';
import { format, differenceInMinutes, parseISO, differenceInDays, startOfMonth, addMonths } from 'date-fns';
import { FormattedDate } from '@/components/FormattedDate';
import { NepaliCalendar, CalendarEvent } from '@/components/NepaliCalendar';
import { NepaliDatePicker } from '@/components/NepaliDatePicker';

const STATUSES = ['Present', 'Late', 'Absent', 'Half-day', 'Work From Home', 'Leave'];

export default function HRMAttendanceLeave() {
  const [searchParams, setSearchParams] = useSearchParams();
  const activeTab = searchParams.get('tab') || 'attendance';
  const setActiveTab = (tab: string) => setSearchParams({ tab });

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h1 className="text-2xl font-bold">Attendance & Leave</h1>
        <p className="text-muted-foreground">Manage employee attendance records and leave requests</p>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-3 md:w-auto md:inline-grid">
          <TabsTrigger value="attendance" className="gap-2">
            <Clock className="h-4 w-4" />
            Attendance
          </TabsTrigger>
          <TabsTrigger value="leave" className="gap-2">
            <Calendar className="h-4 w-4" />
            Leave Requests
          </TabsTrigger>
          <TabsTrigger value="quota" className="gap-2">
            <ClipboardList className="h-4 w-4" />
            Leave Quota
          </TabsTrigger>
        </TabsList>

        <TabsContent value="attendance" className="mt-6">
          <AttendanceSection />
        </TabsContent>

        <TabsContent value="leave" className="mt-6">
          <LeaveSection />
        </TabsContent>

        <TabsContent value="quota" className="mt-6">
          <LeaveQuotaSection />
        </TabsContent>
      </Tabs>
    </div>
  );
}

// Attendance Section (inlined from HRMAttendance)
function AttendanceSection() {
  const today = new Date().toISOString().split('T')[0];
  const yesterday = new Date(Date.now() - 86400000).toISOString().split('T')[0];
  const [datePreset, setDatePreset] = useState<'today' | 'yesterday' | 'custom'>('today');
  const [filter, setFilter] = useState({ employee_id: '', from: today, to: today, status: '' });

  // Compute effective date range based on preset
  const effectiveDateRange = useMemo(() => {
    if (datePreset === 'today') return { from: today, to: today };
    if (datePreset === 'yesterday') return { from: yesterday, to: yesterday };
    return { from: filter.from, to: filter.to };
  }, [datePreset, today, yesterday, filter.from, filter.to]);

  const { data: rawRecords, isLoading } = useAttendanceRecords(
    filter.employee_id || undefined,
    effectiveDateRange.from || effectiveDateRange.to ? effectiveDateRange : undefined
  );

  // Filter by status client-side
  const records = useMemo(() => {
    if (!rawRecords) return [];
    if (!filter.status) return rawRecords;
    return rawRecords.filter(r => r.status === filter.status);
  }, [rawRecords, filter.status]);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editRecord, setEditRecord] = useState<AttendanceRecord | null>(null);
  const [form, setForm] = useState({
    employee_id: '',
    date: today,
    check_in_time: '',
    check_out_time: '',
    status: 'Present' as 'Present' | 'Absent' | 'Half-day' | 'Work From Home' | 'Leave' | 'Late',
    notes: '',
  });
  const { data: employees } = useEmployees();
  const createAttendance = useCreateAttendance();
  const updateAttendance = useUpdateAttendance();
  const { data: todayAttendance, isLoading: loadingToday } = useTodayAttendance();
  const checkIn = useCheckIn();
  const checkOut = useCheckOut();

  const resetForm = () => {
    setForm({ employee_id: '', date: today, check_in_time: '', check_out_time: '', status: 'Present', notes: '' });
    setEditRecord(null);
  };

  const handleSubmit = async () => {
    const data = {
      employee_id: form.employee_id,
      date: form.date,
      check_in_time: form.check_in_time ? new Date(`${form.date}T${form.check_in_time}`).toISOString() : null,
      check_out_time: form.check_out_time ? new Date(`${form.date}T${form.check_out_time}`).toISOString() : null,
      status: form.status,
      notes: form.notes || null,
    };
    if (editRecord) {
      await updateAttendance.mutateAsync({ id: editRecord.id, ...data });
    } else {
      await createAttendance.mutateAsync(data);
    }
    setDialogOpen(false);
    resetForm();
  };

  const openEdit = (record: AttendanceRecord) => {
    setEditRecord(record);
    setForm({
      employee_id: record.employee_id,
      date: record.date,
      check_in_time: record.check_in_time ? format(parseISO(record.check_in_time), 'HH:mm') : '',
      check_out_time: record.check_out_time ? format(parseISO(record.check_out_time), 'HH:mm') : '',
      status: record.status,
      notes: record.notes || '',
    });
    setDialogOpen(true);
  };

  const calculateHours = (checkInTime: string | null, checkOutTime: string | null) => {
    if (!checkInTime || !checkOutTime) return '-';
    const minutes = differenceInMinutes(parseISO(checkOutTime), parseISO(checkInTime));
    return `${Math.floor(minutes / 60)}h ${minutes % 60}m`;
  };

  const statusColors: Record<string, string> = {
    Present: 'bg-green-100 text-green-800',
    Late: 'bg-orange-100 text-orange-800',
    Absent: 'bg-red-100 text-red-800',
    'Half-day': 'bg-yellow-100 text-yellow-800',
    'Work From Home': 'bg-blue-100 text-blue-800',
    Leave: 'bg-purple-100 text-purple-800',
  };

  const summary = records?.reduce((acc, r) => { acc[r.status] = (acc[r.status] || 0) + 1; return acc; }, {} as Record<string, number>) || {};
  const [selectedDate, setSelectedDate] = useState<Date | undefined>();
  const calendarEvents: CalendarEvent[] = useMemo(() => {
    return (records || []).map(r => ({
      date: r.date,
      title: `${r.employees?.full_name || 'Unknown'} - ${r.status}`,
      type: r.status === 'Present' || r.status === 'Work From Home' ? 'attendance' : r.status === 'Leave' ? 'leave' : r.status === 'Absent' ? 'holiday' : 'event',
    }));
  }, [records]);

  return (
    <div className="space-y-6">
      {/* My Attendance Today */}
      <Card className="bg-gradient-to-r from-primary/10 to-primary/5">
        <CardContent className="p-6">
          <div className="flex items-center justify-between flex-wrap gap-4">
            <div>
              <h2 className="text-lg font-semibold mb-2">My Attendance Today</h2>
              <p className="text-sm text-muted-foreground">{format(new Date(), 'EEEE, MMMM d, yyyy')}</p>
              {todayAttendance ? (
                <div className="mt-3 space-y-1">
                  <p className="text-sm">Check In: <strong>{todayAttendance.check_in_time ? format(parseISO(todayAttendance.check_in_time), 'hh:mm a') : '-'}</strong></p>
                  <p className="text-sm">Check Out: <strong>{todayAttendance.check_out_time ? format(parseISO(todayAttendance.check_out_time), 'hh:mm a') : '-'}</strong></p>
                </div>
              ) : <p className="mt-3 text-sm text-muted-foreground">Not checked in yet</p>}
            </div>
            <div className="flex gap-2">
              {loadingToday ? <Button disabled>Loading...</Button> : !todayAttendance ? (
                <Button onClick={() => checkIn.mutate()} disabled={checkIn.isPending}><LogIn className="w-4 h-4 mr-2" />Check In</Button>
              ) : !todayAttendance.check_in_time ? (
                <Button onClick={() => checkIn.mutate()} disabled={checkIn.isPending}><LogIn className="w-4 h-4 mr-2" />Check In</Button>
              ) : !todayAttendance.check_out_time ? (
                <Button onClick={() => checkOut.mutate(todayAttendance.id)} disabled={checkOut.isPending}><LogOut className="w-4 h-4 mr-2" />Check Out</Button>
              ) : <Badge className="bg-green-100 text-green-800 px-4 py-2"><Clock className="w-4 h-4 mr-2" />Completed</Badge>}
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold">Time & Attendance</h2>
          <p className="text-muted-foreground text-sm">Manage employee attendance records</p>
        </div>
        <Dialog open={dialogOpen} onOpenChange={(open) => { setDialogOpen(open); if (!open) resetForm(); }}>
          <DialogTrigger asChild><Button><Plus className="w-4 h-4 mr-2" />Add Record</Button></DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>{editRecord ? 'Edit Attendance' : 'Add Attendance Record'}</DialogTitle></DialogHeader>
            <div className="space-y-4">
              <div><Label>Employee *</Label><Select value={form.employee_id} onValueChange={v => setForm({ ...form, employee_id: v })}><SelectTrigger><SelectValue placeholder="Select employee" /></SelectTrigger><SelectContent>{employees?.map(emp => <SelectItem key={emp.id} value={emp.id}>{emp.full_name}</SelectItem>)}</SelectContent></Select></div>
              <div className="grid grid-cols-2 gap-4">
                <div><Label>Date *</Label><NepaliDatePicker value={form.date} onChange={v => setForm({ ...form, date: v })} placeholder="Select date" /></div>
                <div><Label>Status</Label><Select value={form.status} onValueChange={v => setForm({ ...form, status: v as any })}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{STATUSES.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent></Select></div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div><Label>Check In Time</Label><Input type="time" value={form.check_in_time} onChange={e => setForm({ ...form, check_in_time: e.target.value })} /></div>
                <div><Label>Check Out Time</Label><Input type="time" value={form.check_out_time} onChange={e => setForm({ ...form, check_out_time: e.target.value })} /></div>
              </div>
              <div><Label>Notes</Label><Input value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })} /></div>
              <Button onClick={handleSubmit} disabled={!form.employee_id || !form.date} className="w-full">{editRecord ? 'Update' : 'Create'} Record</Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid grid-cols-5 gap-4">
        {STATUSES.map(status => (
          <Card key={status}><CardContent className="p-4 text-center"><div className="text-2xl font-bold">{summary[status] || 0}</div><div className="text-sm text-muted-foreground">{status}</div></CardContent></Card>
        ))}
      </div>

      <Tabs defaultValue="list" className="w-full">
        <TabsList>
          <TabsTrigger value="calendar" className="flex items-center gap-2"><CalendarDays className="w-4 h-4" />Calendar View</TabsTrigger>
          <TabsTrigger value="list" className="flex items-center gap-2"><List className="w-4 h-4" />List View</TabsTrigger>
        </TabsList>
        <TabsContent value="calendar" className="mt-4">
          <NepaliCalendar events={calendarEvents} selectedDate={selectedDate} onDateClick={(_, adDate) => setSelectedDate(adDate)} />
        </TabsContent>
        <TabsContent value="list" className="mt-4">
          <div className="flex flex-wrap gap-3 mb-4 items-end">
            <Select value={filter.employee_id} onValueChange={v => setFilter({ ...filter, employee_id: v === 'all' ? '' : v })}><SelectTrigger className="w-52"><SelectValue placeholder="All Employees" /></SelectTrigger><SelectContent><SelectItem value="all">All Employees</SelectItem>{employees?.map(emp => <SelectItem key={emp.id} value={emp.id}>{emp.full_name}</SelectItem>)}</SelectContent></Select>
            <div className="flex gap-1">
              <Button size="sm" variant={datePreset === 'today' ? 'default' : 'outline'} onClick={() => setDatePreset('today')}>Today</Button>
              <Button size="sm" variant={datePreset === 'yesterday' ? 'default' : 'outline'} onClick={() => setDatePreset('yesterday')}>Yesterday</Button>
              <Button size="sm" variant={datePreset === 'custom' ? 'default' : 'outline'} onClick={() => setDatePreset('custom')}>Custom</Button>
            </div>
            {datePreset === 'custom' && (
              <>
                <NepaliDatePicker value={filter.from} onChange={v => setFilter({ ...filter, from: v })} placeholder="From date" className="w-44" />
                <NepaliDatePicker value={filter.to} onChange={v => setFilter({ ...filter, to: v })} placeholder="To date" className="w-44" />
              </>
            )}
            <Select value={filter.status || 'all'} onValueChange={v => setFilter({ ...filter, status: v === 'all' ? '' : v })}><SelectTrigger className="w-40"><SelectValue placeholder="All Status" /></SelectTrigger><SelectContent><SelectItem value="all">All Status</SelectItem><SelectItem value="Present">Present</SelectItem><SelectItem value="Late">Late</SelectItem><SelectItem value="Absent">Absent</SelectItem><SelectItem value="Half-day">Half-day</SelectItem><SelectItem value="Work From Home">WFH</SelectItem><SelectItem value="Leave">Leave</SelectItem></SelectContent></Select>
          </div>
          <Card>
            <CardHeader><CardTitle>Attendance Records ({records?.length || 0})</CardTitle></CardHeader>
            <CardContent>
              <Table>
                <TableHeader><TableRow><TableHead>Employee</TableHead><TableHead>Date</TableHead><TableHead>Check In</TableHead><TableHead>Check Out</TableHead><TableHead>Hours</TableHead><TableHead>Status</TableHead><TableHead>Actions</TableHead></TableRow></TableHeader>
                <TableBody>
                  {isLoading ? <TableRow><TableCell colSpan={7} className="text-center">Loading...</TableCell></TableRow> : records?.length === 0 ? <TableRow><TableCell colSpan={7} className="text-center">No records found</TableCell></TableRow> : records?.map(record => (
                    <TableRow key={record.id}>
                      <TableCell>{record.employees?.full_name}</TableCell>
                      <TableCell><FormattedDate date={record.date} /></TableCell>
                      <TableCell>{record.check_in_time ? format(parseISO(record.check_in_time), 'HH:mm') : '-'}</TableCell>
                      <TableCell>{record.check_out_time ? format(parseISO(record.check_out_time), 'HH:mm') : '-'}</TableCell>
                      <TableCell>{calculateHours(record.check_in_time, record.check_out_time)}</TableCell>
                      <TableCell><Badge className={statusColors[record.status]}>{record.status}</Badge></TableCell>
                      <TableCell><Button size="sm" variant="outline" onClick={() => openEdit(record)}><Edit className="w-4 h-4" /></Button></TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}

// Leave Section (inlined from HRMLeave)
function LeaveSection() {
  const [statusFilter, setStatusFilter] = useState('all');
  const { data: requests = [], isLoading } = useLeaveRequests({ status: statusFilter === 'all' ? undefined : statusFilter });
  const { data: employees = [] } = useEmployees();
  const { data: leaveTypes = [] } = useLeaveTypes();
  const createRequest = useCreateLeaveRequest();
  const updateRequest = useUpdateLeaveRequest();

  const [isOpen, setIsOpen] = useState(false);
  const [viewRequest, setViewRequest] = useState<typeof requests[0] | null>(null);
  const [form, setForm] = useState({ employee_id: '', leave_type_id: '', from_date: '', to_date: '', reason: '' });

  const resetForm = () => setForm({ employee_id: '', leave_type_id: '', from_date: '', to_date: '', reason: '' });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const totalDays = differenceInDays(new Date(form.to_date), new Date(form.from_date)) + 1;
    await createRequest.mutateAsync({ ...form, total_days: totalDays, reason: form.reason || undefined });
    setIsOpen(false);
    resetForm();
  };

  const handleApprove = async (id: string) => { await updateRequest.mutateAsync({ id, status: 'Approved' }); };
  const handleReject = async (id: string) => { await updateRequest.mutateAsync({ id, status: 'Rejected' }); };

  const statusColors: Record<string, string> = { Pending: 'bg-warning/10 text-warning', Approved: 'bg-success/10 text-success', Rejected: 'bg-destructive/10 text-destructive', Cancelled: 'bg-muted text-muted-foreground' };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div className="flex gap-2">
          <Select value={statusFilter} onValueChange={setStatusFilter}><SelectTrigger className="w-[140px]"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="all">All Status</SelectItem><SelectItem value="Pending">Pending</SelectItem><SelectItem value="Approved">Approved</SelectItem><SelectItem value="Rejected">Rejected</SelectItem></SelectContent></Select>
          <Dialog open={isOpen} onOpenChange={(open) => { setIsOpen(open); if (!open) resetForm(); }}><DialogTrigger asChild><Button><Plus className="w-4 h-4 mr-2" />New Request</Button></DialogTrigger>
            <DialogContent><DialogHeader><DialogTitle>Create Leave Request</DialogTitle></DialogHeader>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-2"><Label>Employee *</Label><Select value={form.employee_id} onValueChange={(v) => setForm({ ...form, employee_id: v })}><SelectTrigger><SelectValue placeholder="Select employee" /></SelectTrigger><SelectContent>{employees.map((e) => <SelectItem key={e.id} value={e.id}>{e.full_name}</SelectItem>)}</SelectContent></Select></div>
                <div className="space-y-2"><Label>Leave Type *</Label><Select value={form.leave_type_id} onValueChange={(v) => setForm({ ...form, leave_type_id: v })}><SelectTrigger><SelectValue placeholder="Select type" /></SelectTrigger><SelectContent>{leaveTypes.map((t) => <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>)}</SelectContent></Select></div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2"><Label>From *</Label><NepaliDatePicker value={form.from_date} onChange={(v) => setForm({ ...form, from_date: v })} placeholder="Select start date" /></div>
                  <div className="space-y-2"><Label>To *</Label><NepaliDatePicker value={form.to_date} onChange={(v) => setForm({ ...form, to_date: v })} placeholder="Select end date" /></div>
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
            <TableHeader><TableRow><TableHead>Employee</TableHead><TableHead>Type</TableHead><TableHead>From</TableHead><TableHead>To</TableHead><TableHead>Days</TableHead><TableHead>Status</TableHead><TableHead className="text-right">Actions</TableHead></TableRow></TableHeader>
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
                    <Button variant="ghost" size="icon" onClick={() => setViewRequest(r)} title="View Details"><Eye className="w-4 h-4 text-muted-foreground" /></Button>
                    {r.status === 'Pending' && (<><Button variant="ghost" size="icon" onClick={() => handleApprove(r.id)} title="Approve"><CheckCircle className="w-4 h-4 text-success" /></Button><Button variant="ghost" size="icon" onClick={() => handleReject(r.id)} title="Reject"><XCircle className="w-4 h-4 text-destructive" /></Button></>)}
                  </TableCell>
                </TableRow>
              ))}
              {requests.length === 0 && <TableRow><TableCell colSpan={7} className="text-center py-8 text-muted-foreground">{isLoading ? 'Loading...' : 'No requests'}</TableCell></TableRow>}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Dialog open={!!viewRequest} onOpenChange={(open) => !open && setViewRequest(null)}>
        <DialogContent className="max-w-md"><DialogHeader><DialogTitle>Leave Request Details</DialogTitle></DialogHeader>
          {viewRequest && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4"><div><Label className="text-muted-foreground text-xs">Employee</Label><p className="font-medium">{viewRequest.employees?.full_name || '-'}</p></div><div><Label className="text-muted-foreground text-xs">Leave Type</Label><p className="font-medium">{viewRequest.leave_types?.name || '-'}</p></div></div>
              <div className="grid grid-cols-2 gap-4"><div><Label className="text-muted-foreground text-xs">From</Label><p className="font-medium"><FormattedDate date={viewRequest.from_date} /></p></div><div><Label className="text-muted-foreground text-xs">To</Label><p className="font-medium"><FormattedDate date={viewRequest.to_date} /></p></div></div>
              <div className="grid grid-cols-2 gap-4"><div><Label className="text-muted-foreground text-xs">Total Days</Label><p className="font-medium">{viewRequest.total_days}</p></div><div><Label className="text-muted-foreground text-xs">Status</Label><Badge variant="outline" className={statusColors[viewRequest.status]}>{viewRequest.status}</Badge></div></div>
              <div><Label className="text-muted-foreground text-xs">Reason</Label><div className="mt-1 p-3 rounded-lg bg-muted/50 min-h-[60px]"><p className="text-sm whitespace-pre-wrap">{viewRequest.reason || 'No reason provided'}</p></div></div>
              {viewRequest.status === 'Pending' && (<div className="flex gap-2 pt-2"><Button className="flex-1" variant="outline" onClick={() => { handleApprove(viewRequest.id); setViewRequest(null); }}><CheckCircle className="w-4 h-4 mr-2 text-success" /> Approve</Button><Button className="flex-1" variant="outline" onClick={() => { handleReject(viewRequest.id); setViewRequest(null); }}><XCircle className="w-4 h-4 mr-2 text-destructive" /> Reject</Button></div>)}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

// Leave Quota Section (inlined from HRMLeaveQuota)
function LeaveQuotaSection() {
  const currentMonth = format(startOfMonth(new Date()), 'yyyy-MM-dd');
  const [selectedMonth, setSelectedMonth] = useState(currentMonth);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [settingsDialogOpen, setSettingsDialogOpen] = useState(false);
  const [editQuota, setEditQuota] = useState<LeaveQuota | null>(null);
  const [form, setForm] = useState({ employee_id: '', max_days: '2' });
  const [settingsForm, setSettingsForm] = useState({ default_monthly_limit: '2', apply_default_if_no_quota: true });

  const { data: quotas, isLoading } = useLeaveQuotas(selectedMonth);
  const { data: settings } = useLeaveSettings();
  const { data: employees } = useEmployees();
  const createQuota = useCreateLeaveQuota();
  const updateQuota = useUpdateLeaveQuota();
  const deleteQuota = useDeleteLeaveQuota();
  const updateSettings = useUpdateLeaveSettings();

  const monthOptions = useMemo(() => {
    const months = [];
    const start = addMonths(new Date(), -6);
    for (let i = 0; i < 12; i++) { const date = addMonths(start, i); months.push({ value: format(startOfMonth(date), 'yyyy-MM-dd'), label: format(date, 'MMMM yyyy') }); }
    return months;
  }, []);

  useMemo(() => { if (settings) setSettingsForm({ default_monthly_limit: settings.default_monthly_limit?.toString() || '2', apply_default_if_no_quota: settings.apply_default_if_no_quota }); }, [settings]);

  const resetForm = () => { setForm({ employee_id: '', max_days: '2' }); setEditQuota(null); };

  const handleSubmit = async () => {
    const data = { employee_id: form.employee_id, month_start: selectedMonth, max_days: parseInt(form.max_days) };
    if (editQuota) { await updateQuota.mutateAsync({ id: editQuota.id, ...data }); } else { await createQuota.mutateAsync(data); }
    setDialogOpen(false); resetForm();
  };

  const handleSaveSettings = async () => {
    await updateSettings.mutateAsync({ default_monthly_limit: parseInt(settingsForm.default_monthly_limit) || null, apply_default_if_no_quota: settingsForm.apply_default_if_no_quota });
    setSettingsDialogOpen(false);
  };

  const openEdit = (quota: LeaveQuota) => { setEditQuota(quota); setForm({ employee_id: quota.employee_id, max_days: quota.max_days.toString() }); setDialogOpen(true); };
  const employeesWithoutQuota = employees?.filter(emp => emp.status === 'Active' && !quotas?.some(q => q.employee_id === emp.id));

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div className="flex items-center gap-4">
          <Select value={selectedMonth} onValueChange={setSelectedMonth}><SelectTrigger className="w-60"><SelectValue /></SelectTrigger><SelectContent>{monthOptions.map(m => <SelectItem key={m.value} value={m.value}>{m.label}</SelectItem>)}</SelectContent></Select>
          <div className="text-sm text-muted-foreground">Default limit: <strong>{settings?.default_monthly_limit || 'Not set'}</strong> days</div>
        </div>
        <div className="flex gap-2">
          <Dialog open={settingsDialogOpen} onOpenChange={setSettingsDialogOpen}><DialogTrigger asChild><Button variant="outline"><Settings className="w-4 h-4 mr-2" />Settings</Button></DialogTrigger>
            <DialogContent><DialogHeader><DialogTitle>Leave Settings</DialogTitle></DialogHeader>
              <div className="space-y-4">
                <div><Label>Default Monthly Limit (days)</Label><Input type="number" value={settingsForm.default_monthly_limit} onChange={e => setSettingsForm({ ...settingsForm, default_monthly_limit: e.target.value })} /></div>
                <div className="flex items-center justify-between"><div><Label>Apply Default If No Quota</Label><p className="text-xs text-muted-foreground">Use default limit when employee has no specific quota</p></div><Switch checked={settingsForm.apply_default_if_no_quota} onCheckedChange={v => setSettingsForm({ ...settingsForm, apply_default_if_no_quota: v })} /></div>
                <Button onClick={handleSaveSettings} className="w-full">Save Settings</Button>
              </div>
            </DialogContent>
          </Dialog>
          <Dialog open={dialogOpen} onOpenChange={(open) => { setDialogOpen(open); if (!open) resetForm(); }}><DialogTrigger asChild><Button><Plus className="w-4 h-4 mr-2" />Set Quota</Button></DialogTrigger>
            <DialogContent><DialogHeader><DialogTitle>{editQuota ? 'Edit Leave Quota' : 'Set Leave Quota'}</DialogTitle></DialogHeader>
              <div className="space-y-4">
                <div><Label>Employee *</Label><Select value={form.employee_id} onValueChange={v => setForm({ ...form, employee_id: v })}><SelectTrigger><SelectValue placeholder="Select employee" /></SelectTrigger><SelectContent>{(editQuota ? employees : employeesWithoutQuota)?.map(emp => <SelectItem key={emp.id} value={emp.id}>{emp.full_name}</SelectItem>)}</SelectContent></Select></div>
                <div><Label>Max Days for {format(new Date(selectedMonth), 'MMMM yyyy')} *</Label><Input type="number" min="0" max="31" value={form.max_days} onChange={e => setForm({ ...form, max_days: e.target.value })} /></div>
                <Button onClick={handleSubmit} disabled={!form.employee_id || !form.max_days} className="w-full">{editQuota ? 'Update' : 'Set'} Quota</Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      <Card>
        <CardHeader><CardTitle>Leave Quotas for {format(new Date(selectedMonth), 'MMMM yyyy')}</CardTitle></CardHeader>
        <CardContent>
          <Table>
            <TableHeader><TableRow><TableHead>Employee</TableHead><TableHead>Max Days</TableHead><TableHead>Actions</TableHead></TableRow></TableHeader>
            <TableBody>
              {isLoading ? <TableRow><TableCell colSpan={3} className="text-center">Loading...</TableCell></TableRow> : quotas?.length === 0 ? <TableRow><TableCell colSpan={3} className="text-center">No quotas set for this month</TableCell></TableRow> : quotas?.map(quota => (
                <TableRow key={quota.id}>
                  <TableCell>{quota.employees?.full_name}</TableCell>
                  <TableCell><strong>{quota.max_days}</strong> days</TableCell>
                  <TableCell><div className="flex gap-1"><Button size="sm" variant="outline" onClick={() => openEdit(quota)}><Edit className="w-4 h-4" /></Button><Button size="sm" variant="outline" onClick={() => deleteQuota.mutate(quota.id)}><XCircle className="w-4 h-4" /></Button></div></TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {employeesWithoutQuota && employeesWithoutQuota.length > 0 && (
        <Card><CardHeader><CardTitle className="text-sm">Employees Using Default Limit</CardTitle></CardHeader><CardContent><div className="flex flex-wrap gap-2">{employeesWithoutQuota.map(emp => <span key={emp.id} className="px-2 py-1 bg-muted rounded text-sm">{emp.full_name}</span>)}</div></CardContent></Card>
      )}
    </div>
  );
}
