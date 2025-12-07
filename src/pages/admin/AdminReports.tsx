import { useState, useMemo } from 'react';
import DOMPurify from 'dompurify';
import { format, startOfDay, endOfDay } from 'date-fns';
import { useLeads } from '@/hooks/useLeads';
import { useOrders } from '@/hooks/useOrders';
import { useStaff } from '@/hooks/useStaff';
import { useCallLogs } from '@/hooks/useCallLogs';
import { useProducts } from '@/hooks/useProducts';
import { useBranches } from '@/hooks/useBranches';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { DateRangeFilter, DateRange } from '@/components/ui/DateRangeFilter';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend, PieChart, Pie, Cell } from 'recharts';
import { FileText, Users, TrendingUp, Phone, Truck, Download, Filter, Package, MapPin, Brain, Sparkles, Loader2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

const COLORS = ['hsl(var(--success))', 'hsl(var(--warning))', 'hsl(var(--chart-5))', 'hsl(var(--destructive))', 'hsl(var(--primary))'];

export default function AdminReports() {
  const today = new Date();
  const [dateRange, setDateRange] = useState<DateRange>({
    from: startOfDay(today),
    to: endOfDay(today),
  });

  // Filters
  const [selectedStaff, setSelectedStaff] = useState<string>('all');
  const [selectedProduct, setSelectedProduct] = useState<string>('all');
  const [selectedBranch, setSelectedBranch] = useState<string>('all');
  
  // AI Summary state
  const [aiSummary, setAiSummary] = useState<string>('');
  const [aiLoading, setAiLoading] = useState(false);
  const [selectedReportType, setSelectedReportType] = useState<string>('overall');

  const dateFrom = format(dateRange.from, 'yyyy-MM-dd');
  const dateTo = format(dateRange.to, 'yyyy-MM-dd');

  const { data: leads = [] } = useLeads({ dateFrom, dateTo });
  const { data: orders = [] } = useOrders({ dateFrom, dateTo });
  const { data: products = [] } = useProducts();
  const { data: branches = [] } = useBranches();
  const { data: leadsStaff = [] } = useStaff('LEADS');
  const { data: callingStaff = [] } = useStaff('CALLING');
  const { data: followupStaff = [] } = useStaff('FOLLOWUP');
  const { data: logisticsStaff = [] } = useStaff('LOGISTICS');
  const { data: callLogs = [] } = useCallLogs({ dateFrom, dateTo });

  // All staff combined for filter dropdown
  const allStaff = useMemo(() => {
    const staffMap = new Map();
    [...leadsStaff, ...callingStaff, ...followupStaff, ...logisticsStaff].forEach(s => {
      if (!staffMap.has(s.id)) staffMap.set(s.id, s);
    });
    return Array.from(staffMap.values());
  }, [leadsStaff, callingStaff, followupStaff, logisticsStaff]);

  // Filtered leads
  const filteredLeads = useMemo(() => {
    return leads.filter(l => {
      if (selectedProduct !== 'all' && l.product_id !== selectedProduct) return false;
      if (selectedBranch !== 'all' && l.branch_id !== selectedBranch) return false;
      if (selectedStaff !== 'all' && l.assigned_to_user_id !== selectedStaff && l.created_by_user_id !== selectedStaff) return false;
      return true;
    });
  }, [leads, selectedProduct, selectedBranch, selectedStaff]);

  // Filtered orders
  const filteredOrders = useMemo(() => {
    return orders.filter(o => {
      if (selectedProduct !== 'all' && o.product_id !== selectedProduct) return false;
      if (selectedBranch !== 'all' && o.branch_id !== selectedBranch) return false;
      if (selectedStaff !== 'all' && o.sales_person_id !== selectedStaff) return false;
      return true;
    });
  }, [orders, selectedProduct, selectedBranch, selectedStaff]);

  // Filtered call logs
  const filteredCallLogs = useMemo(() => {
    if (selectedStaff === 'all') return callLogs;
    return callLogs.filter(c => c.staff_id === selectedStaff);
  }, [callLogs, selectedStaff]);

  // Leads Performance Data
  const leadsPerformance = useMemo(() => {
    const staffToFilter = selectedStaff !== 'all' ? leadsStaff.filter(s => s.id === selectedStaff) : leadsStaff;
    return staffToFilter.map((staff) => {
      const staffLeads = filteredLeads.filter(l => l.created_by_user_id === staff.id);
      const newLeads = staffLeads.length;
      const assignedToCalling = staffLeads.filter((l) => l.current_team === 'CALLING').length;
      const remaining = staffLeads.filter((l) => l.current_team === 'LEADS' && !l.assigned_to_user_id).length;
      return { id: staff.id, name: staff.name, newLeads, assignedToCalling, remaining };
    }).filter((s) => s.newLeads > 0);
  }, [leadsStaff, filteredLeads, selectedStaff]);

  // Followup Performance Data
  const followupPerformance = useMemo(() => {
    const staffToFilter = selectedStaff !== 'all' ? followupStaff.filter(s => s.id === selectedStaff) : followupStaff;
    return staffToFilter.map((staff) => {
      const staffLeads = filteredLeads.filter(l => l.assigned_to_user_id === staff.id);
      const received = staffLeads.filter((l) => l.current_team === 'FOLLOWUP').length;
      const followUpCalls = staffLeads.filter((l) => l.status === 'FOLLOW_UP').length;
      const confirmed = staffLeads.filter((l) => l.status === 'CONFIRMED').length;
      const cancelled = staffLeads.filter((l) => l.status === 'CANCELLED').length;
      const conversion = received > 0 ? ((confirmed / received) * 100).toFixed(1) : '0';
      return { id: staff.id, name: staff.name, received, followUpCalls, confirmed, cancelled, conversion };
    }).filter((s) => s.received > 0 || s.confirmed > 0);
  }, [followupStaff, filteredLeads, selectedStaff]);

  // Calling/Order Performance Data
  const callingPerformance = useMemo(() => {
    const staffToFilter = selectedStaff !== 'all' ? callingStaff.filter(s => s.id === selectedStaff) : callingStaff;
    return staffToFilter.map((staff) => {
      const staffLeads = filteredLeads.filter(l => l.assigned_to_user_id === staff.id);
      const staffOrders = filteredOrders.filter(o => o.sales_person_id === staff.id);
      const staffCalls = filteredCallLogs.filter(c => c.staff_id === staff.id);
      
      const assigned = staffLeads.length;
      const callsDone = staffCalls.length;
      const confirmedOrders = staffOrders.length;
      const insideValley = staffOrders.filter((o) => o.delivery_location === 'INSIDE_VALLEY').length;
      const outsideValley = staffOrders.filter((o) => o.delivery_location === 'OUTSIDE_VALLEY').length;
      const followUps = staffLeads.filter((l) => l.status === 'FOLLOW_UP').length;
      const cnr = staffLeads.filter((l) => l.status === 'CALL_NOT_RECEIVED').length;
      const cancelled = staffLeads.filter((l) => l.status === 'CANCELLED').length;
      const conversion = assigned > 0 ? ((confirmedOrders / assigned) * 100).toFixed(1) : '0';
      const totalSales = staffOrders.reduce((sum, o) => sum + (o.amount || 0), 0);
      return { id: staff.id, name: staff.name, assigned, callsDone, confirmedOrders, insideValley, outsideValley, followUps, cnr, cancelled, conversion, totalSales };
    }).filter((s) => s.assigned > 0 || s.confirmedOrders > 0);
  }, [callingStaff, filteredLeads, filteredOrders, filteredCallLogs, selectedStaff]);

  // Logistics Performance Data
  const logisticsPerformance = useMemo(() => {
    const insideValleyOrders = filteredOrders.filter((o) => o.delivery_location === 'INSIDE_VALLEY');
    const outsideValleyOrders = filteredOrders.filter((o) => o.delivery_location === 'OUTSIDE_VALLEY');

    const insideTotal = insideValleyOrders.length;
    const insideDelivered = insideValleyOrders.filter((o) => o.order_status === 'DELIVERED').length;
    const insideStats = {
      total: insideTotal,
      delivered: insideDelivered,
      pending: insideValleyOrders.filter((o) => !['DELIVERED', 'CANCELLED', 'RETURNED'].includes(o.order_status || '')).length,
      cancelled: insideValleyOrders.filter((o) => o.order_status === 'CANCELLED').length,
      deliveryRate: insideTotal > 0 ? ((insideDelivered / insideTotal) * 100).toFixed(1) : '0',
    };

    const outsideTotal = outsideValleyOrders.length;
    const outsideDelivered = outsideValleyOrders.filter((o) => o.order_status === 'DELIVERED').length;
    const outsideStats = {
      total: outsideTotal,
      delivered: outsideDelivered,
      pending: outsideValleyOrders.filter((o) => !['DELIVERED', 'CANCELLED', 'RETURNED'].includes(o.order_status || '')).length,
      returned: outsideValleyOrders.filter((o) => o.order_status === 'RETURNED').length,
      deliveryRate: outsideTotal > 0 ? ((outsideDelivered / outsideTotal) * 100).toFixed(1) : '0',
    };

    // Partner summary
    const partnerSummary = outsideValleyOrders.reduce((acc, order) => {
      const partner = order.shipping_partner || 'Unassigned';
      if (!acc[partner]) acc[partner] = { orders: 0, delivered: 0, pending: 0, returned: 0 };
      acc[partner].orders++;
      if (order.order_status === 'DELIVERED') acc[partner].delivered++;
      else if (order.order_status === 'RETURNED') acc[partner].returned++;
      else acc[partner].pending++;
      return acc;
    }, {} as Record<string, { orders: number; delivered: number; pending: number; returned: number }>);

    // Branch summary
    const branchSummary = filteredOrders.reduce((acc, order) => {
      const branch = order.destination_branch || 'Unknown';
      if (!acc[branch]) acc[branch] = { orders: 0, delivered: 0, pending: 0, amount: 0 };
      acc[branch].orders++;
      acc[branch].amount += order.amount || 0;
      if (order.order_status === 'DELIVERED') acc[branch].delivered++;
      else if (!['CANCELLED', 'RETURNED'].includes(order.order_status || '')) acc[branch].pending++;
      return acc;
    }, {} as Record<string, { orders: number; delivered: number; pending: number; amount: number }>);

    return { 
      insideStats, 
      outsideStats, 
      partnerSummary: Object.entries(partnerSummary).map(([name, stats]) => ({ name, ...stats })),
      branchSummary: Object.entries(branchSummary).map(([name, stats]) => ({ name, ...stats })).sort((a, b) => b.orders - a.orders)
    };
  }, [filteredOrders]);

  // Product Performance
  const productPerformance = useMemo(() => {
    return products.map(product => {
      const productLeads = filteredLeads.filter(l => l.product_id === product.id);
      const productOrders = filteredOrders.filter(o => o.product_id === product.id);
      return {
        id: product.id,
        name: product.name,
        leads: productLeads.length,
        confirmed: productLeads.filter(l => l.status === 'CONFIRMED').length,
        orders: productOrders.length,
        revenue: productOrders.reduce((sum, o) => sum + (o.amount || 0), 0),
        delivered: productOrders.filter(o => o.order_status === 'DELIVERED').length,
      };
    }).filter(p => p.leads > 0 || p.orders > 0).sort((a, b) => b.revenue - a.revenue);
  }, [products, filteredLeads, filteredOrders]);

  const exportCSV = (data: any[], filename: string, headers: string[]) => {
    const rows = data.map((row) => headers.map((h) => {
      const key = h.toLowerCase().replace(/ /g, '').replace(/%/g, '');
      return row[key] ?? row[h] ?? '';
    }));
    const csv = [headers, ...rows].map((r) => r.map((cell) => `"${cell}"`).join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${filename}-${dateFrom}-${dateTo}.csv`;
    a.click();
  };

  const clearFilters = () => {
    setSelectedStaff('all');
    setSelectedProduct('all');
    setSelectedBranch('all');
  };

  const hasFilters = selectedStaff !== 'all' || selectedProduct !== 'all' || selectedBranch !== 'all';

  // AI Report Summary generation
  const generateAISummary = async () => {
    setAiLoading(true);
    setAiSummary('');
    
    try {
      const reportData = {
        dateRange: `${dateFrom} to ${dateTo}`,
        totalLeads: filteredLeads.length,
        confirmedLeads: filteredLeads.filter(l => l.status === 'CONFIRMED').length,
        totalOrders: filteredOrders.length,
        deliveredOrders: filteredOrders.filter(o => o.order_status === 'DELIVERED').length,
        totalRevenue: filteredOrders.reduce((sum, o) => sum + (o.amount || 0), 0),
        insideValleyOrders: filteredOrders.filter(o => o.delivery_location === 'INSIDE_VALLEY').length,
        outsideValleyOrders: filteredOrders.filter(o => o.delivery_location === 'OUTSIDE_VALLEY').length,
        topProducts: productPerformance.slice(0, 5).map(p => ({ name: p.name, orders: p.orders, revenue: p.revenue })),
        topCallingStaff: callingPerformance.slice(0, 5).map(s => ({ name: s.name, orders: s.confirmedOrders, conversion: s.conversion })),
        rtoOrders: filteredOrders.filter(o => o.order_status === 'RETURNED').length,
        cancelledOrders: filteredOrders.filter(o => o.order_status === 'CANCELLED').length,
      };

      const { data, error } = await supabase.functions.invoke('ai-report-summary', {
        body: { 
          reportData, 
          reportType: selectedReportType,
          dateRange: `${format(dateRange.from, 'MMM d')} - ${format(dateRange.to, 'MMM d, yyyy')}`
        }
      });

      if (error) throw error;
      
      if (data?.error) {
        toast.error(data.error);
        return;
      }

      setAiSummary(data.summary);
    } catch (error: any) {
      console.error('AI Summary error:', error);
      toast.error(error.message || 'Failed to generate AI summary');
    } finally {
      setAiLoading(false);
    }
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-bold">Reports</h1>
          <p className="text-muted-foreground">Performance analytics and insights</p>
        </div>
        <DateRangeFilter value={dateRange} onChange={setDateRange} />
      </div>

      {/* Filters Section */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base">
            <Filter className="w-4 h-4" />
            Filters
            {hasFilters && (
              <Button variant="ghost" size="sm" onClick={clearFilters} className="ml-auto h-7 text-xs">
                Clear All
              </Button>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="text-sm font-medium mb-1.5 block">Staff</label>
              <Select value={selectedStaff} onValueChange={setSelectedStaff}>
                <SelectTrigger>
                  <SelectValue placeholder="All Staff" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Staff</SelectItem>
                  {allStaff.map(s => (
                    <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-sm font-medium mb-1.5 block">Product</label>
              <Select value={selectedProduct} onValueChange={setSelectedProduct}>
                <SelectTrigger>
                  <SelectValue placeholder="All Products" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Products</SelectItem>
                  {products.map(p => (
                    <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-sm font-medium mb-1.5 block">Branch</label>
              <Select value={selectedBranch} onValueChange={setSelectedBranch}>
                <SelectTrigger>
                  <SelectValue placeholder="All Branches" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Branches</SelectItem>
                  {branches.map(b => (
                    <SelectItem key={b.id} value={b.id}>{b.branch_name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      <Tabs defaultValue="leads" className="space-y-6">
        <TabsList className="grid grid-cols-6 w-full max-w-4xl">
          <TabsTrigger value="ai-summary" className="flex items-center gap-1">
            <Sparkles className="w-4 h-4" />
            AI Summary
          </TabsTrigger>
          <TabsTrigger value="leads">Leads</TabsTrigger>
          <TabsTrigger value="calling">Calling</TabsTrigger>
          <TabsTrigger value="followup">Follow-up</TabsTrigger>
          <TabsTrigger value="logistics">Logistics</TabsTrigger>
          <TabsTrigger value="products">Products</TabsTrigger>
        </TabsList>

        {/* AI Summary Tab */}
        <TabsContent value="ai-summary" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Brain className="w-5 h-5 text-primary" />
                AI Report Summary
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex flex-wrap items-center gap-4">
                <div>
                  <label className="text-sm font-medium mb-1.5 block">Report Type</label>
                  <Select value={selectedReportType} onValueChange={setSelectedReportType}>
                    <SelectTrigger className="w-[180px]">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="overall">Overall Summary</SelectItem>
                      <SelectItem value="sales">Sales Focus</SelectItem>
                      <SelectItem value="leads">Leads Focus</SelectItem>
                      <SelectItem value="logistics">Logistics Focus</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="flex items-end">
                  <Button 
                    onClick={generateAISummary} 
                    disabled={aiLoading}
                    className="gap-2"
                  >
                    {aiLoading ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        Generating...
                      </>
                    ) : (
                      <>
                        <Sparkles className="w-4 h-4" />
                        Generate AI Summary
                      </>
                    )}
                  </Button>
                </div>
              </div>

              <p className="text-sm text-muted-foreground">
                Generate an AI-powered analysis of your report data for {format(dateRange.from, 'MMM d')} - {format(dateRange.to, 'MMM d, yyyy')}
              </p>

              {aiSummary && (
                <div className="mt-4 p-4 rounded-lg bg-muted/50 border prose prose-sm dark:prose-invert max-w-none">
                  <div 
                    className="whitespace-pre-wrap" 
                    dangerouslySetInnerHTML={{ 
                      __html: DOMPurify.sanitize(
                        aiSummary
                          .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
                          .replace(/\n/g, '<br />'),
                        { ALLOWED_TAGS: ['strong', 'br', 'p', 'ul', 'li', 'ol', 'em', 'b', 'i'] }
                      )
                    }} 
                  />
                </div>
              )}

              {!aiSummary && !aiLoading && (
                <div className="mt-4 p-8 rounded-lg border border-dashed flex flex-col items-center justify-center text-center">
                  <Brain className="w-12 h-12 text-muted-foreground/50 mb-3" />
                  <p className="text-muted-foreground">Click "Generate AI Summary" to get an AI-powered analysis of your report data</p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Quick Stats Cards */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <Card>
              <CardContent className="p-4">
                <p className="text-sm text-muted-foreground">Total Leads</p>
                <p className="text-2xl font-bold">{filteredLeads.length}</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <p className="text-sm text-muted-foreground">Total Orders</p>
                <p className="text-2xl font-bold">{filteredOrders.length}</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <p className="text-sm text-muted-foreground">Delivered</p>
                <p className="text-2xl font-bold text-success">{filteredOrders.filter(o => o.order_status === 'DELIVERED').length}</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <p className="text-sm text-muted-foreground">Total Revenue</p>
                <p className="text-2xl font-bold">₹{filteredOrders.reduce((sum, o) => sum + (o.amount || 0), 0).toLocaleString()}</p>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Leads Performance */}
        <TabsContent value="leads" className="space-y-6">
          <div className="flex justify-between items-center">
            <div className="flex gap-2">
              <Badge variant="outline">{filteredLeads.length} leads</Badge>
            </div>
            <Button variant="outline" size="sm" onClick={() => exportCSV(leadsPerformance, 'leads-performance', ['name', 'newLeads', 'assignedToCalling', 'remaining'])}>
              <Download className="w-4 h-4 mr-2" />Export CSV
            </Button>
          </div>
          <div className="grid lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader><CardTitle className="flex items-center gap-2"><TrendingUp className="w-5 h-5 text-primary" />Top Performers</CardTitle></CardHeader>
              <CardContent>
                <div className="h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={leadsPerformance.slice(0, 5)} layout="vertical">
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis type="number" />
                      <YAxis dataKey="name" type="category" width={100} />
                      <Tooltip />
                      <Bar dataKey="newLeads" fill="hsl(var(--primary))" name="New Leads" />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader><CardTitle className="flex items-center gap-2"><FileText className="w-5 h-5 text-primary" />Staff Details</CardTitle></CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Staff</TableHead>
                      <TableHead className="text-right">New</TableHead>
                      <TableHead className="text-right">Assigned</TableHead>
                      <TableHead className="text-right">Remaining</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {leadsPerformance.map((s) => (
                      <TableRow key={s.id}>
                        <TableCell className="font-medium">{s.name}</TableCell>
                        <TableCell className="text-right">{s.newLeads}</TableCell>
                        <TableCell className="text-right text-success">{s.assignedToCalling}</TableCell>
                        <TableCell className="text-right text-warning">{s.remaining}</TableCell>
                      </TableRow>
                    ))}
                    {leadsPerformance.length === 0 && (
                      <TableRow><TableCell colSpan={4} className="text-center py-8 text-muted-foreground">No data</TableCell></TableRow>
                    )}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Calling/Order Performance */}
        <TabsContent value="calling" className="space-y-6">
          <div className="flex justify-between items-center">
            <div className="flex gap-2">
              <Badge variant="outline">{filteredOrders.length} orders</Badge>
              <Badge variant="outline" className="bg-success/10">₹{filteredOrders.reduce((s, o) => s + (o.amount || 0), 0).toLocaleString()}</Badge>
            </div>
            <Button variant="outline" size="sm" onClick={() => exportCSV(callingPerformance, 'calling-performance', ['name', 'assigned', 'callsDone', 'confirmedOrders', 'insideValley', 'outsideValley', 'followUps', 'cnr', 'cancelled', 'conversion', 'totalSales'])}>
              <Download className="w-4 h-4 mr-2" />Export CSV
            </Button>
          </div>
          <Card>
            <CardHeader><CardTitle className="flex items-center gap-2"><Phone className="w-5 h-5 text-primary" />Calling Team Performance</CardTitle></CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Staff</TableHead>
                      <TableHead className="text-right">Assigned</TableHead>
                      <TableHead className="text-right">Calls</TableHead>
                      <TableHead className="text-right">Orders</TableHead>
                      <TableHead className="text-right">IV</TableHead>
                      <TableHead className="text-right">OV</TableHead>
                      <TableHead className="text-right">F/U</TableHead>
                      <TableHead className="text-right">CNR</TableHead>
                      <TableHead className="text-right">Cancel</TableHead>
                      <TableHead className="text-right">Conv%</TableHead>
                      <TableHead className="text-right">Sales</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {callingPerformance.map((s) => (
                      <TableRow key={s.id}>
                        <TableCell className="font-medium">{s.name}</TableCell>
                        <TableCell className="text-right">{s.assigned}</TableCell>
                        <TableCell className="text-right">{s.callsDone}</TableCell>
                        <TableCell className="text-right text-success font-medium">{s.confirmedOrders}</TableCell>
                        <TableCell className="text-right text-blue-600">{s.insideValley}</TableCell>
                        <TableCell className="text-right text-orange-600">{s.outsideValley}</TableCell>
                        <TableCell className="text-right text-warning">{s.followUps}</TableCell>
                        <TableCell className="text-right">{s.cnr}</TableCell>
                        <TableCell className="text-right text-destructive">{s.cancelled}</TableCell>
                        <TableCell className="text-right font-medium">{s.conversion}%</TableCell>
                        <TableCell className="text-right font-medium">₹{s.totalSales.toLocaleString()}</TableCell>
                      </TableRow>
                    ))}
                    {callingPerformance.length === 0 && (
                      <TableRow><TableCell colSpan={11} className="text-center py-8 text-muted-foreground">No data</TableCell></TableRow>
                    )}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader><CardTitle>Performance Chart</CardTitle></CardHeader>
            <CardContent>
              <div className="h-80">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={callingPerformance} layout="vertical">
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis type="number" />
                    <YAxis dataKey="name" type="category" width={100} />
                    <Tooltip />
                    <Legend />
                    <Bar dataKey="confirmedOrders" fill="hsl(var(--success))" name="Orders" />
                    <Bar dataKey="followUps" fill="hsl(var(--warning))" name="Follow Up" />
                    <Bar dataKey="cnr" fill="hsl(var(--chart-5))" name="CNR" />
                    <Bar dataKey="cancelled" fill="hsl(var(--destructive))" name="Cancelled" />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Followup Performance */}
        <TabsContent value="followup" className="space-y-6">
          <div className="flex justify-end">
            <Button variant="outline" size="sm" onClick={() => exportCSV(followupPerformance, 'followup-performance', ['name', 'received', 'followUpCalls', 'confirmed', 'cancelled', 'conversion'])}>
              <Download className="w-4 h-4 mr-2" />Export CSV
            </Button>
          </div>
          <Card>
            <CardHeader><CardTitle className="flex items-center gap-2"><Users className="w-5 h-5 text-primary" />Follow-up Team Performance</CardTitle></CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Staff</TableHead>
                    <TableHead className="text-right">Received</TableHead>
                    <TableHead className="text-right">Follow Up</TableHead>
                    <TableHead className="text-right">Confirmed</TableHead>
                    <TableHead className="text-right">Cancelled</TableHead>
                    <TableHead className="text-right">Conversion %</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {followupPerformance.map((s) => (
                    <TableRow key={s.id}>
                      <TableCell className="font-medium">{s.name}</TableCell>
                      <TableCell className="text-right">{s.received}</TableCell>
                      <TableCell className="text-right text-warning">{s.followUpCalls}</TableCell>
                      <TableCell className="text-right text-success">{s.confirmed}</TableCell>
                      <TableCell className="text-right text-destructive">{s.cancelled}</TableCell>
                      <TableCell className="text-right font-medium">{s.conversion}%</TableCell>
                    </TableRow>
                  ))}
                  {followupPerformance.length === 0 && (
                    <TableRow><TableCell colSpan={6} className="text-center py-8 text-muted-foreground">No data</TableCell></TableRow>
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Logistics Performance */}
        <TabsContent value="logistics" className="space-y-6">
          <div className="flex justify-end">
            <Button variant="outline" size="sm" onClick={() => exportCSV(logisticsPerformance.partnerSummary, 'logistics-partner', ['name', 'orders', 'delivered', 'pending', 'returned'])}>
              <Download className="w-4 h-4 mr-2" />Export CSV
            </Button>
          </div>
          <div className="grid lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader><CardTitle className="flex items-center gap-2"><MapPin className="w-5 h-5 text-primary" />Inside Valley</CardTitle></CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 gap-4 mb-4">
                  <div className="p-4 rounded-lg bg-muted/50">
                    <p className="text-sm text-muted-foreground">Total Orders</p>
                    <p className="text-2xl font-bold">{logisticsPerformance.insideStats.total}</p>
                  </div>
                  <div className="p-4 rounded-lg bg-success/10">
                    <p className="text-sm text-muted-foreground">Delivered</p>
                    <p className="text-2xl font-bold text-success">{logisticsPerformance.insideStats.delivered}</p>
                  </div>
                  <div className="p-4 rounded-lg bg-warning/10">
                    <p className="text-sm text-muted-foreground">Pending</p>
                    <p className="text-2xl font-bold text-warning">{logisticsPerformance.insideStats.pending}</p>
                  </div>
                  <div className="p-4 rounded-lg bg-primary/10">
                    <p className="text-sm text-muted-foreground">Delivery Rate</p>
                    <p className="text-2xl font-bold text-primary">{logisticsPerformance.insideStats.deliveryRate}%</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader><CardTitle className="flex items-center gap-2"><Truck className="w-5 h-5 text-primary" />Outside Valley</CardTitle></CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 gap-4 mb-4">
                  <div className="p-4 rounded-lg bg-muted/50">
                    <p className="text-sm text-muted-foreground">Total Orders</p>
                    <p className="text-2xl font-bold">{logisticsPerformance.outsideStats.total}</p>
                  </div>
                  <div className="p-4 rounded-lg bg-success/10">
                    <p className="text-sm text-muted-foreground">Delivered</p>
                    <p className="text-2xl font-bold text-success">{logisticsPerformance.outsideStats.delivered}</p>
                  </div>
                  <div className="p-4 rounded-lg bg-warning/10">
                    <p className="text-sm text-muted-foreground">Pending</p>
                    <p className="text-2xl font-bold text-warning">{logisticsPerformance.outsideStats.pending}</p>
                  </div>
                  <div className="p-4 rounded-lg bg-primary/10">
                    <p className="text-sm text-muted-foreground">Delivery Rate</p>
                    <p className="text-2xl font-bold text-primary">{logisticsPerformance.outsideStats.deliveryRate}%</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
          
          <div className="grid lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader><CardTitle>Logistics Partner Summary</CardTitle></CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Partner</TableHead>
                      <TableHead className="text-right">Orders</TableHead>
                      <TableHead className="text-right">Delivered</TableHead>
                      <TableHead className="text-right">Pending</TableHead>
                      <TableHead className="text-right">Returned</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {logisticsPerformance.partnerSummary.map((p) => (
                      <TableRow key={p.name}>
                        <TableCell className="font-medium">{p.name}</TableCell>
                        <TableCell className="text-right">{p.orders}</TableCell>
                        <TableCell className="text-right text-success">{p.delivered}</TableCell>
                        <TableCell className="text-right text-warning">{p.pending}</TableCell>
                        <TableCell className="text-right text-destructive">{p.returned}</TableCell>
                      </TableRow>
                    ))}
                    {logisticsPerformance.partnerSummary.length === 0 && (
                      <TableRow><TableCell colSpan={5} className="text-center py-8 text-muted-foreground">No data</TableCell></TableRow>
                    )}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
            <Card>
              <CardHeader><CardTitle>Branch Summary</CardTitle></CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Branch</TableHead>
                      <TableHead className="text-right">Orders</TableHead>
                      <TableHead className="text-right">Delivered</TableHead>
                      <TableHead className="text-right">Revenue</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {logisticsPerformance.branchSummary.slice(0, 10).map((b) => (
                      <TableRow key={b.name}>
                        <TableCell className="font-medium truncate max-w-[120px]">{b.name}</TableCell>
                        <TableCell className="text-right">{b.orders}</TableCell>
                        <TableCell className="text-right text-success">{b.delivered}</TableCell>
                        <TableCell className="text-right">₹{b.amount.toLocaleString()}</TableCell>
                      </TableRow>
                    ))}
                    {logisticsPerformance.branchSummary.length === 0 && (
                      <TableRow><TableCell colSpan={4} className="text-center py-8 text-muted-foreground">No data</TableCell></TableRow>
                    )}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Products Performance */}
        <TabsContent value="products" className="space-y-6">
          <div className="flex justify-end">
            <Button variant="outline" size="sm" onClick={() => exportCSV(productPerformance, 'product-performance', ['name', 'leads', 'confirmed', 'orders', 'delivered', 'revenue'])}>
              <Download className="w-4 h-4 mr-2" />Export CSV
            </Button>
          </div>
          <Card>
            <CardHeader><CardTitle className="flex items-center gap-2"><Package className="w-5 h-5 text-primary" />Product Performance</CardTitle></CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Product</TableHead>
                    <TableHead className="text-right">Leads</TableHead>
                    <TableHead className="text-right">Confirmed</TableHead>
                    <TableHead className="text-right">Orders</TableHead>
                    <TableHead className="text-right">Delivered</TableHead>
                    <TableHead className="text-right">Revenue</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {productPerformance.map((p) => (
                    <TableRow key={p.id}>
                      <TableCell className="font-medium">{p.name}</TableCell>
                      <TableCell className="text-right">{p.leads}</TableCell>
                      <TableCell className="text-right text-success">{p.confirmed}</TableCell>
                      <TableCell className="text-right">{p.orders}</TableCell>
                      <TableCell className="text-right text-success">{p.delivered}</TableCell>
                      <TableCell className="text-right font-medium">₹{p.revenue.toLocaleString()}</TableCell>
                    </TableRow>
                  ))}
                  {productPerformance.length === 0 && (
                    <TableRow><TableCell colSpan={6} className="text-center py-8 text-muted-foreground">No data</TableCell></TableRow>
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
          <Card>
            <CardHeader><CardTitle>Revenue by Product</CardTitle></CardHeader>
            <CardContent>
              <div className="h-80">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={productPerformance.slice(0, 10)}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="name" angle={-45} textAnchor="end" height={80} fontSize={12} />
                    <YAxis tickFormatter={(v) => `₹${(v/1000).toFixed(0)}k`} />
                    <Tooltip formatter={(value: number) => [`₹${value.toLocaleString()}`, 'Revenue']} />
                    <Bar dataKey="revenue" fill="hsl(var(--primary))" name="Revenue" />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
