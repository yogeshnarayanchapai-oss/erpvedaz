import { useState, useMemo, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useLeads, useTransferLeads } from '@/hooks/useLeads';
import { useLeadAssignmentCounts } from '@/hooks/useLeadAssignmentCounts';
import { useProducts } from '@/hooks/useProducts';
import { useCallingStaff } from '@/hooks/useStaff';
import { useQueryClient } from '@tanstack/react-query';
import { useCurrentStore } from '@/contexts/CurrentStoreContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { DateRangeFilter, DateRange } from '@/components/ui/DateRangeFilter';
import { Checkbox } from '@/components/ui/checkbox';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Download, Upload, Search, Send, Edit, UserPlus } from 'lucide-react';
import { format, startOfDay, endOfDay, isToday } from 'date-fns';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { getLeadStatusBadgeClass, formatStatusLabel } from '@/lib/statusColors';
import { DeleteLeadsButton } from '@/components/leads/DeleteLeadsButton';
import { FormattedDate } from '@/components/FormattedDate';
import { cn } from '@/lib/utils';
import { matchesReferenceId, isReferenceIdSearch } from '@/lib/referenceIdSearch';
import { BulkEditLeadsForm } from '@/components/leads/BulkEditLeadsForm';
import { DuplicateBadge } from '@/components/leads/DuplicateBadge';
import { useClientPagination } from '@/hooks/useClientPagination';
import { DataPagination } from '@/components/ui/data-pagination';
import { DEFAULT_PAGE_SIZE } from '@/hooks/usePagination';

const STATUS_OPTIONS = ['ALL', 'DUPLICATE', 'NEW', 'ASSIGNED', 'IN_PROGRESS', 'CONFIRMED', 'FOLLOW_UP', 'CALL_NOT_RECEIVED', 'CANCELLED', 'REDIRECT'];

type LeadBucketFilter = 'ALL' | 'NEW' | 'FOLLOWUP' | 'CNR' | 'CANCELLED' | 'CONFIRMED';

