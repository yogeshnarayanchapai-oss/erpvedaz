import { useState, useMemo, useCallback } from 'react';
import { format, startOfDay, endOfDay, subDays, subMonths, startOfMonth, endOfMonth } from 'date-fns';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { DateRangeFilter, DateRange } from '@/components/ui/DateRangeFilter';
import {
  BarChart, Bar, LineChart, Line, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend
} from 'recharts';
import {
  TrendingUp, DollarSign, ShoppingCart, Package, Users, Percent,
  Target, MapPin, Award, TrendingDown, Clock, AlertCircle, FileDown
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { toast } from 'sonner';
import { TodayQuickStats } from '@/components/dashboard/TodayQuickStats';
import { QuickActionsCard } from '@/components/dashboard/QuickActionsCard';
import { useProducts } from '@/hooks/useProducts';
import { useBranches } from '@/hooks/useBranches';
import { useStaff } from '@/hooks/useStaff';
import {
  useSalesMetrics,
  useOrderChannels,
  useOrderStatusDistribution,
  useTopCities,
  useProductInsights,
  useStaffPerformance,
  useDeliveryInsights,
  useRevenueTrend,
  type AnalyticsFilters,
} from '@/hooks/useAnalytics';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';

const CHART_COLORS = {
  primary: 'hsl(var(--primary))',
  success: 'hsl(var(--success))',
  warning: 'hsl(var(--warning))',
  info: 'hsl(var(--info))',
  destructive: 'hsl(var(--destructive))',
  chart1: 'hsl(var(--chart-1))',
  chart2: 'hsl(var(--chart-2))',
  chart3: 'hsl(var(--chart-3))',
  chart4: 'hsl(var(--chart-4))',
  chart5: 'hsl(var(--chart-5))',
};

const PIE_COLORS = [
  CHART_COLORS.primary,
  CHART_COLORS.success,
  CHART_COLORS.warning,
  CHART_COLORS.info,
  CHART_COLORS.chart3,
  CHART_COLORS.chart4,
  CHART_COLORS.chart5,
];

type QuickRange = 'today' | 'yesterday' | 'last7' | 'last30' | 'custom';

export default function AdminAnalytics() {
  const today = new Date();
  const [quickRange, setQuickRange] = useState<QuickRange>('today');
  const [dateRange, setDateRange] = useState<DateRange>({
    from: startOfDay(today),
    to: endOfDay(today),
  });

  // Filters
  const [branchId, setBranchId] = useState<string>('all');
  const [productId, setProductId] = useState<string>('all');
  const [staffId, setStaffId] = useState<string>('all');
  const [deliveryZone, setDeliveryZone] = useState<'all' | 'INSIDE_VALLEY' | 'OUTSIDE_VALLEY'>('all');
  const [paymentMethod, setPaymentMethod] = useState<'all' | 'COD' | 'ONLINE'>('all');
  const [orderStatus, setOrderStatus] = useState<string>('all');
  const [cityType, setCityType] = useState<'orders' | 'revenue'>('orders');

  const { data: products = [] } = useProducts();
  const { data: branches = [] } = useBranches();
  const { data: staff = [] } = useStaff();

  const filters: AnalyticsFilters = useMemo(() => ({
    dateFrom: format(dateRange.from, 'yyyy-MM-dd'),
    dateTo: format(dateRange.to, 'yyyy-MM-dd'),
    branchId: branchId !== 'all' ? branchId : undefined,
    productId: productId !== 'all' ? productId : undefined,
    staffId: staffId !== 'all' ? staffId : undefined,
    deliveryZone,
    paymentMethod,
    orderStatus: orderStatus !== 'all' ? orderStatus : undefined,
  }), [dateRange, branchId, productId, staffId, deliveryZone, paymentMethod, orderStatus]);

  const { data: salesMetrics, isLoading: loadingSales } = useSalesMetrics(filters);
  const { data: orderChannels } = useOrderChannels(filters);
  const { data: orderStatusData } = useOrderStatusDistribution(filters);
  const { data: topCities } = useTopCities(filters, cityType);
  const { data: productInsights } = useProductInsights(filters);
  const { data: staffPerformance } = useStaffPerformance(filters);
  const { data: deliveryInsights } = useDeliveryInsights(filters);
  const { data: revenueTrend } = useRevenueTrend(filters);

  const handleQuickRange = (range: QuickRange) => {
    setQuickRange(range);
    const today = new Date();
    switch (range) {
      case 'today':
        setDateRange({ from: startOfDay(today), to: endOfDay(today) });
        break;
      case 'yesterday':
        const yesterday = subDays(today, 1);
        setDateRange({ from: startOfDay(yesterday), to: endOfDay(yesterday) });
        break;
      case 'last7':
        setDateRange({ from: startOfDay(subDays(today, 7)), to: endOfDay(today) });
        break;
      case 'last30':
        setDateRange({ from: startOfDay(subDays(today, 30)), to: endOfDay(today) });
        break;
    }
  };

  const clearFilters = () => {
    setBranchId('all');
    setProductId('all');
    setStaffId('all');
    setDeliveryZone('all');
    setPaymentMethod('all');
    setOrderStatus('all');
  };

  const hasFilters = branchId !== 'all' || productId !== 'all' || staffId !== 'all' || 
                     deliveryZone !== 'all' || paymentMethod !== 'all' || orderStatus !== 'all';

  // ---- 3-Month Performance Report PDF Export ----
  const [exporting, setExporting] = useState(false);

  const exportPerformanceReport = useCallback(async () => {
    setExporting(true);
    try {
      const now = new Date();
      const months = [0, 1, 2].map(i => {
        const d = subMonths(now, 2 - i); // oldest first
        return {
          label: format(d, 'MMM yyyy'),
          from: format(startOfMonth(d), 'yyyy-MM-dd'),
          to: format(endOfMonth(d), 'yyyy-MM-dd'),
        };
      });

      // Fetch company info
      const { data: companyInfo } = await supabase.from('company_info').select('*').limit(1).maybeSingle();
      const compName = companyInfo?.company_name || 'Company';

      // Fetch data for each month
      const monthlyData = await Promise.all(months.map(async (m) => {
        // Leads
        const { count: totalLeads } = await supabase
          .from('leads')
          .select('*', { count: 'exact', head: true })
          .gte('date', m.from)
          .lte('date', m.to);

        const { count: confirmedLeads } = await supabase
          .from('leads')
          .select('*', { count: 'exact', head: true })
          .gte('date', m.from)
          .lte('date', m.to)
          .or('status.eq.CONFIRMED,order_id.not.is.null');

        // Orders
        const { data: ordersData } = await supabase
          .from('orders')
          .select('amount, order_status, quantity, product_id')
          .eq('is_deleted', false)
          .gte('order_date', `${m.from}T00:00:00+05:45`)
          .lte('order_date', `${m.to}T23:59:59+05:45`);

        const orders = ordersData || [];
        const totalOrders = orders.length;
        const deliveredOrders = orders.filter(o => o.order_status === 'DELIVERED').length;
        const returnedOrders = orders.filter(o => o.order_status === 'RETURNED' || o.order_status === 'CANCELLED').length;
        const totalSales = orders.filter(o => ['CONFIRMED', 'DISPATCHED', 'DELIVERED', 'PACKED'].includes(o.order_status as string)).reduce((s, o) => s + (o.amount || 0), 0);
        const returnRate = totalOrders > 0 ? ((returnedOrders / totalOrders) * 100) : 0;

        // Ads spend
        const { data: adsData } = await supabase
          .from('ads_spend')
          .select('npr_amount')
          .gte('date', m.from)
          .lte('date', m.to);
        const totalAdsCost = (adsData || []).reduce((s, a) => s + (a.npr_amount || 0), 0);

        // Daily PL for profit
        const { data: plData } = await supabase
          .from('daily_pl')
          .select('actual_profit, total_expense, gross_sales_value')
          .gte('date', m.from)
          .lte('date', m.to);
        const totalProfit = (plData || []).reduce((s, p) => s + (p.actual_profit || 0), 0);
        const totalExpense = (plData || []).reduce((s, p) => s + (p.total_expense || 0), 0);

        return {
          label: m.label,
          totalLeads: totalLeads || 0,
          confirmedLeads: confirmedLeads || 0,
          totalOrders,
          deliveredOrders,
          returnedOrders,
          totalSales,
          returnRate: returnRate.toFixed(1),
          totalAdsCost,
          totalProfit,
          totalExpense,
        };
      }));

      // ---- Generate PDF ----
      const doc = new jsPDF('portrait', 'mm', 'a4');
      const pageWidth = doc.internal.pageSize.getWidth();
      const margin = { left: 14, right: 14 };
      let y = 16;

      // Header
      doc.setFontSize(16);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(30, 41, 59);
      doc.text(compName, pageWidth / 2, y, { align: 'center' });
      y += 8;

      doc.setFontSize(12);
      doc.text('3-Month Performance Report', pageWidth / 2, y, { align: 'center' });
      y += 5;

      doc.setFontSize(9);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(100, 116, 139);
      doc.text(`${months[0].label} — ${months[2].label}  |  Generated: ${format(now, 'MMM dd, yyyy')}`, pageWidth / 2, y, { align: 'center' });
      y += 4;

      doc.setDrawColor(203, 213, 225);
      doc.line(margin.left, y, pageWidth - margin.left, y);
      y += 8;

      const headStyle = { fillColor: [241, 245, 249] as [number, number, number], textColor: [30, 41, 59] as [number, number, number], fontStyle: 'bold' as const, fontSize: 9, cellPadding: 3 };
      const bodyStyle = { fontSize: 9, textColor: [51, 65, 85] as [number, number, number], cellPadding: 3 };

      // Helper: trend arrow
      const trend = (arr: number[]) => {
        if (arr[2] > arr[0]) return '↑ Up';
        if (arr[2] < arr[0]) return '↓ Down';
        return '→ Stable';
      };

      // ---- Leads Summary ----
      doc.setFontSize(11);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(30, 41, 59);
      doc.text('Leads Summary', margin.left, y);
      y += 3;

      autoTable(doc, {
        startY: y, theme: 'grid', headStyles: { ...headStyle }, styles: { ...bodyStyle },
        head: [['Metric', monthlyData[0].label, monthlyData[1].label, monthlyData[2].label, 'Trend']],
        body: [
          ['Total Leads', monthlyData[0].totalLeads.toString(), monthlyData[1].totalLeads.toString(), monthlyData[2].totalLeads.toString(), trend(monthlyData.map(m => m.totalLeads))],
          ['Confirmed', monthlyData[0].confirmedLeads.toString(), monthlyData[1].confirmedLeads.toString(), monthlyData[2].confirmedLeads.toString(), trend(monthlyData.map(m => m.confirmedLeads))],
        ],
        columnStyles: { 0: { fontStyle: 'bold', cellWidth: 35 }, 4: { cellWidth: 22 } },
        didParseCell: (data: any) => {
          if (data.section === 'body' && data.column.index === 4) {
            const t = data.cell.raw as string;
            data.cell.styles.fontStyle = 'bold';
            data.cell.styles.textColor = t.includes('Up') ? [22, 163, 74] : t.includes('Down') ? [220, 38, 38] : [37, 99, 235];
          }
        },
        margin,
      });
      y = (doc as any).lastAutoTable.finalY + 8;

      // ---- Orders & Sales ----
      doc.setFontSize(11);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(30, 41, 59);
      doc.text('Orders & Sales', margin.left, y);
      y += 3;

      autoTable(doc, {
        startY: y, theme: 'grid', headStyles: { ...headStyle }, styles: { ...bodyStyle },
        head: [['Metric', monthlyData[0].label, monthlyData[1].label, monthlyData[2].label, 'Trend']],
        body: [
          ['Total Orders', monthlyData[0].totalOrders.toString(), monthlyData[1].totalOrders.toString(), monthlyData[2].totalOrders.toString(), trend(monthlyData.map(m => m.totalOrders))],
          ['Delivered', monthlyData[0].deliveredOrders.toString(), monthlyData[1].deliveredOrders.toString(), monthlyData[2].deliveredOrders.toString(), trend(monthlyData.map(m => m.deliveredOrders))],
          ['Total Sales (Rs.)', `Rs.${monthlyData[0].totalSales.toLocaleString()}`, `Rs.${monthlyData[1].totalSales.toLocaleString()}`, `Rs.${monthlyData[2].totalSales.toLocaleString()}`, trend(monthlyData.map(m => m.totalSales))],
        ],
        columnStyles: { 0: { fontStyle: 'bold', cellWidth: 35 }, 4: { cellWidth: 22 } },
        didParseCell: (data: any) => {
          if (data.section === 'body' && data.column.index === 4) {
            const t = data.cell.raw as string;
            data.cell.styles.fontStyle = 'bold';
            data.cell.styles.textColor = t.includes('Up') ? [22, 163, 74] : t.includes('Down') ? [220, 38, 38] : [37, 99, 235];
          }
        },
        margin,
      });
      y = (doc as any).lastAutoTable.finalY + 8;

      // ---- Return Rate ----
      doc.setFontSize(11);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(30, 41, 59);
      doc.text('Return Rate (RTO/Cancelled)', margin.left, y);
      y += 3;

      autoTable(doc, {
        startY: y, theme: 'grid', headStyles: { ...headStyle }, styles: { ...bodyStyle },
        head: [['Metric', monthlyData[0].label, monthlyData[1].label, monthlyData[2].label, 'Trend']],
        body: [
          ['Returned Orders', monthlyData[0].returnedOrders.toString(), monthlyData[1].returnedOrders.toString(), monthlyData[2].returnedOrders.toString(), trend(monthlyData.map(m => m.returnedOrders))],
          ['Return Rate %', `${monthlyData[0].returnRate}%`, `${monthlyData[1].returnRate}%`, `${monthlyData[2].returnRate}%`, (() => { const vals = monthlyData.map(m => parseFloat(m.returnRate)); return vals[2] < vals[0] ? '↑ Better' : vals[2] > vals[0] ? '↓ Worse' : '→ Same'; })()],
        ],
        columnStyles: { 0: { fontStyle: 'bold', cellWidth: 35 }, 4: { cellWidth: 22 } },
        didParseCell: (data: any) => {
          if (data.section === 'body' && data.column.index === 4) {
            const t = data.cell.raw as string;
            data.cell.styles.fontStyle = 'bold';
            data.cell.styles.textColor = t.includes('Better') || t.includes('Stable') || t.includes('Same') ? [22, 163, 74] : t.includes('Worse') ? [220, 38, 38] : [37, 99, 235];
          }
        },
        margin,
      });
      y = (doc as any).lastAutoTable.finalY + 8;

      // ---- Ads Cost & Profit ----
      doc.setFontSize(11);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(30, 41, 59);
      doc.text('Ads Cost & Profit', margin.left, y);
      y += 3;

      autoTable(doc, {
        startY: y, theme: 'grid', headStyles: { ...headStyle }, styles: { ...bodyStyle },
        head: [['Metric', monthlyData[0].label, monthlyData[1].label, monthlyData[2].label, 'Trend']],
        body: [
          ['Ads Cost (Rs.)', `Rs.${monthlyData[0].totalAdsCost.toLocaleString()}`, `Rs.${monthlyData[1].totalAdsCost.toLocaleString()}`, `Rs.${monthlyData[2].totalAdsCost.toLocaleString()}`, trend(monthlyData.map(m => m.totalAdsCost))],
          ['Total Expense', `Rs.${monthlyData[0].totalExpense.toLocaleString()}`, `Rs.${monthlyData[1].totalExpense.toLocaleString()}`, `Rs.${monthlyData[2].totalExpense.toLocaleString()}`, trend(monthlyData.map(m => m.totalExpense))],
          ['Net Profit', `Rs.${monthlyData[0].totalProfit.toLocaleString()}`, `Rs.${monthlyData[1].totalProfit.toLocaleString()}`, `Rs.${monthlyData[2].totalProfit.toLocaleString()}`, trend(monthlyData.map(m => m.totalProfit))],
        ],
        columnStyles: { 0: { fontStyle: 'bold', cellWidth: 35 }, 4: { cellWidth: 22 } },
        didParseCell: (data: any) => {
          if (data.section === 'body' && data.column.index === 4) {
            const t = data.cell.raw as string;
            data.cell.styles.fontStyle = 'bold';
            data.cell.styles.textColor = t.includes('Up') ? [22, 163, 74] : t.includes('Down') ? [220, 38, 38] : [37, 99, 235];
          }
          // Color profit values
          if (data.section === 'body' && data.row.index === 2 && data.column.index >= 1 && data.column.index <= 3) {
            const val = monthlyData[data.column.index - 1].totalProfit;
            data.cell.styles.textColor = val >= 0 ? [22, 163, 74] : [220, 38, 38];
            data.cell.styles.fontStyle = 'bold';
          }
        },
        margin,
      });
      y = (doc as any).lastAutoTable.finalY + 10;

      // ---- Quick Summary Line ----
      doc.setFontSize(10);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(30, 41, 59);
      doc.text('Summary Observations', margin.left, y);
      y += 5;

      doc.setFontSize(8.5);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(71, 85, 105);

      const observations: string[] = [];
      const m0 = monthlyData[0], m2 = monthlyData[2];
      if (m2.totalSales > m0.totalSales) observations.push(`• Sales grew from Rs.${m0.totalSales.toLocaleString()} to Rs.${m2.totalSales.toLocaleString()} (+${((m2.totalSales - m0.totalSales) / (m0.totalSales || 1) * 100).toFixed(0)}%).`);
      else if (m2.totalSales < m0.totalSales) observations.push(`• Sales dropped from Rs.${m0.totalSales.toLocaleString()} to Rs.${m2.totalSales.toLocaleString()} (${((m2.totalSales - m0.totalSales) / (m0.totalSales || 1) * 100).toFixed(0)}%).`);
      else observations.push('• Sales remained stable across 3 months.');

      if (parseFloat(m2.returnRate) > parseFloat(m0.returnRate)) observations.push(`• Return rate increased from ${m0.returnRate}% to ${m2.returnRate}%. Needs attention.`);
      else if (parseFloat(m2.returnRate) < parseFloat(m0.returnRate)) observations.push(`• Return rate improved from ${m0.returnRate}% to ${m2.returnRate}%.`);

      if (m2.totalProfit > m0.totalProfit) observations.push(`• Profit trending up: Rs.${m0.totalProfit.toLocaleString()} → Rs.${m2.totalProfit.toLocaleString()}.`);
      else if (m2.totalProfit < m0.totalProfit) observations.push(`• Profit trending down: Rs.${m0.totalProfit.toLocaleString()} → Rs.${m2.totalProfit.toLocaleString()}. Review expenses.`);

      if (m2.totalAdsCost > m0.totalAdsCost * 1.2) observations.push(`• Ads cost increased significantly (+${((m2.totalAdsCost - m0.totalAdsCost) / (m0.totalAdsCost || 1) * 100).toFixed(0)}%). Monitor ROI.`);

      const maxW = pageWidth - margin.left * 2;
      observations.forEach(ob => {
        const lines = doc.splitTextToSize(ob, maxW);
        doc.text(lines, margin.left, y);
        y += lines.length * 4;
      });

      // Footer
      doc.setFontSize(6.5);
      doc.setFont('helvetica', 'italic');
      doc.setTextColor(148, 163, 184);
      const pageHeight = doc.internal.pageSize.getHeight();
      doc.text(`Generated on ${format(now, 'MMM dd, yyyy hh:mm a')} | ${compName}`, pageWidth / 2, pageHeight - 6, { align: 'center' });

      doc.save(`Performance_Report_${months[0].label.replace(' ', '_')}_to_${months[2].label.replace(' ', '_')}.pdf`);
      toast.success('Performance report exported!');
    } catch (err) {
      console.error(err);
      toast.error('Failed to export report');
    } finally {
      setExporting(false);
    }
  }, []);

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-3xl font-bold gradient-text">Analytics</h1>
          <p className="text-muted-foreground mt-1">Comprehensive performance insights and metrics</p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <Button
            variant="outline"
            size="sm"
            onClick={exportPerformanceReport}
            disabled={exporting}
            className="gap-1.5"
          >
            <FileDown className="w-4 h-4" />
            {exporting ? 'Exporting...' : '3-Month Report'}
          </Button>
          <div className="flex gap-1">
            {(['today', 'yesterday', 'last7', 'last30'] as QuickRange[]).map((range) => (
              <Button
                key={range}
                variant={quickRange === range ? 'default' : 'outline'}
                size="sm"
                onClick={() => handleQuickRange(range)}
              >
                {range === 'today' ? 'Today' : range === 'yesterday' ? 'Yesterday' : 
                 range === 'last7' ? 'Last 7 Days' : 'Last 30 Days'}
              </Button>
            ))}
          </div>
          <DateRangeFilter 
            value={dateRange} 
            onChange={(range) => {
              setDateRange(range);
              setQuickRange('custom');
            }} 
          />
        </div>
      </div>

      {/* Today's Quick Stats */}
      <TodayQuickStats />

      {/* Quick Actions */}
      <QuickActionsCard role="ADMIN" />

      {/* Advanced Filters */}
      <Card className="glass-card">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-base">Advanced Filters</CardTitle>
            {hasFilters && (
              <Button variant="ghost" size="sm" onClick={clearFilters}>
                Clear All
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
            <Select value={branchId} onValueChange={setBranchId}>
              <SelectTrigger className="h-9">
                <SelectValue placeholder="Branch" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Branches</SelectItem>
                {branches.map(b => <SelectItem key={b.id} value={b.id}>{b.branch_name}</SelectItem>)}
              </SelectContent>
            </Select>
            <Select value={productId} onValueChange={setProductId}>
              <SelectTrigger className="h-9">
                <SelectValue placeholder="Product" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Products</SelectItem>
                {products.map(p => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}
              </SelectContent>
            </Select>
            <Select value={staffId} onValueChange={setStaffId}>
              <SelectTrigger className="h-9">
                <SelectValue placeholder="Staff" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Staff</SelectItem>
                {staff.map(s => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}
              </SelectContent>
            </Select>
            <Select value={deliveryZone} onValueChange={(v) => setDeliveryZone(v as any)}>
              <SelectTrigger className="h-9">
                <SelectValue placeholder="Zone" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Zones</SelectItem>
                <SelectItem value="INSIDE_VALLEY">Inside Valley</SelectItem>
                <SelectItem value="OUTSIDE_VALLEY">Outside Valley</SelectItem>
              </SelectContent>
            </Select>
            <Select value={paymentMethod} onValueChange={(v) => setPaymentMethod(v as any)}>
              <SelectTrigger className="h-9">
                <SelectValue placeholder="Payment" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Payments</SelectItem>
                <SelectItem value="COD">COD</SelectItem>
                <SelectItem value="ONLINE">Online</SelectItem>
              </SelectContent>
            </Select>
            <Select value={orderStatus} onValueChange={setOrderStatus}>
              <SelectTrigger className="h-9">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Statuses</SelectItem>
                <SelectItem value="CONFIRMED">Confirmed</SelectItem>
                <SelectItem value="DISPATCHED">Dispatched</SelectItem>
                <SelectItem value="DELIVERED">Delivered</SelectItem>
                <SelectItem value="CANCELLED">Cancelled</SelectItem>
                <SelectItem value="RETURNED">RTO</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Sales Overview Metrics */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
        <Card className="stat-card">
          <CardContent className="p-4">
            <div className="flex items-start justify-between">
              <div>
                <p className="stat-label">Total Revenue</p>
                <p className="stat-value text-2xl text-success">₹{salesMetrics?.totalRevenue.toLocaleString() || 0}</p>
              </div>
              <DollarSign className="w-8 h-8 text-success opacity-20" />
            </div>
          </CardContent>
        </Card>
        <Card className="stat-card">
          <CardContent className="p-4">
            <div className="flex items-start justify-between">
              <div>
                <p className="stat-label">Total Orders</p>
                <p className="stat-value text-2xl">{salesMetrics?.totalOrders || 0}</p>
              </div>
              <ShoppingCart className="w-8 h-8 text-primary opacity-20" />
            </div>
          </CardContent>
        </Card>
        <Card className="stat-card">
          <CardContent className="p-4">
            <div className="flex items-start justify-between">
              <div>
                <p className="stat-label">Delivery Charge</p>
                <p className="stat-value text-2xl">₹{salesMetrics?.deliveryChargeCollected.toLocaleString() || 0}</p>
              </div>
              <Package className="w-8 h-8 text-info opacity-20" />
            </div>
          </CardContent>
        </Card>
        <Card className="stat-card">
          <CardContent className="p-4">
            <div className="flex items-start justify-between">
              <div>
                <p className="stat-label">Online Payments</p>
                <p className="stat-value text-2xl">₹{salesMetrics?.onlinePayments.toLocaleString() || 0}</p>
              </div>
              <TrendingUp className="w-8 h-8 text-warning opacity-20" />
            </div>
          </CardContent>
        </Card>
        <Card className="stat-card">
          <CardContent className="p-4">
            <div className="flex items-start justify-between">
              <div>
                <p className="stat-label">Unique Customers</p>
                <p className="stat-value text-2xl">{salesMetrics?.uniqueCustomers || 0}</p>
              </div>
              <Users className="w-8 h-8 text-chart-5 opacity-20" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Second Row Metrics */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        <Card className="stat-card">
          <CardContent className="p-4">
            <p className="stat-label">Avg Order Value</p>
            <p className="stat-value text-xl">₹{salesMetrics?.averageOrderValue.toFixed(0) || 0}</p>
          </CardContent>
        </Card>
        <Card className="stat-card">
          <CardContent className="p-4">
            <p className="stat-label">Gross Margin</p>
            <p className="stat-value text-xl text-success">{salesMetrics?.grossMargin.toFixed(1) || 0}%</p>
          </CardContent>
        </Card>
        <Card className="stat-card">
          <CardContent className="p-4">
            <p className="stat-label">Gross Profit</p>
            <p className="stat-value text-xl text-success">₹{salesMetrics?.grossProfit.toLocaleString() || 0}</p>
          </CardContent>
        </Card>
        <Card className="stat-card">
          <CardContent className="p-4">
            <p className="stat-label">Conversion Rate</p>
            <p className="stat-value text-xl">{salesMetrics?.conversionRate.toFixed(1) || 0}%</p>
          </CardContent>
        </Card>
        <Card className="stat-card">
          <CardContent className="p-4">
            <p className="stat-label">Discount Amount</p>
            <p className="stat-value text-xl">₹{salesMetrics?.discountAmount.toLocaleString() || 0}</p>
          </CardContent>
        </Card>
      </div>

      {/* Revenue & Orders Trend Chart */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="w-5 h-5 text-primary" />
            Revenue & Orders Trend
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={revenueTrend || []}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis 
                  dataKey="date" 
                  stroke="hsl(var(--muted-foreground))"
                  tickFormatter={(date) => format(new Date(date), 'MMM dd')}
                />
                <YAxis yAxisId="left" stroke="hsl(var(--muted-foreground))" />
                <YAxis yAxisId="right" orientation="right" stroke="hsl(var(--muted-foreground))" />
                <Tooltip 
                  contentStyle={{ 
                    backgroundColor: 'hsl(var(--card))',
                    border: '1px solid hsl(var(--border))',
                    borderRadius: '8px',
                  }}
                  labelFormatter={(date) => format(new Date(date), 'MMM dd, yyyy')}
                />
                <Legend />
                <Line 
                  yAxisId="left"
                  type="monotone" 
                  dataKey="revenue" 
                  stroke={CHART_COLORS.success} 
                  strokeWidth={2}
                  name="Revenue (₹)"
                  dot={{ fill: CHART_COLORS.success, r: 4 }}
                />
                <Line 
                  yAxisId="right"
                  type="monotone" 
                  dataKey="orders" 
                  stroke={CHART_COLORS.primary} 
                  strokeWidth={2}
                  name="Orders"
                  dot={{ fill: CHART_COLORS.primary, r: 4 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>

      <Tabs defaultValue="channels" className="space-y-6">
        <TabsList className="grid w-full grid-cols-6">
          <TabsTrigger value="channels">Channels</TabsTrigger>
          <TabsTrigger value="status">Status</TabsTrigger>
          <TabsTrigger value="cities">Top Cities</TabsTrigger>
          <TabsTrigger value="products">Products</TabsTrigger>
          <TabsTrigger value="staff">Staff</TabsTrigger>
          <TabsTrigger value="delivery">Delivery</TabsTrigger>
        </TabsList>

        {/* Order Channels */}
        <TabsContent value="channels" className="space-y-6">
          <div className="grid lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Order Distribution by Channel</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="h-80">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={orderChannels || []}
                        dataKey="count"
                        nameKey="channel"
                        cx="50%"
                        cy="50%"
                        outerRadius={100}
                        label={(entry) => `${entry.channel}: ${entry.count}`}
                      >
                        {(orderChannels || []).map((_, index) => (
                          <Cell key={`cell-${index}`} fill={PIE_COLORS[index % PIE_COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip 
                        contentStyle={{ 
                          backgroundColor: 'hsl(var(--card))',
                          border: '1px solid hsl(var(--border))',
                          borderRadius: '8px',
                        }}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle>Channel Performance</CardTitle>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Channel</TableHead>
                      <TableHead className="text-right">Orders</TableHead>
                      <TableHead className="text-right">Revenue</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {(orderChannels || []).map((channel) => (
                      <TableRow key={channel.channel}>
                        <TableCell className="font-medium">{channel.channel}</TableCell>
                        <TableCell className="text-right">{channel.count}</TableCell>
                        <TableCell className="text-right text-success">₹{channel.revenue.toLocaleString()}</TableCell>
                      </TableRow>
                    ))}
                    {!orderChannels?.length && (
                      <TableRow>
                        <TableCell colSpan={3} className="text-center py-8 text-muted-foreground">No data available</TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Order Status Distribution */}
        <TabsContent value="status" className="space-y-6">
          <div className="grid lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Order Status Breakdown</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="h-80">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={orderStatusData || []}>
                      <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                      <XAxis dataKey="status" stroke="hsl(var(--muted-foreground))" />
                      <YAxis stroke="hsl(var(--muted-foreground))" />
                      <Tooltip 
                        contentStyle={{ 
                          backgroundColor: 'hsl(var(--card))',
                          border: '1px solid hsl(var(--border))',
                          borderRadius: '8px',
                        }}
                      />
                      <Bar dataKey="count" fill={CHART_COLORS.primary} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle>Status Details</CardTitle>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Status</TableHead>
                      <TableHead className="text-right">Count</TableHead>
                      <TableHead className="text-right">Percentage</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {(orderStatusData || []).map((status) => (
                      <TableRow key={status.status}>
                        <TableCell className="font-medium">{status.status}</TableCell>
                        <TableCell className="text-right">{status.count}</TableCell>
                        <TableCell className="text-right">{status.percentage.toFixed(1)}%</TableCell>
                      </TableRow>
                    ))}
                    {!orderStatusData?.length && (
                      <TableRow>
                        <TableCell colSpan={3} className="text-center py-8 text-muted-foreground">No data available</TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Top Cities */}
        <TabsContent value="cities" className="space-y-6">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center gap-2">
                  <MapPin className="w-5 h-5 text-primary" />
                  Top Cities by {cityType === 'orders' ? 'Orders' : 'Revenue'}
                </CardTitle>
                <div className="flex gap-2">
                  <Button 
                    variant={cityType === 'orders' ? 'default' : 'outline'} 
                    size="sm"
                    onClick={() => setCityType('orders')}
                  >
                    Orders
                  </Button>
                  <Button 
                    variant={cityType === 'revenue' ? 'default' : 'outline'} 
                    size="sm"
                    onClick={() => setCityType('revenue')}
                  >
                    Revenue
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="h-96">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={topCities || []} layout="vertical">
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                    <XAxis type="number" stroke="hsl(var(--muted-foreground))" />
                    <YAxis dataKey="city" type="category" width={120} stroke="hsl(var(--muted-foreground))" />
                    <Tooltip 
                      contentStyle={{ 
                        backgroundColor: 'hsl(var(--card))',
                        border: '1px solid hsl(var(--border))',
                        borderRadius: '8px',
                      }}
                    />
                    <Bar dataKey={cityType} fill={cityType === 'orders' ? CHART_COLORS.primary : CHART_COLORS.success} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Product Insights */}
        <TabsContent value="products" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Package className="w-5 h-5 text-primary" />
                Product Performance
              </CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Product</TableHead>
                    <TableHead className="text-right">Qty Sold</TableHead>
                    <TableHead className="text-right">Revenue</TableHead>
                    <TableHead className="text-right">Profit</TableHead>
                    <TableHead className="text-right">Margin %</TableHead>
                    <TableHead className="text-right">Contribution %</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {(productInsights || []).map((product) => (
                    <TableRow key={product.id}>
                      <TableCell className="font-medium">{product.name}</TableCell>
                      <TableCell className="text-right">{product.quantitySold}</TableCell>
                      <TableCell className="text-right text-success">₹{product.revenue.toLocaleString()}</TableCell>
                      <TableCell className="text-right text-success">₹{product.profit.toLocaleString()}</TableCell>
                      <TableCell className="text-right">{product.profitMargin.toFixed(1)}%</TableCell>
                      <TableCell className="text-right">{product.revenueContribution.toFixed(1)}%</TableCell>
                    </TableRow>
                  ))}
                  {!productInsights?.length && (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">No data available</TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Staff Performance */}
        <TabsContent value="staff" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Award className="w-5 h-5 text-primary" />
                Staff Performance Leaderboard
              </CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Staff</TableHead>
                    <TableHead className="text-right">Leads</TableHead>
                    <TableHead className="text-right">Followed</TableHead>
                    <TableHead className="text-right">Orders</TableHead>
                    <TableHead className="text-right">Revenue</TableHead>
                    <TableHead className="text-right">Conversion %</TableHead>
                    <TableHead className="text-right">Inside</TableHead>
                    <TableHead className="text-right">Outside</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {(staffPerformance || []).map((staff, idx) => (
                    <TableRow key={staff.id}>
                      <TableCell className="font-medium">
                        {idx < 3 && <Award className="w-4 h-4 inline mr-1 text-warning" />}
                        {staff.name}
                      </TableCell>
                      <TableCell className="text-right">{staff.leadsAssigned}</TableCell>
                      <TableCell className="text-right">{staff.leadsFollowed}</TableCell>
                      <TableCell className="text-right">{staff.ordersConfirmed}</TableCell>
                      <TableCell className="text-right text-success">₹{staff.revenue.toLocaleString()}</TableCell>
                      <TableCell className="text-right">{staff.conversionRate.toFixed(1)}%</TableCell>
                      <TableCell className="text-right">{staff.insideValley}</TableCell>
                      <TableCell className="text-right">{staff.outsideValley}</TableCell>
                    </TableRow>
                  ))}
                  {!staffPerformance?.length && (
                    <TableRow>
                      <TableCell colSpan={8} className="text-center py-8 text-muted-foreground">No data available</TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Delivery Insights */}
        <TabsContent value="delivery" className="space-y-6">
          <div className="grid md:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Target className="w-5 h-5 text-primary" />
                  Inside Valley
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex justify-between items-center">
                  <span className="text-muted-foreground">Total Orders</span>
                  <span className="font-semibold">{deliveryInsights?.insideValley.total || 0}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-muted-foreground">Delivered</span>
                  <span className="font-semibold text-success">{deliveryInsights?.insideValley.delivered || 0}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-muted-foreground">Delivery Rate</span>
                  <span className="font-semibold text-success">{deliveryInsights?.insideValley.rate.toFixed(1) || 0}%</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-muted-foreground">RTO</span>
                  <span className="font-semibold text-destructive">{deliveryInsights?.insideValley.rto || 0}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-muted-foreground">RTO Rate</span>
                  <span className="font-semibold text-destructive">{deliveryInsights?.insideValley.rtoRate.toFixed(1) || 0}%</span>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Target className="w-5 h-5 text-primary" />
                  Outside Valley
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex justify-between items-center">
                  <span className="text-muted-foreground">Total Orders</span>
                  <span className="font-semibold">{deliveryInsights?.outsideValley.total || 0}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-muted-foreground">Delivered</span>
                  <span className="font-semibold text-success">{deliveryInsights?.outsideValley.delivered || 0}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-muted-foreground">Delivery Rate</span>
                  <span className="font-semibold text-success">{deliveryInsights?.outsideValley.rate.toFixed(1) || 0}%</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-muted-foreground">RTO</span>
                  <span className="font-semibold text-destructive">{deliveryInsights?.outsideValley.rto || 0}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-muted-foreground">RTO Rate</span>
                  <span className="font-semibold text-destructive">{deliveryInsights?.outsideValley.rtoRate.toFixed(1) || 0}%</span>
                </div>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Clock className="w-5 h-5 text-primary" />
                Delivery Metrics
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex justify-between items-center p-4 bg-muted/50 rounded-lg">
                <span className="text-muted-foreground">Average Delivery Time</span>
                <span className="font-semibold text-lg">{deliveryInsights?.avgDeliveryTime.toFixed(1) || 0} days</span>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <AlertCircle className="w-5 h-5 text-destructive" />
                Top RTO Cities
              </CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>City</TableHead>
                    <TableHead className="text-right">RTO Count</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {(deliveryInsights?.topRTOCities || []).map((city) => (
                    <TableRow key={city.city}>
                      <TableCell className="font-medium">{city.city}</TableCell>
                      <TableCell className="text-right text-destructive">{city.count}</TableCell>
                    </TableRow>
                  ))}
                  {!deliveryInsights?.topRTOCities?.length && (
                    <TableRow>
                      <TableCell colSpan={2} className="text-center py-8 text-muted-foreground">No RTO data available</TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
