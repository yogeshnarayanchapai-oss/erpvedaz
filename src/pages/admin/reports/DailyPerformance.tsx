import { useState, useMemo } from 'react';
import { format, startOfDay, endOfDay } from 'date-fns';
import { useLeads } from '@/hooks/useLeads';
import { useOrders } from '@/hooks/useOrders';
import { useStaff } from '@/hooks/useStaff';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { DateRangeFilter, DateRange } from '@/components/ui/DateRangeFilter';
import { Users, TrendingUp, Target, MapPin, Phone, Download, AlertTriangle, CheckCircle } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useQuery } from '@tanstack/react-query';

export default function DailyPerformance() {
  const today = new Date();
  const [dateRange, setDateRange] = useState<DateRange>({
    from: startOfDay(today),
    to: endOfDay(today),
  });
  const [roleFilter, setRoleFilter] = useState<string>('all');
  const [staffFilter, setStaffFilter] = useState<string>('all');

  const dateFrom = format(dateRange.from, 'yyyy-MM-dd');
  const dateTo = format(dateRange.to, 'yyyy-MM-dd');

  const { data: leads = [] } = useLeads({ dateFrom, dateTo });
  const { data: orders = [] } = useOrders({ dateFrom, dateTo });
  const { data: callingStaff = [] } = useStaff('CALLING');
  const { data: adminStaff = [] } = useStaff('ADMIN');

  // Fetch marketing targets
  const { data: marketingTargets } = useQuery({
    queryKey: ['marketing-targets', dateFrom],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('marketing_targets')
        .select('*')
        .eq('date', dateFrom)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
  });

  // All staff for filter
  const allStaff = useMemo(() => {
    return [...callingStaff, ...adminStaff];
  }, [callingStaff, adminStaff]);

  // Helper to calculate total from order_items or fallback to legacy amount
  const getOrderTotal = (order: any) => {
    const orderItems = order.order_items || [];
    if (orderItems.length > 0) {
      return orderItems.reduce((sum: number, item: any) => sum + (item.total_price || 0), 0);
    }
    return order.amount || 0;
  };

  // Summary stats
  const summaryStats = useMemo(() => {
    const totalLeads = leads.length;
    const confirmedOrders = orders.filter(o => o.order_status === 'CONFIRMED' || o.order_status === 'DELIVERED').length;
    const insideValley = orders.filter(o => o.delivery_location === 'INSIDE_VALLEY').length;
    const outsideValley = orders.filter(o => o.delivery_location === 'OUTSIDE_VALLEY').length;
    const totalOrderAmount = orders.reduce((sum, o) => sum + getOrderTotal(o), 0);
    const avgOrderValue = confirmedOrders > 0 ? totalOrderAmount / confirmedOrders : 0;
    const conversionRate = totalLeads > 0 ? (confirmedOrders / totalLeads) * 100 : 0;

    // Target comparison
    const targetLeads = marketingTargets?.total_leads_target || 0;
    const targetOrders = marketingTargets?.confirmed_orders_target || 0;
    const minAvg = marketingTargets?.min_avg_order || 0;
    const maxAvg = marketingTargets?.max_avg_order || 0;
    
    const leadsAchievement = targetLeads > 0 ? (totalLeads / targetLeads) * 100 : 0;
    const ordersAchievement = targetOrders > 0 ? (confirmedOrders / targetOrders) * 100 : 0;
    const avgInRange = avgOrderValue >= minAvg && avgOrderValue <= maxAvg;

    return {
      totalLeads,
      confirmedOrders,
      insideValley,
      outsideValley,
      totalOrderAmount,
      avgOrderValue,
      conversionRate,
      targetLeads,
      targetOrders,
      leadsAchievement,
      ordersAchievement,
      avgInRange,
      minAvg,
      maxAvg,
    };
  }, [leads, orders, marketingTargets]);

  // Caller Performance
  const callerPerformance = useMemo(() => {
    const staffToShow = staffFilter !== 'all' 
      ? callingStaff.filter(s => s.id === staffFilter)
      : callingStaff;

    return staffToShow.map(staff => {
      const staffLeads = leads.filter(l => l.assigned_to_user_id === staff.id);
      const staffOrders = orders.filter(o => o.sales_person_id === staff.id);

      const transferredLeads = staffLeads.length;
      const confirmedOrders = staffOrders.length;
      const notInterested = staffLeads.filter(l => l.status === 'CANCELLED').length;
      const followUps = staffLeads.filter(l => l.status === 'FOLLOW_UP').length;
      const performancePercent = transferredLeads > 0 ? (confirmedOrders / transferredLeads) * 100 : 0;
      const totalAmount = staffOrders.reduce((sum, o) => sum + getOrderTotal(o), 0);

      return {
        id: staff.id,
        name: staff.name,
        transferredLeads,
        confirmedOrders,
        notInterested,
        followUps,
        performancePercent,
        totalAmount,
        status: performancePercent >= 50 ? 'good' : 'low',
      };
    }).filter(s => s.transferredLeads > 0 || s.confirmedOrders > 0)
      .sort((a, b) => b.performancePercent - a.performancePercent);
  }, [callingStaff, leads, orders, staffFilter]);

  // Admin Performance  
  const adminPerformance = useMemo(() => {
    const staffToShow = staffFilter !== 'all'
      ? adminStaff.filter(s => s.id === staffFilter)
      : adminStaff;

    return staffToShow.map(staff => {
      const staffOrders = orders.filter(o => o.sales_person_id === staff.id);
      
      const ordersProcessed = staffOrders.length;
      const confirmed = staffOrders.filter(o => ['CONFIRMED', 'DELIVERED', 'DISPATCHED'].includes(o.order_status || '')).length;
      const rto = staffOrders.filter(o => o.order_status === 'RETURNED').length;
      const cancelled = staffOrders.filter(o => o.order_status === 'CANCELLED').length;
      const totalAmount = staffOrders.reduce((sum, o) => sum + getOrderTotal(o), 0);
      const avgOrderValue = confirmed > 0 ? totalAmount / confirmed : 0;
      
      const targetOrders = marketingTargets?.confirmed_orders_target || 0;
      const achievement = targetOrders > 0 ? (confirmed / targetOrders) * 100 : 0;
      
      let status: 'low' | 'medium' | 'good' = 'good';
      if (achievement < 50) status = 'low';
      else if (achievement < 80) status = 'medium';

      return {
        id: staff.id,
        name: staff.name,
        ordersProcessed,
        confirmed,
        rto,
        cancelled,
        totalAmount,
        avgOrderValue,
        achievement,
        status,
      };
    }).filter(s => s.ordersProcessed > 0)
      .sort((a, b) => b.achievement - a.achievement);
  }, [adminStaff, orders, staffFilter, marketingTargets]);

  const getStatusBadge = (status: 'low' | 'medium' | 'good') => {
    switch (status) {
      case 'low':
        return <Badge variant="destructive">Low</Badge>;
      case 'medium':
        return <Badge variant="secondary" className="bg-warning/20 text-warning-foreground">Medium</Badge>;
      case 'good':
        return <Badge variant="default" className="bg-success/20 text-success">Good</Badge>;
    }
  };

  const exportCSV = (data: any[], filename: string, headers: string[]) => {
    const rows = data.map(row => headers.map(h => {
      const key = h.toLowerCase().replace(/ /g, '').replace(/%/g, 'percent');
      return row[key] ?? '';
    }));
    const csv = [headers, ...rows].map(r => r.map(cell => `"${cell}"`).join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${filename}-${dateFrom}.csv`;
    a.click();
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-bold">Daily Performance</h1>
          <p className="text-muted-foreground">Staff performance tracking and analysis</p>
        </div>
        <DateRangeFilter value={dateRange} onChange={setDateRange} />
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-wrap gap-4">
            <div>
              <label className="text-sm font-medium mb-1.5 block">Role</label>
              <Select value={roleFilter} onValueChange={setRoleFilter}>
                <SelectTrigger className="w-[150px]">
                  <SelectValue placeholder="All Roles" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Roles</SelectItem>
                  <SelectItem value="caller">Caller</SelectItem>
                  <SelectItem value="admin">Admin</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-sm font-medium mb-1.5 block">Staff</label>
              <Select value={staffFilter} onValueChange={setStaffFilter}>
                <SelectTrigger className="w-[200px]">
                  <SelectValue placeholder="All Staff" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Staff</SelectItem>
                  {allStaff.map(s => (
                    <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
        <Card>
          <CardContent className="p-4 text-center">
            <Users className="w-5 h-5 mx-auto text-primary mb-2" />
            <p className="text-2xl font-bold">{summaryStats.totalLeads.toLocaleString()}</p>
            <p className="text-xs text-muted-foreground">Today's Leads</p>
            {summaryStats.targetLeads > 0 && (
              <p className="text-xs mt-1">
                Target: {summaryStats.targetLeads.toLocaleString()} ({summaryStats.leadsAchievement.toFixed(0)}%)
              </p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4 text-center">
            <CheckCircle className="w-5 h-5 mx-auto text-success mb-2" />
            <p className="text-2xl font-bold">{summaryStats.confirmedOrders.toLocaleString()}</p>
            <p className="text-xs text-muted-foreground">Confirmed Orders</p>
            {summaryStats.targetOrders > 0 && (
              <p className="text-xs mt-1">
                Target: {summaryStats.targetOrders} ({summaryStats.ordersAchievement.toFixed(0)}%)
              </p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4 text-center">
            <MapPin className="w-5 h-5 mx-auto text-chart-1 mb-2" />
            <p className="text-2xl font-bold">{summaryStats.insideValley.toLocaleString()}</p>
            <p className="text-xs text-muted-foreground">Inside Valley</p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4 text-center">
            <MapPin className="w-5 h-5 mx-auto text-chart-2 mb-2" />
            <p className="text-2xl font-bold">{summaryStats.outsideValley.toLocaleString()}</p>
            <p className="text-xs text-muted-foreground">Outside Valley</p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4 text-center">
            <TrendingUp className="w-5 h-5 mx-auto text-primary mb-2" />
            <p className="text-2xl font-bold">{summaryStats.conversionRate.toFixed(1)}%</p>
            <p className="text-xs text-muted-foreground">Conversion Rate</p>
          </CardContent>
        </Card>

        <Card className={!summaryStats.avgInRange && summaryStats.avgOrderValue > 0 ? 'border-warning' : ''}>
          <CardContent className="p-4 text-center">
            <Target className="w-5 h-5 mx-auto text-primary mb-2" />
            <p className="text-2xl font-bold">Rs. {summaryStats.avgOrderValue.toLocaleString(undefined, { maximumFractionDigits: 0 })}</p>
            <p className="text-xs text-muted-foreground">Avg Order Value</p>
            {summaryStats.minAvg > 0 && (
              <p className={`text-xs mt-1 ${!summaryStats.avgInRange ? 'text-warning' : ''}`}>
                Target: Rs. {summaryStats.minAvg} - {summaryStats.maxAvg}
              </p>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Caller Performance Table */}
      {(roleFilter === 'all' || roleFilter === 'caller') && (
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <Phone className="w-5 h-5" />
              Caller Performance
            </CardTitle>
            <Button 
              variant="outline" 
              size="sm"
              onClick={() => exportCSV(
                callerPerformance.map(c => ({
                  name: c.name,
                  transferredleads: c.transferredLeads,
                  confirmedorders: c.confirmedOrders,
                  notinterested: c.notInterested,
                  followups: c.followUps,
                  performancepercent: c.performancePercent.toFixed(1),
                  totalamount: c.totalAmount,
                })),
                'caller-performance',
                ['Name', 'Transferred Leads', 'Confirmed Orders', 'Not Interested', 'Follow Ups', 'Performance %', 'Total Amount']
              )}
            >
              <Download className="w-4 h-4 mr-2" />
              Export
            </Button>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Staff Name</TableHead>
                  <TableHead className="text-center">Leads Transferred</TableHead>
                  <TableHead className="text-center">Confirmed Orders</TableHead>
                  <TableHead className="text-center">Not Interested</TableHead>
                  <TableHead className="text-center">Follow Ups</TableHead>
                  <TableHead className="text-center">Performance %</TableHead>
                  <TableHead className="text-right">Total Amount</TableHead>
                  <TableHead className="text-center">Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {callerPerformance.length > 0 ? (
                  callerPerformance.map(staff => (
                    <TableRow key={staff.id} className="hover:bg-muted/50">
                      <TableCell className="font-medium">{staff.name}</TableCell>
                      <TableCell className="text-center">{staff.transferredLeads}</TableCell>
                      <TableCell className="text-center">{staff.confirmedOrders}</TableCell>
                      <TableCell className="text-center">{staff.notInterested}</TableCell>
                      <TableCell className="text-center">{staff.followUps}</TableCell>
                      <TableCell className="text-center">
                        <span className={staff.performancePercent < 50 ? 'text-destructive' : 'text-success'}>
                          {staff.performancePercent.toFixed(1)}%
                        </span>
                      </TableCell>
                      <TableCell className="text-right">Rs. {staff.totalAmount.toLocaleString()}</TableCell>
                      <TableCell className="text-center">{getStatusBadge(staff.status as 'low' | 'medium' | 'good')}</TableCell>
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell colSpan={8} className="text-center py-8 text-muted-foreground">
                      No caller performance data for this period
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      {/* Admin Performance Table */}
      {(roleFilter === 'all' || roleFilter === 'admin') && (
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <Users className="w-5 h-5" />
              Admin Performance
            </CardTitle>
            <Button 
              variant="outline" 
              size="sm"
              onClick={() => exportCSV(
                adminPerformance.map(a => ({
                  name: a.name,
                  ordersprocessed: a.ordersProcessed,
                  confirmed: a.confirmed,
                  rto: a.rto,
                  cancelled: a.cancelled,
                  totalamount: a.totalAmount,
                  avgordervalue: a.avgOrderValue.toFixed(0),
                  achievement: a.achievement.toFixed(1),
                })),
                'admin-performance',
                ['Name', 'Orders Processed', 'Confirmed', 'RTO', 'Cancelled', 'Total Amount', 'Avg Order Value', 'Achievement %']
              )}
            >
              <Download className="w-4 h-4 mr-2" />
              Export
            </Button>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Staff Name</TableHead>
                  <TableHead className="text-center">Orders Processed</TableHead>
                  <TableHead className="text-center">Confirmed</TableHead>
                  <TableHead className="text-center">RTO</TableHead>
                  <TableHead className="text-center">Cancelled</TableHead>
                  <TableHead className="text-right">Total Amount</TableHead>
                  <TableHead className="text-right">Avg Order</TableHead>
                  <TableHead className="text-center">Achievement</TableHead>
                  <TableHead className="text-center">Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {adminPerformance.length > 0 ? (
                  adminPerformance.map(staff => (
                    <TableRow key={staff.id} className="hover:bg-muted/50">
                      <TableCell className="font-medium">{staff.name}</TableCell>
                      <TableCell className="text-center">{staff.ordersProcessed}</TableCell>
                      <TableCell className="text-center">{staff.confirmed}</TableCell>
                      <TableCell className="text-center">{staff.rto}</TableCell>
                      <TableCell className="text-center">{staff.cancelled}</TableCell>
                      <TableCell className="text-right">Rs. {staff.totalAmount.toLocaleString()}</TableCell>
                      <TableCell className="text-right">Rs. {staff.avgOrderValue.toLocaleString(undefined, { maximumFractionDigits: 0 })}</TableCell>
                      <TableCell className="text-center">{staff.achievement.toFixed(1)}%</TableCell>
                      <TableCell className="text-center">{getStatusBadge(staff.status)}</TableCell>
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell colSpan={9} className="text-center py-8 text-muted-foreground">
                      No admin performance data for this period
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}
    </div>
  );
}