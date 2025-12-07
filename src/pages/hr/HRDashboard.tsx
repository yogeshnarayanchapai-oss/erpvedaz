import { useEmployees, useLeaveRequests, useNotices } from '@/hooks/useHRM';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { StatCard } from '@/components/dashboard/StatCard';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { useNavigate } from 'react-router-dom';
import { 
  Users, Clock, Calendar, DollarSign, UserCheck, UserX, 
  AlertCircle, Bell, ArrowRight 
} from 'lucide-react';
import { format } from 'date-fns';

export default function HRDashboard() {
  const navigate = useNavigate();
  const { data: employees = [] } = useEmployees();
  const { data: leaveRequests = [] } = useLeaveRequests();
  const { data: notices = [] } = useNotices();

  const activeEmployees = employees.filter(e => e.status === 'Active').length;
  const inactiveEmployees = employees.filter(e => e.status !== 'Active').length;
  const pendingLeaves = leaveRequests.filter(l => l.status === 'Pending').length;
  const activeNotices = notices.filter(n => n.is_active).length;

  const recentLeaves = leaveRequests
    .filter(l => l.status === 'Pending')
    .slice(0, 5);

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h1 className="text-2xl font-bold">HR Dashboard</h1>
        <p className="text-muted-foreground">Overview of HR activities and employee status</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard 
          title="Active Employees" 
          value={activeEmployees} 
          icon={<UserCheck className="w-5 h-5" />} 
          variant="success" 
        />
        <StatCard 
          title="Inactive/Resigned" 
          value={inactiveEmployees} 
          icon={<UserX className="w-5 h-5" />} 
          variant="default" 
        />
        <StatCard 
          title="Pending Leaves" 
          value={pendingLeaves} 
          icon={<Clock className="w-5 h-5" />} 
          variant="warning" 
        />
        <StatCard 
          title="Active Notices" 
          value={activeNotices} 
          icon={<Bell className="w-5 h-5" />} 
          variant="info" 
        />
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Button variant="outline" className="h-20 flex-col gap-2" onClick={() => navigate('/hrm/employees')}>
          <Users className="w-5 h-5" />
          <span>Employees</span>
        </Button>
        <Button variant="outline" className="h-20 flex-col gap-2" onClick={() => navigate('/hrm/payroll')}>
          <DollarSign className="w-5 h-5" />
          <span>Payroll</span>
        </Button>
        <Button variant="outline" className="h-20 flex-col gap-2" onClick={() => navigate('/hrm/leave')}>
          <Calendar className="w-5 h-5" />
          <span>Leave Management</span>
        </Button>
        <Button variant="outline" className="h-20 flex-col gap-2" onClick={() => navigate('/hrm/attendance')}>
          <Clock className="w-5 h-5" />
          <span>Attendance</span>
        </Button>
      </div>

      {/* Pending Leave Requests */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <AlertCircle className="w-5 h-5 text-warning" />
            Pending Leave Requests
          </CardTitle>
          <Button variant="ghost" size="sm" onClick={() => navigate('/hrm/leave')}>
            View All <ArrowRight className="w-4 h-4 ml-1" />
          </Button>
        </CardHeader>
        <CardContent>
          {recentLeaves.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Employee</TableHead>
                  <TableHead>Leave Type</TableHead>
                  <TableHead>From</TableHead>
                  <TableHead>To</TableHead>
                  <TableHead>Days</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {recentLeaves.map((leave) => (
                  <TableRow key={leave.id}>
                    <TableCell className="font-medium">{leave.employees?.full_name}</TableCell>
                    <TableCell>{leave.leave_types?.name}</TableCell>
                    <TableCell>{format(new Date(leave.from_date), 'dd MMM')}</TableCell>
                    <TableCell>{format(new Date(leave.to_date), 'dd MMM')}</TableCell>
                    <TableCell>{leave.total_days}</TableCell>
                    <TableCell>
                      <Badge variant="outline" className="bg-amber-500/15 text-amber-600">
                        Pending
                      </Badge>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : (
            <p className="text-center text-muted-foreground py-8">No pending leave requests</p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
