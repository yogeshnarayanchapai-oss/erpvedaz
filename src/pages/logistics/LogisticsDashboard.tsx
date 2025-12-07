import { useState, useMemo, useEffect, useRef } from 'react';
import { useOrders } from '@/hooks/useOrders';
import { StatCard } from '@/components/dashboard/StatCard';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from '@/components/ui/dialog';
import { 
  Package, 
  CheckCircle, 
  Clock, 
  TrendingUp, 
  BarChart3,
  MapPin,
  Globe,
  Percent,
  Download,
  FileSpreadsheet,
  FileText,
  Bell,
  BellRing,
  Settings,
  AlertTriangle,
} from 'lucide-react';
import { format, subDays, eachDayOfInterval, parseISO } from 'date-fns';
import {
  AreaChart,
  Area,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
  PieChart,
  Pie,
  Cell,
} from 'recharts';
import * as XLSX from 'xlsx';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { toast } from 'sonner';

type TimePeriod = '7' | '14' | '30';

const DEFAULT_THRESHOLD = 70;
const STORAGE_KEY = 'logistics_alert_settings';

interface AlertSettings {
  enabled: boolean;
  threshold: number;
  insideValleyEnabled: boolean;
  outsideValleyEnabled: boolean;
}

const getStoredSettings = (): AlertSettings => {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) return JSON.parse(stored);
  } catch {}
  return {
    enabled: true,
    threshold: DEFAULT_THRESHOLD,
    insideValleyEnabled: true,
    outsideValleyEnabled: true,
  };
};

const saveSettings = (settings: AlertSettings) => {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
};

