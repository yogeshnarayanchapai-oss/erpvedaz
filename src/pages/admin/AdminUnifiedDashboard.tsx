import { useMemo, useState, useEffect } from 'react';
import { format, startOfDay, endOfDay, subDays } from 'date-fns';
import { BirthdayBanner } from '@/components/hrm/BirthdayBanner';
import { useBirthdayCheck } from '@/hooks/useBirthdayCheck';
import { useNavigate } from 'react-router-dom';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { DashboardDateFilter } from '@/components/dashboard/DashboardDateFilter';
import { DateRange, useProductDaybookByDateRange } from '@/hooks/useSalesByDateRange';
import { useProducts } from '@/hooks/useProducts';
import { useLeadDashboardStats, useOrderDashboardStats } from '@/hooks/useDashboardStats';
import { useInventorySummaryByWarehouse } from '@/hooks/useInventorySummaryByWarehouse';
import { useEmployees, useLeaveRequests } from '@/hooks/useHRM';
import { useAttendanceRecords } from '@/hooks/useAttendance';
import { useLogisticsStats } from '@/hooks/useLogisticsStats';
import { useEffectiveRole } from '@/hooks/useEffectiveRole';
import { useAccounts } from '@/hooks/useAccounts';
import { useTransactions } from '@/hooks/useTransactions';
import { usePartiesWithBalances } from '@/hooks/useParties';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useDashboardHighAlertCount } from '@/hooks/useDashboardHighAlertCount';
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
  CheckSquare,
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

  // Products data for daybook
  const { data: products = [] } = useProducts();
  
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
  
  // Pending documents count for HRM - filter by store via employees table
  const { data: pendingDocsData } = useQuery({
    queryKey: ['pending-hrm-documents', storeId],
    queryFn: async () => {
      if (!storeId) return 0;
      
      // First get employee IDs for this store
      const { data: storeEmployees, error: empError } = await supabase
        .from('employees')
        .select('id')
        .eq('store_id', storeId);
      
      if (empError) throw empError;
      if (!storeEmployees || storeEmployees.length === 0) return 0;
      
      const employeeIds = storeEmployees.map(e => e.id);
      
      // Then count pending documents for those employees
      const { count, error } = await supabase
        .from('employee_documents')
        .select('id', { count: 'exact', head: true })
        .eq('status', 'PENDING')
        .in('employee_id', employeeIds);
      
      if (error) throw error;
      return count || 0;
    },
    enabled: !!storeId,
  });

  // Total ad spend from ad_spend_reference table (USD amount) - all dates, store-wise
  const { data: totalAdsRefData, isLoading: adsLoading } = useQuery({
    queryKey: ['total-ads-ref-spend', storeId],
    queryFn: async () => {
      let query = supabase
        .from('ad_spend_reference')
        .select('amount, store_id');
      
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

  // Ref. P/L - Sum of P/L from Product Daybook (useProductDaybookByDateRange)
  const productList = useMemo(() => products.map(p => ({
    id: p.id,
    name: p.name,
    target_per_day: p.target_per_day,
    cost_price: p.cost_price,
    sell_price: p.sell_price,
  })), [products]);
  
  const { data: productDaybook = [], isLoading: refPLLoading } = useProductDaybookByDateRange(dateRange, productList);
  
  // Sum all P/L values from product daybook
  const refPLData = useMemo(() => {
    return productDaybook.reduce((sum, item) => sum + (item.pl || 0), 0);
  }, [productDaybook]);

  // Logistics stats for pending/total work
  const { data: logisticsStats, isLoading: logisticsLoading } = useLogisticsStats();

  // Parties with balances for receivable/payable - already store-wise filtered
  const { data: partiesData, isLoading: partyTxLoading } = usePartiesWithBalances();

  // Task stats for Task Management card
  const { data: taskStats, isLoading: tasksLoading } = useQuery({
    queryKey: ['admin-task-stats', storeId],
    queryFn: async () => {
      if (!storeId) return { pending: 0, issues: 0, pendingReplies: 0, total: 0 };
      
      // Pending tasks (status = PENDING or IN_PROGRESS)
      const { count: pendingCount } = await supabase
        .from('tasks')
        .select('*', { count: 'exact', head: true })
        .eq('store_id', storeId)
        .in('status', ['PENDING', 'IN_PROGRESS']);
      
      // Get non-completed task IDs for this store
      const { data: nonCompletedTasks } = await supabase
        .from('tasks')
        .select('id')
        .eq('store_id', storeId)
        .neq('status', 'COMPLETED');
      const nonCompletedIds = (nonCompletedTasks || []).map(t => t.id);

      // Tasks with issues - only non-completed, count unique tasks
      let issueCount = 0;
      if (nonCompletedIds.length > 0) {
        const { data: issueRemarks } = await supabase
          .from('task_remarks')
          .select('task_id')
          .in('task_id', nonCompletedIds)
          .eq('is_issue', true)
          .is('parent_remark_id', null)
          .eq('status', 'OPEN');
        issueCount = new Set((issueRemarks || []).map(r => r.task_id)).size;
      }
      
      // Pending replies - count unique TASKS that have open tickets with no replies
      let pendingRepliesCount = 0;
      if (nonCompletedIds.length > 0) {
        const { data: openTickets } = await supabase
          .from('task_remarks')
          .select('id, task_id')
          .in('task_id', nonCompletedIds)
          .is('parent_remark_id', null)
          .eq('status', 'OPEN');
        
        if (openTickets && openTickets.length > 0) {
          const tasksWithUnreplied = new Set<string>();
          for (const tr of openTickets) {
            if (tasksWithUnreplied.has(tr.task_id)) continue;
            const { count: replyCount } = await supabase
              .from('task_remarks')
              .select('*', { count: 'exact', head: true })
              .eq('parent_remark_id', tr.id);
            if ((replyCount || 0) === 0) {
              tasksWithUnreplied.add(tr.task_id);
            }
          }
          pendingRepliesCount = tasksWithUnreplied.size;
        }
      }
      
      // Total tasks
      const { count: totalCount } = await supabase
        .from('tasks')
        .select('*', { count: 'exact', head: true })
        .eq('store_id', storeId);
      
      return {
        pending: pendingCount || 0,
        issues: issueCount || 0,
        pendingReplies: pendingRepliesCount || 0,
        total: totalCount || 0,
      };
    },
    enabled: !!storeId,
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

    // Receivable/Payable from parties with balances (same as Party Statement)
    const receivables = partiesData?.reduce((sum, p) => sum + Math.max(0, p.net_receivable + p.pending_receivable_amount), 0) || 0;
    const payables = partiesData?.reduce((sum, p) => sum + Math.max(0, p.net_payable + p.pending_payable_amount), 0) || 0;
    
    return {
      totalAvailableBalance,
      daybook,
      receivables,
      payables,
    };
  }, [accountsData, todayTransactions, partiesData]);

  // High Alert count
  const { data: highAlertCount = 0 } = useDashboardHighAlertCount();

  const inventoryMetrics = useMemo(() => {
    const items = inventoryData?.items || [];
    const totals = inventoryData?.totals;
    const totalStock = totals?.totalStock || 0;
    const totalValue = totals?.totalValue || 0;
    const lowStock = items.filter(i => i.reorder_required && i.reorder_level > 0).length;
    
    // Yesterday's P/L from daily_records (sum if multiple entries)
    const yesterdayProfit = yesterdayPLData?.reduce((sum, r) => sum + (r.profit_loss || 0), 0) || 0;
    
    return { totalStock, totalValue, lowStock, warehouseCount: new Set(items.map(i => i.warehouse_id)).size, yesterdayProfit, highAlertCount };
  }, [inventoryData, yesterdayPLData, highAlertCount]);

const hrmMetrics = useMemo(() => {
    const presentToday = attendanceData?.filter(a => a.status === 'Present' || a.status === 'Late').length || 0;
    const pendingLeaveCount = leaveRequestsData?.filter(l => l.status === 'Pending').length || 0;
    const pendingDocsCount = pendingDocsData || 0;
    return {
      activeEmployees: employeesData?.filter(e => e.status === 'Active').length || 0,
      pendingLeave: pendingLeaveCount,
      pendingHRM: pendingLeaveCount + pendingDocsCount,
      presentToday,
    };
  }, [employeesData, leaveRequestsData, attendanceData, pendingDocsData]);

  const marketingMetrics = useMemo(() => {
    // Total ads spend in USD from ad_spend_reference table (all dates)
    const totalRefSpendUSD = totalAdsRefData?.reduce((sum, a) => sum + (a.amount || 0), 0) || 0;
    return { totalRefSpendUSD };
  }, [totalAdsRefData]);

  const deliveryMetrics = useMemo(() => {
    const pendingWork = (logisticsStats?.inTransit || 0) + (logisticsStats?.pendingPickup || 0);
    const totalWork = logisticsStats?.totalSent || 0;
    return { pendingWork, totalWork };
  }, [logisticsStats]);

  // Format whole numbers without decimals for dashboard cards
  const fmt = (n: number) => Math.round(n || 0).toLocaleString('en-IN', { maximumFractionDigits: 0 });

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
      className="hover:shadow-lg transition-all duration-300 cursor-pointer group border-0 shadow-sm bg-card/80 backdrop-blur-sm" 
      onClick={() => navigate(navigateTo)}
    >
      <CardHeader className="p-2 pb-1 md:p-4 md:pb-2">
        <CardTitle className="flex items-center justify-between">
          <span className="flex items-center gap-2">
            <div className={`p-1.5 md:p-2 rounded-lg ${iconBg} shadow-md`}>
              <Icon className="w-4 h-4 md:w-5 md:h-5 text-white" />
            </div>
            <span className="text-sm md:text-base font-bold">{title}</span>
          </span>
          <ArrowRight className="w-4 h-4 md:w-5 md:h-5 text-muted-foreground opacity-0 group-hover:opacity-100 group-hover:translate-x-1 transition-all duration-200" />
        </CardTitle>
      </CardHeader>
      <CardContent className="pt-0 p-2 md:p-4 md:pt-0">
        {isLoading ? (
          <div className="grid grid-cols-2 gap-2 md:gap-3">
            {[1, 2, 3, 4].map(i => (
              <div key={i} className="p-2 md:p-3 rounded-lg bg-muted/30">
                <Skeleton className="h-3 w-12 mb-1" />
                <Skeleton className="h-5 w-16" />
              </div>
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-2 md:gap-3">
            {metrics.map((m, i) => (
              <div key={i} className="p-2 md:p-3 rounded-lg bg-muted/40 hover:bg-muted/60 transition-colors">
                <p className="text-[10px] md:text-xs font-medium text-muted-foreground uppercase tracking-wide mb-1 truncate">{m.label}</p>
                <p className={`text-sm md:text-lg font-bold truncate ${m.color || 'text-foreground'}`}>
                  {m.value}
                </p>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );

  const { isSelfBirthday, selfName, otherBirthdayNames } = useBirthdayCheck();

  return (
    <div className="min-h-full flex flex-col animate-fade-in px-1 md:px-0">
      {/* Self birthday wish */}
      {isSelfBirthday && (
        <div className="mb-2">
          <BirthdayBanner names={[selfName]} isSelf />
        </div>
      )}
      {/* Other staff birthdays */}
      {otherBirthdayNames.length > 0 && (
        <div className="mb-2">
          <BirthdayBanner names={otherBirthdayNames} />
        </div>
      )}

      {/* Header with Date Filter and Quick Actions */}
      <div className="flex flex-col gap-1.5 md:gap-2 mb-1.5 md:mb-2">
        {/* Title Row */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
          <div className="shrink-0">
            <h1 className="text-lg sm:text-xl md:text-2xl font-bold tracking-tight">Admin Dashboard</h1>
            <p className="text-[10px] sm:text-xs text-muted-foreground">Overview across all modules</p>
          </div>
          <DashboardDateFilter value={dateRange} onChange={setDateRange} />
        </div>
        
        {/* Quick Actions - Scrollable on mobile */}
        <div className="flex items-center gap-2 overflow-x-auto pb-1 -mx-1 px-1 scrollbar-hide">
          <span className="text-xs text-muted-foreground font-medium whitespace-nowrap hidden sm:inline">Quick:</span>
          <Button 
            variant="outline" 
            size="sm" 
            onClick={(e) => { e.stopPropagation(); navigate('/admin/sales/dashboard'); }}
            className="gap-1 rounded-lg hover:bg-primary hover:text-primary-foreground transition-colors h-8 text-xs whitespace-nowrap shrink-0"
          >
            <TrendingUp className="w-3.5 h-3.5" /> Sales
          </Button>
          <Button 
            variant="outline" 
            size="sm" 
            onClick={(e) => { e.stopPropagation(); navigate('/admin/accounting/transactions'); }}
            className="gap-1 rounded-lg hover:bg-primary hover:text-primary-foreground transition-colors h-8 text-xs whitespace-nowrap shrink-0"
          >
            <FileText className="w-3.5 h-3.5" /> Txns
          </Button>
          <Button 
            variant="outline" 
            size="sm" 
            onClick={(e) => { e.stopPropagation(); navigate('/admin/inventory/movements'); }}
            className="gap-1 rounded-lg hover:bg-primary hover:text-primary-foreground transition-colors h-8 text-xs whitespace-nowrap shrink-0"
          >
            <Package className="w-3.5 h-3.5" /> Stock
          </Button>
          <Button 
            variant="outline" 
            size="sm" 
            onClick={(e) => { e.stopPropagation(); navigate('/admin/marketing/ads'); }}
            className="gap-1 rounded-lg hover:bg-primary hover:text-primary-foreground transition-colors h-8 text-xs whitespace-nowrap shrink-0"
          >
            <DollarSign className="w-3.5 h-3.5" /> Ads
          </Button>
          <Button 
            variant="outline" 
            size="sm" 
            onClick={(e) => { e.stopPropagation(); navigate('/hrm/leave'); }}
            className="gap-1 rounded-lg hover:bg-primary hover:text-primary-foreground transition-colors h-8 text-xs whitespace-nowrap shrink-0"
          >
            <Calendar className="w-3.5 h-3.5" /> Leave
          </Button>
        </div>
      </div>

      {/* Quick Summary Stats Bar - Responsive grid */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-1 md:gap-1.5 mb-1.5 md:mb-2">
        {/* Total Balance */}
        <Card className="bg-gradient-to-br from-green-500/10 to-green-600/5 border-green-200/50 dark:border-green-800/50">
          <CardContent className="p-2 md:p-3">
            <div className="flex items-center gap-2">
              <div className="p-1.5 rounded-lg bg-green-500/20 shrink-0">
                <DollarSign className="w-3.5 h-3.5 md:w-4 md:h-4 text-green-600" />
              </div>
              <div className="min-w-0">
                <p className="text-[9px] md:text-[10px] text-muted-foreground font-medium truncate">Total Balance</p>
                <p className="text-sm md:text-base font-bold text-green-600 truncate">
                  ₹{Math.round(accountingMetricsComputed.totalAvailableBalance).toLocaleString()}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        {/* Ref. P/L - Moved here (was Yesterday P/L position) */}
        <Card className={`bg-gradient-to-br ${refPLData >= 0 ? 'from-purple-500/10 to-purple-600/5 border-purple-200/50 dark:border-purple-800/50' : 'from-red-500/10 to-red-600/5 border-red-200/50 dark:border-red-800/50'}`}>
          <CardContent className="p-2 md:p-3">
            <div className="flex items-center gap-2">
              <div className={`p-1.5 rounded-lg shrink-0 ${refPLData >= 0 ? 'bg-purple-500/20' : 'bg-red-500/20'}`}>
                <TrendingUp className={`w-3.5 h-3.5 md:w-4 md:h-4 ${refPLData >= 0 ? 'text-purple-600' : 'text-red-600'}`} />
              </div>
              <div className="min-w-0">
                <p className="text-[9px] md:text-[10px] text-muted-foreground font-medium truncate">Ref. P/L</p>
                <p className={`text-sm md:text-base font-bold truncate ${refPLData >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                  {refPLLoading ? '...' : `₹${Math.round(refPLData).toLocaleString()}`}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        {/* Low Stock / High Alert Items */}
        <Card className="bg-gradient-to-br from-orange-500/10 to-orange-600/5 border-orange-200/50 dark:border-orange-800/50">
          <CardContent className="p-2 md:p-3">
            <div className="flex items-center gap-2">
              <div className="p-1.5 rounded-lg bg-orange-500/20 shrink-0">
                <AlertTriangle className="w-3.5 h-3.5 md:w-4 md:h-4 text-orange-600" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-[9px] md:text-[10px] text-muted-foreground font-medium truncate">High Alert Stock</p>
                <p className="text-sm md:text-base font-bold text-orange-600">
                  {inventoryMetrics.highAlertCount}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        {/* Pending HRM */}
        <Card className="bg-gradient-to-br from-blue-500/10 to-blue-600/5 border-blue-200/50 dark:border-blue-800/50">
          <CardContent className="p-2 md:p-3">
            <div className="flex items-center gap-2">
              <div className="p-1.5 rounded-lg bg-blue-500/20 shrink-0">
                <Users className="w-3.5 h-3.5 md:w-4 md:h-4 text-blue-600" />
              </div>
              <div className="min-w-0">
                <p className="text-[9px] md:text-[10px] text-muted-foreground font-medium truncate">Pending HRM</p>
                <p className="text-sm md:text-base font-bold text-blue-600">
                  {hrmMetrics.pendingHRM}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        {/* Yesterday P/L */}
        <Card className={`bg-gradient-to-br ${inventoryMetrics.yesterdayProfit >= 0 ? 'from-emerald-500/10 to-emerald-600/5 border-emerald-200/50 dark:border-emerald-800/50' : 'from-red-500/10 to-red-600/5 border-red-200/50 dark:border-red-800/50'}`}>
          <CardContent className="p-2 md:p-3">
            <div className="flex items-center gap-2">
              <div className={`p-1.5 rounded-lg shrink-0 ${inventoryMetrics.yesterdayProfit >= 0 ? 'bg-emerald-500/20' : 'bg-red-500/20'}`}>
                <BarChart3 className={`w-3.5 h-3.5 md:w-4 md:h-4 ${inventoryMetrics.yesterdayProfit >= 0 ? 'text-emerald-600' : 'text-red-600'}`} />
              </div>
              <div className="min-w-0">
                <p className="text-[9px] md:text-[10px] text-muted-foreground font-medium truncate">Yesterday P/L</p>
                <p className={`text-sm md:text-base font-bold truncate ${inventoryMetrics.yesterdayProfit >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>
                  ₹{Math.round(inventoryMetrics.yesterdayProfit).toLocaleString()}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        {/* Pending Tasks - Store-wise */}
        <Card 
          className="bg-gradient-to-br from-amber-500/10 to-amber-600/5 border-amber-200/50 dark:border-amber-800/50 cursor-pointer hover:shadow-md transition-shadow"
          onClick={() => navigate('/hrm/tasks')}
        >
          <CardContent className="p-2 md:p-3">
            <div className="flex items-center gap-2">
              <div className="p-1.5 rounded-lg bg-amber-500/20 shrink-0">
                <CheckSquare className="w-3.5 h-3.5 md:w-4 md:h-4 text-amber-600" />
              </div>
              <div className="min-w-0">
                <p className="text-[9px] md:text-[10px] text-muted-foreground font-medium truncate">Pending Tasks</p>
                <p className="text-sm md:text-base font-bold text-amber-600">
                  {tasksLoading ? '...' : taskStats?.pending || 0}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Module Cards Grid - Responsive, flex-1 to fill remaining space */}
      <div className="flex-1 grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-1 md:gap-1.5 auto-rows-fr">
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
            { label: 'Total Sales', value: `₹${Math.round(salesMetrics.totalSales).toLocaleString()}` },
          ]}
        />

        {/* Task Management Module - 2nd position after Sales */}
        <ModuleCard
          title="Task Management"
          icon={CheckSquare}
          iconBg="bg-gradient-to-br from-amber-500 to-amber-600"
          navigateTo="/hrm/tasks"
          isLoading={tasksLoading}
          metrics={[
            { label: 'Pending', value: taskStats?.pending || 0, color: (taskStats?.pending || 0) > 0 ? 'text-orange-600' : undefined },
            { label: 'Issues', value: taskStats?.issues || 0, color: (taskStats?.issues || 0) > 0 ? 'text-red-600' : undefined },
            { label: 'Replies Pending', value: taskStats?.pendingReplies || 0, color: (taskStats?.pendingReplies || 0) > 0 ? 'text-blue-600' : undefined },
            { label: 'Total Tasks', value: taskStats?.total || 0 },
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
            { label: 'Total Balance', value: `₹${Math.round(accountingMetricsComputed.totalAvailableBalance).toLocaleString()}` },
            { label: 'Daybook', value: `₹${Math.round(accountingMetricsComputed.daybook).toLocaleString()}`, color: accountingMetricsComputed.daybook >= 0 ? 'text-green-600' : 'text-red-600' },
            { label: 'Receivable', value: `₹${Math.round(accountingMetricsComputed.receivables).toLocaleString()}`, color: 'text-blue-600' },
            { label: 'Payable', value: `₹${Math.round(accountingMetricsComputed.payables).toLocaleString()}`, color: 'text-orange-600' },
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
            { label: 'Stock Units', value: Math.round(inventoryMetrics.totalStock).toLocaleString() },
            { label: 'Stock Value', value: `₹${Math.round(inventoryMetrics.totalValue).toLocaleString()}` },
            { label: 'Low Stock', value: inventoryMetrics.lowStock, color: inventoryMetrics.lowStock > 0 ? 'text-orange-600' : undefined },
            { label: "Yesterday P/L", value: `₹${Math.round(inventoryMetrics.yesterdayProfit).toLocaleString()}`, color: inventoryMetrics.yesterdayProfit >= 0 ? 'text-green-600' : 'text-red-600' },
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
            { label: 'Total Ads (USD)', value: `$${Math.round(marketingMetrics.totalRefSpendUSD).toLocaleString()}`, color: 'text-purple-600' },
            { label: 'Confirmed Orders', value: salesMetrics.confirmedOrders },
            { label: 'Delivery Queue', value: `${deliveryMetrics.pendingWork} / ${deliveryMetrics.totalWork}` },
            { label: 'Total Sales', value: `₹${Math.round(salesMetrics.totalSales).toLocaleString()}` },
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
            { label: 'Pending HRM', value: hrmMetrics.pendingHRM, color: hrmMetrics.pendingHRM > 0 ? 'text-orange-600' : undefined },
            { label: 'Present Today', value: hrmMetrics.presentToday, color: 'text-green-600' },
            { label: 'Active', value: `${hrmMetrics.activeEmployees} Staff` },
          ]}
        />
      </div>
    </div>
  );
}
