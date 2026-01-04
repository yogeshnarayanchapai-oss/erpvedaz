import { useMemo, useState, useEffect } from 'react';
import { format, startOfDay, endOfDay, startOfMonth, subDays } from 'date-fns';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { DashboardDateFilter } from '@/components/dashboard/DashboardDateFilter';
import { DateRange } from '@/hooks/useSalesByDateRange';
import { useLeadDashboardStats, useOrderDashboardStats } from '@/hooks/useDashboardStats';
import { useInventorySummaryByWarehouse } from '@/hooks/useInventorySummaryByWarehouse';
import { useEmployees, useLeaveRequests } from '@/hooks/useHRM';
import { useAdsSpend } from '@/hooks/useAdsSpend';
import { useAttendanceRecords } from '@/hooks/useAttendance';
import { useDailyPL } from '@/hooks/useDailyPL';
import { useLogisticsStats } from '@/hooks/useLogisticsStats';
import { useEffectiveRole } from '@/hooks/useEffectiveRole';
import { useAccounts } from '@/hooks/useAccounts';
import { useTransactions } from '@/hooks/useTransactions';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useCurrentStoreId } from '@/hooks/useCurrentStoreId';
import { Skeleton } from '@/components/ui/skeleton';
import { toast } from 'sonner';
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
  Truck,
} from 'lucide-react';

