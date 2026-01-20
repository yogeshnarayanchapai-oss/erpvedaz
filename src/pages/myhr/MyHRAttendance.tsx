import { useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Clock, LogIn, LogOut, Calendar, CalendarDays, List, Timer } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useTodayAttendance, useCheckIn, useCheckOut, useMyAttendance } from '@/hooks/useAttendance';
import { format, parseISO, differenceInMinutes, startOfMonth, endOfMonth, subMonths } from 'date-fns';
import { FormattedDate } from '@/components/FormattedDate';
import { NepaliCalendar, CalendarEvent } from '@/components/NepaliCalendar';

export default function MyHRAttendance() {
  const { data: todayAttendance, isLoading: loadingToday } = useTodayAttendance();
  const { data: myAttendance = [], isLoading } = useMyAttendance();
  const checkIn = useCheckIn();
  const checkOut = useCheckOut();

  const [selectedDate, setSelectedDate] = useState<Date | undefined>();
  const [monthFilter, setMonthFilter] = useState<'this' | 'last'>('this');

  const calculateHours = (checkIn: string | null, checkOut: string | null) => {
    if (!checkIn || !checkOut) return '-';
    const minutes = differenceInMinutes(parseISO(checkOut), parseISO(checkIn));
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
  };

  // Get date range based on filter
  const getDateRange = () => {
    const now = new Date();
    if (monthFilter === 'this') {
      return { start: startOfMonth(now), end: endOfMonth(now) };
    } else {
      const lastMonth = subMonths(now, 1);
      return { start: startOfMonth(lastMonth), end: endOfMonth(lastMonth) };
    }
  };

  const dateRange = getDateRange();

  // Filter attendance based on month
  const filteredAttendance = useMemo(() => {
    return myAttendance.filter(a => {
      const recordDate = new Date(a.date);
      return recordDate >= dateRange.start && recordDate <= dateRange.end;
    });
  }, [myAttendance, dateRange.start, dateRange.end]);

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

  // Calculate stats - Include Late in present count
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

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h1 className="text-2xl font-bold">My Attendance</h1>
        <p className="text-muted-foreground">Track your daily attendance</p>
      </div>

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
                        {isLoading ? 'Loading...' : 'No attendance records'}
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