export default function LogisticsDashboard() {
  const [period, setPeriod] = useState<TimePeriod>('7');
  const [alertSettings, setAlertSettings] = useState<AlertSettings>(getStoredSettings);
  const [alertDialogOpen, setAlertDialogOpen] = useState(false);
  const [tempThreshold, setTempThreshold] = useState(alertSettings.threshold.toString());
  const lastAlertRef = useRef<{ overall: number; inside: number; outside: number }>({ overall: 0, inside: 0, outside: 0 });
  
  const dateFrom = format(subDays(new Date(), parseInt(period)), 'yyyy-MM-dd');
  const dateTo = format(new Date(), 'yyyy-MM-dd');
  
  const { data: allOrders = [], isLoading } = useOrders({
    dateFrom,
    dateTo,
    sentToLogistics: true,
  });

  // Previous period for comparison
  const prevDateFrom = format(subDays(new Date(), parseInt(period) * 2), 'yyyy-MM-dd');
  const prevDateTo = format(subDays(new Date(), parseInt(period) + 1), 'yyyy-MM-dd');
  
  const { data: prevOrders = [] } = useOrders({
    dateFrom: prevDateFrom,
    dateTo: prevDateTo,
    sentToLogistics: true,
  });

  // Filter by delivery location
  const insideValleyOrders = allOrders.filter(o => o.delivery_location === 'INSIDE_VALLEY');
  const outsideValleyOrders = allOrders.filter(o => o.delivery_location === 'OUTSIDE_VALLEY');

  // Calculate metrics
  const metrics = useMemo(() => {
    const totalOrders = allOrders.length;
    const deliveredOrders = allOrders.filter(o => o.order_status === 'DELIVERED').length;
    const pendingOrders = allOrders.filter(o => !['DELIVERED', 'RETURNED'].includes(o.order_status)).length;
    const returnedOrders = allOrders.filter(o => o.order_status === 'RETURNED').length;
    const deliveryRate = totalOrders > 0 ? (deliveredOrders / totalOrders) * 100 : 0;
    const returnRate = totalOrders > 0 ? (returnedOrders / totalOrders) * 100 : 0;

    // Previous period metrics for comparison
    const prevTotal = prevOrders.length;
    const prevDelivered = prevOrders.filter(o => o.order_status === 'DELIVERED').length;
    const prevDeliveryRate = prevTotal > 0 ? (prevDelivered / prevTotal) * 100 : 0;

    // Trends
    const ordersTrend = prevTotal > 0 ? ((totalOrders - prevTotal) / prevTotal) * 100 : 0;
    const deliveryRateTrend = prevDeliveryRate > 0 ? deliveryRate - prevDeliveryRate : 0;

    return {
      totalOrders,
      deliveredOrders,
      pendingOrders,
      returnedOrders,
      deliveryRate,
      returnRate,
      ordersTrend,
      deliveryRateTrend,
      insideValley: {
        total: insideValleyOrders.length,
        delivered: insideValleyOrders.filter(o => o.order_status === 'DELIVERED').length,
        rate: insideValleyOrders.length > 0 
          ? (insideValleyOrders.filter(o => o.order_status === 'DELIVERED').length / insideValleyOrders.length) * 100 
          : 0,
      },
      outsideValley: {
        total: outsideValleyOrders.length,
        delivered: outsideValleyOrders.filter(o => o.order_status === 'DELIVERED').length,
        rate: outsideValleyOrders.length > 0 
          ? (outsideValleyOrders.filter(o => o.order_status === 'DELIVERED').length / outsideValleyOrders.length) * 100 
          : 0,
      },
    };
  }, [allOrders, prevOrders, insideValleyOrders, outsideValleyOrders]);

  // Alert monitoring effect
  useEffect(() => {
    if (!alertSettings.enabled || isLoading || allOrders.length === 0) return;

    const now = Date.now();
    const ALERT_COOLDOWN = 60000; // 1 minute cooldown between alerts

    // Check overall delivery rate
    if (metrics.deliveryRate < alertSettings.threshold && metrics.totalOrders >= 5) {
      if (now - lastAlertRef.current.overall > ALERT_COOLDOWN) {
        toast.warning(
          `Overall delivery rate dropped to ${metrics.deliveryRate.toFixed(1)}%`,
          {
            description: `Below your threshold of ${alertSettings.threshold}%`,
            icon: <AlertTriangle className="w-4 h-4" />,
            duration: 10000,
          }
        );
        lastAlertRef.current.overall = now;
      }
    }

    // Check Inside Valley rate
    if (alertSettings.insideValleyEnabled && metrics.insideValley.total >= 3) {
      if (metrics.insideValley.rate < alertSettings.threshold) {
        if (now - lastAlertRef.current.inside > ALERT_COOLDOWN) {
          toast.warning(
            `Inside Valley delivery rate: ${metrics.insideValley.rate.toFixed(1)}%`,
            {
              description: `Below threshold of ${alertSettings.threshold}%`,
              icon: <MapPin className="w-4 h-4" />,
              duration: 8000,
            }
          );
          lastAlertRef.current.inside = now;
        }
      }
    }

    // Check Outside Valley rate
    if (alertSettings.outsideValleyEnabled && metrics.outsideValley.total >= 3) {
      if (metrics.outsideValley.rate < alertSettings.threshold) {
        if (now - lastAlertRef.current.outside > ALERT_COOLDOWN) {
          toast.warning(
            `Outside Valley delivery rate: ${metrics.outsideValley.rate.toFixed(1)}%`,
            {
              description: `Below threshold of ${alertSettings.threshold}%`,
              icon: <Globe className="w-4 h-4" />,
              duration: 8000,
            }
          );
          lastAlertRef.current.outside = now;
        }
      }
    }
  }, [metrics, alertSettings, isLoading, allOrders.length]);

  // Save alert settings
  const handleSaveAlertSettings = () => {
    const threshold = parseInt(tempThreshold) || DEFAULT_THRESHOLD;
    const newSettings = { ...alertSettings, threshold: Math.max(1, Math.min(100, threshold)) };
    setAlertSettings(newSettings);
    saveSettings(newSettings);
    setAlertDialogOpen(false);
    toast.success('Alert settings saved');
  };

  const toggleAlerts = () => {
    const newSettings = { ...alertSettings, enabled: !alertSettings.enabled };
    setAlertSettings(newSettings);
    saveSettings(newSettings);
    toast.success(newSettings.enabled ? 'Alerts enabled' : 'Alerts disabled');
  };

  // Daily trend data
  const dailyTrendData = useMemo(() => {
    const days = eachDayOfInterval({
      start: subDays(new Date(), parseInt(period) - 1),
      end: new Date(),
    });

    return days.map(day => {
      const dayStr = format(day, 'yyyy-MM-dd');
      const dayOrders = allOrders.filter(o => {
        const orderDate = format(parseISO(o.order_date), 'yyyy-MM-dd');
        return orderDate === dayStr;
      });

      const delivered = dayOrders.filter(o => o.order_status === 'DELIVERED').length;
      const total = dayOrders.length;

      return {
        date: format(day, 'dd MMM'),
        total,
        delivered,
        pending: dayOrders.filter(o => !['DELIVERED', 'RETURNED'].includes(o.order_status)).length,
        returned: dayOrders.filter(o => o.order_status === 'RETURNED').length,
        rate: total > 0 ? Math.round((delivered / total) * 100) : 0,
      };
    });
  }, [allOrders, period]);

  // Status distribution for pie chart
  const statusDistribution = useMemo(() => {
    const statusCounts: Record<string, number> = {};
    allOrders.forEach(o => {
      statusCounts[o.order_status] = (statusCounts[o.order_status] || 0) + 1;
    });
    
    return Object.entries(statusCounts).map(([status, count]) => ({
      name: status,
      value: count,
    }));
  }, [allOrders]);

  const COLORS = {
    CONFIRMED: 'hsl(var(--info))',
    PACKED: 'hsl(var(--warning))',
    DISPATCHED: 'hsl(var(--primary))',
    DELIVERED: 'hsl(var(--success))',
    RETURNED: 'hsl(var(--destructive))',
  };

  // Location comparison data
  const locationData = [
    { name: 'Inside Valley', total: metrics.insideValley.total, delivered: metrics.insideValley.delivered },
    { name: 'Outside Valley', total: metrics.outsideValley.total, delivered: metrics.outsideValley.delivered },
  ];

  // Export to Excel
  const exportToExcel = () => {
    try {
      const wb = XLSX.utils.book_new();
      
      // Summary sheet
      const summaryData = [
        ['Logistics Dashboard Report'],
        [`Period: ${dateFrom} to ${dateTo}`],
        [''],
        ['Key Metrics'],
        ['Metric', 'Value'],
        ['Total Orders', metrics.totalOrders],
        ['Delivered', metrics.deliveredOrders],
        ['Pending', metrics.pendingOrders],
        ['Returned', metrics.returnedOrders],
        ['Delivery Rate', `${metrics.deliveryRate.toFixed(1)}%`],
        ['Return Rate', `${metrics.returnRate.toFixed(1)}%`],
        [''],
        ['Location Breakdown'],
        ['Location', 'Total', 'Delivered', 'Rate'],
        ['Inside Valley', metrics.insideValley.total, metrics.insideValley.delivered, `${metrics.insideValley.rate.toFixed(1)}%`],
        ['Outside Valley', metrics.outsideValley.total, metrics.outsideValley.delivered, `${metrics.outsideValley.rate.toFixed(1)}%`],
      ];
      const summaryWs = XLSX.utils.aoa_to_sheet(summaryData);
      XLSX.utils.book_append_sheet(wb, summaryWs, 'Summary');
      
      // Daily performance sheet
      const dailyHeaders = ['Date', 'Total Orders', 'Delivered', 'Pending', 'Returned', 'Delivery Rate'];
      const dailyRows = dailyTrendData.map(d => [d.date, d.total, d.delivered, d.pending, d.returned, `${d.rate}%`]);
      const dailyWs = XLSX.utils.aoa_to_sheet([dailyHeaders, ...dailyRows]);
      XLSX.utils.book_append_sheet(wb, dailyWs, 'Daily Performance');
      
      // Status distribution sheet
      const statusHeaders = ['Status', 'Count'];
      const statusRows = statusDistribution.map(s => [s.name, s.value]);
      const statusWs = XLSX.utils.aoa_to_sheet([statusHeaders, ...statusRows]);
      XLSX.utils.book_append_sheet(wb, statusWs, 'Status Distribution');
      
      XLSX.writeFile(wb, `logistics-report-${dateFrom}-to-${dateTo}.xlsx`);
      toast.success('Excel report downloaded successfully');
    } catch (error) {
      toast.error('Failed to export Excel report');
      console.error(error);
    }
  };

  // Export to PDF
  const exportToPDF = () => {
    try {
      const doc = new jsPDF();
      const pageWidth = doc.internal.pageSize.getWidth();
      
      // Title
      doc.setFontSize(20);
      doc.text('Logistics Dashboard Report', pageWidth / 2, 20, { align: 'center' });
      
      doc.setFontSize(12);
      doc.setTextColor(100);
      doc.text(`Period: ${dateFrom} to ${dateTo}`, pageWidth / 2, 28, { align: 'center' });
      
      // Key Metrics
      doc.setFontSize(14);
      doc.setTextColor(0);
      doc.text('Key Metrics', 14, 45);
      
      autoTable(doc, {
        startY: 50,
        head: [['Metric', 'Value']],
        body: [
          ['Total Orders', metrics.totalOrders.toString()],
          ['Delivered', metrics.deliveredOrders.toString()],
          ['Pending', metrics.pendingOrders.toString()],
          ['Returned', metrics.returnedOrders.toString()],
          ['Delivery Rate', `${metrics.deliveryRate.toFixed(1)}%`],
          ['Return Rate', `${metrics.returnRate.toFixed(1)}%`],
        ],
        theme: 'striped',
        headStyles: { fillColor: [59, 130, 246] },
      });
      
      // Location Breakdown
      const locationY = (doc as any).lastAutoTable.finalY + 15;
      doc.setFontSize(14);
      doc.text('Location Breakdown', 14, locationY);
      
      autoTable(doc, {
        startY: locationY + 5,
        head: [['Location', 'Total', 'Delivered', 'Rate']],
        body: [
          ['Inside Valley', metrics.insideValley.total.toString(), metrics.insideValley.delivered.toString(), `${metrics.insideValley.rate.toFixed(1)}%`],
          ['Outside Valley', metrics.outsideValley.total.toString(), metrics.outsideValley.delivered.toString(), `${metrics.outsideValley.rate.toFixed(1)}%`],
        ],
        theme: 'striped',
        headStyles: { fillColor: [59, 130, 246] },
      });
      
      // Daily Performance
      const dailyY = (doc as any).lastAutoTable.finalY + 15;
      doc.setFontSize(14);
      doc.text('Daily Performance', 14, dailyY);
      
      autoTable(doc, {
        startY: dailyY + 5,
        head: [['Date', 'Total', 'Delivered', 'Pending', 'Returned', 'Rate']],
        body: dailyTrendData.map(d => [d.date, d.total.toString(), d.delivered.toString(), d.pending.toString(), d.returned.toString(), `${d.rate}%`]),
        theme: 'striped',
        headStyles: { fillColor: [59, 130, 246] },
      });
      
      // Status Distribution
      doc.addPage();
      doc.setFontSize(14);
      doc.text('Status Distribution', 14, 20);
      
      autoTable(doc, {
        startY: 25,
        head: [['Status', 'Count', 'Percentage']],
        body: statusDistribution.map(s => [
          s.name, 
          s.value.toString(), 
          `${((s.value / metrics.totalOrders) * 100).toFixed(1)}%`
        ]),
        theme: 'striped',
        headStyles: { fillColor: [59, 130, 246] },
      });
      
      doc.save(`logistics-report-${dateFrom}-to-${dateTo}.pdf`);
      toast.success('PDF report downloaded successfully');
    } catch (error) {
      toast.error('Failed to export PDF report');
      console.error(error);
    }
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-bold">Logistics Dashboard</h1>
          <p className="text-muted-foreground">Delivery performance metrics and trends</p>
        </div>
        <div className="flex items-center gap-3">
          <Select value={period} onValueChange={(v) => setPeriod(v as TimePeriod)}>
            <SelectTrigger className="w-40">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="7">Last 7 days</SelectItem>
              <SelectItem value="14">Last 14 days</SelectItem>
              <SelectItem value="30">Last 30 days</SelectItem>
            </SelectContent>
          </Select>
          
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline">
                <Download className="w-4 h-4 mr-2" />
                Export
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={exportToExcel}>
                <FileSpreadsheet className="w-4 h-4 mr-2" />
                Export to Excel
              </DropdownMenuItem>
              <DropdownMenuItem onClick={exportToPDF}>
                <FileText className="w-4 h-4 mr-2" />
                Export to PDF
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
          
          {/* Alert Settings */}
          <Button 
            variant={alertSettings.enabled ? "default" : "outline"} 
            size="icon"
            onClick={toggleAlerts}
            title={alertSettings.enabled ? "Alerts enabled" : "Alerts disabled"}
          >
            {alertSettings.enabled ? <BellRing className="w-4 h-4" /> : <Bell className="w-4 h-4" />}
          </Button>
          
          <Dialog open={alertDialogOpen} onOpenChange={setAlertDialogOpen}>
            <DialogTrigger asChild>
              <Button variant="outline" size="icon" title="Alert settings">
                <Settings className="w-4 h-4" />
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2">
                  <BellRing className="w-5 h-5" />
                  Alert Settings
                </DialogTitle>
                <DialogDescription>
                  Configure delivery rate alerts to get notified when performance drops.
                </DialogDescription>
              </DialogHeader>
              
              <div className="space-y-6 py-4">
                <div className="flex items-center justify-between">
                  <div>
                    <Label htmlFor="alerts-enabled">Enable Alerts</Label>
                    <p className="text-sm text-muted-foreground">Receive notifications for low delivery rates</p>
                  </div>
                  <Switch
                    id="alerts-enabled"
                    checked={alertSettings.enabled}
                    onCheckedChange={(checked) => setAlertSettings({ ...alertSettings, enabled: checked })}
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="threshold">Delivery Rate Threshold (%)</Label>
                  <div className="flex items-center gap-2">
                    <Input
                      id="threshold"
                      type="number"
                      min="1"
                      max="100"
                      value={tempThreshold}
                      onChange={(e) => setTempThreshold(e.target.value)}
                      className="w-24"
                    />
                    <span className="text-sm text-muted-foreground">Alert when rate drops below this</span>
                  </div>
                </div>
                
                <div className="space-y-3">
                  <Label>Monitor by Location</Label>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <MapPin className="w-4 h-4 text-primary" />
                      <span className="text-sm">Inside Valley</span>
                    </div>
                    <Switch
                      checked={alertSettings.insideValleyEnabled}
                      onCheckedChange={(checked) => setAlertSettings({ ...alertSettings, insideValleyEnabled: checked })}
                    />
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Globe className="w-4 h-4 text-info" />
                      <span className="text-sm">Outside Valley</span>
                    </div>
                    <Switch
                      checked={alertSettings.outsideValleyEnabled}
                      onCheckedChange={(checked) => setAlertSettings({ ...alertSettings, outsideValleyEnabled: checked })}
                    />
                  </div>
                </div>
                
                {/* Current Status */}
                <div className="p-3 rounded-lg bg-muted/50 space-y-2">
                  <p className="text-sm font-medium">Current Delivery Rates</p>
                  <div className="grid grid-cols-3 gap-2 text-sm">
                    <div>
                      <span className="text-muted-foreground">Overall:</span>{' '}
                      <span className={metrics.deliveryRate < alertSettings.threshold ? 'text-destructive font-medium' : 'text-success'}>
                        {metrics.deliveryRate.toFixed(1)}%
                      </span>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Inside:</span>{' '}
                      <span className={metrics.insideValley.rate < alertSettings.threshold ? 'text-destructive font-medium' : 'text-success'}>
                        {metrics.insideValley.rate.toFixed(1)}%
                      </span>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Outside:</span>{' '}
                      <span className={metrics.outsideValley.rate < alertSettings.threshold ? 'text-destructive font-medium' : 'text-success'}>
                        {metrics.outsideValley.rate.toFixed(1)}%
                      </span>
                    </div>
                  </div>
                </div>
              </div>
              
              <DialogFooter>
                <Button variant="outline" onClick={() => setAlertDialogOpen(false)}>
                  Cancel
                </Button>
                <Button onClick={handleSaveAlertSettings}>
                  Save Settings
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard
          title="Total Orders"
          value={metrics.totalOrders}
          icon={<Package className="w-5 h-5" />}
          variant="primary"
          trend={metrics.ordersTrend !== 0 ? {
            value: Math.abs(Math.round(metrics.ordersTrend)),
            isPositive: metrics.ordersTrend > 0,
          } : undefined}
        />
        <StatCard
          title="Delivered"
          value={metrics.deliveredOrders}
          icon={<CheckCircle className="w-5 h-5" />}
          variant="success"
        />
        <StatCard
          title="Pending"
          value={metrics.pendingOrders}
          icon={<Clock className="w-5 h-5" />}
          variant="warning"
        />
        <StatCard
          title="Delivery Rate"
          value={`${metrics.deliveryRate.toFixed(1)}%`}
          icon={<Percent className="w-5 h-5" />}
          variant="info"
          trend={metrics.deliveryRateTrend !== 0 ? {
            value: Math.abs(Math.round(metrics.deliveryRateTrend * 10) / 10),
            isPositive: metrics.deliveryRateTrend > 0,
          } : undefined}
        />
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Daily Trend Chart */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="w-5 h-5 text-primary" />
              Daily Delivery Trend
            </CardTitle>
            <CardDescription>Orders delivered vs total orders per day</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={dailyTrendData}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                  <XAxis dataKey="date" className="text-xs" tick={{ fill: 'hsl(var(--muted-foreground))' }} />
                  <YAxis className="text-xs" tick={{ fill: 'hsl(var(--muted-foreground))' }} />
                  <Tooltip 
                    contentStyle={{ 
                      backgroundColor: 'hsl(var(--card))', 
                      border: '1px solid hsl(var(--border))',
                      borderRadius: '8px',
                    }}
                  />
                  <Legend />
                  <Area 
                    type="monotone" 
                    dataKey="total" 
                    stackId="1"
                    stroke="hsl(var(--primary))" 
                    fill="hsl(var(--primary)/0.2)"
                    name="Total Orders"
                  />
                  <Area 
                    type="monotone" 
                    dataKey="delivered" 
                    stackId="2"
                    stroke="hsl(var(--success))" 
                    fill="hsl(var(--success)/0.3)"
                    name="Delivered"
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* Status Distribution */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <BarChart3 className="w-5 h-5 text-primary" />
              Status Distribution
            </CardTitle>
            <CardDescription>Current order status breakdown</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={statusDistribution}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={100}
                    paddingAngle={2}
                    dataKey="value"
                    label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                    labelLine={false}
                  >
                    {statusDistribution.map((entry, index) => (
                      <Cell 
                        key={`cell-${index}`} 
                        fill={COLORS[entry.name as keyof typeof COLORS] || 'hsl(var(--muted))'} 
                      />
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
      </div>

      {/* Location Comparison */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <MapPin className="w-5 h-5 text-primary" />
            Inside vs Outside Valley Performance
          </CardTitle>
          <CardDescription>Delivery comparison by location</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Bar Chart */}
            <div className="lg:col-span-2 h-[250px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={locationData} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                  <XAxis type="number" tick={{ fill: 'hsl(var(--muted-foreground))' }} />
                  <YAxis dataKey="name" type="category" width={100} tick={{ fill: 'hsl(var(--muted-foreground))' }} />
                  <Tooltip 
                    contentStyle={{ 
                      backgroundColor: 'hsl(var(--card))', 
                      border: '1px solid hsl(var(--border))',
                      borderRadius: '8px',
                    }}
                  />
                  <Legend />
                  <Bar dataKey="total" fill="hsl(var(--primary))" name="Total Orders" radius={[0, 4, 4, 0]} />
                  <Bar dataKey="delivered" fill="hsl(var(--success))" name="Delivered" radius={[0, 4, 4, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
            
            {/* Location Stats */}
            <div className="space-y-4">
              <div className="p-4 rounded-lg bg-primary/5 border border-primary/20">
                <div className="flex items-center gap-2 mb-2">
                  <MapPin className="w-4 h-4 text-primary" />
                  <span className="font-medium">Inside Valley</span>
                </div>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <p className="text-muted-foreground">Total</p>
                    <p className="text-xl font-bold">{metrics.insideValley.total}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Delivered</p>
                    <p className="text-xl font-bold text-success">{metrics.insideValley.delivered}</p>
                  </div>
                  <div className="col-span-2">
                    <p className="text-muted-foreground">Delivery Rate</p>
                    <p className="text-xl font-bold text-primary">{metrics.insideValley.rate.toFixed(1)}%</p>
                  </div>
                </div>
              </div>
              
              <div className="p-4 rounded-lg bg-info/5 border border-info/20">
                <div className="flex items-center gap-2 mb-2">
                  <Globe className="w-4 h-4 text-info" />
                  <span className="font-medium">Outside Valley</span>
                </div>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <p className="text-muted-foreground">Total</p>
                    <p className="text-xl font-bold">{metrics.outsideValley.total}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Delivered</p>
                    <p className="text-xl font-bold text-success">{metrics.outsideValley.delivered}</p>
                  </div>
                  <div className="col-span-2">
                    <p className="text-muted-foreground">Delivery Rate</p>
                    <p className="text-xl font-bold text-info">{metrics.outsideValley.rate.toFixed(1)}%</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Daily Performance Table */}
      <Card>
        <CardHeader>
          <CardTitle>Daily Performance Summary</CardTitle>
          <CardDescription>Breakdown of orders by day</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b">
                  <th className="text-left py-3 px-4 font-medium text-muted-foreground">Date</th>
                  <th className="text-right py-3 px-4 font-medium text-muted-foreground">Total</th>
                  <th className="text-right py-3 px-4 font-medium text-muted-foreground">Delivered</th>
                  <th className="text-right py-3 px-4 font-medium text-muted-foreground">Pending</th>
                  <th className="text-right py-3 px-4 font-medium text-muted-foreground">Returned</th>
                  <th className="text-right py-3 px-4 font-medium text-muted-foreground">Rate</th>
                </tr>
              </thead>
              <tbody>
                {dailyTrendData.slice().reverse().map((day, index) => (
                  <tr key={index} className="border-b last:border-0 hover:bg-muted/50">
                    <td className="py-3 px-4 font-medium">{day.date}</td>
                    <td className="py-3 px-4 text-right">{day.total}</td>
                    <td className="py-3 px-4 text-right text-success">{day.delivered}</td>
                    <td className="py-3 px-4 text-right text-warning">{day.pending}</td>
                    <td className="py-3 px-4 text-right text-destructive">{day.returned}</td>
                    <td className="py-3 px-4 text-right">
                      <span className={day.rate >= 80 ? 'text-success' : day.rate >= 50 ? 'text-warning' : 'text-destructive'}>
                        {day.rate}%
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}