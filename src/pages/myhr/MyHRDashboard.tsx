import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Clock, LogIn, LogOut, Calendar, FileText, Box, MessageSquare } from 'lucide-react';
import { useTodayAttendance, useCheckIn, useCheckOut, useMyAttendance } from '@/hooks/useAttendance';
import { useMyAssets } from '@/hooks/useAssets';
import { useLeaveRequests } from '@/hooks/useHRM';
import { useMyLeaveQuota } from '@/hooks/useLeaveQuota';
import { format, parseISO, differenceInMinutes } from 'date-fns';
import { useAuth } from '@/contexts/AuthContext';
import { Link } from 'react-router-dom';
import { BirthdayBanner } from '@/components/hrm/BirthdayBanner';
import { useBirthdayCheck } from '@/hooks/useBirthdayCheck';

export default function MyHRDashboard() {
  const { profile } = useAuth();
  const { data: todayAttendance, isLoading: loadingAttendance } = useTodayAttendance();
  const { data: myAttendance } = useMyAttendance();
  const { data: myAssets } = useMyAssets();
  const { data: leaveRequests } = useLeaveRequests();
  const { data: leaveQuota } = useMyLeaveQuota();
  const checkIn = useCheckIn();
  const checkOut = useCheckOut();

  const calculateHours = (checkIn: string | null, checkOut: string | null) => {
    if (!checkIn || !checkOut) return null;
    const minutes = differenceInMinutes(parseISO(checkOut), parseISO(checkIn));
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return `${hours}h ${mins}m`;
  };

  const pendingLeaves = leaveRequests?.filter(l => l.status === 'Pending').length || 0;
  const approvedLeaves = leaveRequests?.filter(l => l.status === 'Approved').length || 0;
  const activeAssets = myAssets?.filter(a => !a.returned_on).length || 0;
  const thisMonthPresent = myAttendance?.filter(a => a.status === 'Present').length || 0;

  const { isSelfBirthday, selfName, otherBirthdayNames } = useBirthdayCheck();

  return (
    <div className="space-y-6">
        {isSelfBirthday && <BirthdayBanner names={[selfName]} isSelf />}
        {otherBirthdayNames.length > 0 && <BirthdayBanner names={otherBirthdayNames} />}

        <div>
          <h1 className="text-2xl font-bold">Welcome, {profile?.name}</h1>
          <p className="text-muted-foreground">Your HR self-service portal</p>
        </div>

        {/* Today's Attendance Card */}
        <Card className="bg-gradient-to-r from-primary/10 to-primary/5">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-lg font-semibold mb-2">Today's Attendance</h2>
                <p className="text-sm text-muted-foreground">{format(new Date(), 'EEEE, MMMM d, yyyy')}</p>
                {todayAttendance ? (
                  <div className="mt-3 space-y-1">
                    <p className="text-sm">
                      Check In: <strong>{todayAttendance.check_in_time ? format(parseISO(todayAttendance.check_in_time), 'HH:mm') : '-'}</strong>
                    </p>
                    <p className="text-sm">
                      Check Out: <strong>{todayAttendance.check_out_time ? format(parseISO(todayAttendance.check_out_time), 'HH:mm') : '-'}</strong>
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
                {!todayAttendance ? (
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
                  <Badge className="bg-green-100 text-green-800">Completed</Badge>
                )}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Quick Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-blue-100 rounded-lg">
                  <Clock className="w-5 h-5 text-blue-600" />
                </div>
                <div>
                  <div className="text-2xl font-bold">{thisMonthPresent}</div>
                  <div className="text-xs text-muted-foreground">Days Present</div>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-green-100 rounded-lg">
                  <Calendar className="w-5 h-5 text-green-600" />
                </div>
                <div>
                  <div className="text-2xl font-bold">{leaveQuota?.max_days || '-'}</div>
                  <div className="text-xs text-muted-foreground">Leave Quota</div>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-yellow-100 rounded-lg">
                  <FileText className="w-5 h-5 text-yellow-600" />
                </div>
                <div>
                  <div className="text-2xl font-bold">{pendingLeaves}</div>
                  <div className="text-xs text-muted-foreground">Pending Leaves</div>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-purple-100 rounded-lg">
                  <Box className="w-5 h-5 text-purple-600" />
                </div>
                <div>
                  <div className="text-2xl font-bold">{activeAssets}</div>
                  <div className="text-xs text-muted-foreground">Assigned Assets</div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Quick Links */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Link to="/my-hr/attendance-leave">
            <Card className="hover:bg-muted/50 transition-colors cursor-pointer">
              <CardContent className="p-4 text-center">
                <Clock className="w-8 h-8 mx-auto mb-2 text-primary" />
                <div className="font-medium">Attendance & Leave</div>
              </CardContent>
            </Card>
          </Link>
          <Link to="/my-hr/documents">
            <Card className="hover:bg-muted/50 transition-colors cursor-pointer">
              <CardContent className="p-4 text-center">
                <Calendar className="w-8 h-8 mx-auto mb-2 text-primary" />
                <div className="font-medium">My Documents</div>
              </CardContent>
            </Card>
          </Link>
          <Link to="/my-hr/company-info">
            <Card className="hover:bg-muted/50 transition-colors cursor-pointer">
              <CardContent className="p-4 text-center">
                <Box className="w-8 h-8 mx-auto mb-2 text-primary" />
                <div className="font-medium">Company Info</div>
              </CardContent>
            </Card>
          </Link>
          <Link to="/my-hr/chat">
            <Card className="hover:bg-muted/50 transition-colors cursor-pointer">
              <CardContent className="p-4 text-center">
                <MessageSquare className="w-8 h-8 mx-auto mb-2 text-primary" />
                <div className="font-medium">Team Chat</div>
              </CardContent>
            </Card>
          </Link>
        </div>

        {/* Recent Activity */}
        <div className="grid md:grid-cols-2 gap-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-sm">Recent Attendance</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {myAttendance?.slice(0, 5).map(record => (
                  <div key={record.id} className="flex items-center justify-between text-sm">
                    <span>{record.date}</span>
                    <Badge variant="outline">{record.status}</Badge>
                  </div>
                ))}
                {(!myAttendance || myAttendance.length === 0) && (
                  <p className="text-sm text-muted-foreground">No attendance records</p>
                )}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-sm">Leave Requests</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {leaveRequests?.slice(0, 5).map(leave => (
                  <div key={leave.id} className="flex items-center justify-between text-sm">
                    <span>{leave.from_date} - {leave.to_date}</span>
                    <Badge
                      className={
                        leave.status === 'Approved' ? 'bg-green-100 text-green-800' :
                        leave.status === 'Rejected' ? 'bg-red-100 text-red-800' :
                        'bg-yellow-100 text-yellow-800'
                      }
                    >
                      {leave.status}
                    </Badge>
                  </div>
                ))}
                {(!leaveRequests || leaveRequests.length === 0) && (
                  <p className="text-sm text-muted-foreground">No leave requests</p>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
    </div>
  );
}
