import { useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Plus, Edit, CalendarDays, List, LogIn, LogOut, Clock } from 'lucide-react';
import { useAttendanceRecords, useCreateAttendance, useUpdateAttendance, useTodayAttendance, useCheckIn, useCheckOut, AttendanceRecord } from '@/hooks/useAttendance';
import { useEmployees } from '@/hooks/useHRM';
import { format, differenceInMinutes, parseISO } from 'date-fns';
import { FormattedDate } from '@/components/FormattedDate';
import { NepaliCalendar, CalendarEvent } from '@/components/NepaliCalendar';
import { NepaliDatePicker } from '@/components/NepaliDatePicker';

const STATUSES = ['Present', 'Late', 'Absent', 'Half-day', 'Work From Home', 'Leave'];

export default function HRMAttendance() {
  const today = new Date().toISOString().split('T')[0];
  const [filter, setFilter] = useState({ employee_id: '', from: '', to: '' });
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

  const { data: records, isLoading } = useAttendanceRecords(
    filter.employee_id || undefined,
    filter.from || filter.to ? { from: filter.from, to: filter.to } : undefined
  );
  const { data: employees } = useEmployees();
  const createAttendance = useCreateAttendance();
  const updateAttendance = useUpdateAttendance();
  
  // My own attendance hooks for admin/manager self check-in/out
  const { data: todayAttendance, isLoading: loadingToday } = useTodayAttendance();
  const checkIn = useCheckIn();
  const checkOut = useCheckOut();

  const resetForm = () => {
    setForm({
      employee_id: '',
      date: today,
      check_in_time: '',
      check_out_time: '',
      status: 'Present',
      notes: '',
    });
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

  const calculateHours = (checkIn: string | null, checkOut: string | null) => {
    if (!checkIn || !checkOut) return '-';
    const minutes = differenceInMinutes(parseISO(checkOut), parseISO(checkIn));
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return `${hours}h ${mins}m`;
  };

  const statusColors: Record<string, string> = {
    Present: 'bg-green-100 text-green-800',
    Late: 'bg-orange-100 text-orange-800',
    Absent: 'bg-red-100 text-red-800',
    'Half-day': 'bg-yellow-100 text-yellow-800',
    'Work From Home': 'bg-blue-100 text-blue-800',
    Leave: 'bg-purple-100 text-purple-800',
  };

  // Calculate summary
  const summary = records?.reduce((acc, r) => {
    acc[r.status] = (acc[r.status] || 0) + 1;
    return acc;
  }, {} as Record<string, number>) || {};

  const [selectedDate, setSelectedDate] = useState<Date | undefined>();

  // Convert attendance records to calendar events
  const calendarEvents: CalendarEvent[] = useMemo(() => {
    return (records || []).map(r => ({
      date: r.date,
      title: `${r.employees?.full_name || 'Unknown'} - ${r.status}`,
      type: r.status === 'Present' || r.status === 'Work From Home' ? 'attendance' : 
            r.status === 'Leave' ? 'leave' : 
            r.status === 'Absent' ? 'holiday' : 'event',
    }));
  }, [records]);

  const handleCalendarDateClick = (bsDate: { year: number; month: number; day: number }, adDate: Date) => {
    setSelectedDate(adDate);
    const dateStr = format(adDate, 'yyyy-MM-dd');
    setForm(prev => ({ ...prev, date: dateStr }));
    setFilter(prev => ({ ...prev, from: dateStr, to: dateStr }));
  };

  return (
    <div className="space-y-6">
        {/* My Attendance Card - Admin/Manager can check in/out */}
        <Card className="bg-gradient-to-r from-primary/10 to-primary/5">
          <CardContent className="p-6">
            <div className="flex items-center justify-between flex-wrap gap-4">
              <div>
                <h2 className="text-lg font-semibold mb-2">My Attendance Today</h2>
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

        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">Time & Attendance</h1>
            <p className="text-muted-foreground">Manage employee attendance records</p>
          </div>
          <Dialog open={dialogOpen} onOpenChange={(open) => { setDialogOpen(open); if (!open) resetForm(); }}>
            <DialogTrigger asChild>
              <Button><Plus className="w-4 h-4 mr-2" />Add Record</Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>{editRecord ? 'Edit Attendance' : 'Add Attendance Record'}</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <div>
                  <Label>Employee *</Label>
                  <Select value={form.employee_id} onValueChange={v => setForm({ ...form, employee_id: v })}>
                    <SelectTrigger><SelectValue placeholder="Select employee" /></SelectTrigger>
                    <SelectContent>
                      {employees?.map(emp => (
                        <SelectItem key={emp.id} value={emp.id}>{emp.full_name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>Date *</Label>
                    <NepaliDatePicker value={form.date} onChange={v => setForm({ ...form, date: v })} placeholder="Select date" />
                  </div>
                  <div>
                    <Label>Status</Label>
                    <Select value={form.status} onValueChange={v => setForm({ ...form, status: v as any })}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {STATUSES.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>Check In Time</Label>
                    <Input type="time" value={form.check_in_time} onChange={e => setForm({ ...form, check_in_time: e.target.value })} />
                  </div>
                  <div>
                    <Label>Check Out Time</Label>
                    <Input type="time" value={form.check_out_time} onChange={e => setForm({ ...form, check_out_time: e.target.value })} />
                  </div>
                </div>
                <div>
                  <Label>Notes</Label>
                  <Input value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })} />
                </div>
                <Button onClick={handleSubmit} disabled={!form.employee_id || !form.date} className="w-full">
                  {editRecord ? 'Update' : 'Create'} Record
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-5 gap-4">
          {STATUSES.map(status => (
            <Card key={status}>
              <CardContent className="p-4 text-center">
                <div className="text-2xl font-bold">{summary[status] || 0}</div>
                <div className="text-sm text-muted-foreground">{status}</div>
              </CardContent>
            </Card>
          ))}
        </div>

        <Tabs defaultValue="calendar" className="w-full">
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
            <div className="grid lg:grid-cols-3 gap-6">
              <div className="lg:col-span-2">
                <NepaliCalendar 
                  events={calendarEvents}
                  selectedDate={selectedDate}
                  onDateClick={handleCalendarDateClick}
                />
              </div>
              <div className="space-y-4">
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-base">Today's Summary</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-2">
                    {STATUSES.map(status => (
                      <div key={status} className="flex items-center justify-between p-2 rounded-lg bg-muted/50">
                        <span className="text-sm">{status}</span>
                        <Badge className={statusColors[status]}>{summary[status] || 0}</Badge>
                      </div>
                    ))}
                  </CardContent>
                </Card>
              </div>
            </div>
          </TabsContent>

          <TabsContent value="list" className="mt-4">
            {/* Filters */}
            <div className="flex flex-wrap gap-4 mb-4">
              <Select value={filter.employee_id} onValueChange={v => setFilter({ ...filter, employee_id: v === 'all' ? '' : v })}>
                <SelectTrigger className="w-60"><SelectValue placeholder="All Employees" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Employees</SelectItem>
                  {employees?.map(emp => (
                    <SelectItem key={emp.id} value={emp.id}>{emp.full_name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <NepaliDatePicker value={filter.from} onChange={v => setFilter({ ...filter, from: v })} placeholder="From date" className="w-48" />
              <NepaliDatePicker value={filter.to} onChange={v => setFilter({ ...filter, to: v })} placeholder="To date" className="w-48" />
            </div>

            {/* Records Table */}
            <Card>
              <CardHeader>
                <CardTitle>Attendance Records ({records?.length || 0})</CardTitle>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Employee</TableHead>
                      <TableHead>Date</TableHead>
                      <TableHead>Check In</TableHead>
                      <TableHead>Check Out</TableHead>
                      <TableHead>Hours</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Notes</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {isLoading ? (
                      <TableRow><TableCell colSpan={8} className="text-center">Loading...</TableCell></TableRow>
                    ) : records?.length === 0 ? (
                      <TableRow><TableCell colSpan={8} className="text-center">No records found</TableCell></TableRow>
                    ) : records?.map(record => (
                      <TableRow key={record.id}>
                        <TableCell>{record.employees?.full_name}</TableCell>
                        <TableCell><FormattedDate date={record.date} /></TableCell>
                        <TableCell>{record.check_in_time ? format(parseISO(record.check_in_time), 'HH:mm') : '-'}</TableCell>
                        <TableCell>{record.check_out_time ? format(parseISO(record.check_out_time), 'HH:mm') : '-'}</TableCell>
                        <TableCell>{calculateHours(record.check_in_time, record.check_out_time)}</TableCell>
                        <TableCell>
                          <div className="flex flex-col gap-1">
                            <Badge className={statusColors[record.status]}>{record.status}</Badge>
                            {record.status === 'Late' && record.late_minutes && (
                              <span className="text-xs text-orange-600">+{record.late_minutes} min</span>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>{record.notes || '-'}</TableCell>
                        <TableCell>
                          <Button size="sm" variant="outline" onClick={() => openEdit(record)}>
                            <Edit className="w-4 h-4" />
                          </Button>
                        </TableCell>
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
