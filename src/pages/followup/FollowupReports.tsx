import { useState } from 'react';
import { startOfDay, endOfDay, format } from 'date-fns';
import { useAuth } from '@/contexts/AuthContext';
import { useFollowupReport } from '@/hooks/usePortalReport';
import { ReportFilters, ReportDateRange } from '@/components/reports/ReportFilters';
import { ReportActions } from '@/components/reports/ReportActions';
import { ReportSummaryCard } from '@/components/reports/ReportSummaryCard';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Skeleton } from '@/components/ui/skeleton';
import { 
  Users, CheckCircle, ArrowRight, XCircle, DollarSign, TrendingUp, FileText 
} from 'lucide-react';

export default function FollowupReports() {
  const { profile } = useAuth();
  const today = new Date();
  const [dateRange, setDateRange] = useState<ReportDateRange>({
    from: startOfDay(today),
    to: endOfDay(today),
  });

  const { data: report, isLoading } = useFollowupReport(profile?.id || '', dateRange);

  const summaryData = report ? {
    'Follow-ups Handled': report.followupHandled,
    'Confirmed Orders': report.confirmedOrders,
    'Redirected Orders': report.redirectedOrders,
    'Cancelled': report.cancelled,
    'Total Sales': `Rs ${report.totalSales.toLocaleString()}`,
    'Redirect Rate': `${report.redirectRate.toFixed(1)}%`,
  } : {};

  const tableHeaders = ['Date', 'Follow-ups', 'Confirmed', 'Redirected', 'Cancelled', 'Sales'];
  const tableData = report?.dailyBreakdown.map(d => ({
    date: format(new Date(d.date), 'dd MMM'),
    followups: d.followups,
    confirmed: d.confirmed,
    redirected: d.redirected,
    cancelled: d.cancelled,
    sales: `Rs ${d.sales.toLocaleString()}`,
  })) || [];

  if (isLoading) {
    return (
      <div className="space-y-6 animate-fade-in">
        <div className="flex justify-between items-center">
          <Skeleton className="h-8 w-48" />
          <Skeleton className="h-10 w-64" />
        </div>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
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
          <p className="text-muted-foreground">Follow-up team performance summary</p>
        </div>
        <ReportFilters value={dateRange} onChange={setDateRange} />
      </div>

      {/* Actions */}
      <div className="flex justify-end">
        <ReportActions
          reportTitle="Follow-up Report"
          staffName={profile?.name || 'Unknown'}
          dateFrom={dateRange.from}
          dateTo={dateRange.to}
          summaryData={summaryData}
          tableHeaders={tableHeaders}
          tableData={tableData}
        />
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
        <ReportSummaryCard
          title="Follow-ups Handled"
          value={report?.followupHandled || 0}
          icon={Users}
        />
        <ReportSummaryCard
          title="Confirmed Orders"
          value={report?.confirmedOrders || 0}
          icon={CheckCircle}
        />
        <ReportSummaryCard
          title="Redirected"
          value={report?.redirectedOrders || 0}
          icon={ArrowRight}
        />
        <ReportSummaryCard
          title="Cancelled"
          value={report?.cancelled || 0}
          icon={XCircle}
        />
        <ReportSummaryCard
          title="Total Sales"
          value={`Rs ${(report?.totalSales || 0).toLocaleString()}`}
          icon={DollarSign}
        />
        <ReportSummaryCard
          title="Redirect Rate"
          value={`${(report?.redirectRate || 0).toFixed(1)}%`}
          icon={TrendingUp}
        />
      </div>

      {/* Daily Breakdown Table */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="w-5 h-5" />
            Daily Breakdown
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Date</TableHead>
                <TableHead className="text-right">Follow-ups</TableHead>
                <TableHead className="text-right">Confirmed</TableHead>
                <TableHead className="text-right">Redirected</TableHead>
                <TableHead className="text-right">Cancelled</TableHead>
                <TableHead className="text-right">Sales</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {report?.dailyBreakdown.map((day) => (
                <TableRow key={day.date}>
                  <TableCell className="font-medium">{format(new Date(day.date), 'dd MMM yyyy')}</TableCell>
                  <TableCell className="text-right">{day.followups}</TableCell>
                  <TableCell className="text-right text-green-500">{day.confirmed}</TableCell>
                  <TableCell className="text-right text-blue-500">{day.redirected}</TableCell>
                  <TableCell className="text-right text-red-500">{day.cancelled}</TableCell>
                  <TableCell className="text-right">Rs {day.sales.toLocaleString()}</TableCell>
                </TableRow>
              ))}
              {(!report?.dailyBreakdown || report.dailyBreakdown.length === 0) && (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                    No data for selected period
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
