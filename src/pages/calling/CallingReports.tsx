import { useState } from 'react';
import { startOfDay, endOfDay, format } from 'date-fns';
import { useAuth } from '@/contexts/AuthContext';
import { useCallingReport } from '@/hooks/usePortalReport';
import { ReportFilters, ReportDateRange } from '@/components/reports/ReportFilters';
import { ReportActions } from '@/components/reports/ReportActions';
import { ReportSummaryCard } from '@/components/reports/ReportSummaryCard';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Skeleton } from '@/components/ui/skeleton';
import { 
  Users, Phone, CheckCircle, Clock, XCircle, ShoppingCart, 
  MapPin, TrendingUp, DollarSign, FileText, Truck 
} from 'lucide-react';

export default function CallingReports() {
  const { profile } = useAuth();
  const today = new Date();
  const [dateRange, setDateRange] = useState<ReportDateRange>({
    from: startOfDay(today),
    to: endOfDay(today),
  });

  const { data: report, isLoading } = useCallingReport(profile?.id || '', dateRange);

  const summaryData = report ? {
    'Assigned Leads': report.assignedLeads,
    'Calls Made': report.callsMade,
    'Confirmed': report.confirmed,
    'Follow-up': report.followup,
    'CNR': report.cnr,
    'Cancelled': report.cancelled,
    'Orders': report.ordersConfirmed,
    'Inside Valley': `${report.insideValleyOrders} (Rs ${report.insideValleySales.toLocaleString()})`,
    'Outside Valley': `${report.outsideValleyOrders} (Rs ${report.outsideValleySales.toLocaleString()})`,
    'Total Sales': `Rs ${report.totalSales.toLocaleString()}`,
    'Conversion Rate': `${report.conversionRate.toFixed(1)}%`,
  } : {};

  const tableHeaders = ['Date', 'Leads', 'Calls', 'Confirmed', 'Follow-up', 'CNR', 'Cancelled', 'Orders', 'Sales', 'Conv %'];
  const tableData = report?.dailyBreakdown.map(d => ({
    date: format(new Date(d.date), 'dd MMM'),
    leads: d.assignedLeads,
    calls: d.calls,
    confirmed: d.confirmed,
    followup: d.followup,
    cnr: d.cnr,
    cancelled: d.cancelled,
    orders: d.orders,
    sales: `Rs ${d.sales.toLocaleString()}`,
    conv: `${d.conversionRate.toFixed(1)}%`,
  })) || [];

  if (isLoading) {
    return (
      <div className="space-y-6 animate-fade-in">
        <div className="flex justify-between items-center">
          <Skeleton className="h-8 w-48" />
          <Skeleton className="h-10 w-64" />
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
          {[...Array(6)].map((_, i) => (
            <Skeleton key={i} className="h-24" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold">My Performance Report</h1>
          <p className="text-muted-foreground">Calling team performance summary</p>
        </div>
        <ReportFilters value={dateRange} onChange={setDateRange} />
      </div>

      {/* Actions */}
      <div className="flex justify-end">
        <ReportActions
          reportTitle="Calling Report"
          staffName={profile?.name || 'Unknown'}
          dateFrom={dateRange.from}
          dateTo={dateRange.to}
          summaryData={summaryData}
          tableHeaders={tableHeaders}
          tableData={tableData}
        />
      </div>

      {/* Summary Cards - Row 1 */}
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
        <ReportSummaryCard
          title="Assigned Leads"
          value={report?.assignedLeads || 0}
          icon={Users}
        />
        <ReportSummaryCard
          title="Calls Made"
          value={report?.callsMade || 0}
          icon={Phone}
        />
        <ReportSummaryCard
          title="Confirmed"
          value={report?.confirmed || 0}
          icon={CheckCircle}
        />
        <ReportSummaryCard
          title="Follow-up"
          value={report?.followup || 0}
          icon={Clock}
        />
        <ReportSummaryCard
          title="CNR"
          value={report?.cnr || 0}
          icon={XCircle}
        />
        <ReportSummaryCard
          title="Cancelled"
          value={report?.cancelled || 0}
          icon={XCircle}
        />
      </div>

      {/* Summary Cards - Row 2 */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <ReportSummaryCard
          title="Orders Confirmed"
          value={report?.ordersConfirmed || 0}
          icon={ShoppingCart}
        />
        <ReportSummaryCard
          title="Inside Valley"
          value={`${report?.insideValleyOrders || 0} orders`}
          subtitle={`Rs ${(report?.insideValleySales || 0).toLocaleString()}`}
          icon={MapPin}
        />
        <ReportSummaryCard
          title="Outside Valley"
          value={`${report?.outsideValleyOrders || 0} orders`}
          subtitle={`Rs ${(report?.outsideValleySales || 0).toLocaleString()}`}
          icon={MapPin}
        />
        <ReportSummaryCard
          title="Total Sales"
          value={`Rs ${(report?.totalSales || 0).toLocaleString()}`}
          icon={DollarSign}
        />
      </div>

      {/* Conversion Rate Card */}
      <Card className="bg-primary/5 border-primary/20">
        <CardContent className="p-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <TrendingUp className="w-8 h-8 text-primary" />
            <div>
              <p className="text-sm text-muted-foreground">Conversion Rate</p>
              <p className="text-3xl font-bold">{(report?.conversionRate || 0).toFixed(1)}%</p>
            </div>
          </div>
          <p className="text-sm text-muted-foreground">
            {report?.ordersConfirmed || 0} orders from {report?.assignedLeads || 0} leads
          </p>
        </CardContent>
      </Card>

      {/* Inside Valley Delivery Breakdown */}
      {(report?.insideValleyOrders || 0) > 0 && (
        <Card className="bg-blue-50/50 dark:bg-blue-950/20 border-blue-200 dark:border-blue-800">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-base">
              <Truck className="w-5 h-5 text-blue-600" />
              Inside Valley Delivery Breakdown
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
              <ReportSummaryCard
                title="IV Orders Confirmed"
                value={report?.insideValleyOrders || 0}
                icon={ShoppingCart}
              />
              <ReportSummaryCard
                title="IV Delivered"
                value={report?.insideDelivered || 0}
                icon={CheckCircle}
              />
              <ReportSummaryCard
                title="IV Pending"
                value={report?.insidePending || 0}
                icon={Clock}
              />
            </div>
          </CardContent>
        </Card>
      )}

      {/* Daily Breakdown Table */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="w-5 h-5" />
            Daily Breakdown
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead className="text-right">Leads</TableHead>
                  <TableHead className="text-right">Calls</TableHead>
                  <TableHead className="text-right">Confirmed</TableHead>
                  <TableHead className="text-right">Follow-up</TableHead>
                  <TableHead className="text-right">CNR</TableHead>
                  <TableHead className="text-right">Cancelled</TableHead>
                  <TableHead className="text-right">Orders</TableHead>
                  <TableHead className="text-right">Sales</TableHead>
                  <TableHead className="text-right">Conv %</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {report?.dailyBreakdown.map((day) => (
                  <TableRow key={day.date}>
                    <TableCell className="font-medium">{format(new Date(day.date), 'dd MMM')}</TableCell>
                    <TableCell className="text-right">{day.assignedLeads}</TableCell>
                    <TableCell className="text-right">{day.calls}</TableCell>
                    <TableCell className="text-right text-green-500">{day.confirmed}</TableCell>
                    <TableCell className="text-right text-amber-500">{day.followup}</TableCell>
                    <TableCell className="text-right text-red-500">{day.cnr}</TableCell>
                    <TableCell className="text-right text-red-500">{day.cancelled}</TableCell>
                    <TableCell className="text-right text-blue-500">{day.orders}</TableCell>
                    <TableCell className="text-right">Rs {day.sales.toLocaleString()}</TableCell>
                    <TableCell className="text-right">{day.conversionRate.toFixed(1)}%</TableCell>
                  </TableRow>
                ))}
                {(!report?.dailyBreakdown || report.dailyBreakdown.length === 0) && (
                  <TableRow>
                    <TableCell colSpan={10} className="text-center py-8 text-muted-foreground">
                      No data for selected period
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
