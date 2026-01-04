import { useMemo, useState, useEffect } from 'react';
import { format, startOfDay, endOfDay, subDays } from 'date-fns';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { DashboardDateFilter } from '@/components/dashboard/DashboardDateFilter';
import { DateRange } from '@/hooks/useSalesByDateRange';
import { useLeadDashboardStats, useOrderDashboardStats } from '@/hooks/useDashboardStats';
import { useInventorySummaryByWarehouse } from '@/hooks/useInventorySummaryByWarehouse';
import { useEmployees, useLeaveRequests } from '@/hooks/useHRM';
import { useAttendanceRecords } from '@/hooks/useAttendance';
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
  DollarSign,
  Package,
  Truck,
  BarChart3,
  Users,
  AlertTriangle,
  Zap,
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

  // Today's ad spend from ad_spend_reference table (USD amount)
  const { data: todayAdsRefData, isLoading: adsLoading } = useQuery({
    queryKey: ['today-ads-ref-spend', today, storeId],
    queryFn: async () => {
      let query = supabase
        .from('ad_spend_reference')
        .select('amount, store_id')
        .eq('spend_date', today);
      
      if (storeId) {
        query = query.eq('store_id', storeId);
      }
      
      const { data, error } = await query;
      if (error) throw error;
      return data || [];
    },
  });

  // Today's attendance
  const { data: attendanceData } = useAttendanceRecords(undefined, { from: today, to: today });

  // Yesterday's Daily P/L from daily_records table
  const { data: yesterdayPLData, isLoading: plLoading } = useQuery({
    queryKey: ['yesterday-daily-records-pl', yesterday, storeId],
    queryFn: async () => {
      let query = supabase
        .from('daily_records')
        .select('profit_loss, store_id')
        .eq('record_date', yesterday);
      
      if (storeId) {
        query = query.eq('store_id', storeId);
      }
      
      const { data, error } = await query;
      if (error) throw error;
      return data || [];
    },
  });

  // Logistics stats for pending/total work
  const { data: logisticsStats, isLoading: logisticsLoading } = useLogisticsStats();

  // Unsettled party transactions for receivable/payable - store-wise
  const { data: unsettledPartyTx, isLoading: partyTxLoading } = useQuery({
    queryKey: ['unsettled-party-transactions', storeId],
    queryFn: async () => {
      let query = supabase
        .from('party_transactions')
        .select('direction, amount, is_settled, store_id, warehouse_id')
        .eq('is_settled', false);
      
      // Note: party_transactions may not have store_id, so we use warehouse for filtering if needed
      const { data, error } = await query;
      if (error) throw error;
      return data || [];
    },
  });
  
  // Compute metrics
  const salesMetrics = useMemo(() => {
    const totalLeads = leadStats?.total || 0;
    const confirmedOrders = orderStats?.confirmed || 0;
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
    
    // Daybook = Today's Income - Today's Expense
    const todayIncome = todayTransactions?.filter(t => t.type === 'income').reduce((sum, t) => sum + (t.amount || 0), 0) || 0;
    const todayExpense = todayTransactions?.filter(t => t.type === 'expense').reduce((sum, t) => sum + (t.amount || 0), 0) || 0;
    const daybook = todayIncome - todayExpense;

    // Receivable/Payable from party_transactions (unsettled) - already filtered
    const receivables = unsettledPartyTx?.filter(t => t.direction === 'RECEIVABLE').reduce((sum, t) => sum + (t.amount || 0), 0) || 0;
    const payables = unsettledPartyTx?.filter(t => t.direction === 'PAYABLE').reduce((sum, t) => sum + (t.amount || 0), 0) || 0;
    
    return {
      totalAvailableBalance,
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
    
    // Yesterday's P/L from daily_records (sum if multiple entries)
    const yesterdayProfit = yesterdayPLData?.reduce((sum, r) => sum + (r.profit_loss || 0), 0) || 0;
    
    return { totalStock, totalValue, lowStock, warehouseCount: new Set(items.map(i => i.warehouse_id)).size, yesterdayProfit };
  }, [inventoryData, yesterdayPLData]);

  const hrmMetrics = useMemo(() => {
    const presentToday = attendanceData?.filter(a => a.status === 'Present').length || 0;
    return {
      activeEmployees: employeesData?.filter(e => e.status === 'Active').length || 0,
      pendingLeave: leaveRequestsData?.filter(l => l.status === 'Pending').length || 0,
      presentToday,
    };
  }, [employeesData, leaveRequestsData, attendanceData]);

  const marketingMetrics = useMemo(() => {
    // Today's ads spend in USD from ad_spend_reference table
    const todayRefSpendUSD = todayAdsRefData?.reduce((sum, a) => sum + (a.amount || 0), 0) || 0;
    return { todayRefSpendUSD };
  }, [todayAdsRefData]);

  const deliveryMetrics = useMemo(() => {
    const pendingWork = (logisticsStats?.inTransit || 0) + (logisticsStats?.pendingPickup || 0);
    const totalWork = logisticsStats?.totalSent || 0;
    return { pendingWork, totalWork };
  }, [logisticsStats]);

  const ModuleCard = ({ 
    title, 
    icon: Icon, 
    iconBg, 
    metrics, 
    navigateTo,
    isLoading 
  }: { 
    title: string; 
    icon: any; 
    iconBg: string;
    metrics: { label: string; value: string | number; highlight?: boolean; color?: string }[];
    navigateTo: string;
    isLoading?: boolean;
  }) => (
    <Card 
      className="hover:shadow-xl transition-all duration-300 cursor-pointer group border-0 shadow-md bg-card/80 backdrop-blur-sm" 
      onClick={() => navigate(navigateTo)}
    >
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center justify-between">
          <span className="flex items-center gap-3">
            <div className={`p-3 rounded-xl ${iconBg} shadow-lg`}>
              <Icon className="w-5 h-5 text-white" />
            </div>
            <span className="text-lg font-bold">{title}</span>
          </span>
          <ArrowRight className="w-5 h-5 text-muted-foreground opacity-0 group-hover:opacity-100 group-hover:translate-x-1 transition-all duration-200" />
        </CardTitle>
      </CardHeader>
      <CardContent className="pt-0">
        {isLoading ? (
          <div className="grid grid-cols-2 gap-3">
            {[1, 2, 3, 4].map(i => (
              <div key={i} className="p-3 rounded-xl bg-muted/30">
                <Skeleton className="h-3 w-16 mb-2" />
                <Skeleton className="h-6 w-20" />
              </div>
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-3">
            {metrics.map((m, i) => (
              <div key={i} className="p-3 rounded-xl bg-muted/40 hover:bg-muted/60 transition-colors">
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-1">{m.label}</p>
                <p className={`text-xl font-bold ${m.color || 'text-foreground'}`}>
                  {m.value}
                </p>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header with Date Filter and Quick Actions - All in one row */}
      <div className="flex flex-col xl:flex-row xl:items-center xl:justify-between gap-4">
        {/* Title */}
        <div className="shrink-0">
          <h1 className="text-2xl md:text-3xl font-bold tracking-tight">Admin Dashboard</h1>
          <p className="text-sm text-muted-foreground">Overview across all modules</p>
        </div>
        
        {/* Date Filter + Quick Actions - Right side */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 flex-wrap">
          <DashboardDateFilter value={dateRange} onChange={setDateRange} />
          
          <div className="h-6 w-px bg-border hidden sm:block" />
          
          {/* Quick Actions */}
          <span className="text-xs text-muted-foreground font-medium hidden sm:inline">Quick Actions:</span>
          <div className="flex flex-wrap gap-2">
            <Button 
              variant="outline" 
              size="sm" 
              onClick={(e) => { e.stopPropagation(); navigate('/admin/sales/dashboard'); }}
              className="gap-1.5 rounded-lg hover:bg-primary hover:text-primary-foreground transition-colors h-8 text-xs"
            >
              <TrendingUp className="w-3.5 h-3.5" /> Sales
            </Button>
            <Button 
              variant="outline" 
              size="sm" 
              onClick={(e) => { e.stopPropagation(); navigate('/admin/accounting/transactions'); }}
              className="gap-1.5 rounded-lg hover:bg-primary hover:text-primary-foreground transition-colors h-8 text-xs"
            >
              <FileText className="w-3.5 h-3.5" /> Transactions
            </Button>
            <Button 
              variant="outline" 
              size="sm" 
              onClick={(e) => { e.stopPropagation(); navigate('/admin/inventory/movements'); }}
              className="gap-1.5 rounded-lg hover:bg-primary hover:text-primary-foreground transition-colors h-8 text-xs"
            >
              <Package className="w-3.5 h-3.5" /> Stock
            </Button>
            <Button 
              variant="outline" 
              size="sm" 
              onClick={(e) => { e.stopPropagation(); navigate('/admin/marketing/ads'); }}
              className="gap-1.5 rounded-lg hover:bg-primary hover:text-primary-foreground transition-colors h-8 text-xs"
            >
              <DollarSign className="w-3.5 h-3.5" /> Ads
            </Button>
            <Button 
              variant="outline" 
              size="sm" 
              onClick={(e) => { e.stopPropagation(); navigate('/hrm/leave'); }}
              className="gap-1.5 rounded-lg hover:bg-primary hover:text-primary-foreground transition-colors h-8 text-xs"
            >
              <Calendar className="w-3.5 h-3.5" /> Leave
            </Button>
          </div>
        </div>
      </div>

      {/* Quick Summary Stats Bar */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card className="bg-gradient-to-br from-green-500/10 to-green-600/5 border-green-200/50 dark:border-green-800/50">
          <CardContent className="pt-4 pb-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-green-500/20">
                <DollarSign className="w-5 h-5 text-green-600" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground font-medium">Total Balance</p>
                <p className="text-xl font-bold text-green-600">
                  ₹{accountingMetricsComputed.totalAvailableBalance.toLocaleString()}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card className={`bg-gradient-to-br ${inventoryMetrics.yesterdayProfit >= 0 ? 'from-emerald-500/10 to-emerald-600/5 border-emerald-200/50 dark:border-emerald-800/50' : 'from-red-500/10 to-red-600/5 border-red-200/50 dark:border-red-800/50'}`}>
          <CardContent className="pt-4 pb-4">
            <div className="flex items-center gap-3">
              <div className={`p-2 rounded-lg ${inventoryMetrics.yesterdayProfit >= 0 ? 'bg-emerald-500/20' : 'bg-red-500/20'}`}>
                <BarChart3 className={`w-5 h-5 ${inventoryMetrics.yesterdayProfit >= 0 ? 'text-emerald-600' : 'text-red-600'}`} />
              </div>
              <div>
                <p className="text-xs text-muted-foreground font-medium">Yesterday P/L</p>
                <p className={`text-xl font-bold ${inventoryMetrics.yesterdayProfit >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>
                  ₹{inventoryMetrics.yesterdayProfit.toLocaleString()}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card className="bg-gradient-to-br from-orange-500/10 to-orange-600/5 border-orange-200/50 dark:border-orange-800/50">
          <CardContent className="pt-4 pb-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-orange-500/20">
                <AlertTriangle className="w-5 h-5 text-orange-600" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground font-medium">Low Stock Items</p>
                <p className="text-xl font-bold text-orange-600">
                  {inventoryMetrics.lowStock}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card className="bg-gradient-to-br from-blue-500/10 to-blue-600/5 border-blue-200/50 dark:border-blue-800/50">
          <CardContent className="pt-4 pb-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-blue-500/20">
                <Users className="w-5 h-5 text-blue-600" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground font-medium">Pending Leave</p>
                <p className="text-xl font-bold text-blue-600">
                  {hrmMetrics.pendingLeave}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Module Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
        {/* Sales Module */}
        <ModuleCard
          title="Sales"
          icon={TrendingUp}
          iconBg="bg-gradient-to-br from-green-500 to-green-600"
          navigateTo="/admin/sales/dashboard"
          isLoading={leadsLoading || ordersLoading}
          metrics={[
            { label: 'Leads', value: salesMetrics.totalLeads },
            { label: 'Conversion', value: `${salesMetrics.conversionRate}%`, color: 'text-green-600' },
            { label: 'Confirmed', value: salesMetrics.confirmedOrders },
            { label: 'Total Sales', value: `₹${salesMetrics.totalSales.toLocaleString()}` },
          ]}
        />

        {/* Accounting Module */}
        <ModuleCard
          title="Accounting"
          icon={Calculator}
          iconBg="bg-gradient-to-br from-blue-500 to-blue-600"
          navigateTo="/admin/accounting/dashboard-new"
          isLoading={accountsLoading || partyTxLoading}
          metrics={[
            { label: 'Total Balance', value: `₹${accountingMetricsComputed.totalAvailableBalance.toLocaleString()}` },
            { label: 'Daybook', value: `₹${accountingMetricsComputed.daybook.toLocaleString()}`, color: accountingMetricsComputed.daybook >= 0 ? 'text-green-600' : 'text-red-600' },
            { label: 'Receivable', value: `₹${accountingMetricsComputed.receivables.toLocaleString()}`, color: 'text-blue-600' },
            { label: 'Payable', value: `₹${accountingMetricsComputed.payables.toLocaleString()}`, color: 'text-orange-600' },
          ]}
        />

        {/* Inventory Module */}
        <ModuleCard
          title="Inventory"
          icon={Warehouse}
          iconBg="bg-gradient-to-br from-orange-500 to-orange-600"
          navigateTo="/admin/inventory/stock-summary"
          isLoading={inventoryLoading || plLoading}
          metrics={[
            { label: 'Stock Units', value: inventoryMetrics.totalStock.toLocaleString() },
            { label: 'Stock Value', value: `₹${inventoryMetrics.totalValue.toLocaleString()}` },
            { label: 'Low Stock', value: inventoryMetrics.lowStock, color: inventoryMetrics.lowStock > 0 ? 'text-orange-600' : undefined },
            { label: "Yesterday P/L", value: `₹${inventoryMetrics.yesterdayProfit.toLocaleString()}`, color: inventoryMetrics.yesterdayProfit >= 0 ? 'text-green-600' : 'text-red-600' },
          ]}
        />

        {/* Marketing Module */}
        <ModuleCard
          title="Marketing"
          icon={Megaphone}
          iconBg="bg-gradient-to-br from-purple-500 to-purple-600"
          navigateTo="/admin/marketing/ads"
          isLoading={adsLoading}
          metrics={[
            { label: 'Today Ads (USD)', value: `$${marketingMetrics.todayRefSpendUSD.toLocaleString()}`, color: 'text-purple-600' },
            { label: 'Confirmed Orders', value: salesMetrics.confirmedOrders },
            { label: 'Delivery Queue', value: `${deliveryMetrics.pendingWork} / ${deliveryMetrics.totalWork}` },
            { label: 'Total Sales', value: `₹${salesMetrics.totalSales.toLocaleString()}` },
          ]}
        />

        {/* HRM Module */}
        <ModuleCard
          title="HRM"
          icon={Briefcase}
          iconBg="bg-gradient-to-br from-teal-500 to-teal-600"
          navigateTo="/hrm/employees"
          isLoading={employeesLoading}
          metrics={[
            { label: 'Employees', value: hrmMetrics.activeEmployees },
            { label: 'Pending Leave', value: hrmMetrics.pendingLeave, color: hrmMetrics.pendingLeave > 0 ? 'text-orange-600' : undefined },
            { label: 'Present Today', value: hrmMetrics.presentToday, color: 'text-green-600' },
            { label: 'Active', value: `${hrmMetrics.activeEmployees} Staff` },
          ]}
        />

        {/* Logistics Module */}
        <ModuleCard
          title="Logistics"
          icon={Truck}
          iconBg="bg-gradient-to-br from-indigo-500 to-indigo-600"
          navigateTo="/logistics/orders"
          isLoading={logisticsLoading}
          metrics={[
            { label: 'Pending Work', value: deliveryMetrics.pendingWork, color: deliveryMetrics.pendingWork > 0 ? 'text-orange-600' : 'text-green-600' },
            { label: 'Total Sent', value: deliveryMetrics.totalWork },
            { label: 'In Transit', value: logisticsStats?.inTransit || 0 },
            { label: 'Delivered', value: logisticsStats?.delivered || 0, color: 'text-green-600' },
          ]}
        />
      </div>
    </div>
  );
}
