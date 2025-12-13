import { useState, useMemo, useEffect } from 'react';
import { useLeads, useTransferLeads } from '@/hooks/useLeads';
import { useProducts } from '@/hooks/useProducts';
import { useCallingStaff } from '@/hooks/useStaff';
import { useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { DateRangeFilter, DateRange } from '@/components/ui/DateRangeFilter';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { Download, Search, RotateCcw, Send, PhoneOff, XCircle } from 'lucide-react';
import { format, startOfDay, endOfDay } from 'date-fns';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { getLeadStatusBadgeClass, formatStatusLabel } from '@/lib/statusColors';
import { DeleteLeadsButton } from '@/components/leads/DeleteLeadsButton';
import { FormattedDate } from '@/components/FormattedDate';
import { matchesReferenceId, isReferenceIdSearch } from '@/lib/referenceIdSearch';

type FollowupTab = 'ALL' | 'FOLLOW_UP' | 'CNR';

export default function LeadsFollowup() {
  const today = new Date();
  const queryClient = useQueryClient();
  const [dateRange, setDateRange] = useState<DateRange>({
    from: startOfDay(today),
    to: endOfDay(today),
  });
  const [productFilter, setProductFilter] = useState<string>('ALL');
  const [search, setSearch] = useState('');
  const [selectedLeads, setSelectedLeads] = useState<string[]>([]);
  const [tabFilter, setTabFilter] = useState<FollowupTab>('ALL');
  const [isTransferOpen, setIsTransferOpen] = useState(false);
  const [showCancelDialog, setShowCancelDialog] = useState(false);
  const [transferStaffId, setTransferStaffId] = useState('');

  const { data: allLeads = [], isLoading } = useLeads();
  const { data: products = [] } = useProducts();
  const { data: callingStaff = [] } = useCallingStaff();

  useEffect(() => {
    const channel = supabase
      .channel('leads-followup-realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'leads' }, () => {
        queryClient.invalidateQueries({ queryKey: ['leads'] });
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [queryClient]);

  // Filter for follow-up and CNR leads returned to LEADS team with IN_POOL status
  const followupLeads = useMemo(() => {
    return allLeads.filter(lead => {
      // Must be in LEADS team with IN_POOL status and in FOLLOW_UP_POOL or CNR_POOL bucket
      const isInPool = lead.pool_status === 'IN_POOL' && 
        (lead.lead_bucket === 'FOLLOW_UP_POOL' || lead.lead_bucket === 'CNR_POOL');
      
      // Use returned_to_leads_at for date filtering if available, else fall back to date
      const effectiveDate = lead.returned_to_leads_at 
        ? new Date(lead.returned_to_leads_at) 
        : new Date(lead.date);
      const inDateRange = effectiveDate >= startOfDay(dateRange.from) && effectiveDate <= endOfDay(dateRange.to);
      const matchesProduct = productFilter === 'ALL' || lead.product_id === productFilter;
      
      // Check for reference ID search
      const matchesRefId = isReferenceIdSearch(search) && matchesReferenceId(lead.reference_id, search);
      
      const matchesSearch = search === '' || 
        matchesRefId ||
        lead.client_name.toLowerCase().includes(search.toLowerCase()) ||
        lead.contact_number.includes(search);
      
      // Tab filter based on bucket
      let matchesTab = true;
      if (tabFilter === 'FOLLOW_UP') {
        matchesTab = lead.lead_bucket === 'FOLLOW_UP_POOL';
      } else if (tabFilter === 'CNR') {
        matchesTab = lead.lead_bucket === 'CNR_POOL';
      }
      
      return isInPool && inDateRange && matchesProduct && matchesSearch && matchesTab;
    });
  }, [allLeads, dateRange, productFilter, search, tabFilter]);

  // Count leads by type - only those in pool
  const leadCounts = useMemo(() => {
    const allInPool = allLeads.filter(l => 
      l.pool_status === 'IN_POOL' && 
      (l.lead_bucket === 'FOLLOW_UP_POOL' || l.lead_bucket === 'CNR_POOL')
    );
    return {
      all: allInPool.length,
      followup: allInPool.filter(l => l.lead_bucket === 'FOLLOW_UP_POOL').length,
      cnr: allInPool.filter(l => l.lead_bucket === 'CNR_POOL').length,
    };
  }, [allLeads]);

  // Selection handlers
  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedLeads(followupLeads.map(lead => lead.id));
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

  const isAllSelected = followupLeads.length > 0 && selectedLeads.length === followupLeads.length;
  const isSomeSelected = selectedLeads.length > 0 && selectedLeads.length < followupLeads.length;

  // Bulk transfer to calling staff
  const handleBulkTransfer = async () => {
    if (!transferStaffId || selectedLeads.length === 0) return;

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const { error: updateError } = await supabase
        .from('leads')
        .update({
          assigned_to_user_id: transferStaffId,
          status: 'ASSIGNED',
          current_team: 'CALLING',
          pool_status: 'ASSIGNED',
          assigned_at: new Date().toISOString(),
        })
        .in('id', selectedLeads);

      if (updateError) throw updateError;

      const transfers = selectedLeads.map(leadId => ({
        lead_id: leadId,
        from_team: 'LEADS' as const,
        to_team: 'CALLING' as const,
        to_user_id: transferStaffId,
        transferred_by_user_id: user.id,
      }));

      await supabase.from('lead_transfers').insert(transfers);

      toast.success(`${selectedLeads.length} leads transferred to calling staff`);
      setSelectedLeads([]);
      setIsTransferOpen(false);
      setTransferStaffId('');
      queryClient.invalidateQueries({ queryKey: ['leads'] });
    } catch (error: any) {
      toast.error(`Transfer failed: ${error.message}`);
    }
  };

  // Bulk cancel leads
  const handleBulkCancel = async () => {
    if (selectedLeads.length === 0) return;

    try {
      const { error: updateError } = await supabase
        .from('leads')
        .update({
          status: 'CANCELLED',
          lead_bucket: 'CANCELLED',
        })
        .in('id', selectedLeads);

      if (updateError) throw updateError;

      toast.success(`${selectedLeads.length} leads marked as cancelled`);
      setSelectedLeads([]);
      setShowCancelDialog(false);
      queryClient.invalidateQueries({ queryKey: ['leads'] });
    } catch (error: any) {
      toast.error(`Failed to cancel leads: ${error.message}`);
    }
  };

  const exportToCSV = () => {
    const headers = ['Date', 'Client Name', 'Contact Number', 'Product', 'Source', 'Status', 'Assigned To', 'Current Team'];
    const rows = followupLeads.map(lead => [
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
    a.download = `followup_leads_${format(dateRange.from, 'yyyy-MM-dd')}_to_${format(dateRange.to, 'yyyy-MM-dd')}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success('Follow-up leads exported successfully');
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Follow-up Queue</h1>
          <p className="text-muted-foreground">Leads returned from calling team (Follow-up & CNR)</p>
        </div>
        <Button onClick={exportToCSV}>
          <Download className="w-4 h-4 mr-2" />
          Export CSV
        </Button>
      </div>

      {/* Tab Filter */}
      <Tabs value={tabFilter} onValueChange={(v) => setTabFilter(v as FollowupTab)} className="w-full">
        <TabsList className="grid w-full grid-cols-3 max-w-md">
          <TabsTrigger value="ALL" className="gap-2">
            <RotateCcw className="w-4 h-4" />
            All ({leadCounts.all})
          </TabsTrigger>
          <TabsTrigger value="FOLLOW_UP" className="gap-2">
            <RotateCcw className="w-4 h-4" />
            Follow-up ({leadCounts.followup})
          </TabsTrigger>
          <TabsTrigger value="CNR" className="gap-2">
            <PhoneOff className="w-4 h-4" />
            CNR ({leadCounts.cnr})
          </TabsTrigger>
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

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card className="bg-warning/5 border-warning/20">
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-full bg-warning/20 flex items-center justify-center">
                <RotateCcw className="w-6 h-6 text-warning" />
              </div>
              <div>
                <p className="text-2xl font-bold">{leadCounts.followup}</p>
                <p className="text-muted-foreground">Follow-up leads</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="bg-destructive/5 border-destructive/20">
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-full bg-destructive/20 flex items-center justify-center">
                <PhoneOff className="w-6 h-6 text-destructive" />
              </div>
              <div>
                <p className="text-2xl font-bold">{leadCounts.cnr}</p>
                <p className="text-muted-foreground">Call Not Received (CNR)</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Leads Table */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>Follow-up & CNR Leads ({followupLeads.length})</CardTitle>
          <div className="flex items-center gap-2">
            {selectedLeads.length > 0 && (
              <>
                <Dialog open={isTransferOpen} onOpenChange={setIsTransferOpen}>
                  <DialogTrigger asChild>
                    <Button variant="outline" size="sm">
                      <Send className="w-4 h-4 mr-2" />
                      Re-assign ({selectedLeads.length})
                    </Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>Re-assign {selectedLeads.length} Leads to Calling Staff</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4">
                      <div className="space-y-2">
                        <Label>Select Staff</Label>
                        <Select value={transferStaffId} onValueChange={setTransferStaffId}>
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
                      <Button onClick={handleBulkTransfer} className="w-full" disabled={!transferStaffId}>
                        Transfer Leads
                      </Button>
                    </div>
                  </DialogContent>
                </Dialog>
                <Button 
                  variant="outline" 
                  size="sm" 
                  className="text-destructive hover:text-destructive"
                  onClick={() => setShowCancelDialog(true)}
                >
                  <XCircle className="w-4 h-4 mr-2" />
                  Cancel ({selectedLeads.length})
                </Button>
              </>
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
                  <TableHead>Last Reason</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {followupLeads.map((lead, index) => (
                  <TableRow key={lead.id}>
                    <TableCell className="w-[60px] text-center font-medium text-muted-foreground sticky left-0 bg-background z-10">
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
                    <TableCell>
                      {lead.products?.name 
                        ? `${lead.products.name}${lead.quantity && lead.quantity > 1 ? ` (${lead.quantity})` : ''}` 
                        : '-'}
                    </TableCell>
                    <TableCell>{lead.source || '-'}</TableCell>
                    <TableCell>
                      <Badge variant="outline" className={getLeadStatusBadgeClass(lead.status)}>
                        {formatStatusLabel(lead.status)}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground">
                      {lead.last_transfer_reason || '-'}
                    </TableCell>
                  </TableRow>
                ))}
                {followupLeads.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={9} className="text-center py-8 text-muted-foreground">
                      {isLoading ? 'Loading...' : 'No follow-up or CNR leads in queue'}
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* Cancel Confirmation Dialog */}
      <AlertDialog open={showCancelDialog} onOpenChange={setShowCancelDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Cancel selected leads?</AlertDialogTitle>
            <AlertDialogDescription>
              This will mark {selectedLeads.length} lead{selectedLeads.length > 1 ? 's' : ''} as CANCELLED. They will be moved to the Cancelled bucket.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleBulkCancel} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Confirm Cancel
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