export default function AdminUnifiedDashboard() {
  const navigate = useNavigate();
  const { effectiveRole } = useEffectiveRole();
  const storeId = useCurrentStoreId();

  // Redirect MANAGER to Sales Dashboard
  useEffect(() => {
    if (effectiveRole === 'MANAGER') {
      toast.error('Access denied');
      navigate('/admin/sales/dashboard', { replace: true });
    }
  }, [effectiveRole, navigate]);
  
  // Date range for today
  const [dateRange, setDateRange] = useState<DateRange>({
    from: startOfDay(new Date()),
    to: endOfDay(new Date()),
  });
  
  const dateFrom = format(dateRange.from, 'yyyy-MM-dd');
  const dateTo = format(dateRange.to, 'yyyy-MM-dd');
  const monthStart = format(startOfMonth(new Date()), 'yyyy-MM-dd');
  const monthEnd = format(new Date(), 'yyyy-MM-dd');
  const today = format(new Date(), 'yyyy-MM-dd');
  const yesterday = format(subDays(new Date(), 1), 'yyyy-MM-dd');

  // Sales data
  const { data: leadStats, isLoading: leadsLoading } = useLeadDashboardStats(dateFrom, dateTo);
  const { data: orderStats, isLoading: ordersLoading } = useOrderDashboardStats(dateFrom, dateTo);

  // Accounting data - All accounts for total balance
  const { data: accountsData, isLoading: accountsLoading } = useAccounts();

  // Today's transactions for daybook calculation
  const { data: todayTransactions } = useTransactions({ startDate: today, endDate: today });

  // Inventory data
  const { data: inventoryData, isLoading: inventoryLoading } = useInventorySummaryByWarehouse();

  // HRM data
  const { data: employeesData, isLoading: employeesLoading } = useEmployees();
  const { data: leaveRequestsData } = useLeaveRequests();

  // Today's ad spend from ads_spend table (has USD amount)
  const { data: todayAdsData } = useAdsSpend({ dateFrom: today, dateTo: today });

  // Today's attendance
  const { data: attendanceData } = useAttendanceRecords(undefined, { from: today, to: today });

  // Yesterday's Daily P/L
  const { data: yesterdayPL, isLoading: plLoading } = useDailyPL(yesterday);

  // Logistics stats for pending/total work
  const { data: logisticsStats, isLoading: logisticsLoading } = useLogisticsStats();

  // Unsettled party transactions for receivable/payable
  const { data: unsettledPartyTx } = useQuery({
    queryKey: ['unsettled-party-transactions', storeId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('party_transactions')
        .select('direction, amount, is_settled')
        .eq('is_settled', false);
      
      if (error) throw error;
      return data || [];
    },
    enabled: !!storeId,
  });
  
  // Compute metrics
  const salesMetrics = useMemo(() => {
    const totalLeads = leadStats?.total || 0;
    const confirmedOrders = orderStats?.confirmed || 0;
    // Conversion rate = Confirmed Orders / Total Leads * 100
    const conversionRate = totalLeads > 0 ? ((confirmedOrders / totalLeads) * 100).toFixed(1) : '0.0';
    
    return {
      totalLeads,
      confirmedOrders,
      conversionRate,
      totalOrders: orderStats?.total || 0,
      deliveredOrders: orderStats?.delivered || 0,
      totalSales: orderStats?.totalSales || 0,
    };
  }, [leadStats, orderStats]);

  const accountingMetricsComputed = useMemo(() => {
    // Total Available Balance = Sum of all account balances
    const totalAvailableBalance = accountsData?.reduce((sum, acc) => sum + (acc.current_balance || 0), 0) || 0;
    const bankBalance = accountsData?.filter(a => a.type === 'bank').reduce((sum, a) => sum + (a.current_balance || 0), 0) || 0;
    
    // Daybook = Today's Income - Today's Expense
    const todayIncome = todayTransactions?.filter(t => t.type === 'income').reduce((sum, t) => sum + (t.amount || 0), 0) || 0;
    const todayExpense = todayTransactions?.filter(t => t.type === 'expense').reduce((sum, t) => sum + (t.amount || 0), 0) || 0;
    const daybook = todayIncome - todayExpense;

    // Receivable/Payable from party_transactions (unsettled)
    const receivables = unsettledPartyTx?.filter(t => t.direction === 'RECEIVABLE').reduce((sum, t) => sum + (t.amount || 0), 0) || 0;
    const payables = unsettledPartyTx?.filter(t => t.direction === 'PAYABLE').reduce((sum, t) => sum + (t.amount || 0), 0) || 0;
    
    return {
      totalAvailableBalance,
      bankBalance,
      daybook,
      receivables,
      payables,
    };
  }, [accountsData, todayTransactions, unsettledPartyTx]);

  const inventoryMetrics = useMemo(() => {
    const items = inventoryData?.items || [];
    const totals = inventoryData?.totals;
    const totalStock = totals?.totalStock || 0;
    const totalValue = totals?.totalValue || 0;
    const lowStock = items.filter(i => i.reorder_required).length;
    // Yesterday's P/L from daily_pl
    const yesterdayProfit = yesterdayPL?.actual_profit || 0;
    return { totalStock, totalValue, lowStock, warehouseCount: new Set(items.map(i => i.warehouse_id)).size, yesterdayProfit };
  }, [inventoryData, yesterdayPL]);

  const hrmMetrics = useMemo(() => {
    const presentToday = attendanceData?.filter(a => a.status === 'Present').length || 0;
    return {
      activeEmployees: employeesData?.filter(e => e.status === 'Active').length || 0,
      pendingLeave: leaveRequestsData?.filter(l => l.status === 'Pending').length || 0,
      presentToday,
    };
  }, [employeesData, leaveRequestsData, attendanceData]);

  const marketingMetrics = useMemo(() => {
    // Today's ads spend in USD from ads_spend table
    const todayRefSpendUSD = todayAdsData?.reduce((sum, a) => sum + (a.usd_amount || 0), 0) || 0;
    return { todayRefSpendUSD };
  }, [todayAdsData]);

  const deliveryMetrics = useMemo(() => {
    // Pending = in transit + pending pickup, Total = all sent
    const pendingWork = (logisticsStats?.inTransit || 0) + (logisticsStats?.pendingPickup || 0);
    const totalWork = logisticsStats?.totalSent || 0;
    return { pendingWork, totalWork };
  }, [logisticsStats]);

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
            { label: 'Avg Conversion Rate', value: `${salesMetrics.conversionRate}%` },
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
          isLoading={accountsLoading}
          metrics={[
            { label: 'Total Available', value: `₹${accountingMetricsComputed.totalAvailableBalance.toLocaleString()}` },
            { label: 'Daybook', value: `₹${accountingMetricsComputed.daybook.toLocaleString()}` },
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
          isLoading={inventoryLoading || plLoading}
          metrics={[
            { label: 'Stock Units', value: inventoryMetrics.totalStock.toLocaleString() },
            { label: 'Stock Value', value: `₹${inventoryMetrics.totalValue.toLocaleString()}` },
            { label: 'Low Stock', value: inventoryMetrics.lowStock },
            { label: "Yesterday's P/L", value: `₹${inventoryMetrics.yesterdayProfit.toLocaleString()}` },
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
            { label: 'Today Ads (USD)', value: `$${marketingMetrics.todayRefSpendUSD.toLocaleString()}` },
            { label: 'Confirmed Orders', value: salesMetrics.confirmedOrders },
            { label: 'Pending / Total', value: `${deliveryMetrics.pendingWork} / ${deliveryMetrics.totalWork}` },
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
            { label: 'Present Today', value: hrmMetrics.presentToday },
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
                <p className="text-xs text-muted-foreground">Total Balance</p>
                <p className="text-sm font-semibold text-primary">
                  ₹{accountingMetricsComputed.totalAvailableBalance.toLocaleString()}
                </p>
              </div>
              <div className="text-center p-2 bg-background/50 rounded-lg">
                <p className="text-xs text-muted-foreground">Yesterday P/L</p>
                <p className={`text-sm font-semibold ${inventoryMetrics.yesterdayProfit >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                  ₹{inventoryMetrics.yesterdayProfit.toLocaleString()}
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
