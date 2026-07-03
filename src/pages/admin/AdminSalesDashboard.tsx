import { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useCurrentStore } from '@/contexts/CurrentStoreContext';
import { format, startOfDay, endOfDay } from 'date-fns';

import { useNavigate } from 'react-router-dom';
import { useOrders } from '@/hooks/useOrders';
import { useProducts } from '@/hooks/useProducts';
import { useStaff } from '@/hooks/useStaff';
import { useStaffLeaderboard } from '@/hooks/useStaffLeaderboard';
import { useLeadDashboardStats, useOrderDashboardStats, getNepalDate } from '@/hooks/useDashboardStats';
import { useProductRevenueTargets } from '@/hooks/useProductRevenueTargets';
import { 
  useMonthlySalesChart, 
  useMonthlyPLData,
  useWeeklySales 
} from '@/hooks/useSalesAnalytics';
import {
  useSalesByDateRange,
  useDailyDeliveryByDateRange,
  useStaffPerformanceByDateRange,
  useProductDaybookByDateRange,
  DateRange,
} from '@/hooks/useSalesByDateRange';
import { StatCard } from '@/components/dashboard/StatCard';
import { DashboardDateFilter } from '@/components/dashboard/DashboardDateFilter';
import { ProductTargetProgress } from '@/components/dashboard/ProductTargetProgress';
import { StaffLeaderboard } from '@/components/dashboard/StaffLeaderboard';
import { GaaubesiStatsCard } from '@/components/dashboard/GaaubesiStatsCard';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend,
  LineChart, Line, ComposedChart
} from 'recharts';
import { 
  CheckCircle, PhoneOff, Clock, XCircle, ArrowUpRight, Package, Users, TrendingUp, 
  MapPin, Truck, DollarSign, BarChart3, Calendar, Download, FileSpreadsheet, ShoppingCart, AlertTriangle
} from 'lucide-react';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import * as XLSX from 'xlsx';

