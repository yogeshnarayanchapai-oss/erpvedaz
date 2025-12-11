import { useState, useEffect, useMemo } from 'react';
import { format, startOfDay, endOfDay, subDays } from 'date-fns';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { useLeads, useReturnLeadsToQueue, useAdminResendCNRToPool, Lead } from '@/hooks/useLeads';
import { useOrders } from '@/hooks/useOrders';
import { useProducts } from '@/hooks/useProducts';
import { useCallingStaff } from '@/hooks/useStaff';
import { useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useAutoMarkSeen } from '@/hooks/useViewState';
import { useCurrentStoreId } from '@/hooks/useCurrentStoreId';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { DateRangeFilter, DateRange } from '@/components/ui/DateRangeFilter';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Phone, Search, RotateCcw, CheckSquare, Send, Plus, ArrowRightLeft, Users, Package, Eye, Edit, Lock, UserPlus } from 'lucide-react';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { getLeadStatusBadgeClass, formatStatusLabel } from '@/lib/statusColors';
import { DeleteLeadsButton } from '@/components/leads/DeleteLeadsButton';
import { FormattedDate } from '@/components/FormattedDate';
import { BulkAddLeadsForm } from '@/components/leads/BulkAddLeadsForm';
import { ImportLeadsDialog } from '@/components/leads/ImportLeadsDialog';
import { AdminTransferLeadsModal } from '@/components/admin/AdminTransferLeadsModal';
import { TodayTransferProgress } from '@/components/admin/TodayTransferProgress';
import { LeadDetailSheet } from '@/components/leads/LeadDetailSheet';
import { toast } from 'sonner';
import { FileSpreadsheet } from 'lucide-react';
import { matchesReferenceId, isReferenceIdSearch } from '@/lib/referenceIdSearch';

