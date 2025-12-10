import { useState } from 'react';
import { subDays, format } from 'date-fns';
import { Package, TrendingUp, Clock, XCircle, DollarSign, CheckCircle, AlertCircle, Truck, Search, Filter, Download } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { DateRangeFilter, DateRange } from '@/components/ui/DateRangeFilter';
import { LogisticsStatsCard } from '@/components/logistics/LogisticsStatsCard';
import { LogisticsTable } from '@/components/logistics/LogisticsTable';
import { LogisticsAnalytics } from '@/components/logistics/LogisticsAnalytics';
import { BulkCourierSubmit } from '@/components/logistics/BulkCourierSubmit';
import { useLogisticsOrders, CourierProvider } from '@/hooks/useLogistics';
import { useLogisticsStats } from '@/hooks/useLogisticsStats';

type CourierTab = 'ALL' | 'NCM' | 'PATHAO' | 'GBL' | 'OTHER';
type StatusFilter = 'ALL' | 'PENDING_PICKUP' | 'IN_TRANSIT' | 'OUT_FOR_DELIVERY' | 'DELIVERED' | 'RTO' | 'CANCELED';

export default function LogisticsControlCenter() {
  const [dateRange, setDateRange] = useState<DateRange>({
    from: subDays(new Date(), 30),
    to: new Date(),
  });
  const [courierTab, setCourierTab] = useState<CourierTab>('ALL');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [cityFilter, setCityFilter] = useState('');
  const [productFilter, setProductFilter] = useState('');
  const [selectedOrders, setSelectedOrders] = useState<Set<string>>(new Set());

  // Build filters for data fetch
  const filters = {
    courier: courierTab !== 'ALL' ? courierTab as CourierProvider : undefined,
    status: statusFilter !== 'ALL' ? statusFilter : undefined,
    dateFrom: format(dateRange.from, 'yyyy-MM-dd'),
    dateTo: format(dateRange.to, 'yyyy-MM-dd'),
  };

  const { data: orders = [], isLoading, refetch } = useLogisticsOrders(filters);
  const { data: stats } = useLogisticsStats(dateRange.from, dateRange.to);

  // Client-side filtering for search, city, product
  const filteredOrders = orders.filter(order => {
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      const matchesSearch = 
        order.customer_name?.toLowerCase().includes(query) ||
        order.customer_phone?.includes(searchQuery) ||
        order.tracking_id?.toLowerCase().includes(query) ||
        order.courier_order_id?.toLowerCase().includes(query);
      if (!matchesSearch) return false;
    }
    if (cityFilter && !order.full_address?.toLowerCase().includes(cityFilter.toLowerCase())) return false;
    if (productFilter && !order.product_name?.toLowerCase().includes(productFilter.toLowerCase())) return false;
    return true;
  }).sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

  // Today stats
  const todayOrders = orders.filter(o => format(new Date(o.created_at), 'yyyy-MM-dd') === format(new Date(), 'yyyy-MM-dd'));
  const todayDelivered = todayOrders.filter(o => o.delivery_status === 'DELIVERED').length;
  const todayRTO = todayOrders.filter(o => ['RTO', 'RETURNED_TO_SELLER'].includes(o.delivery_status)).length;
  const todayPending = todayOrders.filter(o => !['DELIVERED', 'RTO', 'RETURNED_TO_SELLER', 'CANCELED'].includes(o.delivery_status)).length;
  const rtoPercentage = stats?.totalSent ? ((stats.rto / stats.totalSent) * 100).toFixed(1) : '0';
  
  // Calculate today's delivery cost (mock - should come from actual courier charges)
  const todayDeliveryCost = todayDelivered * 150; // Assuming 150 NPR per delivery

  const toggleOrderSelection = (orderId: string) => {
    setSelectedOrders(prev => {
      const newSet = new Set(prev);
      if (newSet.has(orderId)) newSet.delete(orderId);
      else newSet.add(orderId);
      return newSet;
    });
  };

  const toggleAllOrders = () => {
    if (selectedOrders.size === filteredOrders.length) {
      setSelectedOrders(new Set());
    } else {
      setSelectedOrders(new Set(filteredOrders.map(o => o.id)));
    }
  };

  const handleExport = () => {
    const headers = ['Order ID', 'Customer Name', 'Phone', 'City', 'Address', 'Product', 'Qty', 'COD', 'AWB', 'Status', 'Courier', 'Last Update'];
    const rows = filteredOrders.map(o => [
      o.order_id || o.id,
      o.customer_name,
      o.customer_phone,
      o.full_address?.split(',')[0] || '',
      o.full_address || '',
      o.product_name || '',
      o.quantity,
      o.cod_amount || 0,
      o.tracking_id || o.courier_order_id || '',
      o.delivery_status,
      o.courier,
      format(new Date(o.updated_at), 'dd MMM yyyy HH:mm'),
    ]);
    const csv = [headers, ...rows].map(r => r.map(cell => `"${cell}"`).join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `logistics-orders-${format(new Date(), 'yyyy-MM-dd')}.csv`;
    a.click();
  };

  return (
    <div className="space-y-6 p-6 animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Logistics Control Center</h1>
          <p className="text-muted-foreground">Multi-courier management & analytics</p>
        </div>
        <DateRangeFilter value={dateRange} onChange={setDateRange} />
      </div>

      {/* Top Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-6 gap-4">
        <LogisticsStatsCard
          title="Total in Logistics"
          value={stats?.totalSent || 0}
          icon={Package}
          description="All couriers combined"
        />
        <LogisticsStatsCard
          title="Delivered Today"
          value={todayDelivered}
          icon={CheckCircle}
          className="border-success/20"
        />
        <LogisticsStatsCard
          title="Pending Deliveries"
          value={todayPending}
          icon={Clock}
          className="border-warning/20"
        />
        <LogisticsStatsCard
          title="RTO Today"
          value={todayRTO}
          icon={XCircle}
          className="border-destructive/20"
        />
        <LogisticsStatsCard
          title="RTO Rate"
          value={`${rtoPercentage}%`}
          icon={TrendingUp}
          description="Overall return rate"
        />
        <LogisticsStatsCard
          title="Delivery Cost Today"
          value={`NPR ${todayDeliveryCost.toLocaleString()}`}
          icon={DollarSign}
          description="Estimated charges"
        />
      </div>

      {/* Courier Tabs */}
      <Card>
        <CardHeader>
          <CardTitle>Courier Operations</CardTitle>
        </CardHeader>
        <CardContent>
          <Tabs value={courierTab} onValueChange={(v) => setCourierTab(v as CourierTab)}>
            <TabsList className="grid w-full grid-cols-5">
              <TabsTrigger value="ALL">All Couriers</TabsTrigger>
              <TabsTrigger value="NCM">NCM</TabsTrigger>
              <TabsTrigger value="PATHAO">Pathao</TabsTrigger>
              <TabsTrigger value="GBL">GBL</TabsTrigger>
              <TabsTrigger value="OTHER">Other Couriers</TabsTrigger>
            </TabsList>

            <TabsContent value={courierTab} className="space-y-4 mt-4">
              {/* Filters Section */}
              <div className="flex flex-wrap gap-4 items-end">
                <div className="flex-1 min-w-[200px]">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <Input
                      placeholder="Search by name, phone, AWB..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="pl-9"
                    />
                  </div>
                </div>
                <Select value={statusFilter} onValueChange={(v) => setStatusFilter(v as StatusFilter)}>
                  <SelectTrigger className="w-[180px]">
                    <SelectValue placeholder="Status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ALL">All Statuses</SelectItem>
                    <SelectItem value="PENDING_PICKUP">Pending Pickup</SelectItem>
                    <SelectItem value="IN_TRANSIT">In Transit</SelectItem>
                    <SelectItem value="OUT_FOR_DELIVERY">Out for Delivery</SelectItem>
                    <SelectItem value="DELIVERED">Delivered</SelectItem>
                    <SelectItem value="RTO">RTO</SelectItem>
                    <SelectItem value="CANCELED">Canceled</SelectItem>
                  </SelectContent>
                </Select>
                <Input
                  placeholder="Filter by city..."
                  value={cityFilter}
                  onChange={(e) => setCityFilter(e.target.value)}
                  className="w-[150px]"
                />
                <Input
                  placeholder="Filter by product..."
                  value={productFilter}
                  onChange={(e) => setProductFilter(e.target.value)}
                  className="w-[150px]"
                />
                <Button variant="outline" onClick={() => {
                  setSearchQuery('');
                  setStatusFilter('ALL');
                  setCityFilter('');
                  setProductFilter('');
                }}>
                  <Filter className="w-4 h-4 mr-2" />
                  Clear Filters
                </Button>
                <Button variant="outline" onClick={handleExport}>
                  <Download className="w-4 h-4 mr-2" />
                  Export CSV
                </Button>
              </div>

              {/* Bulk Operations */}
              {selectedOrders.size > 0 && (
                <BulkCourierSubmit
                  selectedOrderIds={Array.from(selectedOrders)}
                  onComplete={() => {
                    setSelectedOrders(new Set());
                    refetch();
                  }}
                />
              )}

              {/* Orders Table */}
              <LogisticsTable
                orders={filteredOrders}
                selectedOrders={selectedOrders}
                onToggleOrder={toggleOrderSelection}
                onToggleAll={toggleAllOrders}
                onRefresh={refetch}
                isLoading={isLoading}
              />
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>

      {/* Analytics Section */}
      <LogisticsAnalytics
        dateRange={dateRange}
        orders={orders}
      />
    </div>
  );
}
