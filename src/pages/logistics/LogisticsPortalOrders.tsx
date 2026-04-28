import { useState, useMemo } from 'react';
import { format } from 'date-fns';
import { useLocation } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Eye, RotateCcw, Package, Search, MapPin, Globe, RefreshCw, CheckCircle, Truck } from 'lucide-react';
import { useLogisticsOrdersInRange } from '@/hooks/useLogisticsPortalOrders';
import { useAuth } from '@/contexts/AuthContext';
import { useCurrentStore } from '@/contexts/CurrentStoreContext';
import { LogisticsRedirectModal } from '@/components/logistics/LogisticsRedirectModal';
import { DashboardDateFilter } from '@/components/dashboard/DashboardDateFilter';
import { matchesReferenceId, isReferenceIdSearch } from '@/lib/referenceIdSearch';
import { useStaff, type StaffMember } from '@/hooks/useStaff';
import { useClientPagination } from '@/hooks/useClientPagination';
import { DataPagination } from '@/components/ui/data-pagination';
import { supabase } from '@/integrations/supabase/client';
import { useQuery } from '@tanstack/react-query';

// Nepal timezone helpers - returns date string in YYYY-MM-DD format for Nepal time
function getNepalDateString(): string {
  // Get current time in Nepal timezone
  const now = new Date();
  const nepalTime = new Date(now.toLocaleString('en-US', { timeZone: 'Asia/Kathmandu' }));
  const year = nepalTime.getFullYear();
  const month = String(nepalTime.getMonth() + 1).padStart(2, '0');
  const day = String(nepalTime.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function getNepalDateDisplay(): string {
  const now = new Date();
  return now.toLocaleDateString('en-US', { 
    timeZone: 'Asia/Kathmandu',
    day: '2-digit',
    month: 'short',
    year: 'numeric'
  });
}

export default function LogisticsPortalOrders() {
  const { user, profile } = useAuth();
  const { availableStores } = useCurrentStore();
  const location = useLocation();
  const isDashboard = location.pathname.includes('/dashboard');
  const [activeTab, setActiveTab] = useState<'new' | 'all'>('new');

  // Date range for "All Orders" tab
  const [allOrdersDateRange, setAllOrdersDateRange] = useState({
    from: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000), // Last 30 days
    to: new Date(),
  });

  // Filters
  const [deliveryFilter, setDeliveryFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [staffFilter, setStaffFilter] = useState('all');
  const [search, setSearch] = useState('');

  // Multi-store aggregation: for non-OWNER users, always aggregate across ALL accessible stores
  // so switching the active store does NOT change what they see in the logistics portal.
  // OWNER continues to respect the single-store switcher.
  const isOwner = profile?.role === 'OWNER';
  const accessibleStoreIds = useMemo(
    () => availableStores.map(s => s.id),
    [availableStores]
  );
  const multiStoreMode = !isOwner && accessibleStoreIds.length >= 1;

  // CALLING staff list — merged across all accessible stores in multi-store mode
  const { data: singleStoreStaff = [] } = useStaff('CALLING', false, undefined, false);
  const { data: multiStoreStaff = [] } = useQuery({
    queryKey: ['staff-multi-store', 'CALLING', accessibleStoreIds.join(',')],
    enabled: multiStoreMode && accessibleStoreIds.length > 0,
    queryFn: async () => {
      // Get user IDs across all accessible stores with CALLING role (store_role or fallback profile role)
      const { data: storeAccess } = await supabase
        .from('user_store_access')
        .select('user_id, store_role')
        .in('store_id', accessibleStoreIds)
        .eq('is_active', true);
      if (!storeAccess) return [];

      const callingFromStoreRole = storeAccess
        .filter(u => u.store_role === 'CALLING')
        .map(u => u.user_id);
      const noStoreRole = storeAccess
        .filter(u => !u.store_role)
        .map(u => u.user_id);

      let callingFromProfile: string[] = [];
      if (noStoreRole.length > 0) {
        const { data: profs } = await supabase
          .from('profiles')
          .select('id')
          .in('id', noStoreRole)
          .eq('role', 'CALLING');
        callingFromProfile = (profs || []).map(p => p.id);
      }

      const ids = Array.from(new Set([...callingFromStoreRole, ...callingFromProfile]));
      if (ids.length === 0) return [];

      const { data: profiles } = await supabase
        .from('profiles')
        .select('*')
        .in('id', ids)
        .eq('is_active', true)
        .neq('role', 'OWNER')
        .order('name');
      return (profiles || []) as StaffMember[];
    },
  });
  const staff = multiStoreMode ? multiStoreStaff : singleStoreStaff;

  // Modal state
  const [selectedOrder, setSelectedOrder] = useState<any>(null);
  const [isRedirectModalOpen, setIsRedirectModalOpen] = useState(false);

  // Today's date in Nepal timezone (YYYY-MM-DD)
  const todayNepal = getNepalDateString();

  // Active tab determines which date range to fetch from server.
  // "New Orders" = today only (small payload). "All Orders" = user-selected range.
  const activeRange = useMemo(() => {
    if (activeTab === 'new') {
      const today = new Date();
      return { from: today, to: today };
    }
    return allOrdersDateRange;
  }, [activeTab, allOrdersDateRange]);

  const { data: rangeOrders = [], isLoading, isFetching, isError, forceRefresh } =
    useLogisticsOrdersInRange(activeRange, multiStoreMode ? accessibleStoreIds : undefined);

  // For search, we use whatever is currently loaded (range-bound).
  const allCachedOrders = rangeOrders;

  const todayOrders = useMemo(() => 
    rangeOrders.filter(o => {
      if (!o.order_date) return false;
      return o.order_date.substring(0, 10) === todayNepal;
    }),
    [rangeOrders, todayNepal]
  );

  const orders = activeTab === 'new' ? todayOrders : rangeOrders;

  // For "New Orders" tab, filter out delivered/cancelled orders
  const filteredOrders = useMemo(() => {
    // If search is active, search across ALL cached orders (bypass date filter)
    if (search) {
      const searchLower = search.toLowerCase();
      const isRefSearch = isReferenceIdSearch(search);
      
      let result = allCachedOrders.filter(o => {
        if (isRefSearch) {
          return matchesReferenceId((o.leads as any)?.reference_id, search);
        }
        return (
          (o.leads as any)?.client_name?.toLowerCase().includes(searchLower) ||
          (o.leads as any)?.contact_number?.includes(search) ||
          (o.leads as any)?.reference_id?.includes(search.replace('#', '')) ||
          o.destination_branch?.toLowerCase().includes(searchLower)
        );
      });
      if (staffFilter !== 'all') {
        result = result.filter(o => o.called_by_user_id === staffFilter);
      }
      if (deliveryFilter !== 'all') {
        result = result.filter(o => o.delivery_location === deliveryFilter);
      }
      if (statusFilter !== 'all') {
        result = result.filter(o => o.order_status === statusFilter);
      }
      return result.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
    }

    let filtered = orders;
    
    // New Orders tab: exclude delivered/cancelled
    if (activeTab === 'new') {
      filtered = filtered.filter(o => 
        !['DELIVERED', 'CANCELLED'].includes(o.order_status || '')
      );
    }
    
    // Apply filters
    if (deliveryFilter !== 'all') {
      filtered = filtered.filter(o => o.delivery_location === deliveryFilter);
    }
    if (statusFilter !== 'all') {
      filtered = filtered.filter(o => o.order_status === statusFilter);
    }
    if (staffFilter !== 'all') {
      filtered = filtered.filter(o => o.called_by_user_id === staffFilter);
    }
    
    // Sort by newest first
    return filtered.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
  }, [orders, allCachedOrders, activeTab, deliveryFilter, statusFilter, staffFilter, search]);

  // Pagination - 100 per page; resets when filters/tab change
  const paginationKey = `${activeTab}|${deliveryFilter}|${statusFilter}|${staffFilter}|${search}|${filteredOrders.length}`;
  const { pagedRows: pagedOrders, page, setPage, totalPages, total, from, to } =
    useClientPagination(filteredOrders, 100, paginationKey);

  // Stats (only used on dashboard)
  const stats = useMemo(() => {
    const data = activeTab === 'new' 
      ? orders.filter(o => !['DELIVERED', 'CANCELLED'].includes(o.order_status || ''))
      : orders;
    return {
      total: data.length,
      inside: data.filter(o => o.delivery_location === 'INSIDE_VALLEY').length,
      outside: data.filter(o => o.delivery_location === 'OUTSIDE_VALLEY').length,
      redirected: data.filter(o => o.order_status === 'REDIRECT').length,
      delivered: data.filter(o => o.order_status === 'DELIVERED').length,
    };
  }, [orders, activeTab]);

  const getDeliveryBadge = (location: string | null) => {
    if (location === 'INSIDE_VALLEY') {
      return <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">Inside Valley</Badge>;
    }
    if (location === 'OUTSIDE_VALLEY') {
      return <Badge variant="outline" className="bg-orange-50 text-orange-700 border-orange-200">Outside Valley</Badge>;
    }
    return <Badge variant="secondary">Unknown</Badge>;
  };

  const getStatusBadge = (status: string | null) => {
    const statusStyles: Record<string, string> = {
      CONFIRMED: 'bg-green-50 text-green-700 border-green-200',
      REDIRECT: 'bg-red-50 text-red-700 border-red-200',
      REDIRECTED: 'bg-red-50 text-red-700 border-red-200',
      CANCELLED: 'bg-gray-50 text-gray-700 border-gray-200',
      PENDING: 'bg-yellow-50 text-yellow-700 border-yellow-200',
      DISPATCHED: 'bg-blue-50 text-blue-700 border-blue-200',
      DELIVERED: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    };
    return (
      <Badge variant="outline" className={statusStyles[status || ''] || ''}>
        {status?.replace('_', ' ') || 'Unknown'}
      </Badge>
    );
  };

  const handleOpenRedirect = (order: any) => {
    setSelectedOrder(order);
    setIsRedirectModalOpen(true);
  };

  const handleCloseRedirect = () => {
    setIsRedirectModalOpen(false);
    setSelectedOrder(null);
  };

  const clearFilters = () => {
    setDeliveryFilter('all');
    setStatusFilter('all');
    setStaffFilter('all');
    setSearch('');
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-bold">{isDashboard ? 'Logistics Dashboard' : 'Logistics Orders'}</h1>
          <p className="text-muted-foreground">Manage and redirect orders for delivery</p>
        </div>
        <div className="flex items-center gap-3">
          {isFetching && !isError && (
            <div className="flex items-center gap-2 text-muted-foreground">
              <RefreshCw className="w-4 h-4 animate-spin" />
              <span className="text-sm">Updating...</span>
            </div>
          )}
          {isError && (
            <div className="flex items-center gap-2">
              <span className="text-sm text-destructive">Failed to load orders</span>
              <Button size="sm" variant="outline" onClick={forceRefresh}>
                <RefreshCw className="w-4 h-4 mr-1" /> Retry
              </Button>
            </div>
          )}
        </div>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as 'new' | 'all')}>
        <TabsList className="grid w-full max-w-md grid-cols-2">
          <TabsTrigger value="new" className="flex items-center gap-2">
            <Package className="w-4 h-4" />
            New Orders
          </TabsTrigger>
          <TabsTrigger value="all" className="flex items-center gap-2">
            <Truck className="w-4 h-4" />
            All Orders
          </TabsTrigger>
        </TabsList>

        <TabsContent value="new" className="mt-4 space-y-4">
          {/* Stats for Today - only on dashboard */}
          {isDashboard && (
            <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
              <Card>
                <CardContent className="pt-4">
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-lg bg-primary/10">
                      <Package className="w-5 h-5 text-primary" />
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Total Active</p>
                      <p className="text-2xl font-bold">{stats.total}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="pt-4">
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-lg bg-blue-100">
                      <MapPin className="w-5 h-5 text-blue-600" />
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Inside Valley</p>
                      <p className="text-2xl font-bold">{stats.inside}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="pt-4">
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-lg bg-orange-100">
                      <Globe className="w-5 h-5 text-orange-600" />
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Outside Valley</p>
                      <p className="text-2xl font-bold">{stats.outside}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="pt-4">
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-lg bg-red-100">
                      <RotateCcw className="w-5 h-5 text-red-600" />
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Redirected</p>
                      <p className="text-2xl font-bold">{stats.redirected}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="pt-4">
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-lg bg-emerald-100">
                      <CheckCircle className="w-5 h-5 text-emerald-600" />
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Delivered</p>
                      <p className="text-2xl font-bold">{stats.delivered}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          )}
        </TabsContent>

        <TabsContent value="all" className="mt-4 space-y-4">
          {/* Date filter for All Orders */}
          <div className="flex items-center gap-4">
            <DashboardDateFilter value={allOrdersDateRange} onChange={setAllOrdersDateRange} />
          </div>

          {/* Stats for All Orders - only on dashboard */}
          {isDashboard && (
            <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
              <Card>
                <CardContent className="pt-4">
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-lg bg-primary/10">
                      <Package className="w-5 h-5 text-primary" />
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Total</p>
                      <p className="text-2xl font-bold">{stats.total}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="pt-4">
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-lg bg-blue-100">
                      <MapPin className="w-5 h-5 text-blue-600" />
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Inside Valley</p>
                      <p className="text-2xl font-bold">{stats.inside}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="pt-4">
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-lg bg-orange-100">
                      <Globe className="w-5 h-5 text-orange-600" />
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Outside Valley</p>
                      <p className="text-2xl font-bold">{stats.outside}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="pt-4">
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-lg bg-red-100">
                      <RotateCcw className="w-5 h-5 text-red-600" />
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Redirected</p>
                      <p className="text-2xl font-bold">{stats.redirected}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="pt-4">
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-lg bg-emerald-100">
                      <CheckCircle className="w-5 h-5 text-emerald-600" />
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Delivered</p>
                      <p className="text-2xl font-bold">{stats.delivered}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          )}
        </TabsContent>
      </Tabs>

      {/* Filters & Table */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between flex-wrap gap-4">
            <CardTitle className="flex items-center gap-2">
              <Package className="w-5 h-5" />
              {activeTab === 'new' ? `Today's Orders - ${getNepalDateDisplay()}` : 'All Orders'}
              <span className="text-sm font-normal text-muted-foreground ml-2">
                (Live updates enabled)
              </span>
            </CardTitle>
            <div className="flex items-center gap-2 flex-wrap">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  placeholder="Search client, phone, #ref ID..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="pl-9 w-[220px]"
                />
              </div>
              <Select value={deliveryFilter} onValueChange={setDeliveryFilter}>
                <SelectTrigger className="w-[160px]">
                  <SelectValue placeholder="Delivery" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Deliveries</SelectItem>
                  <SelectItem value="INSIDE_VALLEY">Inside Valley</SelectItem>
                  <SelectItem value="OUTSIDE_VALLEY">Outside Valley</SelectItem>
                </SelectContent>
              </Select>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-[160px]">
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Statuses</SelectItem>
                  <SelectItem value="CONFIRMED">Confirmed</SelectItem>
                  <SelectItem value="REDIRECT">Redirected</SelectItem>
                  <SelectItem value="DISPATCHED">Dispatched</SelectItem>
                  <SelectItem value="DELIVERED">Delivered</SelectItem>
                  <SelectItem value="CANCELLED">Cancelled</SelectItem>
                </SelectContent>
              </Select>
              <Select value={staffFilter} onValueChange={setStaffFilter}>
                <SelectTrigger className="w-[160px]">
                  <SelectValue placeholder="All Staff" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Staff</SelectItem>
                  {staff.map((s) => (
                    <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {(deliveryFilter !== 'all' || statusFilter !== 'all' || staffFilter !== 'all' || search) && (
                <Button variant="ghost" size="sm" onClick={clearFilters}>
                  Clear
                </Button>
              )}
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="table-header">Client</TableHead>
                  <TableHead className="table-header">Contact</TableHead>
                  <TableHead className="table-header">Products</TableHead>
                  <TableHead className="table-header">Amount</TableHead>
                  <TableHead className="table-header">Delivery</TableHead>
                  <TableHead className="table-header">Branch</TableHead>
                  <TableHead className="table-header">Staff</TableHead>
                  <TableHead className="table-header">Status</TableHead>
                  <TableHead className="table-header">Remark</TableHead>
                  <TableHead className="table-header">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {pagedOrders.map((order) => {
                  const orderItems = (order as any).order_items || [];
                  const productDisplay = orderItems.length > 0 
                    ? orderItems.map((item: any) => `(${item.quantity || 1}) ${item.product_name}`).join(', ')
                    : `(${order.quantity || 1}) ${(order.products as any)?.name || '-'}`;
                  const totalAmount = orderItems.length > 0
                    ? orderItems.reduce((sum: number, item: any) => sum + (item.total_price || 0), 0)
                    : order.amount || 0;
                  
                  const clientName = (order.leads as any)?.client_name || (order as any).customers?.customer_name || '-';
                  const contactNumber = (order.leads as any)?.contact_number || (order as any).customers?.phone_number || '-';
                  const confirmedBy = Array.isArray((order as any).confirmed_by_profile) 
                    ? (order as any).confirmed_by_profile[0] 
                    : (order as any).confirmed_by_profile;
                  const salesPerson = Array.isArray(order.profiles) 
                    ? (order.profiles as any)[0] 
                    : order.profiles;
                  const staffName = confirmedBy?.name || salesPerson?.name || '-';
                  
                  const canRedirect = !['DELIVERED', 'CANCELLED', 'REDIRECT', 'REDIRECTED'].includes(order.order_status || '');
                  const canMarkDelivered = !['DELIVERED', 'CANCELLED'].includes(order.order_status || '');
                  
                  return (
                    <TableRow key={order.id}>
                      <TableCell className="font-medium">{clientName}</TableCell>
                      <TableCell>{contactNumber}</TableCell>
                      <TableCell className="max-w-[200px]">
                        <span className="line-clamp-2">{productDisplay}</span>
                      </TableCell>
                      <TableCell>Rs. {totalAmount.toLocaleString()}</TableCell>
                      <TableCell>{getDeliveryBadge(order.delivery_location)}</TableCell>
                      <TableCell>{order.destination_branch || '-'}</TableCell>
                      <TableCell>{staffName}</TableCell>
                      <TableCell>{getStatusBadge(order.order_status)}</TableCell>
                      <TableCell className="max-w-[200px]">
                        <div className="flex flex-col gap-1">
                          {(order.leads as any)?.reference_id && (
                            <Badge variant="outline" className="bg-primary/10 text-primary border-primary/20 w-fit text-xs font-mono">
                              #{(order.leads as any).reference_id}
                            </Badge>
                          )}
                          <span className="truncate text-sm">{order.delivery_notes || '-'}</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleOpenRedirect(order)}
                            className="h-8 w-8 p-0"
                            title="View/Redirect"
                          >
                            <Eye className="w-4 h-4" />
                          </Button>
                          {canRedirect && (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleOpenRedirect(order)}
                              className="h-8 w-8 p-0 text-destructive hover:text-destructive"
                              title="Redirect Order"
                            >
                              <RotateCcw className="w-4 h-4" />
                            </Button>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}
                {filteredOrders.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={10} className="text-center py-8 text-muted-foreground">
                      {isLoading ? 'Loading...' : 'No orders found'}
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
          <DataPagination
            page={page}
            totalPages={totalPages}
            total={total}
            from={from}
            to={to}
            onPageChange={setPage}
            itemLabel="orders"
          />
        </CardContent>
      </Card>

      {/* Redirect Modal */}
      <LogisticsRedirectModal
        order={selectedOrder}
        isOpen={isRedirectModalOpen}
        onClose={handleCloseRedirect}
        userId={user?.id || ''}
        userName={profile?.name || ''}
      />
    </div>
  );
}
