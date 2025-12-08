import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { useOrders } from '@/hooks/useOrders';
import { useCallLogsByUserAndDate } from '@/hooks/useCallLogs';
import { useFollowupStats } from '@/hooks/useFollowupReminders';
import { useStaffLeadStats, useStaffOrderStats, getNepalDate } from '@/hooks/useDashboardStats';
import { useLeads } from '@/hooks/useLeads';
import { StatCard } from '@/components/dashboard/StatCard';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Progress } from '@/components/ui/progress';
import { CheckCircle, PhoneOff, Clock, XCircle, Users, TrendingUp, Calendar, BarChart3, ArrowRight, Target, PieChart, PhoneCall, Truck, MapPin, Package, Bell, AlertTriangle } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend, PieChart as RechartsPieChart, Pie, Cell } from 'recharts';
import { format, subDays, differenceInDays } from 'date-fns';

type DatePreset = 'today' | 'last7' | 'last30' | 'custom';

const CHART_COLORS = [
  'hsl(var(--success))',
  'hsl(var(--info))',
  'hsl(var(--warning))',
  'hsl(var(--destructive))',
  'hsl(var(--primary))',
];

export default function CallingDashboard() {
  const { profile } = useAuth();
  const navigate = useNavigate();
  // Use Nepal timezone for today's date
  const today = getNepalDate();
  
  // Date filter state
  const [datePreset, setDatePreset] = useState<DatePreset>('today');
  const [customDateFrom, setCustomDateFrom] = useState(today);
  const [customDateTo, setCustomDateTo] = useState(today);
  
  const dateRange = useMemo(() => {
    if (datePreset === 'today') return { from: today, to: today };
    if (datePreset === 'last7') return { from: format(subDays(new Date(), 7), 'yyyy-MM-dd'), to: today };
    if (datePreset === 'last30') return { from: format(subDays(new Date(), 30), 'yyyy-MM-dd'), to: today };
    return { from: customDateFrom, to: customDateTo };
  }, [datePreset, today, customDateFrom, customDateTo]);
  
  // Calculate number of days in range
  const daysInRange = useMemo(() => {
    const fromDate = new Date(dateRange.from);
    const toDate = new Date(dateRange.to);
    return differenceInDays(toDate, fromDate) + 1;
  }, [dateRange]);
  
  // Use realtime-enabled staff stats hooks
  const { data: leadStats } = useStaffLeadStats(profile?.id, dateRange.from, dateRange.to);
  const { data: orderStatsData } = useStaffOrderStats(profile?.id, dateRange.from, dateRange.to);
  
  // Fallback to existing hooks for chart data (call logs need the raw data)
  const { data: leads = [] } = useLeads({ 
    team: 'CALLING', 
    assignedTo: profile?.id,
  });
  
  const { data: orders = [] } = useOrders({
    salesPersonId: profile?.id,
    dateFrom: dateRange.from,
    dateTo: dateRange.to,
  });
  
  // Call logs for chart
  const { data: callLogs = [] } = useCallLogsByUserAndDate(profile?.id, dateRange.from, dateRange.to);

  // Follow-up statistics
  const followupStats = useFollowupStats(leads);

  // Use stats from realtime hooks, fallback to computed values if not yet loaded
  const assignedCount = leadStats?.total ?? 0;
  const confirmedCount = leadStats?.confirmed ?? 0;
  const cnrCount = leadStats?.callNotReceived ?? 0;
  const followupCount = leadStats?.followUp ?? 0;
  const cancelledCount = leadStats?.cancelled ?? 0;
  const pendingCount = leadStats?.pending ?? 0;
  const remainingToCall = leadStats?.remainingToCall ?? 0;
  
  // Conversion % = Confirmed leads / Assigned leads (not orders)
  const conversionRate = assignedCount > 0 ? ((confirmedCount / assignedCount) * 100).toFixed(0) : '0';

  // Inside Valley delivery stats from realtime hook
  const insideValleyStats = orderStatsData?.insideValley ?? { total: 0, delivered: 0, pending: 0, reachedCNR: 0, customerCancelled: 0 };
  const ivDelivered = insideValleyStats.delivered;
  const ivPending = insideValleyStats.pending;
  const ivReachedCNR = insideValleyStats.reachedCNR;
  const ivCustomerCancelled = insideValleyStats.customerCancelled;
  const insideValleyOrdersCount = insideValleyStats.total;

  // Daily performance chart data
  const dailyChartData = useMemo(() => {
    const dataMap = new Map<string, { date: string; calls: number; confirmed: number }>();
    
    callLogs.forEach(log => {
      if (log.called_at) {
        const date = log.called_at.split('T')[0];
        const existing = dataMap.get(date) || { date, calls: 0, confirmed: 0 };
        existing.calls += 1;
        dataMap.set(date, existing);
      }
    });
    
    orders.forEach(order => {
      if (order.order_date && order.order_status === 'CONFIRMED') {
        const date = order.order_date.split('T')[0];
        const existing = dataMap.get(date) || { date, calls: 0, confirmed: 0 };
        existing.confirmed += 1;
        dataMap.set(date, existing);
      }
    });
    
    return Array.from(dataMap.values())
      .sort((a, b) => a.date.localeCompare(b.date))
      .map(item => ({
        ...item,
        date: format(new Date(item.date), 'dd MMM'),
      }));
  }, [callLogs, orders]);

  // Status breakdown pie chart data
  const statusBreakdownData = useMemo(() => {
    return [
      { name: 'Confirmed', value: confirmedCount, color: CHART_COLORS[0] },
      { name: 'Follow Up', value: followupCount, color: CHART_COLORS[1] },
      { name: 'CNR', value: cnrCount, color: CHART_COLORS[2] },
      { name: 'Cancelled', value: cancelledCount, color: CHART_COLORS[3] },
      { name: 'Pending', value: pendingCount, color: CHART_COLORS[4] },
    ].filter(item => item.value > 0);
  }, [confirmedCount, followupCount, cnrCount, cancelledCount, pendingCount]);

  // Target vs Completed - use user's configured daily_target or default to 100
  const dailyTarget = profile?.daily_target ?? 100;
  const targetCalls = dailyTarget * daysInRange;
  const callsDone = callLogs.length;
  const completionRate = targetCalls > 0 ? Math.min(100, Math.round((callsDone / targetCalls) * 100)) : 0;
  const remainingPercent = Math.max(0, 100 - completionRate);

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-bold">Calling Dashboard</h1>
          <p className="text-muted-foreground">Your performance overview</p>
        </div>
        
        <div className="flex items-center gap-2 flex-wrap">
          {/* Date Filter */}
          <Select value={datePreset} onValueChange={(v) => setDatePreset(v as DatePreset)}>
            <SelectTrigger className="w-[140px]">
              <Calendar className="w-4 h-4 mr-2" />
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="today">Today</SelectItem>
              <SelectItem value="last7">Last 7 days</SelectItem>
              <SelectItem value="last30">Last 30 days</SelectItem>
              <SelectItem value="custom">Custom</SelectItem>
            </SelectContent>
          </Select>
          
          {datePreset === 'custom' && (
            <div className="flex items-center gap-2">
              <Input
                type="date"
                value={customDateFrom}
                onChange={(e) => setCustomDateFrom(e.target.value)}
                className="w-36"
              />
              <span className="text-muted-foreground">to</span>
              <Input
                type="date"
                value={customDateTo}
                onChange={(e) => setCustomDateTo(e.target.value)}
                className="w-36"
              />
            </div>
          )}
          
          <Button onClick={() => navigate('/calling/leads')} variant="outline">
            <ArrowRight className="w-4 h-4 mr-2" />
            Go to My Leads
          </Button>
        </div>
      </div>

      {/* Stats - All cards are clickable to filter My Leads */}
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-4">
        <StatCard
          title="Assigned"
          value={assignedCount}
          icon={<Users className="w-5 h-5" />}
          variant="primary"
          onClick={() => navigate('/calling/leads?status=ALL')}
          className="cursor-pointer hover:ring-2 hover:ring-primary/50 transition-all"
        />
        <StatCard
          title="Remaining to Call"
          value={remainingToCall}
          icon={<PhoneCall className="w-5 h-5" />}
          variant="warning"
          onClick={() => navigate('/calling/leads?status=REMAINING')}
          className="cursor-pointer hover:ring-2 hover:ring-warning/50 transition-all"
        />
        <StatCard
          title="Confirmed"
          value={confirmedCount}
          icon={<CheckCircle className="w-5 h-5" />}
          variant="success"
          onClick={() => navigate('/calling/orders?status=CONFIRMED')}
          className="cursor-pointer hover:ring-2 hover:ring-success/50 transition-all"
        />
        <StatCard
          title="CNR"
          value={cnrCount}
          icon={<PhoneOff className="w-5 h-5" />}
          variant="warning"
          onClick={() => navigate('/calling/leads?status=CALL_NOT_RECEIVED')}
          className="cursor-pointer hover:ring-2 hover:ring-warning/50 transition-all"
        />
        <StatCard
          title="Follow Up"
          value={followupCount}
          icon={<Clock className="w-5 h-5" />}
          variant="info"
          onClick={() => navigate('/calling/leads?status=FOLLOW_UP')}
          className="cursor-pointer hover:ring-2 hover:ring-info/50 transition-all"
        />
        <StatCard
          title="Cancelled"
          value={cancelledCount}
          icon={<XCircle className="w-5 h-5" />}
          variant="destructive"
          onClick={() => navigate('/calling/leads?status=CANCELLED')}
          className="cursor-pointer hover:ring-2 hover:ring-destructive/50 transition-all"
        />
        <StatCard
          title="Conversion %"
          value={`${conversionRate}%`}
          icon={<TrendingUp className="w-5 h-5" />}
          variant="default"
        />
      </div>

      {/* Follow-Up Statistics */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base">
            <Bell className="w-5 h-5 text-primary" />
            Follow-Up Statistics
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <StatCard
              title="Today Follow-Ups Due"
              value={followupStats.todayFollowupsDue}
              icon={<Clock className="w-5 h-5" />}
              variant="info"
              onClick={() => navigate('/calling/leads?followup=today')}
              className="cursor-pointer hover:ring-2 hover:ring-info/50 transition-all"
            />
            <StatCard
              title="Pending Follow-Ups"
              value={followupStats.pendingFollowups}
              icon={<Bell className="w-5 h-5" />}
              variant="warning"
              onClick={() => navigate('/calling/leads?followup=pending')}
              className="cursor-pointer hover:ring-2 hover:ring-warning/50 transition-all"
            />
            <StatCard
              title="Overdue Follow-Ups"
              value={followupStats.overdueFollowups}
              icon={<AlertTriangle className="w-5 h-5" />}
              variant="destructive"
              onClick={() => navigate('/calling/leads?followup=overdue')}
              className="cursor-pointer hover:ring-2 hover:ring-destructive/50 transition-all"
            />
            <StatCard
              title="Completed Today"
              value={followupStats.completedFollowupsToday}
              icon={<CheckCircle className="w-5 h-5" />}
              variant="success"
            />
          </div>
        </CardContent>
      </Card>

      {/* Inside Valley Delivery Stats */}
      {insideValleyOrdersCount > 0 && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-base">
              <MapPin className="w-5 h-5 text-primary" />
              Inside Valley Delivery Status
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <StatCard
                title="IV Delivered"
                value={ivDelivered}
                icon={<CheckCircle className="w-5 h-5" />}
                variant="success"
              />
              <StatCard
                title="IV Pending"
                value={ivPending}
                icon={<Clock className="w-5 h-5" />}
                variant="warning"
              />
              <StatCard
                title="IV Reached CNR"
                value={ivReachedCNR}
                icon={<PhoneOff className="w-5 h-5" />}
                variant="info"
              />
              <StatCard
                title="IV Customer Cancel"
                value={ivCustomerCancelled}
                icon={<XCircle className="w-5 h-5" />}
                variant="destructive"
              />
            </div>
          </CardContent>
        </Card>
      )}

      {/* Charts Row */}
      <div className="grid lg:grid-cols-2 gap-6">
        {/* Status Breakdown Pie Chart */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <PieChart className="w-5 h-5" />
              Status Breakdown
            </CardTitle>
          </CardHeader>
          <CardContent>
            {statusBreakdownData.length > 0 ? (
              <div className="h-[250px]">
                <ResponsiveContainer width="100%" height="100%">
                  <RechartsPieChart>
                    <Pie
                      data={statusBreakdownData}
                      cx="50%"
                      cy="50%"
                      innerRadius={60}
                      outerRadius={100}
                      paddingAngle={2}
                      dataKey="value"
                      label={({ name, value }) => `${name}: ${value}`}
                    >
                      {statusBreakdownData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip 
                      contentStyle={{ 
                        backgroundColor: 'hsl(var(--background))', 
                        border: '1px solid hsl(var(--border))',
                        borderRadius: '8px'
                      }} 
                    />
                  </RechartsPieChart>
                </ResponsiveContainer>
              </div>
            ) : (
              <div className="h-[250px] flex items-center justify-center text-muted-foreground">
                No data for selected period
              </div>
            )}
          </CardContent>
        </Card>

        {/* Target vs Completed */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Target className="w-5 h-5" />
              Target vs Completed
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="space-y-4">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Daily Target</span>
                <span className="font-medium">{dailyTarget} calls/day</span>
              </div>
              
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Period Target ({daysInRange} days)</span>
                <span className="font-medium">{targetCalls} calls</span>
              </div>
              
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Calls Made</span>
                <span className="font-medium text-primary">{callsDone} calls</span>
              </div>
            </div>
            
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span>Completion</span>
                <span className="font-semibold">{completionRate}%</span>
              </div>
              <Progress value={completionRate} className="h-3" />
            </div>
            
            <div className="p-4 bg-muted/50 rounded-lg">
              <div className="flex justify-between items-center">
                <div>
                  <p className="text-sm text-muted-foreground">Remaining to Target</p>
                  <p className="text-2xl font-bold text-primary">
                    {Math.max(0, targetCalls - callsDone)}
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-sm text-muted-foreground">Remaining %</p>
                  <p className="text-2xl font-bold text-warning">
                    {remainingPercent}%
                  </p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Daily Performance Chart */}
      {dailyChartData.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <BarChart3 className="w-5 h-5" />
              Daily Performance
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-[250px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={dailyChartData} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                  <XAxis dataKey="date" className="text-xs" tick={{ fill: 'hsl(var(--muted-foreground))' }} />
                  <YAxis className="text-xs" tick={{ fill: 'hsl(var(--muted-foreground))' }} />
                  <Tooltip 
                    contentStyle={{ 
                      backgroundColor: 'hsl(var(--background))', 
                      border: '1px solid hsl(var(--border))',
                      borderRadius: '8px'
                    }} 
                  />
                  <Legend />
                  <Bar dataKey="calls" name="Calls Made" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="confirmed" name="Confirmed" fill="hsl(var(--success))" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}