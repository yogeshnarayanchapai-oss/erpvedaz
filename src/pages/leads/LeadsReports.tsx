import { useState } from 'react';
import { startOfDay, endOfDay, format } from 'date-fns';
import { useAuth } from '@/contexts/AuthContext';
import { useLeadsReport } from '@/hooks/usePortalReport';
import { ReportFilters, ReportDateRange } from '@/components/reports/ReportFilters';
import { ReportActions } from '@/components/reports/ReportActions';
import { ReportSummaryCard } from '@/components/reports/ReportSummaryCard';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Skeleton } from '@/components/ui/skeleton';
import { Users, Phone, UserCheck, XCircle, ShoppingCart, TrendingUp, FileText } from 'lucide-react';

export default function LeadsReports() {
  const { profile } = useAuth();
  const today = new Date();
  const [dateRange, setDateRange] = useState<ReportDateRange>({
    from: startOfDay(today),
    to: endOfDay(today),
  });

  const { data: report, isLoading } = useLeadsReport(profile?.id || '', dateRange);

  const summaryData = report ? {
    'Leads Created': report.leadsCreated,
    'Transferred to Calling': report.transferredToCalling,
    'Sent to Follow-up': report.sentToFollowup,
    'CNR Sent Back': report.cnrSentBack,
    'Converted to Orders': report.convertedToOrders,
    'Conversion Rate': `${report.conversionRate.toFixed(1)}%`,
  } : {};

  const tableHeaders = ['Date', 'Created', 'To Calling', 'Follow-up', 'CNR', 'Converted', 'Conv %'];
  const tableData = report?.dailyBreakdown.map(d => ({
    date: format(new Date(d.date), 'dd MMM'),
    created: d.leadsCreated,
    tocalling: d.assignedToCalling,
    followup: d.followup,
    cnr: d.cnr,
    converted: d.converted,
    conv: `${d.conversionRate.toFixed(1)}%`,
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
          <p className="text-muted-foreground">Leads team performance summary</p>
        </div>
        <ReportFilters value={dateRange} onChange={setDateRange} />
      </div>

      {/* Actions */}
      <div className="flex justify-end">
        <ReportActions
          reportTitle="Leads Report"
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
          title="Leads Created"
          value={report?.leadsCreated || 0}
          icon={Users}
        />
        <ReportSummaryCard
          title="To Calling"
          value={report?.transferredToCalling || 0}
          icon={Phone}
        />
        <ReportSummaryCard
          title="To Follow-up"
          value={report?.sentToFollowup || 0}
          icon={UserCheck}
        />
        <ReportSummaryCard
          title="CNR Sent Back"
          value={report?.cnrSentBack || 0}
          icon={XCircle}
        />
        <ReportSummaryCard
          title="Converted"
          value={report?.convertedToOrders || 0}
          icon={ShoppingCart}
        />
        <ReportSummaryCard
          title="Conversion Rate"
          value={`${(report?.conversionRate || 0).toFixed(1)}%`}
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
                <TableHead className="text-right">Created</TableHead>
                <TableHead className="text-right">To Calling</TableHead>
                <TableHead className="text-right">Follow-up</TableHead>
                <TableHead className="text-right">CNR</TableHead>
                <TableHead className="text-right">Converted</TableHead>
                <TableHead className="text-right">Conv %</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {report?.dailyBreakdown.map((day) => (
                <TableRow key={day.date}>
                  <TableCell className="font-medium">{format(new Date(day.date), 'dd MMM yyyy')}</TableCell>
                  <TableCell className="text-right">{day.leadsCreated}</TableCell>
                  <TableCell className="text-right text-blue-500">{day.assignedToCalling}</TableCell>
                  <TableCell className="text-right text-amber-500">{day.followup}</TableCell>
                  <TableCell className="text-right text-red-500">{day.cnr}</TableCell>
                  <TableCell className="text-right text-green-500">{day.converted}</TableCell>
                  <TableCell className="text-right">{day.conversionRate.toFixed(1)}%</TableCell>
                </TableRow>
              ))}
              {(!report?.dailyBreakdown || report.dailyBreakdown.length === 0) && (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
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