export default function LeadsAll() {
  const today = new Date();
  const queryClient = useQueryClient();
  const { currentStore } = useCurrentStore();
  const [searchParams] = useSearchParams();
  
  // Read initial bucket filter from URL
  const initialBucket = (searchParams.get('bucket') as LeadBucketFilter) || 'ALL';
  
  const [dateRange, setDateRange] = useState<DateRange>({
    from: startOfDay(today),
    to: endOfDay(today),
  });
  const [productFilter, setProductFilter] = useState<string>('ALL');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [bucketFilter, setBucketFilter] = useState<LeadBucketFilter>(initialBucket);
  const [assignedToFilter, setAssignedToFilter] = useState<string>('ALL');
  const [search, setSearch] = useState('');
  const [isImportOpen, setIsImportOpen] = useState(false);
  const [isTransferOpen, setIsTransferOpen] = useState(false);
  const [isReassignOpen, setIsReassignOpen] = useState(false);
  const [isBulkEditOpen, setIsBulkEditOpen] = useState(false);
  const [importFile, setImportFile] = useState<File | null>(null);
  const [importing, setImporting] = useState(false);
  const [selectedLeads, setSelectedLeads] = useState<string[]>([]);
  const [reassignStaffId, setReassignStaffId] = useState<string>('');

  // IMPORTANT: Apply date/product/status filtering at the database level.
  // Without this, the page fetches the entire store's leads and frequently times out.
  const serverFilters = useMemo(() => {
    const dateFrom = format(dateRange.from, 'yyyy-MM-dd');
    const dateTo = format(dateRange.to, 'yyyy-MM-dd');

    const status =
      statusFilter !== 'ALL' && statusFilter !== 'DUPLICATE'
        ? (statusFilter as any)
        : undefined;

    const assignedTo =
      assignedToFilter !== 'ALL' && assignedToFilter !== 'UNASSIGNED'
        ? assignedToFilter
        : undefined;

    return {
      dateFrom,
      dateTo,
      productId: productFilter !== 'ALL' ? productFilter : undefined,
      status,
      assignedTo,
    };
  }, [dateRange, productFilter, statusFilter, assignedToFilter]);

  const { data: allLeads = [], isLoading, refetch } = useLeads(serverFilters);
  const { data: products = [] } = useProducts();
  const { data: callingStaff = [] } = useCallingStaff();
  const transferLeads = useTransferLeads();
  
  // Get transfer counts for the selected date range
  const { data: transferCounts } = useLeadAssignmentCounts({
    dateFrom: format(dateRange.from, 'yyyy-MM-dd'),
    dateTo: format(dateRange.to, 'yyyy-MM-dd'),
    excludeSelfCreated: true, // Count only admin-transferred leads
  });

  const [transferForm, setTransferForm] = useState({
    staffId: '',
    productId: '',
  });

  useEffect(() => {
    if (!currentStore?.id) return;
    const channel = supabase
      .channel(`leads-all-rt-${currentStore.id}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'leads', filter: `store_id=eq.${currentStore.id}` }, () => {
        queryClient.invalidateQueries({ queryKey: ['leads'] });
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [queryClient, currentStore?.id]);

  // Sync bucket filter with URL params
  useEffect(() => {
    const urlBucket = searchParams.get('bucket') as LeadBucketFilter;
    if (urlBucket && ['ALL', 'NEW', 'FOLLOWUP', 'CNR', 'CANCELLED', 'CONFIRMED'].includes(urlBucket)) {
      setBucketFilter(urlBucket);
    }
  }, [searchParams]);

  // Check if showing today's leads
  const isTodayFilter = isToday(dateRange.from) && isToday(dateRange.to);

  const filteredLeads = useMemo(() => {
    let leads = allLeads.filter(lead => {
      const leadDate = new Date(lead.date);
      const inDateRange = leadDate >= startOfDay(dateRange.from) && leadDate <= endOfDay(dateRange.to);
      const matchesProduct = productFilter === 'ALL' || lead.product_id === productFilter;
      const matchesStatus = statusFilter === 'ALL' ? true :
        statusFilter === 'DUPLICATE' ? lead.is_duplicate === true :
        lead.status === statusFilter;
      
      // Assigned to filter
      let matchesAssignedTo = assignedToFilter === 'ALL';
      if (assignedToFilter === 'UNASSIGNED') {
        matchesAssignedTo = !lead.assigned_to_user_id;
      } else if (assignedToFilter !== 'ALL') {
        matchesAssignedTo = lead.assigned_to_user_id === assignedToFilter;
      }
      
      // Bucket filter logic
      let matchesBucket = bucketFilter === 'ALL';
      if (bucketFilter === 'CNR') {
        matchesBucket = lead.lead_bucket === 'CNR_POOL' || lead.status === 'CALL_NOT_RECEIVED';
      } else if (bucketFilter === 'FOLLOWUP') {
        matchesBucket = lead.lead_bucket === 'FOLLOW_UP_POOL' || lead.current_team === 'FOLLOWUP' || lead.status === 'FOLLOW_UP';
      } else if (bucketFilter === 'NEW') {
        matchesBucket = lead.lead_bucket === 'NEW' && lead.status !== 'CALL_NOT_RECEIVED' && lead.status !== 'FOLLOW_UP' && lead.status !== 'CONFIRMED';
      } else if (bucketFilter === 'CANCELLED') {
        matchesBucket = lead.lead_bucket === 'CANCELLED';
      } else if (bucketFilter === 'CONFIRMED') {
        matchesBucket = lead.status === 'CONFIRMED';
      }
      
      // Check for reference ID search
      const matchesRefId = isReferenceIdSearch(search) && matchesReferenceId(lead.reference_id, search);
      
      const matchesSearch = search === '' || 
        matchesRefId ||
        lead.client_name.toLowerCase().includes(search.toLowerCase()) ||
        lead.contact_number.includes(search);
      
      return inDateRange && matchesProduct && matchesStatus && matchesBucket && matchesAssignedTo && matchesSearch;
    });

    // Sort: newest first, then unassigned leads first when viewing today's leads
    if (isTodayFilter) {
      leads = leads.sort((a, b) => {
        const aUnassigned = !a.assigned_to_user_id;
        const bUnassigned = !b.assigned_to_user_id;
        if (aUnassigned && !bUnassigned) return -1;
        if (!aUnassigned && bUnassigned) return 1;
        // Within same group, sort by created_at descending
        return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
      });
    } else {
      // For all other views, sort by created_at descending (newest first)
      leads = leads.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
    }

    return leads;
  }, [allLeads, dateRange, productFilter, statusFilter, bucketFilter, assignedToFilter, search, isTodayFilter]);

  // Client-side pagination — slices filteredLeads into 100/page for rendering.
  const { page: leadsPage, setPage: setLeadsPage, pagedRows: pagedLeads } =
    useClientPagination(filteredLeads, DEFAULT_PAGE_SIZE);

  // Count leads by bucket - CNR includes both teams (LEADS and CALLING)
  const bucketCounts = useMemo(() => {
    const counts = { ALL: 0, NEW: 0, FOLLOWUP: 0, CNR: 0, CANCELLED: 0, CONFIRMED: 0 };
    allLeads.forEach(lead => {
      counts.ALL++;
      // Check CONFIRMED first
      if (lead.status === 'CONFIRMED') {
        counts.CONFIRMED++;
      } else if (lead.lead_bucket === 'CNR_POOL' || lead.status === 'CALL_NOT_RECEIVED') {
        counts.CNR++;
      } else if (lead.lead_bucket === 'FOLLOW_UP_POOL' || lead.current_team === 'FOLLOWUP' || lead.status === 'FOLLOW_UP') {
        counts.FOLLOWUP++;
      } else if (lead.lead_bucket === 'NEW') {
        counts.NEW++;
      } else if (lead.lead_bucket === 'CANCELLED') {
        counts.CANCELLED++;
      }
    });
    return counts;
  }, [allLeads]);

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

  // Get selected unassigned leads for bulk transfer
  const selectedUnassignedLeads = useMemo(() => {
    return filteredLeads.filter(l => 
      selectedLeads.includes(l.id) && 
      !l.assigned_to_user_id && 
      l.current_team === 'LEADS'
    );
  }, [filteredLeads, selectedLeads]);

  const handleBulkTransfer = async () => {
    if (!transferForm.staffId || selectedUnassignedLeads.length === 0) return;

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const leadIds = selectedUnassignedLeads.map(l => l.id);

      const { error: updateError } = await supabase
        .from('leads')
        .update({
          assigned_to_user_id: transferForm.staffId,
          status: 'ASSIGNED',
          current_team: 'CALLING',
        })
        .in('id', leadIds);

      if (updateError) throw updateError;

      const transfers = leadIds.map(leadId => ({
        lead_id: leadId,
        from_team: 'LEADS' as const,
        to_team: 'CALLING' as const,
        to_user_id: transferForm.staffId,
        transferred_by_user_id: user.id,
        store_id: currentStore?.id || null,
        lead_type: 'NEW', // Fresh leads from LEADS portal
      }));

      await supabase.from('lead_transfers').insert(transfers);

      toast.success(`${leadIds.length} leads transferred successfully`);
      setSelectedLeads([]);
      setIsTransferOpen(false);
      setTransferForm({ staffId: '', productId: '' });
      queryClient.invalidateQueries({ queryKey: ['leads'] });
    } catch (error: any) {
      toast.error(`Transfer failed: ${error.message}`);
    }
  };

  const handleBulkReassign = async () => {
    if (!reassignStaffId || selectedLeads.length === 0) return;

    // Check if any selected leads have ASSIGNED status - they cannot be reassigned
    const selectedLeadObjects = filteredLeads.filter(l => selectedLeads.includes(l.id));
    const assignedStatusLeads = selectedLeadObjects.filter(l => l.status === 'ASSIGNED');
    
    if (assignedStatusLeads.length > 0) {
      toast.error(`Cannot reassign ${assignedStatusLeads.length} lead(s) with ASSIGNED status. Staff must first work on the lead (change status to CONFIRMED, FOLLOW_UP, CNR, or CANCELLED).`);
      return;
    }

    // Check for same-day leads - they cannot be reassigned today
    const today = format(new Date(), 'yyyy-MM-dd');
    const sameDayLeads = selectedLeadObjects.filter(l => l.date === today);
    
    if (sameDayLeads.length > 0) {
      toast.error(`Cannot reassign ${sameDayLeads.length} lead(s) with today's date. Leads can only be reassigned the next day.`);
      return;
    }

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      // Get current user's profile for notification
      const { data: currentProfile } = await supabase
        .from('profiles')
        .select('name')
        .eq('id', user.id)
        .single();

      const { error: updateError } = await supabase
        .from('leads')
        .update({
          assigned_to_user_id: reassignStaffId,
          status: 'ASSIGNED',
          current_team: 'CALLING',
          assigned_at: new Date().toISOString(),
          remark: '', // Clear remark when reassigning to new staff
          date: new Date().toISOString().split('T')[0], // Set today's date when reassigning
        })
        .in('id', selectedLeads);

      if (updateError) throw updateError;

      const transfers = selectedLeads.map(leadId => ({
        lead_id: leadId,
        from_team: 'LEADS' as const,
        to_team: 'CALLING' as const,
        to_user_id: reassignStaffId,
        transferred_by_user_id: user.id,
        store_id: currentStore?.id || null,
        lead_type: 'REASSIGN', // Reassignment within LEADS portal
      }));

      await supabase.from('lead_transfers').insert(transfers);

      // Send notification to the new assigned staff
      await supabase.from('notifications').insert({
        type: 'LEAD_ASSIGNED',
        title: 'New Leads Reassigned',
        message: `Assigned new ${selectedLeads.length} lead${selectedLeads.length > 1 ? 's' : ''} to you.`,
        target_user_id: reassignStaffId,
        actor_id: user.id,
        actor_name: currentProfile?.name || 'Leads Staff',
        portal: 'CALLING',
        link_path: '/calling/leads',
        store_id: currentStore?.id || null,
      });

      toast.success(`${selectedLeads.length} leads reassigned successfully`);
      setSelectedLeads([]);
      setIsReassignOpen(false);
      setReassignStaffId('');
      queryClient.invalidateQueries({ queryKey: ['leads'] });
    } catch (error: any) {
      toast.error(`Reassign failed: ${error.message}`);
    }
  };

  const exportToCSV = () => {
    const headers = ['Date', 'Client Name', 'Contact Number', 'Product', 'Source', 'Status', 'Assigned To', 'Current Team'];
    const rows = filteredLeads.map(lead => [
      lead.date,
      lead.client_name,
      lead.contact_number,
      lead.products?.name || '',
      lead.source || '',
      lead.status,
      lead.assigned_to?.name || '',
      lead.current_team,
    ]);

    const csvContent = [headers, ...rows].map(row => row.map(cell => `"${cell}"`).join(',')).join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `leads_${format(dateRange.from, 'yyyy-MM-dd')}_to_${format(dateRange.to, 'yyyy-MM-dd')}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success('Leads exported successfully');
  };

  const handleImport = async () => {
    if (!importFile) {
      toast.error('Please select a file');
      return;
    }

    setImporting(true);
    try {
      const text = await importFile.text();
      const lines = text.split('\n').filter(line => line.trim());
      const headers = lines[0].split(',').map(h => h.trim().toLowerCase().replace(/"/g, ''));
      
      const productMap = new Map(products.map(p => [p.name.toLowerCase(), p.id]));
      
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const leadsToInsert = [];
      for (let i = 1; i < lines.length; i++) {
        const values = lines[i].split(',').map(v => v.trim().replace(/"/g, ''));
        const row: Record<string, string> = {};
        headers.forEach((h, idx) => {
          row[h] = values[idx] || '';
        });

        const productId = row.product_name ? productMap.get(row.product_name.toLowerCase()) : null;

        leadsToInsert.push({
          date: row.date || new Date().toISOString().split('T')[0],
          client_name: row.client_name || 'Unknown',
          contact_number: row.contact_number || '',
          product_id: productId || null,
          source: row.source || null,
          status: 'NEW',
          current_team: 'LEADS',
          lead_bucket: 'NEW',
          created_by_user_id: user.id,
          store_id: currentStore?.id || null,
        });
      }

      if (leadsToInsert.length > 0) {
        const { error } = await supabase.from('leads').insert(leadsToInsert);
        if (error) throw error;
        
        toast.success(`${leadsToInsert.length} leads imported successfully`);
        refetch();
        setIsImportOpen(false);
        setImportFile(null);
      }
    } catch (error: any) {
      toast.error(`Import failed: ${error.message}`);
    } finally {
      setImporting(false);
    }
  };

  return (
    <div className="space-y-4 md:space-y-6 animate-fade-in p-2 md:p-0">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-xl md:text-2xl font-bold">All Leads</h1>
          <p className="text-sm text-muted-foreground">View and manage all leads</p>
        </div>
        <div className="flex gap-2">
          <Dialog open={isImportOpen} onOpenChange={setIsImportOpen}>
            <DialogTrigger asChild>
              <Button variant="outline" size="sm" className="text-xs md:text-sm">
                <Upload className="w-4 h-4 mr-1 md:mr-2" />
                <span className="hidden sm:inline">Import CSV</span>
                <span className="sm:hidden">Import</span>
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Import Leads from CSV</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <div className="text-sm text-muted-foreground">
                  CSV should have columns: date, client_name, contact_number, product_name, source, status
                </div>
                <div className="space-y-2">
                  <Label>Select CSV File</Label>
                  <Input
                    type="file"
                    accept=".csv"
                    onChange={(e) => setImportFile(e.target.files?.[0] || null)}
                  />
                </div>
                <Button onClick={handleImport} className="w-full" disabled={importing || !importFile}>
                  {importing ? 'Importing...' : 'Import Leads'}
                </Button>
              </div>
            </DialogContent>
          </Dialog>
          <Button onClick={exportToCSV} size="sm" className="text-xs md:text-sm">
            <Download className="w-4 h-4 mr-1 md:mr-2" />
            <span className="hidden sm:inline">Export CSV</span>
            <span className="sm:hidden">Export</span>
          </Button>
        </div>
      </div>

      {/* Lead Bucket Tabs - scrollable on mobile */}
      <Tabs value={bucketFilter} onValueChange={(v) => setBucketFilter(v as LeadBucketFilter)} className="w-full">
        <div className="overflow-x-auto -mx-2 px-2 md:mx-0 md:px-0">
          <TabsList className="grid w-max md:w-full grid-cols-6 min-w-[600px] md:min-w-0 md:max-w-2xl">
            <TabsTrigger value="ALL" className="text-xs md:text-sm">All ({bucketCounts.ALL})</TabsTrigger>
            <TabsTrigger value="NEW" className="text-xs md:text-sm">New ({bucketCounts.NEW})</TabsTrigger>
            <TabsTrigger value="FOLLOWUP" className="text-xs md:text-sm">Follow-up ({bucketCounts.FOLLOWUP})</TabsTrigger>
            <TabsTrigger value="CNR" className="text-xs md:text-sm">CNR ({bucketCounts.CNR})</TabsTrigger>
            <TabsTrigger value="CONFIRMED" className="text-xs md:text-sm">Confirmed ({bucketCounts.CONFIRMED})</TabsTrigger>
            <TabsTrigger value="CANCELLED" className="text-xs md:text-sm">Cancelled ({bucketCounts.CANCELLED})</TabsTrigger>
          </TabsList>
        </div>
      </Tabs>

      {/* Transfer Progress Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-2 md:gap-4">
        <Card className="p-3">
          <div className="text-xs text-muted-foreground">Total Leads</div>
          <div className="text-lg font-bold">{bucketCounts.ALL}</div>
        </Card>
        <Card className="p-3">
          <div className="text-xs text-muted-foreground">Transferred</div>
          <div className="text-lg font-bold text-green-600">{transferCounts?.totalCount || 0}</div>
        </Card>
        <Card className="p-3">
          <div className="text-xs text-muted-foreground">In My Orders</div>
          <div className="text-lg font-bold text-blue-600">{bucketCounts.CONFIRMED}</div>
        </Card>
        <Card className="p-3">
          <div className="text-xs text-muted-foreground">Pending Transfer</div>
          <div className="text-lg font-bold text-orange-600">{bucketCounts.NEW}</div>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="pt-4 md:pt-6">
          <div className="flex flex-col md:flex-row md:flex-wrap gap-3 md:items-end">
            {/* Search first on mobile */}
            <div className="space-y-1 md:order-last md:flex-1 md:min-w-[150px]">
              <label className="text-xs font-medium">Search</label>
              <div className="relative">
                <Search className="absolute left-2 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  placeholder="Search..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="pl-8 h-9"
                />
              </div>
            </div>
            
            {/* Filter row - scrollable on mobile */}
            <div className="flex gap-2 overflow-x-auto -mx-2 px-2 md:mx-0 md:px-0 pb-2 md:pb-0">
              <div className="space-y-1 flex-shrink-0">
                <label className="text-xs font-medium">Date</label>
                <DateRangeFilter value={dateRange} onChange={setDateRange} />
              </div>
              <div className="space-y-1 flex-shrink-0">
                <label className="text-xs font-medium">Product</label>
                <Select value={productFilter} onValueChange={setProductFilter}>
                  <SelectTrigger className="w-[110px] md:w-[130px] h-9">
                    <SelectValue placeholder="All" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ALL">All Products</SelectItem>
                    {products.map((p) => (
                      <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1 flex-shrink-0">
                <label className="text-xs font-medium">Status</label>
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger className="w-[100px] md:w-[120px] h-9">
                    <SelectValue placeholder="All" />
                  </SelectTrigger>
                  <SelectContent>
                    {STATUS_OPTIONS.map((s) => (
                      <SelectItem key={s} value={s}>
                        {s === 'ALL' ? 'All' : s === 'CALL_NOT_RECEIVED' ? 'CNR' : s.replace(/_/g, ' ')}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1 flex-shrink-0">
                <label className="text-xs font-medium">Assigned</label>
                <Select value={assignedToFilter} onValueChange={setAssignedToFilter}>
                  <SelectTrigger className="w-[110px] md:w-[130px] h-9">
                    <SelectValue placeholder="All" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ALL">All Staff</SelectItem>
                    <SelectItem value="UNASSIGNED">Unassigned</SelectItem>
                    {callingStaff.map((staff) => (
                      <SelectItem key={staff.id} value={staff.id}>{staff.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Leads Table */}
      <Card>
        <CardHeader className="flex flex-col md:flex-row md:items-center justify-between gap-3 p-4 md:p-6">
          <CardTitle className="text-base md:text-lg">Leads ({filteredLeads.length})</CardTitle>
          <div className="flex flex-wrap items-center gap-2">
            {selectedLeads.length > 0 && (
              <>
                <Dialog open={isReassignOpen} onOpenChange={setIsReassignOpen}>
                  <DialogTrigger asChild>
                    <Button variant="outline" size="sm" className="text-xs">
                      <UserPlus className="w-3 h-3 mr-1" />
                      Reassign ({selectedLeads.length})
                    </Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>Reassign {selectedLeads.length} Leads</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4">
                      <div className="space-y-2">
                        <Label>Select Staff</Label>
                        <Select value={reassignStaffId} onValueChange={setReassignStaffId}>
                          <SelectTrigger>
                            <SelectValue placeholder="Choose staff member" />
                          </SelectTrigger>
                          <SelectContent>
                            {callingStaff.map((s) => (
                              <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <Button onClick={handleBulkReassign} className="w-full" disabled={!reassignStaffId}>
                        Reassign Leads
                      </Button>
                    </div>
                  </DialogContent>
                </Dialog>
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={() => setIsBulkEditOpen(true)}
                  className="text-xs"
                >
                  <Edit className="w-3 h-3 mr-1" />
                  Edit ({selectedLeads.length})
                </Button>
              </>
            )}
            {selectedUnassignedLeads.length > 0 && (
              <Dialog open={isTransferOpen} onOpenChange={setIsTransferOpen}>
                <DialogTrigger asChild>
                  <Button variant="outline" size="sm" className="text-xs">
                    <Send className="w-3 h-3 mr-1" />
                    Transfer ({selectedUnassignedLeads.length})
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Transfer {selectedUnassignedLeads.length} Leads</DialogTitle>
                  </DialogHeader>
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <Label>Select Staff</Label>
                      <Select value={transferForm.staffId} onValueChange={(v) => setTransferForm({ ...transferForm, staffId: v })}>
                        <SelectTrigger>
                          <SelectValue placeholder="Choose staff member" />
                        </SelectTrigger>
                        <SelectContent>
                          {callingStaff.map((s) => (
                            <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <Button onClick={handleBulkTransfer} className="w-full" disabled={!transferForm.staffId}>
                      Transfer Leads
                    </Button>
                  </div>
                </DialogContent>
              </Dialog>
            )}
            <DeleteLeadsButton 
              selectedIds={selectedLeads} 
              onDeleteComplete={() => setSelectedLeads([])} 
            />
          </div>
        </CardHeader>
        <CardContent className="p-0 md:p-6 md:pt-0">
          {/* Mobile Card View */}
          <div className="md:hidden space-y-2 p-3">
            {filteredLeads.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                {isLoading ? 'Loading...' : 'No leads found'}
              </div>
            ) : (
              pagedLeads.map((lead, index) => (
                <div 
                  key={lead.id} 
                  className={cn(
                    "border rounded-lg p-3 space-y-2",
                    isTodayFilter && lead.assigned_to_user_id && 'bg-muted/30'
                  )}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-2">
                      <Checkbox
                        checked={selectedLeads.includes(lead.id)}
                        onCheckedChange={(checked) => handleSelectLead(lead.id, !!checked)}
                      />
                      <span className="text-xs text-muted-foreground">#{index + 1}</span>
                    </div>
                    <Badge variant="outline" className={cn("text-xs", getLeadStatusBadgeClass(lead.status))}>
                      {formatStatusLabel(lead.status)}
                    </Badge>
                  </div>
                  <div className="pl-6">
                    <div className="flex items-center gap-2 font-medium">
                      {lead.client_name}
                      <DuplicateBadge phone={lead.contact_number} isDuplicate={lead.is_duplicate} />
                    </div>
                    <div className="text-sm text-muted-foreground">{lead.contact_number}</div>
                    <div className="flex flex-wrap gap-2 mt-2 text-xs">
                      <span className="bg-muted px-2 py-0.5 rounded">{lead.products?.name || 'No product'}</span>
                      {lead.source && <span className="bg-muted px-2 py-0.5 rounded">{lead.source}</span>}
                    </div>
                    <div className="flex justify-between items-center mt-2 text-xs text-muted-foreground">
                      <FormattedDate date={lead.date} />
                      <span>{lead.assigned_to?.name || 'Unassigned'}</span>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>

          {/* Desktop Table View */}
          <div className="hidden md:block overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[60px] text-center sticky left-0 bg-background z-10">S.No</TableHead>
                  <TableHead className="w-[50px] text-center">
                    <Checkbox 
                      checked={isAllSelected}
                      onCheckedChange={handleSelectAll}
                      aria-label="Select all"
                      className={isSomeSelected ? 'data-[state=checked]:bg-primary/50' : ''}
                    />
                  </TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead>Client</TableHead>
                  <TableHead>Contact</TableHead>
                  <TableHead>Product</TableHead>
                  <TableHead>Source</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Assigned To</TableHead>
                  <TableHead>Team</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {pagedLeads.map((lead, index) => {
                  const isAssigned = !!lead.assigned_to_user_id;
                  return (
                    <TableRow 
                      key={lead.id}
                      className={cn(
                        isTodayFilter && isAssigned && 'bg-muted/30'
                      )}
                    >
                      <TableCell className={cn(
                        "w-[60px] text-center font-medium text-muted-foreground sticky left-0 z-10",
                        isTodayFilter && isAssigned ? 'bg-muted/30' : 'bg-background'
                      )}>
                        {index + 1}
                      </TableCell>
                      <TableCell className="w-[50px] text-center">
                        <Checkbox
                          checked={selectedLeads.includes(lead.id)}
                          onCheckedChange={(checked) => handleSelectLead(lead.id, !!checked)}
                          aria-label={`Select ${lead.client_name}`}
                        />
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        <FormattedDate date={lead.date} />
                      </TableCell>
                      <TableCell className="font-medium">
                        <div className="flex items-center gap-2">
                          {lead.client_name}
                          <DuplicateBadge phone={lead.contact_number} isDuplicate={lead.is_duplicate} />
                        </div>
                      </TableCell>
                      <TableCell>{lead.contact_number}</TableCell>
                      <TableCell>{lead.products?.name || '-'}</TableCell>
                      <TableCell>{lead.source || '-'}</TableCell>
                      <TableCell>
                        <Badge variant="outline" className={getLeadStatusBadgeClass(lead.status)}>
                          {formatStatusLabel(lead.status)}
                        </Badge>
                      </TableCell>
                      <TableCell>{lead.assigned_to?.name || '-'}</TableCell>
                      <TableCell>
                        <Badge variant="secondary">{lead.current_team}</Badge>
                      </TableCell>
                    </TableRow>
                  );
                })}
                {filteredLeads.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={10} className="text-center py-8 text-muted-foreground">
                      {isLoading ? 'Loading...' : 'No leads found'}
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
          <DataPagination
            page={leadsPage}
            pageSize={DEFAULT_PAGE_SIZE}
            totalCount={filteredLeads.length}
            onPageChange={setLeadsPage}
            isLoading={isLoading}
            itemLabel="leads"
          />
        </CardContent>
      </Card>

      {/* Bulk Edit Dialog */}
      <BulkEditLeadsForm
        open={isBulkEditOpen}
        onOpenChange={setIsBulkEditOpen}
        selectedLeads={filteredLeads.filter(l => selectedLeads.includes(l.id))}
        onComplete={() => setSelectedLeads([])}
      />
    </div>
  );
}
