import { useMemo, useState } from 'react';
import { format, startOfDay, endOfDay, startOfMonth } from 'date-fns';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { DashboardDateFilter } from '@/components/dashboard/DashboardDateFilter';
import { DateRange } from '@/hooks/useSalesByDateRange';
import { useLeadDashboardStats, useOrderDashboardStats } from '@/hooks/useDashboardStats';
import { useAccountingDashboardMetrics } from '@/hooks/useAccountingDashboardMetrics';
import { useInventorySummaryByWarehouse } from '@/hooks/useInventorySummaryByWarehouse';
import { useEmployees, useLeaveRequests } from '@/hooks/useHRM';
import { useAdsSpend } from '@/hooks/useAdsSpend';
import { Skeleton } from '@/components/ui/skeleton';
import {
  TrendingUp,
  Calculator,
  Warehouse,
  Megaphone,
  Briefcase,
  Calendar,
  FileText,
  ArrowRight,
  CheckCircle,
  DollarSign,
  Package,
} from 'lucide-react';

export default function AdminUnifiedDashboard() {
  const navigate = useNavigate();
  
  // Date range for today
  const [dateRange, setDateRange] = useState<DateRange>({
    from: startOfDay(new Date()),
    to: endOfDay(new Date()),
  });
  
  const dateFrom = format(dateRange.from, 'yyyy-MM-dd');
  const dateTo = format(dateRange.to, 'yyyy-MM-dd');
  const monthStart = format(startOfMonth(new Date()), 'yyyy-MM-dd');
  const monthEnd = format(new Date(), 'yyyy-MM-dd');

  // Sales data
  const { data: leadStats, isLoading: leadsLoading } = useLeadDashboardStats(dateFrom, dateTo);
  const { data: orderStats, isLoading: ordersLoading } = useOrderDashboardStats(dateFrom, dateTo);

  // Accounting data
  const { data: accountingMetrics, isLoading: accountingLoading } = useAccountingDashboardMetrics(monthStart, monthEnd);

  // Inventory data
  const { data: inventoryData, isLoading: inventoryLoading } = useInventorySummaryByWarehouse();

  // HRM data
  const { data: employeesData, isLoading: employeesLoading } = useEmployees();
  const { data: leaveRequestsData } = useLeaveRequests();

  // Marketing/Ads data (this month)
  const { data: adsData } = useAdsSpend();
  
  // Compute metrics
  const salesMetrics = useMemo(() => ({
    totalLeads: leadStats?.total || 0,
    confirmedOrders: orderStats?.confirmed || 0,
    totalOrders: orderStats?.total || 0,
    deliveredOrders: orderStats?.delivered || 0,
    totalSales: orderStats?.totalSales || 0,
  }), [leadStats, orderStats]);

  const accountingMetricsComputed = useMemo(() => ({
    cashInHand: accountingMetrics?.assetAccounts?.find(a => a.type === 'cash')?.current_balance || 0,
    bankBalance: accountingMetrics?.assetAccounts?.filter(a => a.type === 'bank').reduce((sum, a) => sum + (a.current_balance || 0), 0) || 0,
    receivables: accountingMetrics?.receivableOutstanding || 0,
    payables: accountingMetrics?.payableOutstanding || 0,
    monthlyProfit: accountingMetrics?.profitLoss || 0,
  }), [accountingMetrics]);

  const inventoryMetrics = useMemo(() => {
    const items = inventoryData?.items || [];
    const totals = inventoryData?.totals;
    const totalStock = totals?.totalStock || 0;
    const totalValue = totals?.totalValue || 0;
    const lowStock = items.filter(i => i.reorder_required).length;
    return { totalStock, totalValue, lowStock, warehouseCount: new Set(items.map(i => i.warehouse_id)).size };
  }, [inventoryData]);

  const hrmMetrics = useMemo(() => ({
    activeEmployees: employeesData?.filter(e => e.status === 'Active').length || 0,
    pendingLeave: leaveRequestsData?.filter(l => l.status === 'Pending').length || 0,
  }), [employeesData, leaveRequestsData]);

  const marketingMetrics = useMemo(() => {
    const monthAds = adsData?.filter(a => a.date >= monthStart) || [];
    const totalSpend = monthAds.reduce((sum, a) => sum + (a.npr_amount || 0), 0);
    return { monthlySpend: totalSpend };
  }, [adsData, monthStart]);

  const ModuleCard = ({ 
    title, 
    icon: Icon, 
    color, 
    metrics, 
    navigateTo,
    isLoading 
  }: { 
    title: string; 
    icon: any; 
    color: string;
    metrics: { label: string; value: string | number }[];
    navigateTo: string;
    isLoading?: boolean;
  }) => (
    <Card className="hover:shadow-lg transition-shadow cursor-pointer group" onClick={() => navigate(navigateTo)}>
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center justify-between text-base">
          <span className="flex items-center gap-2">
            <div className={`p-2 rounded-lg ${color}`}>
              <Icon className="w-4 h-4 text-white" />
            </div>
            {title}
          </span>
          <ArrowRight className="w-4 h-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
        </CardTitle>
      </CardHeader>
      <CardContent className="pt-0">
        {isLoading ? (
          <div className="space-y-2">
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-3/4" />
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-2">
            {metrics.map((m, i) => (
              <div key={i} className="text-center p-2 bg-muted/50 rounded-lg">
                <p className="text-xs text-muted-foreground">{m.label}</p>
                <p className="text-sm font-semibold">{m.value}</p>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );

  return (
    <div className="space-y-4 md:space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col gap-3 md:gap-4">
        <div className="flex items-start justify-between gap-2">
          <div>
            <h1 className="text-xl md:text-2xl font-bold">Admin Dashboard</h1>
            <p className="text-xs md:text-sm text-muted-foreground">
              Overview across all modules
            </p>
          </div>
        </div>
        <DashboardDateFilter value={dateRange} onChange={setDateRange} />
      </div>

      {/* Module Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
        {/* Sales Module */}
        <ModuleCard
          title="Sales"
          icon={TrendingUp}
          color="bg-green-500"
          navigateTo="/admin/sales/dashboard"
          isLoading={leadsLoading || ordersLoading}
          metrics={[
            { label: 'Leads', value: salesMetrics.totalLeads },
            { label: 'Orders', value: salesMetrics.totalOrders },
            { label: 'Confirmed', value: salesMetrics.confirmedOrders },
            { label: 'Total Sales', value: `₹${salesMetrics.totalSales.toLocaleString()}` },
          ]}
        />

        {/* Accounting Module */}
        <ModuleCard
          title="Accounting"
          icon={Calculator}
          color="bg-blue-500"
          navigateTo="/admin/accounting/dashboard-new"
          isLoading={accountingLoading}
          metrics={[
            { label: 'Cash', value: `₹${accountingMetricsComputed.cashInHand.toLocaleString()}` },
            { label: 'Bank', value: `₹${accountingMetricsComputed.bankBalance.toLocaleString()}` },
            { label: 'Receivable', value: `₹${accountingMetricsComputed.receivables.toLocaleString()}` },
            { label: 'Payable', value: `₹${accountingMetricsComputed.payables.toLocaleString()}` },
          ]}
        />

        {/* Inventory Module */}
        <ModuleCard
          title="Inventory"
          icon={Warehouse}
          color="bg-orange-500"
          navigateTo="/admin/inventory/stock-summary"
          isLoading={inventoryLoading}
          metrics={[
            { label: 'Stock Units', value: inventoryMetrics.totalStock.toLocaleString() },
            { label: 'Stock Value', value: `₹${inventoryMetrics.totalValue.toLocaleString()}` },
            { label: 'Low Stock', value: inventoryMetrics.lowStock },
            { label: 'Warehouses', value: inventoryMetrics.warehouseCount },
          ]}
        />

        {/* Marketing Module */}
        <ModuleCard
          title="Marketing"
          icon={Megaphone}
          color="bg-purple-500"
          navigateTo="/admin/marketing/ads"
          isLoading={false}
          metrics={[
            { label: 'Monthly Spend', value: `₹${marketingMetrics.monthlySpend.toLocaleString()}` },
            { label: 'Confirmed', value: salesMetrics.confirmedOrders },
            { label: 'Delivered', value: salesMetrics.deliveredOrders },
            { label: 'Sales', value: `₹${salesMetrics.totalSales.toLocaleString()}` },
          ]}
        />

        {/* HRM Module */}
        <ModuleCard
          title="HRM"
          icon={Briefcase}
          color="bg-teal-500"
          navigateTo="/hrm/employees"
          isLoading={employeesLoading}
          metrics={[
            { label: 'Employees', value: hrmMetrics.activeEmployees },
            { label: 'Pending Leave', value: hrmMetrics.pendingLeave },
            { label: 'Attendance', value: '-' },
            { label: 'Notices', value: '-' },
          ]}
        />

        {/* Quick Stats Summary */}
        <Card className="bg-gradient-to-br from-primary/10 to-primary/5">
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2">
              <CheckCircle className="w-4 h-4 text-primary" />
              Quick Summary
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            <div className="grid grid-cols-2 gap-2">
              <div className="text-center p-2 bg-background/50 rounded-lg">
                <p className="text-xs text-muted-foreground">Net Worth</p>
                <p className="text-sm font-semibold text-primary">
                  ₹{(accountingMetrics?.netWorth || 0).toLocaleString()}
                </p>
              </div>
              <div className="text-center p-2 bg-background/50 rounded-lg">
                <p className="text-xs text-muted-foreground">Monthly P/L</p>
                <p className={`text-sm font-semibold ${accountingMetricsComputed.monthlyProfit >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                  ₹{accountingMetricsComputed.monthlyProfit.toLocaleString()}
                </p>
              </div>
              <div className="text-center p-2 bg-background/50 rounded-lg">
                <p className="text-xs text-muted-foreground">Alerts</p>
                <p className="text-sm font-semibold text-orange-600">
                  {inventoryMetrics.lowStock} Low Stock
                </p>
              </div>
              <div className="text-center p-2 bg-background/50 rounded-lg">
                <p className="text-xs text-muted-foreground">Pending</p>
                <p className="text-sm font-semibold text-blue-600">
                  {hrmMetrics.pendingLeave} Leave Req
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Quick Actions */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Quick Actions</CardTitle>
        </CardHeader>
        <CardContent className="pt-0">
          <div className="flex flex-wrap gap-2">
            <Button variant="outline" size="sm" onClick={() => navigate('/admin/sales/dashboard')}>
              <TrendingUp className="w-4 h-4 mr-1" /> Sales Dashboard
            </Button>
            <Button variant="outline" size="sm" onClick={() => navigate('/admin/accounting/transactions')}>
              <FileText className="w-4 h-4 mr-1" /> Transactions
            </Button>
            <Button variant="outline" size="sm" onClick={() => navigate('/admin/inventory/movements')}>
              <Package className="w-4 h-4 mr-1" /> Stock Movements
            </Button>
            <Button variant="outline" size="sm" onClick={() => navigate('/admin/marketing/ads')}>
              <DollarSign className="w-4 h-4 mr-1" /> Ad Spend
            </Button>
            <Button variant="outline" size="sm" onClick={() => navigate('/hrm/leave')}>
              <Calendar className="w-4 h-4 mr-1" /> Leave Requests
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
