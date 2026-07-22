import { useState } from 'react';
import { Link } from 'react-router-dom';
import { subDays, format } from 'date-fns';
import { useBirthdayCheck } from '@/hooks/useBirthdayCheck';
import { BirthdayBanner } from '@/components/hrm/BirthdayBanner';
import { Package, TrendingUp, Clock, XCircle, DollarSign, CheckCircle, AlertCircle } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { DateRangeFilter, DateRange } from '@/components/ui/DateRangeFilter';
import { LogisticsStatsCard } from '@/components/logistics/LogisticsStatsCard';
import { CourierComparisonChart } from '@/components/logistics/CourierComparisonChart';
import { DeliveryRateChart } from '@/components/logistics/DeliveryRateChart';
import { useLogisticsStats, useCourierComparison } from '@/hooks/useLogisticsStats';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Settings } from 'lucide-react';


export default function LogisticsDashboardMain() {
  const [dateRange, setDateRange] = useState<DateRange>({
    from: subDays(new Date(), 30),
    to: new Date(),
  });

  const { data: stats, isLoading: statsLoading } = useLogisticsStats(dateRange.from, dateRange.to);
  const { data: courierData, isLoading: courierLoading } = useCourierComparison(dateRange.from, dateRange.to);


  const { isSelfBirthday, selfName, otherBirthdayNames } = useBirthdayCheck();

  return (
    <div className="space-y-6 p-6 animate-fade-in">
      {isSelfBirthday && <BirthdayBanner names={[selfName]} isSelf />}
      {otherBirthdayNames.length > 0 && <BirthdayBanner names={otherBirthdayNames} />}
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Logistics Dashboard</h1>
          <p className="text-muted-foreground">Multi-courier performance overview</p>
        </div>
        <div className="flex items-center gap-3">
          <Link to="/admin/logistics-settings">
            <Button variant="outline" size="sm">
              <Settings className="h-4 w-4 mr-2" />
              Logistics Settings
            </Button>
          </Link>
          <DateRangeFilter value={dateRange} onChange={setDateRange} />
        </div>

      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <LogisticsStatsCard
          title="Total Sent"
          value={stats?.totalSent || 0}
          icon={Package}
          description={`From ${format(dateRange.from, 'MMM dd')} to ${format(dateRange.to, 'MMM dd')}`}
        />
        <LogisticsStatsCard
          title="Delivered"
          value={stats?.delivered || 0}
          icon={CheckCircle}
          description={`${stats?.deliveryRate || 0}% delivery rate`}
          className="border-success/20"
        />
        <LogisticsStatsCard
          title="In Transit"
          value={stats?.inTransit || 0}
          icon={Clock}
          description="Currently being delivered"
          className="border-info/20"
        />
        <LogisticsStatsCard
          title="Pending Pickup"
          value={stats?.pendingPickup || 0}
          icon={AlertCircle}
          description="Waiting for courier pickup"
          className="border-warning/20"
        />
      </div>

      {/* COD & RTO Row */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <LogisticsStatsCard
          title="RTO / Returned"
          value={stats?.rto || 0}
          icon={XCircle}
          description="Return to origin"
          className="border-destructive/20"
        />
        <LogisticsStatsCard
          title="Total COD"
          value={`NPR ${stats?.totalCod.toLocaleString() || 0}`}
          icon={DollarSign}
        />
        <LogisticsStatsCard
          title="COD Settled"
          value={`NPR ${stats?.codSettled.toLocaleString() || 0}`}
          icon={CheckCircle}
          className="border-success/20"
        />
        <LogisticsStatsCard
          title="COD Pending"
          value={`NPR ${stats?.codPending.toLocaleString() || 0}`}
          icon={Clock}
          className="border-warning/20"
        />
      </div>

      {/* Courier Breakdown Cards */}
      <Card>
        <CardHeader>
          <CardTitle>Courier Breakdown</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {courierLoading ? (
              <p className="text-sm text-muted-foreground col-span-3">Loading courier data...</p>
            ) : courierData && courierData.length > 0 ? (
              courierData.map((courier) => (
                <Link
                  key={courier.courier}
                  to={`/admin/logistics/${courier.courier.toLowerCase()}`}
                  className="block"
                >
                  <Card className="hover:border-primary transition-colors cursor-pointer">
                    <CardHeader className="pb-3">
                      <CardTitle className="text-lg flex items-center justify-between">
                        {courier.courier}
                        <Badge variant="outline">{courier.deliveryRate}%</Badge>
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-2 text-sm">
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Total:</span>
                          <span className="font-medium">{courier.total}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Delivered:</span>
                          <span className="font-medium text-success">{courier.delivered}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">In Transit:</span>
                          <span className="font-medium text-info">{courier.inTransit}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">RTO:</span>
                          <span className="font-medium text-destructive">{courier.rto}</span>
                        </div>
                        <div className="flex justify-between border-t pt-2">
                          <span className="text-muted-foreground">COD Collected:</span>
                          <span className="font-medium">NPR {courier.codCollected.toLocaleString()}</span>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </Link>
              ))
            ) : (
              <p className="text-sm text-muted-foreground col-span-3">No courier data available</p>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <CourierComparisonChart data={courierData || []} />
        <DeliveryRateChart data={courierData || []} />
      </div>
    </div>
  );
}
