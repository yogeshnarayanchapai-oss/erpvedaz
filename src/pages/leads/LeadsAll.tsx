import { useState, useMemo, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useLeads, useTransferLeads } from '@/hooks/useLeads';
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
import { Download, Upload, Search, Send } from 'lucide-react';
import { format, startOfDay, endOfDay, isToday } from 'date-fns';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { getLeadStatusBadgeClass, formatStatusLabel } from '@/lib/statusColors';
import { DeleteLeadsButton } from '@/components/leads/DeleteLeadsButton';
import { FormattedDate } from '@/components/FormattedDate';
import { cn } from '@/lib/utils';

const STATUS_OPTIONS = ['ALL', 'NEW', 'ASSIGNED', 'IN_PROGRESS', 'CONFIRMED', 'FOLLOW_UP', 'CALL_NOT_RECEIVED', 'CANCELLED', 'REDIRECT'];

type LeadBucketFilter = 'ALL' | 'NEW' | 'FOLLOWUP' | 'CNR' | 'CANCELLED';

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
  const [search, setSearch] = useState('');
  const [isImportOpen, setIsImportOpen] = useState(false);
  const [isTransferOpen, setIsTransferOpen] = useState(false);
  const [importFile, setImportFile] = useState<File | null>(null);
  const [importing, setImporting] = useState(false);
  const [selectedLeads, setSelectedLeads] = useState<string[]>([]);

  const { data: allLeads = [], isLoading, refetch } = useLeads();
  const { data: products = [] } = useProducts();
  const { data: callingStaff = [] } = useCallingStaff();
  const transferLeads = useTransferLeads();

  const [transferForm, setTransferForm] = useState({
    staffId: '',
    productId: '',
  });

  useEffect(() => {
    const channel = supabase
      .channel('leads-all-realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'leads' }, () => {
        queryClient.invalidateQueries({ queryKey: ['leads'] });
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [queryClient]);

  // Sync bucket filter with URL params
  useEffect(() => {
    const urlBucket = searchParams.get('bucket') as LeadBucketFilter;
    if (urlBucket && ['ALL', 'NEW', 'FOLLOWUP', 'CNR', 'CANCELLED'].includes(urlBucket)) {
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
      const matchesStatus = statusFilter === 'ALL' || lead.status === statusFilter;
      const matchesBucket = bucketFilter === 'ALL' || 
        (bucketFilter === 'CNR' && (lead.lead_bucket === 'CNR_POOL' || lead.status === 'CALL_NOT_RECEIVED')) ||
        (bucketFilter !== 'CNR' && lead.lead_bucket === bucketFilter);
      const matchesSearch = search === '' || 
        lead.client_name.toLowerCase().includes(search.toLowerCase()) ||
        lead.contact_number.includes(search);
      
      return inDateRange && matchesProduct && matchesStatus && matchesBucket && matchesSearch;
    });

    // Sort: unassigned leads first when viewing today's leads
    if (isTodayFilter) {
      leads = leads.sort((a, b) => {
        const aUnassigned = !a.assigned_to_user_id;
        const bUnassigned = !b.assigned_to_user_id;
        if (aUnassigned && !bUnassigned) return -1;
        if (!aUnassigned && bUnassigned) return 1;
        return 0;
      });
    }

    return leads;
  }, [allLeads, dateRange, productFilter, statusFilter, bucketFilter, search, isTodayFilter]);

  // Count leads by bucket - CNR includes both teams (LEADS and CALLING)
  const bucketCounts = useMemo(() => {
    const counts = { ALL: 0, NEW: 0, FOLLOWUP: 0, CNR: 0, CANCELLED: 0 };
    allLeads.forEach(lead => {
      counts.ALL++;
      // Check CNR first - status takes priority for CNR classification
      if (lead.lead_bucket === 'CNR_POOL' || lead.status === 'CALL_NOT_RECEIVED') {
        counts.CNR++;
      } else if (lead.lead_bucket === 'NEW') {
        counts.NEW++;
      } else if (lead.lead_bucket === 'FOLLOW_UP_POOL' || lead.lead_bucket === 'FOLLOWUP') {
        counts.FOLLOWUP++;
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
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">All Leads</h1>
          <p className="text-muted-foreground">View and manage all leads</p>
        </div>
        <div className="flex gap-2">
          <Dialog open={isImportOpen} onOpenChange={setIsImportOpen}>
            <DialogTrigger asChild>
              <Button variant="outline">
                <Upload className="w-4 h-4 mr-2" />
                Import CSV
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
          <Button onClick={exportToCSV}>
            <Download className="w-4 h-4 mr-2" />
            Export CSV
          </Button>
        </div>
      </div>

      {/* Lead Bucket Tabs */}
      <Tabs value={bucketFilter} onValueChange={(v) => setBucketFilter(v as LeadBucketFilter)} className="w-full">
        <TabsList className="grid w-full grid-cols-5 max-w-lg">
          <TabsTrigger value="ALL">All ({bucketCounts.ALL})</TabsTrigger>
          <TabsTrigger value="NEW">New ({bucketCounts.NEW})</TabsTrigger>
          <TabsTrigger value="FOLLOWUP">Follow-up ({bucketCounts.FOLLOWUP})</TabsTrigger>
          <TabsTrigger value="CNR">CNR ({bucketCounts.CNR})</TabsTrigger>
          <TabsTrigger value="CANCELLED">Cancelled ({bucketCounts.CANCELLED})</TabsTrigger>
        </TabsList>
      </Tabs>

      {/* Filters */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-wrap gap-4 items-end">
            <div className="space-y-2">
              <label className="text-sm font-medium">Date Range</label>
              <DateRangeFilter value={dateRange} onChange={setDateRange} />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Product</label>
              <Select value={productFilter} onValueChange={setProductFilter}>
                <SelectTrigger className="w-[180px]">
                  <SelectValue placeholder="All products" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ALL">All Products</SelectItem>
                  {products.map((p) => (
                    <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Status</label>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-[180px]">
                  <SelectValue placeholder="All statuses" />
                </SelectTrigger>
                <SelectContent>
                  {STATUS_OPTIONS.map((s) => (
                    <SelectItem key={s} value={s}>
                      {s === 'ALL' ? 'All Statuses' : s === 'CALL_NOT_RECEIVED' ? 'CNR' : s.replace(/_/g, ' ')}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2 flex-1 min-w-[200px]">
              <label className="text-sm font-medium">Search</label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  placeholder="Search by name or contact..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="pl-9"
                />
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Leads Table */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>Leads ({filteredLeads.length})</CardTitle>
          <div className="flex items-center gap-2">
            {selectedUnassignedLeads.length > 0 && (
              <Dialog open={isTransferOpen} onOpenChange={setIsTransferOpen}>
                <DialogTrigger asChild>
                  <Button variant="outline" size="sm">
                    <Send className="w-4 h-4 mr-2" />
                    Transfer Selected ({selectedUnassignedLeads.length})
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
        <CardContent>
          <div className="overflow-x-auto">
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
                {filteredLeads.map((lead, index) => {
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
                      <TableCell className="font-medium">{lead.client_name}</TableCell>
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
        </CardContent>
      </Card>
    </div>
  );
}
