import { useMemo, useState } from 'react';
import { format, startOfDay, endOfDay } from 'date-fns';
import { useBirthdayCheck } from '@/hooks/useBirthdayCheck';
import { BirthdayBanner } from '@/components/hrm/BirthdayBanner';
import { useLeads } from '@/hooks/useLeads';
import { useOrders } from '@/hooks/useOrders';
import { useStaff } from '@/hooks/useStaff';
import { useLeaveRequests } from '@/hooks/useHRM';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { StatCard } from '@/components/dashboard/StatCard';
import { DashboardDateFilter } from '@/components/dashboard/DashboardDateFilter';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { useNavigate } from 'react-router-dom';
import { 
  Users, Target, TrendingUp, CheckCircle, Clock, 
  FileText, ArrowRight, BarChart3 
} from 'lucide-react';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer 
} from 'recharts';
import { DateRange } from '@/hooks/useSalesByDateRange';

export default function ManagerDashboard() {
  const navigate = useNavigate();
  
  // Date range state - defaults to today
  const [dateRange, setDateRange] = useState<DateRange>({
    from: startOfDay(new Date()),
    to: endOfDay(new Date()),
  });

  // Format dates for queries
  const dateFrom = format(dateRange.from, 'yyyy-MM-dd');
  const dateTo = format(dateRange.to, 'yyyy-MM-dd');
  
  const { data: leads = [] } = useLeads({ dateFrom, dateTo });
  const { data: orders = [] } = useOrders({ dateFrom, dateTo });
  const { data: callingStaff = [] } = useStaff('CALLING');
  const { data: pendingLeaves = [] } = useLeaveRequests();

  const leadStats = useMemo(() => {
    const confirmed = leads.filter(l => l.status === 'CONFIRMED').length;
    const followUp = leads.filter(l => l.status === 'FOLLOW_UP').length;
    const cancelled = leads.filter(l => l.status === 'CANCELLED').length;
    return { confirmed, followUp, cancelled, total: leads.length };
  }, [leads]);

  const staffPerformance = useMemo(() => {
    const perfMap: Record<string, { name: string; confirmed: number; target: number }> = {};
    callingStaff.forEach(s => {
      perfMap[s.id] = { name: s.name, confirmed: 0, target: s.daily_target || 100 };
    });
    orders.forEach(order => {
      if (order.sales_person_id && ['CONFIRMED', 'DISPATCHED', 'DELIVERED'].includes(order.order_status || '')) {
        if (perfMap[order.sales_person_id]) {
          perfMap[order.sales_person_id].confirmed++;
        }
      }
    });
    return Object.values(perfMap).map(p => ({
      ...p,
      percentage: p.target > 0 ? Math.round((p.confirmed / p.target) * 100) : 0
    }));
  }, [orders, callingStaff]);

  const pendingApprovals = pendingLeaves.filter(l => l.status === 'Pending').length;

  // Generate period label for display
  const getPeriodLabel = () => {
    const fromStr = format(dateRange.from, 'MMM d');
    const toStr = format(dateRange.to, 'MMM d, yyyy');
    const isSameDay = format(dateRange.from, 'yyyy-MM-dd') === format(dateRange.to, 'yyyy-MM-dd');
    return isSameDay ? format(dateRange.from, 'MMM d, yyyy') : `${fromStr} – ${toStr}`;
  };

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header with Date Filter */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">Manager Dashboard</h1>
          <p className="text-muted-foreground">Team performance overview and approvals</p>
        </div>
        <DashboardDateFilter value={dateRange} onChange={setDateRange} />
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard 
          title="Total Leads" 
          value={leadStats.total} 
          description={getPeriodLabel()}
          icon={<Users className="w-5 h-5" />} 
          variant="primary" 
        />
        <StatCard 
          title="Confirmed" 
          value={leadStats.confirmed} 
          description={getPeriodLabel()}
          icon={<CheckCircle className="w-5 h-5" />} 
          variant="success" 
        />
        <StatCard 
          title="Pending Approvals" 
          value={pendingApprovals} 
          icon={<Clock className="w-5 h-5" />} 
          variant="warning" 
        />
        <StatCard 
          title="Active Staff" 
          value={callingStaff.length} 
          icon={<Target className="w-5 h-5" />} 
          variant="info" 
        />
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Button variant="outline" className="h-20 flex-col gap-2" onClick={() => navigate('/manager/reports')}>
          <FileText className="w-5 h-5" />
          <span>View Reports</span>
        </Button>
        <Button variant="outline" className="h-20 flex-col gap-2" onClick={() => navigate('/manager/targets')}>
          <Target className="w-5 h-5" />
          <span>Staff Targets</span>
        </Button>
        <Button variant="outline" className="h-20 flex-col gap-2" onClick={() => navigate('/manager/approvals')}>
          <CheckCircle className="w-5 h-5" />
          <span>Approvals</span>
        </Button>
        <Button variant="outline" className="h-20 flex-col gap-2" onClick={() => navigate('/my-hr')}>
          <Users className="w-5 h-5" />
          <span>My HR</span>
        </Button>
      </div>

      {/* Staff Performance Chart */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BarChart3 className="w-5 h-5 text-primary" />
            Staff Performance ({getPeriodLabel()})
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-64">
            {staffPerformance.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={staffPerformance}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                  <XAxis dataKey="name" className="text-xs" />
                  <YAxis className="text-xs" />
                  <Tooltip 
                    contentStyle={{ 
                      backgroundColor: 'hsl(var(--card))', 
                      border: '1px solid hsl(var(--border))',
                      borderRadius: '8px'
                    }}
                  />
                  <Bar dataKey="confirmed" name="Confirmed" fill="hsl(var(--chart-2))" />
                  <Bar dataKey="target" name="Target" fill="hsl(var(--chart-1))" opacity={0.3} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full flex items-center justify-center text-muted-foreground">
                No performance data for selected period
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Staff Performance Table */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="w-5 h-5 text-primary" />
            Staff Target Achievement ({getPeriodLabel()})
          </CardTitle>
          <Button variant="ghost" size="sm" onClick={() => navigate('/manager/targets')}>
            Manage Targets <ArrowRight className="w-4 h-4 ml-1" />
          </Button>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Staff Member</TableHead>
                <TableHead className="text-right">Target</TableHead>
                <TableHead className="text-right">Achieved</TableHead>
                <TableHead className="text-right">Progress</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {staffPerformance.map((staff, idx) => (
                <TableRow key={idx}>
                  <TableCell className="font-medium">{staff.name}</TableCell>
                  <TableCell className="text-right">{staff.target}</TableCell>
                  <TableCell className="text-right">{staff.confirmed}</TableCell>
                  <TableCell className="text-right">
                    <Badge 
                      variant="outline" 
                      className={
                        staff.percentage >= 100 
                          ? 'bg-emerald-500/15 text-emerald-600' 
                          : staff.percentage >= 50 
                            ? 'bg-amber-500/15 text-amber-600'
                            : 'bg-red-500/15 text-red-600'
                      }
                    >
                      {staff.percentage}%
                    </Badge>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