export default function AdminDashboard() {
  const navigate = useNavigate();
  const currentYear = new Date().getFullYear();
  
  // Date range state - defaults to today using Nepal timezone
  const [dateRange, setDateRange] = useState<DateRange>({
    from: startOfDay(new Date()),
    to: endOfDay(new Date()),
  });

  const [selectedYear, setSelectedYear] = useState(currentYear);
  const [exportingReport, setExportingReport] = useState(false);

  // Format dates for queries - use Nepal-aware date formatting
  const dateFrom = format(dateRange.from, 'yyyy-MM-dd');
  const dateTo = format(dateRange.to, 'yyyy-MM-dd');

  // Use dashboard-specific hooks that include ALL leads (including confirmed)
  const { data: leadStats } = useLeadDashboardStats(dateFrom, dateTo);
  const { data: orderStats } = useOrderDashboardStats(dateFrom, dateTo);

  // Yesterday same-time-of-day comparison (only when viewing today)
  const { currentStore } = useCurrentStore();
  const storeId = currentStore?.id;
  const todayStr = getNepalDate();
  const isTodayView = dateFrom === todayStr && dateTo === todayStr;

  const { data: ySameTime } = useQuery({
    queryKey: ['yday-same-time-stats', storeId, todayStr],
    queryFn: async () => {
      const now = new Date();
      const yEnd = new Date(now.getTime() - 24 * 60 * 60 * 1000);
      const yStart = new Date(yEnd);
      // Nepal day start for yesterday
      const yDateStr = yEnd.toLocaleDateString('en-CA', { timeZone: 'Asia/Kathmandu' });
      const yStartISO = `${yDateStr}T00:00:00+05:45`;
      const yEndISO = yEnd.toISOString();

      let leadsQ = supabase
        .from('leads')
        .select('id, status, order_id, assigned_to_user_id, created_at, store_id')
        .gte('created_at', yStartISO)
        .lte('created_at', yEndISO);
      if (storeId) leadsQ = leadsQ.eq('store_id', storeId);

      let ordersQ = supabase
        .from('orders')
        .select('id, order_status, delivery_location, amount, is_deleted, order_date, store_id')
        .eq('is_deleted', false)
        .gte('order_date', yStartISO)
        .lte('order_date', yEndISO);
      if (storeId) ordersQ = ordersQ.eq('store_id', storeId);

      const [{ data: leads = [] }, { data: orders = [] }] = await Promise.all([leadsQ, ordersQ]);
      const validStatuses = ['CONFIRMED', 'DISPATCHED', 'DELIVERED', 'PACKED'];
      const salesOrders = (orders || []).filter((o: any) => validStatuses.includes(o.order_status || ''));
      return {
        totalLeads: leads?.length || 0,
        confirmed: (orders || []).filter((o: any) => o.order_status === 'CONFIRMED').length,
        cnr: (leads || []).filter((l: any) => l.status === 'CALL_NOT_RECEIVED').length,
        followUp: (leads || []).filter((l: any) => l.status === 'FOLLOW_UP').length,
        cancelled: (leads || []).filter((l: any) => l.status === 'CANCELLED').length,
        redirect: (orders || []).filter((o: any) => o.order_status === 'REDIRECT').length,
        insideValley: salesOrders.filter((o: any) => o.delivery_location === 'INSIDE_VALLEY').reduce((s: number, o: any) => s + (o.amount || 0), 0),
        outsideValley: salesOrders.filter((o: any) => o.delivery_location === 'OUTSIDE_VALLEY').reduce((s: number, o: any) => s + (o.amount || 0), 0),
        totalSales: salesOrders.reduce((s: number, o: any) => s + (o.amount || 0), 0),
      };
    },
    enabled: !!storeId && isTodayView,
    staleTime: 60_000,
  });

  const cmp = (today: number, yday: number) => {
    if (!isTodayView) return null;
    if (!yday && !today) return null;
    if (!yday) return { pct: 100, positive: today > 0 };
    const pct = Math.round(((today - yday) / yday) * 100);
    return { pct, positive: pct >= 0 };
  };

  
  // Other data fetching
  const { data: products = [] } = useProducts();
  const { data: staff = [] } = useStaff();


  // Sales analytics with date range
  const { data: salesByRange } = useSalesByDateRange(dateRange);
  const { data: dailyDelivery = [] } = useDailyDeliveryByDateRange(dateRange);
  const { data: monthlySales = [] } = useMonthlySalesChart(selectedYear);
  const { data: monthlyPL = [] } = useMonthlyPLData(selectedYear);
  const { data: weeklySales } = useWeeklySales();

  // Staff performance with date range
  const staffList = useMemo(() => staff.map(s => ({ id: s.id, name: s.name })), [staff]);
  const { data: staffPerformance = [] } = useStaffPerformanceByDateRange(dateRange, staffList);

  // Staff leaderboard
  const { data: leaderboardData = [], isLoading: leaderboardLoading } = useStaffLeaderboard(dateRange);

  // Product daybook with date range
  const productList = useMemo(() => products.map(p => ({
    id: p.id,
    name: p.name,
    target_per_day: p.target_per_day,
    cost_price: p.cost_price,
    sell_price: p.sell_price,
  })), [products]);
  const { data: productDaybook = [] } = useProductDaybookByDateRange(dateRange, productList);
  
  // Fetch revenue-based targets from ads spend
  const { data: productRevenueTargets = [] } = useProductRevenueTargets(dateRange);

  // Sort product daybook by orders (sales) descending
  const sortedProductDaybook = useMemo(() => {
    return [...productDaybook].sort((a, b) => b.sales - a.sales);
  }, [productDaybook]);

  // Default lead stats if not loaded yet
  const stats = leadStats || {
    total: 0,
    confirmed: 0,
    callNotReceived: 0,
    followUp: 0,
    cancelled: 0,
    redirect: 0,
    pendingTransfer: 0,
    newLeads: 0,
    assigned: 0,
  };

  // Default order stats
  const orders = orderStats || {
    total: 0,
    confirmed: 0,
    dispatched: 0,
    delivered: 0,
    returned: 0,
    cancelled: 0,
    redirect: 0,
    insideValley: 0,
    outsideValley: 0,
    totalSales: 0,
  };

  const yearOptions = Array.from({ length: 5 }, (_, i) => currentYear - i);

  const plTotals = useMemo(() => {
    return monthlyPL.reduce((acc, row) => ({
      productSold: acc.productSold + row.productSold,
      adsSpend: acc.adsSpend + row.adsSpend,
      officeCost: acc.officeCost + row.officeCost,
      pl: acc.pl + row.pl,
    }), { productSold: 0, adsSpend: 0, officeCost: 0, pl: 0 });
  }, [monthlyPL]);

  const exportPLToPDF = () => {
    const doc = new jsPDF('landscape');
    doc.setFontSize(18);
    doc.text(`Monthly P/L Report - ${selectedYear}`, 14, 22);
    
    const tableData = monthlyPL.map(row => [
      row.month,
      `₹${row.productSold.toLocaleString()}`,
      `₹${row.adsSpend.toLocaleString()}`,
      `₹${row.officeCost.toLocaleString()}`,
      `₹${row.pl.toLocaleString()}`
    ]);
    
    tableData.push([
      'Total',
      `₹${plTotals.productSold.toLocaleString()}`,
      `₹${plTotals.adsSpend.toLocaleString()}`,
      `₹${plTotals.officeCost.toLocaleString()}`,
      `₹${plTotals.pl.toLocaleString()}`
    ]);

    autoTable(doc, {
      head: [['Month', 'Sales', 'Ads (NPR)', 'Office', 'P/L']],
      body: tableData,
      startY: 30,
      theme: 'striped',
      headStyles: { fillColor: [59, 130, 246] },
    });

    doc.save(`PL_Report_${selectedYear}.pdf`);
  };

  const exportPLToExcel = () => {
    const data = monthlyPL.map(row => ({
      Month: row.month,
      'Sales (NPR)': row.productSold,
      'Ads Spend (NPR)': row.adsSpend,
      'Office Cost (NPR)': row.officeCost,
      'P/L (NPR)': row.pl
    }));

    data.push({
      Month: 'Total',
      'Sales (NPR)': plTotals.productSold,
      'Ads Spend (NPR)': plTotals.adsSpend,
      'Office Cost (NPR)': plTotals.officeCost,
      'P/L (NPR)': plTotals.pl
    });

    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'P&L Report');
    XLSX.writeFile(wb, `PL_Report_${selectedYear}.xlsx`);
  };

  // Export Sales Report PDF
  const exportSalesReport = () => {
    setExportingReport(true);
    try {
      const doc = new jsPDF();
      const periodLabel = getPeriodLabel();
      const pageWidth = doc.internal.pageSize.width;

      // Title
      doc.setFontSize(18);
      doc.setFont('helvetica', 'bold');
      doc.text('Sales Performance Report', 14, 20);
      
      doc.setFontSize(10);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(100);
      doc.text(`Period: ${periodLabel}`, 14, 27);
      doc.text(`Generated: ${format(new Date(), 'dd MMM yyyy, HH:mm')}`, 14, 32);
      doc.setTextColor(0);

      // ── Lead & Order Summary ──
      doc.setFontSize(13);
      doc.setFont('helvetica', 'bold');
      doc.text('Lead & Order Summary', 14, 42);

      const confirmRate = stats.total > 0 ? ((orders.confirmed / stats.total) * 100).toFixed(1) : '0';
      const returnRate = orders.total > 0 ? ((orders.returned / orders.total) * 100).toFixed(1) : '0';

      autoTable(doc, {
        startY: 46,
        head: [['Metric', 'Value']],
        body: [
          ['Total Leads', String(stats.total)],
          ['Confirmed Orders', String(orders.confirmed)],
          ['Confirmation Rate', `${confirmRate}%`],
          ['Total Orders', String(orders.total)],
          ['Dispatched', String(orders.dispatched)],
          ['Delivered', String(orders.delivered)],
          ['Returned', String(orders.returned)],
          ['Return Rate', `${returnRate}%`],
          ['Cancelled', String(orders.cancelled)],
          ['Redirect', String(orders.redirect)],
        ],
        styles: { fontSize: 9 },
        headStyles: { fillColor: [59, 130, 246] },
        columnStyles: {
          0: { fontStyle: 'bold', cellWidth: 60 },
        },
        didParseCell: (data: any) => {
          // Bold highlight for Total Orders row
          if (data.section === 'body' && (data.row.index === 3)) {
            data.cell.styles.fontStyle = 'bold';
            data.cell.styles.fillColor = [235, 245, 255];
          }
        },
      });

      // ── Sales by Location ──
      let y = (doc as any).lastAutoTable.finalY + 10;
      doc.setFontSize(13);
      doc.setFont('helvetica', 'bold');
      doc.text('Sales Summary (VD / OVD)', 14, y);

      const totalSales = salesByRange?.total || 0;
      const vdSales = salesByRange?.insideValley || 0;
      const ovdSales = salesByRange?.outsideValley || 0;

      autoTable(doc, {
        startY: y + 4,
        head: [['Location', 'Sales (NPR)']],
        body: [
          ['Inside Valley (VD)', `Rs ${vdSales.toLocaleString()}`],
          ['Outside Valley (OVD)', `Rs ${ovdSales.toLocaleString()}`],
          ['TOTAL SALES', `Rs ${totalSales.toLocaleString()}`],
        ],
        styles: { fontSize: 9 },
        headStyles: { fillColor: [59, 130, 246] },
        didParseCell: (data: any) => {
          // Bold highlight Total Sales row
          if (data.section === 'body' && data.row.index === 2) {
            data.cell.styles.fontStyle = 'bold';
            data.cell.styles.fontSize = 11;
            data.cell.styles.fillColor = [235, 245, 255];
          }
        },
      });

      // ── Product Target Progress ──
      y = (doc as any).lastAutoTable.finalY + 10;
      doc.setFontSize(13);
      doc.setFont('helvetica', 'bold');
      doc.text('Product Target Progress', 14, y);

      const targetRows = productRevenueTargets.map((p: any) => {
        const progress = p.target > 0 ? ((p.actual / p.target) * 100).toFixed(0) : '-';
        const met = p.target > 0 && p.actual >= p.target;
        return [
          p.name,
          `Rs ${(p.target || 0).toLocaleString()}`,
          `Rs ${(p.actual || 0).toLocaleString()}`,
          `${progress}%`,
          met ? '✅ YES' : '❌ NO',
        ];
      });

      if (targetRows.length > 0) {
        autoTable(doc, {
          startY: y + 4,
          head: [['Product', 'Target (NPR)', 'Actual (NPR)', 'Progress', 'Target Met?']],
          body: targetRows,
          styles: { fontSize: 8 },
          headStyles: { fillColor: [59, 130, 246] },
          columnStyles: {
            4: { fontStyle: 'bold' },
          },
          didParseCell: (data: any) => {
            if (data.section === 'body' && data.column.index === 4) {
              const val = data.cell.raw as string;
              if (val.includes('YES')) {
                data.cell.styles.textColor = [22, 163, 74];
              } else {
                data.cell.styles.textColor = [220, 38, 38];
              }
            }
          },
        });
      }

      // ── Product Daybook (Ref Profit) ──
      const activeProducts = sortedProductDaybook.filter(item => item.sales > 0);
      if (activeProducts.length > 0) {
        y = (doc as any).lastAutoTable?.finalY + 10 || y + 10;
        
        // Check if we need a new page
        if (y > 240) {
          doc.addPage();
          y = 20;
        }

        doc.setFontSize(13);
        doc.setFont('helvetica', 'bold');
        doc.text('Product Daybook & Profit', 14, y);

        const daybookRows = activeProducts.map(item => [
          item.name,
          String(item.sales),
          String(item.ovdOrders || 0),
          String(item.vdOrders || 0),
          `Rs ${(item.revenue || 0).toLocaleString()}`,
          `Rs ${item.pl.toLocaleString()}`,
        ]);

        const totalRevenue = activeProducts.reduce((s, i) => s + (i.revenue || 0), 0);
        const totalPL = activeProducts.reduce((s, i) => s + i.pl, 0);

        daybookRows.push([
          'TOTAL',
          String(activeProducts.reduce((s, i) => s + i.sales, 0)),
          String(activeProducts.reduce((s, i) => s + (i.ovdOrders || 0), 0)),
          String(activeProducts.reduce((s, i) => s + (i.vdOrders || 0), 0)),
          `Rs ${totalRevenue.toLocaleString()}`,
          `Rs ${totalPL.toLocaleString()}`,
        ]);

        autoTable(doc, {
          startY: y + 4,
          head: [['Product', 'Orders', 'OVD', 'VD', 'Revenue', 'P/L']],
          body: daybookRows,
          styles: { fontSize: 8 },
          headStyles: { fillColor: [59, 130, 246] },
          didParseCell: (data: any) => {
            // Bold total row
            if (data.section === 'body' && data.row.index === daybookRows.length - 1) {
              data.cell.styles.fontStyle = 'bold';
              data.cell.styles.fillColor = [235, 245, 255];
            }
            // Color P/L column
            if (data.section === 'body' && data.column.index === 5) {
              const raw = String(data.cell.raw).replace(/[^0-9-]/g, '');
              if (parseInt(raw) < 0) {
                data.cell.styles.textColor = [220, 38, 38];
              } else {
                data.cell.styles.textColor = [22, 163, 74];
              }
            }
          },
        });
      }

      // ── Footer ──
      const pageCount = doc.getNumberOfPages();
      for (let i = 1; i <= pageCount; i++) {
        doc.setPage(i);
        doc.setFontSize(8);
        doc.setTextColor(150);
        doc.text(
          `Generated by Vakari Vision | Page ${i} of ${pageCount}`,
          14,
          doc.internal.pageSize.height - 10
        );
      }

      doc.save(`Sales_Report_${format(dateRange.from, 'yyyy-MM-dd')}_to_${format(dateRange.to, 'yyyy-MM-dd')}.pdf`);
    } finally {
      setExportingReport(false);
    }
  };

  // Generate period label for display
  const getPeriodLabel = () => {
    const fromStr = format(dateRange.from, 'MMM d');
    const toStr = format(dateRange.to, 'MMM d, yyyy');
    const isSameDay = format(dateRange.from, 'yyyy-MM-dd') === format(dateRange.to, 'yyyy-MM-dd');
    return isSameDay ? format(dateRange.from, 'MMM d, yyyy') : `${fromStr} – ${toStr}`;
  };

  // Check if today is selected
  const today = new Date().toISOString().split('T')[0];
  const isToday = format(dateRange.from, 'yyyy-MM-dd') === today && format(dateRange.to, 'yyyy-MM-dd') === today;

  // Clickable card handlers - navigate to filtered pages
  const handleStatCardClick = (type: string) => {
    const params = new URLSearchParams();
    params.set('from', dateFrom);
    params.set('to', dateTo);
    
    switch (type) {
      case 'total':
        navigate(`/admin/leads?${params.toString()}`);
        break;
      case 'confirmed':
        params.set('status', 'CONFIRMED');
        navigate(`/admin/orders?${params.toString()}`);
        break;
      case 'cnr':
        params.set('status', 'CALL_NOT_RECEIVED');
        navigate(`/admin/leads?${params.toString()}`);
        break;
      case 'followup':
        params.set('status', 'FOLLOW_UP');
        navigate(`/admin/leads?${params.toString()}`);
        break;
      case 'cancelled':
        params.set('status', 'CANCELLED');
        navigate(`/admin/leads?${params.toString()}`);
        break;
      case 'redirect':
        params.set('status', 'REDIRECT');
        navigate(`/admin/leads?${params.toString()}`);
        break;
      case 'pending_transfer':
        // Navigate to leads page - pending transfers are leads not yet transferred
        navigate(`/admin/leads?${params.toString()}`);
        break;
    }
  };

  return (
    <div className="space-y-4 md:space-y-6 animate-fade-in">
      {/* Header with Date Filter - Mobile Optimized */}
      <div className="flex flex-col gap-3 md:gap-4">
        <div className="flex items-start justify-between gap-2">
          <div>
            <h1 className="text-xl md:text-2xl font-bold">Sales Dashboard</h1>
            <p className="text-xs md:text-sm text-muted-foreground">Sales performance and analytics</p>
          </div>
          <Button variant="outline" size="sm" onClick={exportSalesReport} disabled={exportingReport}>
            <Download className="w-4 h-4 mr-1" />
            {exportingReport ? 'Generating...' : 'Sales Report'}
          </Button>
        </div>
        <DashboardDateFilter value={dateRange} onChange={setDateRange} />
      </div>

      {/* Lead Stats for Selected Period - Mobile: 2 cols, Tablet: 4 cols, Desktop: 5 cols */}
      <div className="grid grid-cols-2 sm:grid-cols-4 xl:grid-cols-5 gap-2 md:gap-4">
        <StatCard 
          title="Total Leads" 
          value={stats.total} 
          description={`Remain Call: ${stats.assigned || 0}`}
          icon={<Users className="w-4 h-4 md:w-5 md:h-5" />} 
          variant="primary" 
          onClick={() => handleStatCardClick('total')}
          className="cursor-pointer hover:scale-[1.02] transition-transform [&_p.text-\\[10px\\]]:text-right [&_p.text-\\[10px\\]]:mt-2"
          compare={cmp(stats.total, ySameTime?.totalLeads || 0)}
        />
        <StatCard 
          title="Pending Transfer" 
          value={stats.pendingTransfer} 
          description="Not yet transferred"
          icon={<AlertTriangle className="w-4 h-4 md:w-5 md:h-5" />} 
          variant="warning" 
          onClick={() => handleStatCardClick('pending_transfer')}
          className="cursor-pointer hover:scale-[1.02] transition-transform"
        />
        <StatCard 
          title="Confirmed / Total Orders" 
          value={`${orders.confirmed}/${orders.total}`} 
          icon={<CheckCircle className="w-4 h-4 md:w-5 md:h-5" />} 
          variant="success" 
          onClick={() => navigate(`/admin/orders?from=${dateFrom}&to=${dateTo}`)}
          className="cursor-pointer hover:scale-[1.02] transition-transform"
          compare={cmp(orders.confirmed, ySameTime?.confirmed || 0)}
        />
        <StatCard 
          title="CNR" 
          value={stats.callNotReceived} 
          icon={<PhoneOff className="w-4 h-4 md:w-5 md:h-5" />} 
          variant="warning" 
          onClick={() => handleStatCardClick('cnr')}
          className="cursor-pointer hover:scale-[1.02] transition-transform"
          compare={cmp(stats.callNotReceived, ySameTime?.cnr || 0)}
        />
        <StatCard 
          title="Follow Up" 
          value={stats.followUp} 
          icon={<Clock className="w-4 h-4 md:w-5 md:h-5" />} 
          variant="info" 
          onClick={() => handleStatCardClick('followup')}
          className="cursor-pointer hover:scale-[1.02] transition-transform"
          compare={cmp(stats.followUp, ySameTime?.followUp || 0)}
        />
        <StatCard 
          title="Cancelled" 
          value={stats.cancelled} 
          icon={<XCircle className="w-4 h-4 md:w-5 md:h-5" />} 
          variant="destructive" 
          onClick={() => handleStatCardClick('cancelled')}
          className="cursor-pointer hover:scale-[1.02] transition-transform"
          compare={cmp(stats.cancelled, ySameTime?.cancelled || 0)}
        />
        <StatCard 
          title="Redirect" 
          value={orders.redirect} 
          icon={<ArrowUpRight className="w-4 h-4 md:w-5 md:h-5" />} 
          variant="default" 
          onClick={() => navigate(`/admin/orders?status=REDIRECT&from=${dateFrom}&to=${dateTo}`)}
          className="cursor-pointer hover:scale-[1.02] transition-transform"
          compare={cmp(orders.redirect, ySameTime?.redirect || 0)}
        />
        <StatCard 
          title="Cancelled Orders" 
          value={orders.cancelled} 
          icon={<XCircle className="w-4 h-4 md:w-5 md:h-5" />} 
          variant="destructive" 
        />
        <StatCard 
          title="Returned Orders" 
          value={orders.returned} 
          icon={<ArrowUpRight className="w-4 h-4 md:w-5 md:h-5" />} 
          variant="default" 
        />
      </div>

      {/* Sales by Location - Mobile: stacked, Desktop: row */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 md:gap-4">
        <StatCard
          title="Inside Valley"
          value={`₹${(salesByRange?.insideValley || 0).toLocaleString()}`}
          description={getPeriodLabel()}
          icon={<MapPin className="w-4 h-4 md:w-5 md:h-5" />}
          variant="success"
          compare={cmp(salesByRange?.insideValley || 0, ySameTime?.insideValley || 0)}
        />
        <StatCard
          title="Outside Valley"
          value={`₹${(salesByRange?.outsideValley || 0).toLocaleString()}`}
          description={getPeriodLabel()}
          icon={<Truck className="w-4 h-4 md:w-5 md:h-5" />}
          variant="info"
          compare={cmp(salesByRange?.outsideValley || 0, ySameTime?.outsideValley || 0)}
        />
        <StatCard
          title="Total Sales"
          value={`₹${(salesByRange?.total || 0).toLocaleString()}`}
          description={getPeriodLabel()}
          icon={<DollarSign className="w-4 h-4 md:w-5 md:h-5" />}
          variant="primary"
          compare={cmp(salesByRange?.total || 0, ySameTime?.totalSales || 0)}

        />
      </div>

      {/* Product Target Progress & Staff Leaderboard - Stack on mobile */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 md:gap-6">
        <ProductTargetProgress 
          products={productRevenueTargets} 
          periodLabel={getPeriodLabel()} 
          isToday={isToday} 
        />
        <StaffLeaderboard 
          data={leaderboardData} 
          periodLabel={getPeriodLabel()}
          isLoading={leaderboardLoading}
        />
      </div>

      {/* Gaaubesi Logistics Overview */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 md:gap-6">
        <GaaubesiStatsCard dateFrom={dateFrom} dateTo={dateTo} />
      </div>

      {/* Daily Orders Chart + Product Daybook Row - Stack on mobile */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 md:gap-6">
        {/* Daily Inside/Outside Chart */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2">
              <BarChart3 className="w-5 h-5 text-primary" />
              Daily Orders ({getPeriodLabel()})
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-64">
              {dailyDelivery.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <ComposedChart data={dailyDelivery}>
                    <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                    <XAxis dataKey="day" className="text-xs" />
                    <YAxis className="text-xs" />
                    <Tooltip 
                      contentStyle={{ 
                        backgroundColor: 'hsl(var(--card))', 
                        border: '1px solid hsl(var(--border))',
                        borderRadius: '8px'
                      }} 
                    />
                    <Legend />
                    <Bar dataKey="inside" name="Inside Delivery" fill="hsl(var(--chart-2))" stackId="a" />
                    <Bar dataKey="outside" name="Outside Delivery" fill="hsl(var(--chart-3))" stackId="a" />
                    <Line type="monotone" dataKey="total" name="Total" stroke="hsl(var(--chart-1))" strokeWidth={2} dot={false} />
                  </ComposedChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-full flex items-center justify-center text-muted-foreground">
                  No order data for selected period
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Product Daybook - Only show products with orders > 0 */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2">
              <Package className="w-5 h-5 text-primary" />
              Product Daybook ({getPeriodLabel()})
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              {sortedProductDaybook.filter(item => item.sales > 0).length > 0 ? (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="table-header">Product</TableHead>
                      <TableHead className="table-header text-right">Target</TableHead>
                      <TableHead className="table-header text-right">OVD</TableHead>
                      <TableHead className="table-header text-right">VD</TableHead>
                      <TableHead className="table-header text-right">OVD Qty</TableHead>
                      <TableHead className="table-header text-right">VD Qty</TableHead>
                      <TableHead className="table-header text-right">Revenue</TableHead>
                      <TableHead className="table-header text-right">P/L</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {sortedProductDaybook.filter(item => item.sales > 0).map((item) => (
                      <TableRow key={item.name}>
                        <TableCell className="font-medium">{item.name}</TableCell>
                        <TableCell className="text-right">{item.target}</TableCell>
                        <TableCell className="text-right">{item.ovdOrders || 0}</TableCell>
                        <TableCell className="text-right">{item.vdOrders || 0}</TableCell>
                        <TableCell className="text-right text-primary font-medium">{item.ovdQtySold || 0}</TableCell>
                        <TableCell className="text-right text-primary font-medium">{item.vdQtySold || 0}</TableCell>
                        <TableCell className="text-right">₹{(item.revenue || 0).toFixed(0)}</TableCell>
                        <TableCell className={`text-right font-medium ${item.pl >= 0 ? 'text-success' : 'text-destructive'}`}>
                          ₹{item.pl.toFixed(0)}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              ) : (
                <div className="h-32 flex items-center justify-center text-muted-foreground">
                  No product orders for selected period
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        {/* Monthly Sales Chart */}
        <Card>
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2">
                <TrendingUp className="w-5 h-5 text-primary" />
                Monthly Sales Report
              </CardTitle>
              <Select value={selectedYear.toString()} onValueChange={(v) => setSelectedYear(parseInt(v))}>
                <SelectTrigger className="w-[100px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {yearOptions.map(y => (
                    <SelectItem key={y} value={y.toString()}>{y}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </CardHeader>
          <CardContent>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={monthlySales}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                  <XAxis dataKey="month" className="text-xs" />
                  <YAxis className="text-xs" tickFormatter={(v) => `₹${(v/1000).toFixed(0)}k`} />
                  <Tooltip 
                    contentStyle={{ 
                      backgroundColor: 'hsl(var(--card))', 
                      border: '1px solid hsl(var(--border))',
                      borderRadius: '8px'
                    }}
                    formatter={(value: number) => [`₹${value.toLocaleString()}`, 'Sales']}
                  />
                  <Line 
                    type="monotone" 
                    dataKey="sales" 
                    stroke="hsl(var(--chart-1))" 
                    strokeWidth={2}
                    dot={{ fill: 'hsl(var(--chart-1))' }}
                    label={{ position: 'top', fontSize: 10, fill: 'hsl(var(--muted-foreground))' }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* Monthly P/L Table */}
        <Card>
          <CardHeader className="pb-2">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
              <CardTitle className="flex items-center gap-2">
                <Calendar className="w-5 h-5 text-primary" />
                Monthly P/L - {selectedYear}
              </CardTitle>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" onClick={exportPLToPDF}>
                  <Download className="w-4 h-4 mr-1" />
                  PDF
                </Button>
                <Button variant="outline" size="sm" onClick={exportPLToExcel}>
                  <FileSpreadsheet className="w-4 h-4 mr-1" />
                  Excel
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="text-xs">Month</TableHead>
                    <TableHead className="text-xs text-right">Sales</TableHead>
                    <TableHead className="text-xs text-right">Ads (NPR)</TableHead>
                    <TableHead className="text-xs text-right">Office</TableHead>
                    <TableHead className="text-xs text-right">P/L</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {monthlyPL.map((row) => (
                    <TableRow key={row.month} className="h-8">
                      <TableCell className="text-xs font-medium py-1">{row.month}</TableCell>
                      <TableCell className="text-xs text-right py-1">₹{row.productSold.toLocaleString()}</TableCell>
                      <TableCell className="text-xs text-right py-1">₹{row.adsSpend.toLocaleString()}</TableCell>
                      <TableCell className="text-xs text-right py-1">₹{row.officeCost.toLocaleString()}</TableCell>
                      <TableCell className={`text-xs text-right font-medium py-1 ${row.pl >= 0 ? 'text-success' : 'text-destructive'}`}>
                        ₹{row.pl.toLocaleString()}
                      </TableCell>
                    </TableRow>
                  ))}
                  <TableRow className="bg-muted/50 font-bold h-8">
                    <TableCell className="text-xs py-1">Total</TableCell>
                    <TableCell className="text-xs text-right py-1">₹{plTotals.productSold.toLocaleString()}</TableCell>
                    <TableCell className="text-xs text-right py-1">₹{plTotals.adsSpend.toLocaleString()}</TableCell>
                    <TableCell className="text-xs text-right py-1">₹{plTotals.officeCost.toLocaleString()}</TableCell>
                    <TableCell className={`text-xs text-right py-1 ${plTotals.pl >= 0 ? 'text-success' : 'text-destructive'}`}>
                      ₹{plTotals.pl.toLocaleString()}
                    </TableCell>
                  </TableRow>
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Staff Performance Chart */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="w-5 h-5 text-primary" />
            Staff Performance ({getPeriodLabel()})
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-64">
            {staffPerformance.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={staffPerformance} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                  <XAxis type="number" className="text-xs" />
                  <YAxis dataKey="name" type="category" width={80} className="text-xs" />
                  <Tooltip 
                    contentStyle={{ 
                      backgroundColor: 'hsl(var(--card))', 
                      border: '1px solid hsl(var(--border))',
                      borderRadius: '8px'
                    }} 
                  />
                  <Legend />
                  <Bar dataKey="inside" name="Inside Delivery" fill="hsl(var(--chart-2))" stackId="a" />
                  <Bar dataKey="outside" name="Outside Delivery" fill="hsl(var(--chart-3))" stackId="a" />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full flex items-center justify-center text-muted-foreground">
                No performance data for selected period
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