export default function AdminLeads() {
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();
  const today = new Date();
  const queryClient = useQueryClient();
  const { profile } = useAuth();
  const storeId = useCurrentStoreId();
  
  // Read initial values from URL params
  const initialFromParam = searchParams.get('from');
  const initialToParam = searchParams.get('to');
  const initialStatusParam = searchParams.get('status');
  
  // Tab state: 'today' or 'all'
  const [activeTab, setActiveTab] = useState<'today' | 'all'>(() => {
    // If URL params have a date range that's not today, show 'all'
    if (initialFromParam || initialToParam) {
      const todayStr = format(today, 'yyyy-MM-dd');
      if (initialFromParam !== todayStr || initialToParam !== todayStr) {
        return 'all';
      }
    }
    return 'today';
  });

  const [dateRange, setDateRange] = useState<DateRange>(() => {
    if (initialFromParam && initialToParam) {
      return {
        from: startOfDay(new Date(initialFromParam)),
        to: endOfDay(new Date(initialToParam)),
      };
    }
    return {
      from: startOfDay(today),
      to: endOfDay(today),
    };
  });
  
  const [selectedProduct, setSelectedProduct] = useState<string>('all');
  const [selectedStatus, setSelectedStatus] = useState<string>(initialStatusParam || 'all');
  const [search, setSearch] = useState('');
  const [selectedLeads, setSelectedLeads] = useState<string[]>([]);
  const [showReturnDialog, setShowReturnDialog] = useState(false);
  const [showAddLeadDialog, setShowAddLeadDialog] = useState(false);
  const [showImportDialog, setShowImportDialog] = useState(false);
  const [showTransferLeadsModal, setShowTransferLeadsModal] = useState(false);
  const [selectedLeadForDetail, setSelectedLeadForDetail] = useState<Lead | null>(null);
  const [showLeadDetail, setShowLeadDetail] = useState(false);
  const [assignedToFilter, setAssignedToFilter] = useState<string>('all');
  const [isReassignOpen, setIsReassignOpen] = useState(false);
  const [reassignStaffId, setReassignStaffId] = useState('');

  const returnLeadsToQueue = useReturnLeadsToQueue();
  const resendCNRToPool = useAdminResendCNRToPool();
  const [showPoolDialog, setShowPoolDialog] = useState(false);

  // Check if user has permission (ADMIN, OWNER or MANAGER role)
  const canReturnLeads = profile?.role === 'ADMIN' || profile?.role === 'OWNER' || profile?.role === 'LEADS';
  const canManageLeads = profile?.role === 'ADMIN' || profile?.role === 'OWNER' || profile?.role === 'MANAGER';

  // Update date range when tab changes
  useEffect(() => {
    if (activeTab === 'today') {
      setDateRange({
        from: startOfDay(today),
        to: endOfDay(today),
      });
    } else {
      // For 'all' tab, show last 30 days by default if not set from URL
      if (!initialFromParam && !initialToParam) {
        setDateRange({
          from: startOfDay(subDays(today, 30)),
          to: endOfDay(today),
        });
      }
    }
  }, [activeTab]);

  // Clear URL params after reading
  useEffect(() => {
    if (searchParams.toString()) {
      const timer = setTimeout(() => {
        setSearchParams({});
      }, 100);
      return () => clearTimeout(timer);
    }
  }, []);

  const dateFrom = format(dateRange.from, 'yyyy-MM-dd');
  const dateTo = format(dateRange.to, 'yyyy-MM-dd');

  const { data: leads = [], isLoading, isFetched } = useLeads({ dateFrom, dateTo });
  const { data: orders = [] } = useOrders({ dateFrom, dateTo });
  const { data: products = [] } = useProducts();
  const { data: callingStaff = [] } = useCallingStaff();

  // Fetch total remaining in pool (all time, not filtered by date)
  const [totalPoolCount, setTotalPoolCount] = useState(0);
  const [dateRangeAssignedLeads, setDateRangeAssignedLeads] = useState<{ assigned_to_user_id: string; lead_id: string; product_id: string | null }[]>([]);
  const [allStoreLeads, setAllStoreLeads] = useState<{ id: string; date: string | null; product_id: string | null; assigned_to_user_id: string | null; pool_status: string | null; assigned_at: string | null; status: string | null }[]>([]);
  
  // Fetch all store leads for product summary (not filtered by date range)
  useEffect(() => {
    const fetchAllStoreLeads = async () => {
      if (!storeId) return;
      const { data } = await supabase
        .from('leads')
        .select('id, date, product_id, assigned_to_user_id, pool_status, assigned_at, status')
        .eq('store_id', storeId);
      
      setAllStoreLeads(data || []);
      // Count pool leads
      const poolLeads = (data || []).filter(l => l.pool_status === 'IN_POOL' && !l.assigned_to_user_id);
      setTotalPoolCount(poolLeads.length);
    };
    fetchAllStoreLeads();
  }, [storeId, leads]); // Refresh when leads change

  // Fetch leads assigned in selected date range from leads table (aggregates ALL assignments regardless of creator)
  useEffect(() => {
    const fetchDateRangeAssignedLeads = async () => {
      if (!storeId) return;
      const { data } = await supabase
        .from('leads')
        .select('id, assigned_to_user_id, product_id')
        .eq('store_id', storeId)
        .not('assigned_to_user_id', 'is', null)
        .gte('assigned_at', `${dateFrom}T00:00:00`)
        .lte('assigned_at', `${dateTo}T23:59:59`);
      setDateRangeAssignedLeads(data?.map(d => ({ 
        assigned_to_user_id: d.assigned_to_user_id!, 
        lead_id: d.id,
        product_id: d.product_id 
      })) || []);
    };
    fetchDateRangeAssignedLeads();

    // Subscribe to real-time changes
    const channel = supabase
      .channel('admin-leads-assigned-realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'leads' }, () => {
        fetchDateRangeAssignedLeads();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [dateFrom, dateTo, storeId]);

  // Mark section as seen when data loads (for badge clearing)
  useAutoMarkSeen('all_leads', isFetched && !isLoading);

  // Real-time subscription
  useEffect(() => {
    const channel = supabase
      .channel('admin-leads-realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'leads' }, () => {
        queryClient.invalidateQueries({ queryKey: ['leads'] });
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [queryClient]);

  const filteredLeads = leads.filter((lead) => {
    const matchesProduct = selectedProduct === 'all' || lead.product_id === selectedProduct;
    // Handle special "pending_transfer" filter
    const matchesStatus = 
      selectedStatus === 'all' ? true :
      selectedStatus === 'pending_transfer' ? lead.is_transferred === false :
      lead.status === selectedStatus;
    // Handle assigned to filter
    const matchesAssignedTo = 
      assignedToFilter === 'all' ? true :
      assignedToFilter === 'UNASSIGNED' ? !lead.assigned_to_user_id :
      lead.assigned_to_user_id === assignedToFilter;
    // Check for reference ID search
    const matchesRefId = isReferenceIdSearch(search) && matchesReferenceId(lead.reference_id, search);
    
    const matchesSearch =
      !search ||
      matchesRefId ||
      lead.client_name.toLowerCase().includes(search.toLowerCase()) ||
      lead.contact_number.includes(search);
    return matchesProduct && matchesStatus && matchesAssignedTo && matchesSearch;
  }).sort((a, b) => {
    // Sort by created_at descending - newest first
    return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
  });

  // Selection handlers
  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedLeads(filteredLeads.map(lead => lead.id));
    } else {
      setSelectedLeads([]);
    }
  };

  const handleSelectLead = (leadId: string, checked: boolean) => {
    if (checked) {
      setSelectedLeads(prev => [...prev, leadId]);
    } else {
      setSelectedLeads(prev => prev.filter(id => id !== leadId));
    }
  };

  const isAllSelected = filteredLeads.length > 0 && selectedLeads.length === filteredLeads.length;
  const isSomeSelected = selectedLeads.length > 0 && selectedLeads.length < filteredLeads.length;

  // Staff Transfer Summary calculation - aggregated from ALL assignments (via assigned_at)
  const staffTransferSummary = useMemo(() => {
    return callingStaff.map(staff => {
      // Transfer = count leads assigned to this staff in date range (from ALL creators)
      const transferCount = dateRangeAssignedLeads.filter(l => l.assigned_to_user_id === staff.id).length;
      
      // New = leads currently assigned to this staff with NEW/ASSIGNED/null status (from all store leads)
      const staffLeads = allStoreLeads.filter(l => l.assigned_to_user_id === staff.id);
      const newLeads = staffLeads.filter(l => 
        l.status === 'ASSIGNED' || l.status === 'NEW' || !l.status
      ).length;
      
      // Products: get product counts from dateRangeAssignedLeads directly (uses product_id already fetched)
      const staffAssignments = dateRangeAssignedLeads.filter(l => l.assigned_to_user_id === staff.id);
      
      const productCounts: Record<string, number> = {};
      staffAssignments.forEach(assignment => {
        if (assignment.product_id) {
          const productName = products.find(p => p.id === assignment.product_id)?.name;
          if (productName) {
            productCounts[productName] = (productCounts[productName] || 0) + 1;
          }
        }
      });
      
      const productEntries = Object.entries(productCounts);
      const fullProductList = productEntries.map(([name, qty]) => `${name} (${qty})`).join(', ');
      const shortProductList = productEntries.map(([name, qty]) => `${name.split(' ')[0]} (${qty})`).join(', ');
      const displayProducts = fullProductList.length > 40 ? shortProductList : fullProductList;

      return {
        id: staff.id,
        name: staff.name,
        transferCount,
        newLeads,
        products: displayProducts || '-',
        fullProducts: fullProductList || '-',
      };
    }).filter(s => s.transferCount > 0) // Only show staff with transferred leads in date range
      .sort((a, b) => b.transferCount - a.transferCount);
  }, [callingStaff, allStoreLeads, dateRangeAssignedLeads, products]);

  // Product Leads Summary calculation - filtered by selected date range using lead.date field
  const productSummary = useMemo(() => {
    return products.map(product => {
      const productLeads = allStoreLeads.filter(l => l.product_id === product.id);
      
      // Leads = total leads where lead.date is within date range
      const leadsInRange = productLeads.filter(l => {
        if (!l.date) return false;
        const leadDate = l.date.split('T')[0]; // Extract date part if timestamp
        return leadDate >= dateFrom && leadDate <= dateTo;
      }).length;
      
      // Transferred = total leads assigned in date range (by assigned_at)
      const transferredInRange = productLeads.filter(l => {
        if (!l.assigned_at) return false;
        const assignedDate = l.assigned_at.split('T')[0];
        return assignedDate >= dateFrom && assignedDate <= dateTo;
      }).length;
      
      // Remaining = Leads - Transferred
      const remaining = leadsInRange - transferredInRange;

      return {
        id: product.id,
        name: product.name,
        leadsInRange,
        transferredInRange,
        remaining: Math.max(0, remaining),
      };
    }).filter(p => p.leadsInRange > 0 || p.transferredInRange > 0);
  }, [products, allStoreLeads, dateFrom, dateTo]);

  // Transfer Progress calculation - uses date filter and store filter
  const transferProgressStats = useMemo(() => {
    // Leads in date range: leads where lead.date is within selected date range
    const leadsInRange = allStoreLeads.filter(l => {
      if (!l.date) return false;
      const leadDate = l.date.split('T')[0];
      return leadDate >= dateFrom && leadDate <= dateTo;
    });
    const totalLeadsInRange = leadsInRange.length;
    
    // Transferred in date range: leads assigned within selected date range
    const transferredInRange = allStoreLeads.filter(l => {
      if (!l.assigned_at) return false;
      const assignedDate = l.assigned_at.split('T')[0];
      return assignedDate >= dateFrom && assignedDate <= dateTo;
    }).length;
    
    // Remaining = total leads in range minus transferred in range
    const remainingInRange = Math.max(0, totalLeadsInRange - transferredInRange);
    
    // Order stats for date range
    const ordersInRange = orders.filter(o => {
      if (!o.order_date) return false;
      const orderDate = o.order_date.split('T')[0];
      return orderDate >= dateFrom && orderDate <= dateTo;
    });
    const confirmedOrders = ordersInRange.filter(o => 
      ['CONFIRMED', 'DELIVERED', 'DISPATCHED'].includes(o.order_status || '')
    ).length;
    const insideValley = ordersInRange.filter(o => o.delivery_location === 'INSIDE_VALLEY').length;
    const outsideValley = ordersInRange.filter(o => o.delivery_location === 'OUTSIDE_VALLEY').length;
    
    return { 
      totalLeadsInRange, 
      transferredInRange, 
      remainingInRange, 
      confirmedOrders, 
      insideValley, 
      outsideValley,
      totalRemainingInPool: totalPoolCount
    };
  }, [allStoreLeads, orders, dateFrom, dateTo, totalPoolCount]);

  // Check if "Send back to Leads" button should be shown
  const showReturnButton = selectedStatus === 'CALL_NOT_RECEIVED' && canReturnLeads;
  const canReturn = showReturnButton && selectedLeads.length > 0;

  const handleReturnToLeads = async () => {
    try {
      await returnLeadsToQueue.mutateAsync(selectedLeads);
      setSelectedLeads([]);
      setShowReturnDialog(false);
    } catch (error) {
      // Error is handled by the mutation
    }
  };

  const handleSendToPool = async () => {
    try {
      await resendCNRToPool.mutateAsync(selectedLeads);
      setSelectedLeads([]);
      setShowPoolDialog(false);
    } catch (error) {
      // Error is handled by the mutation
    }
  };

  // Lead detail handlers
  const handleViewLead = (lead: Lead) => {
    setSelectedLeadForDetail(lead);
    setShowLeadDetail(true);
  };

  const handleEditLead = (lead: Lead) => {
    // Open the lead detail sheet which has edit capabilities
    setSelectedLeadForDetail(lead);
    setShowLeadDetail(true);
  };

  const handleCreateOrderFromLead = (lead: Lead) => {
    // Navigate to order creation with lead data pre-filled
    toast.info('Creating order from lead...');
    navigate(`/calling/orders?createFromLead=${lead.id}`);
  };

  const handleCallLead = (phone: string) => {
    window.location.href = `tel:${phone}`;
  };

  const handleWhatsAppLead = (phone: string) => {
    window.open(`https://wa.me/${phone.replace(/\D/g, '')}`, '_blank');
  };

  const handleBulkReassign = async () => {
    if (!reassignStaffId || selectedLeads.length === 0) return;
    try {
      const { error } = await supabase
        .from('leads')
        .update({
          assigned_to_user_id: reassignStaffId,
          status: 'ASSIGNED',
          current_team: 'CALLING',
          assigned_at: new Date().toISOString(),
          remark: '', // Clear remark when reassigning to new staff
        })
        .in('id', selectedLeads);

      if (error) throw error;

      // Log transfers
      const transfers = selectedLeads.map(leadId => ({
        lead_id: leadId,
        from_user_id: profile?.id,
        to_user_id: reassignStaffId,
        transferred_at: new Date().toISOString(),
      }));
      await supabase.from('lead_transfers').insert(transfers);

      // Send notification to the new assigned staff
      await supabase.from('notifications').insert({
        type: 'LEAD_ASSIGNED',
        title: 'New Leads Reassigned',
        message: `Assigned new ${selectedLeads.length} lead${selectedLeads.length > 1 ? 's' : ''} to you.`,
        target_user_id: reassignStaffId,
        actor_id: profile?.id,
        actor_name: profile?.name || 'Admin',
        portal: 'CALLING',
        link_path: '/calling/leads',
      });

      toast.success(`Reassigned ${selectedLeads.length} leads`);
      setSelectedLeads([]);
      setIsReassignOpen(false);
      setReassignStaffId('');
      queryClient.invalidateQueries({ queryKey: ['leads'] });
    } catch (error: any) {
      toast.error(error.message || 'Failed to reassign leads');
    }
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-bold">Leads</h1>
          <p className="text-muted-foreground">View and filter all leads in the system</p>
        </div>
        <div className="flex items-center gap-3">
          <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as 'today' | 'all')}>
            <TabsList>
              <TabsTrigger value="today">Today</TabsTrigger>
              <TabsTrigger value="all">All Leads</TabsTrigger>
            </TabsList>
          </Tabs>
          {canManageLeads && (
            <>
              <Button variant="outline" onClick={() => setShowTransferLeadsModal(true)} className="gap-2">
                <ArrowRightLeft className="w-4 h-4" />
                Transfer Leads
              </Button>
              <Button variant="outline" onClick={() => setShowImportDialog(true)} className="gap-2">
                <FileSpreadsheet className="w-4 h-4" />
                Import
              </Button>
              <Button onClick={() => setShowAddLeadDialog(true)} className="gap-2">
                <Plus className="w-4 h-4" />
                Add Leads
              </Button>
            </>
          )}
        </div>
      </div>

      {/* Transfer Progress Widget with Stats - filtered by date range */}
      {canManageLeads && (
        <TodayTransferProgress
          totalTodayLeads={transferProgressStats.totalLeadsInRange}
          transferredToday={transferProgressStats.transferredInRange}
          remainingTodayLeads={transferProgressStats.remainingInRange}
          confirmedOrders={transferProgressStats.confirmedOrders}
          insideValley={transferProgressStats.insideValley}
          outsideValley={transferProgressStats.outsideValley}
          totalRemainingInPool={transferProgressStats.totalRemainingInPool}
          dateLabel={dateFrom === dateTo ? 'Today' : `${dateFrom} to ${dateTo}`}
        />
      )}

      {/* Leads Overview - Admin Summary Cards */}
      {canManageLeads && (
        <div className="grid lg:grid-cols-2 gap-6">
          {/* Product Leads Summary */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Package className="w-5 h-5" />
                Product Leads Summary
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="table-header">Product</TableHead>
                      <TableHead className="table-header text-center">Leads</TableHead>
                      <TableHead className="table-header text-center">Transferred</TableHead>
                      <TableHead className="table-header text-center">Remaining</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {productSummary.length > 0 ? (
                      productSummary.map((product) => (
                        <TableRow key={product.id} className="hover:bg-muted/50">
                          <TableCell className="font-medium">{product.name}</TableCell>
                          <TableCell className="text-center">
                            <Badge variant="outline" className="bg-info/5">
                              {product.leadsInRange.toLocaleString()}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-center">
                            <Badge variant="outline" className="bg-success/5">
                              {product.transferredInRange.toLocaleString()}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-center">
                            <Badge variant="outline" className="bg-warning/5">
                              {product.remaining.toLocaleString()}
                            </Badge>
                          </TableCell>
                        </TableRow>
                      ))
                    ) : (
                      <TableRow>
                        <TableCell colSpan={4} className="text-center py-6 text-muted-foreground">
                          No leads transferred in selected date range
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>

          {/* Staff Transfer Summary */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Users className="w-5 h-5" />
                Staff Transfer Summary
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="table-header">Staff Name</TableHead>
                      <TableHead className="table-header text-center">Transferred</TableHead>
                      <TableHead className="table-header text-center">New</TableHead>
                      <TableHead className="table-header">Products</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {staffTransferSummary.length > 0 ? (
                      staffTransferSummary.map((staff) => (
                        <TableRow key={staff.id} className="hover:bg-muted/50">
                          <TableCell className="font-medium">{staff.name}</TableCell>
                          <TableCell className="text-center">
                            <Badge variant="outline" className="bg-primary/5">
                              {staff.transferCount.toLocaleString()}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-center">
                            <Badge variant="outline" className="bg-secondary/5">
                              {staff.newLeads.toLocaleString()}
                            </Badge>
                          </TableCell>
                          <TableCell 
                            className="text-sm text-muted-foreground max-w-[200px]"
                            title={staff.fullProducts}
                          >
                            {staff.products}
                          </TableCell>
                        </TableRow>
                      ))
                    ) : (
                      <TableRow>
                        <TableCell colSpan={4} className="text-center py-6 text-muted-foreground">
                          No transfers in selected date range
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Filters */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-wrap items-center gap-4">
            {activeTab === 'all' && (
              <>
                <DateRangeFilter value={dateRange} onChange={setDateRange} />
                <span className="text-xs text-muted-foreground">Filters based on lead creation date</span>
              </>
            )}
            <Select value={selectedProduct} onValueChange={setSelectedProduct}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="All Products" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Products</SelectItem>
                {products.map((p) => (
                  <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={selectedStatus} onValueChange={setSelectedStatus}>
              <SelectTrigger className="w-[150px]">
                <SelectValue placeholder="All Statuses" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Statuses</SelectItem>
                <SelectItem value="pending_transfer">Pending Transfer</SelectItem>
                <SelectItem value="NEW">New</SelectItem>
                <SelectItem value="ASSIGNED">Assigned</SelectItem>
                <SelectItem value="IN_PROGRESS">In Progress</SelectItem>
                <SelectItem value="CONFIRMED">Confirmed</SelectItem>
                <SelectItem value="FOLLOW_UP">Follow Up</SelectItem>
                <SelectItem value="CALL_NOT_RECEIVED">Call Not Received</SelectItem>
                <SelectItem value="CANCELLED">Cancelled</SelectItem>
                <SelectItem value="REDIRECT">Redirect</SelectItem>
              </SelectContent>
            </Select>
            <Select value={assignedToFilter} onValueChange={setAssignedToFilter}>
              <SelectTrigger className="w-[150px]">
                <SelectValue placeholder="Assigned To" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Staff</SelectItem>
                <SelectItem value="UNASSIGNED">Unassigned</SelectItem>
                {callingStaff.map((staff) => (
                  <SelectItem key={staff.id} value={staff.id}>{staff.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <div className="relative flex-1 min-w-[200px]">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Search by name or phone..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9"
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Leads Table */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <Phone className="w-5 h-5 text-primary" />
            {activeTab === 'today' ? "Today's Leads" : 'Leads'} ({filteredLeads.length})
          </CardTitle>
          <div className="flex items-center gap-2">
            {showReturnButton && (
              <>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setSelectedLeads(filteredLeads.map(l => l.id))}
                  disabled={filteredLeads.length === 0 || selectedLeads.length === filteredLeads.length}
                  className="gap-2"
                >
                  <CheckSquare className="w-4 h-4" />
                  Select All CNR ({filteredLeads.length})
                </Button>
                <Button
                  variant="default"
                  size="sm"
                  onClick={() => setShowPoolDialog(true)}
                  disabled={!canReturn || resendCNRToPool.isPending}
                  className="gap-2"
                >
                  <Send className="w-4 h-4" />
                  Send to Leads Pool {selectedLeads.length > 0 && `(${selectedLeads.length})`}
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setShowReturnDialog(true)}
                  disabled={!canReturn || returnLeadsToQueue.isPending}
                  className="gap-2"
                >
                  <RotateCcw className="w-4 h-4" />
                  Send back to Leads {selectedLeads.length > 0 && `(${selectedLeads.length})`}
                </Button>
              </>
            )}
            {selectedLeads.length > 0 && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => setIsReassignOpen(true)}
                className="gap-2"
              >
                <UserPlus className="w-4 h-4" />
                Reassign ({selectedLeads.length})
              </Button>
            )}
            <DeleteLeadsButton 
              selectedIds={selectedLeads} 
              onDeleteComplete={() => setSelectedLeads([])} 
            />
          </div>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="table-header w-[60px] text-center sticky left-0 bg-background z-10">S.No</TableHead>
                  <TableHead className="w-[50px] text-center">
                    <Checkbox 
                      checked={isAllSelected}
                      onCheckedChange={handleSelectAll}
                      aria-label="Select all"
                      className={isSomeSelected ? 'data-[state=checked]:bg-primary/50' : ''}
                    />
                  </TableHead>
                  <TableHead className="table-header">Date</TableHead>
                  <TableHead className="table-header">Customer</TableHead>
                  <TableHead className="table-header">Contact</TableHead>
                  <TableHead className="table-header">Product</TableHead>
                  <TableHead className="table-header">Branch</TableHead>
                  <TableHead className="table-header">Status</TableHead>
                  <TableHead className="table-header">Assigned To</TableHead>
                  <TableHead className="table-header">Created By</TableHead>
                  <TableHead className="table-header text-center">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredLeads.map((lead, index) => (
                  <TableRow key={lead.id} className="cursor-pointer hover:bg-muted/50" onClick={() => handleViewLead(lead)}>
                    <TableCell className="w-[60px] text-center font-medium text-muted-foreground sticky left-0 bg-background z-10">
                      {index + 1}
                    </TableCell>
                    <TableCell className="w-[50px] text-center" onClick={(e) => e.stopPropagation()}>
                      <Checkbox
                        checked={selectedLeads.includes(lead.id)}
                        onCheckedChange={(checked) => handleSelectLead(lead.id, !!checked)}
                        aria-label={`Select ${lead.client_name}`}
                      />
                    </TableCell>
                    <TableCell><FormattedDate date={lead.date} /></TableCell>
                    <TableCell className="font-medium">{lead.client_name}</TableCell>
                    <TableCell>{lead.contact_number}</TableCell>
                    <TableCell>{lead.products?.name || '-'}</TableCell>
                    <TableCell>{lead.destination_branch || '-'}</TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1">
                        <Badge variant="outline" className={getLeadStatusBadgeClass(lead.status || 'NEW')}>
                          {formatStatusLabel(lead.status || 'NEW')}
                        </Badge>
                        {(lead.status === 'CONFIRMED' || lead.order_id) && (
                          <TooltipProvider>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Lock className="w-3 h-3 text-muted-foreground" />
                              </TooltipTrigger>
                              <TooltipContent>
                                <p>This lead is confirmed and cannot be transferred</p>
                              </TooltipContent>
                            </Tooltip>
                          </TooltipProvider>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      {(lead.status === 'CONFIRMED' || lead.order_id) ? (
                        <span className="text-muted-foreground">{lead.assigned_to?.name || '-'}</span>
                      ) : (
                        lead.assigned_to?.name || '-'
                      )}
                    </TableCell>
                    <TableCell className="text-muted-foreground">{lead.created_by_staff?.name || '-'}</TableCell>
                    <TableCell className="text-center" onClick={(e) => e.stopPropagation()}>
                      <div className="flex items-center justify-center gap-1">
                        <Button variant="ghost" size="sm" onClick={() => handleViewLead(lead)} className="h-8 w-8 p-0">
                          <Eye className="w-4 h-4" />
                        </Button>
                        <Button variant="ghost" size="sm" onClick={() => handleEditLead(lead)} className="h-8 w-8 p-0">
                          <Edit className="w-4 h-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
                {filteredLeads.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={11} className="text-center py-8 text-muted-foreground">
                      {isLoading ? 'Loading...' : 'No leads found'}
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* Send to Pool Dialog */}
      <AlertDialog open={showPoolDialog} onOpenChange={setShowPoolDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Send CNR leads to Leads Pool?</AlertDialogTitle>
            <AlertDialogDescription>
              These {selectedLeads.length} CNR lead{selectedLeads.length > 1 ? 's' : ''} will be added to the CNR pool for the Leads team to reassign. Continue?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction 
              onClick={handleSendToPool}
              disabled={resendCNRToPool.isPending}
            >
              {resendCNRToPool.isPending ? 'Processing...' : 'Confirm'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Return to Leads Dialog */}
      <AlertDialog open={showReturnDialog} onOpenChange={setShowReturnDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Send selected leads back to Leads queue?</AlertDialogTitle>
            <AlertDialogDescription>
              These {selectedLeads.length} Call Not Received lead{selectedLeads.length > 1 ? 's' : ''} will be returned to the Leads Portal as fresh leads. Assigned caller will be cleared. Continue?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction 
              onClick={handleReturnToLeads}
              disabled={returnLeadsToQueue.isPending}
            >
              {returnLeadsToQueue.isPending ? 'Processing...' : 'Confirm'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Bulk Add Leads Form */}
      <BulkAddLeadsForm 
        open={showAddLeadDialog} 
        onOpenChange={setShowAddLeadDialog} 
      />

      {/* Import Leads Dialog */}
      <ImportLeadsDialog 
        open={showImportDialog} 
        onOpenChange={setShowImportDialog}
        portalType="ADMIN"
      />
      
      {/* Admin Transfer Leads Modal */}
      <AdminTransferLeadsModal
        open={showTransferLeadsModal}
        onOpenChange={setShowTransferLeadsModal}
      />

      {/* Lead Detail Sheet */}
      <LeadDetailSheet
        lead={selectedLeadForDetail}
        open={showLeadDetail}
        onOpenChange={setShowLeadDetail}
        onEdit={handleEditLead}
        onCreateOrder={handleCreateOrderFromLead}
        onCall={handleCallLead}
        onWhatsApp={handleWhatsAppLead}
      />

      {/* Reassign Dialog */}
      <Dialog open={isReassignOpen} onOpenChange={setIsReassignOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Reassign {selectedLeads.length} Lead(s)</DialogTitle>
          </DialogHeader>
          <div className="py-4">
            <label className="text-sm font-medium">Select Staff</label>
            <Select value={reassignStaffId} onValueChange={setReassignStaffId}>
              <SelectTrigger className="mt-2">
                <SelectValue placeholder="Choose staff member" />
              </SelectTrigger>
              <SelectContent>
                {callingStaff.map((staff) => (
                  <SelectItem key={staff.id} value={staff.id}>{staff.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsReassignOpen(false)}>Cancel</Button>
            <Button onClick={handleBulkReassign} disabled={!reassignStaffId}>Reassign</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}