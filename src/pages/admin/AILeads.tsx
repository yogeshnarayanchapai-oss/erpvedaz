import { useState, useCallback, useMemo } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Loader2, ArrowRight, RefreshCw, Brain, AlertCircle, Trash2 } from 'lucide-react';
import { useFetchSocialBoxLeads, useSocialBoxConfig, useMarkLeadsTransferred, useDeleteSocialBoxLeads, useStoredSocialBoxLeads, type SocialBoxLead } from '@/hooks/useSocialBoxLeads';
import { BulkAddLeadsForm } from '@/components/leads/BulkAddLeadsForm';
import { useProducts } from '@/hooks/useProducts';
import { toast } from 'sonner';
import { useQueryClient } from '@tanstack/react-query';

export default function AILeads() {
  const { data: config, isLoading: configLoading } = useSocialBoxConfig();
  const { data: storedLeads = [], isLoading: storedLoading } = useStoredSocialBoxLeads();
  const fetchLeads = useFetchSocialBoxLeads();
  const markTransferred = useMarkLeadsTransferred();
  const deleteLeads = useDeleteSocialBoxLeads();
  const { data: products = [] } = useProducts();
  const queryClient = useQueryClient();
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [sourceFilter, setSourceFilter] = useState<string>('all');
  const [showBulkForm, setShowBulkForm] = useState(false);
  const [prefillLeads, setPrefillLeads] = useState<any[]>([]);
  const [showDuplicateDialog, setShowDuplicateDialog] = useState(false);
  const [isDeletingDuplicates, setIsDeletingDuplicates] = useState(false);

  // Use stored leads directly - no local state copy needed
  const leads = storedLeads;

  // Manual pull from SocialBox API
  const handleManualPull = useCallback(async () => {
    try {
      const result = await fetchLeads.mutateAsync({ limit: 200 });
      if (result) {
        // Refresh stored leads cache from DB
        await queryClient.invalidateQueries({ queryKey: ['socialbox-stored-leads'] });
        if (result.new_count > 0) {
          toast.success(`${result.new_count} new leads pulled from SocialBox`);
        } else {
          toast.info('No new leads found from SocialBox');
        }
      }
    } catch {
      // handled by hook
    }
  }, [fetchLeads, queryClient]);

  // Derive unique sources for filter
  const availableSources = Array.from(new Set(leads.map(l => l.source || 'SocialBox').filter(Boolean)));
  const filteredLeads = sourceFilter === 'all' ? leads : leads.filter(l => (l.source || 'SocialBox') === sourceFilter);

  // Build phone duplicate count map
  const phoneCounts = filteredLeads.reduce<Record<string, number>>((acc, l) => {
    const phone = (l.phone || '').replace(/\D/g, '');
    if (phone.length >= 10) {
      acc[phone] = (acc[phone] || 0) + 1;
    }
    return acc;
  }, {});
  const duplicateCount = Object.values(phoneCounts).filter(c => c > 1).reduce((sum, c) => sum + c, 0);

  const toggleSelect = (id: string) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const toggleAll = () => {
    if (selectedIds.size === filteredLeads.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(filteredLeads.map(l => l.id)));
    }
  };

  const [pendingTransferIds, setPendingTransferIds] = useState<string[]>([]);

  const handleTransfer = async () => {
    const selected = leads.filter(l => selectedIds.has(l.id));
    if (selected.length === 0) {
      toast.error('Please select at least one lead to refill');
      return;
    }

    const mappedLeads = selected.map(lead => {
      // Match product by first word of the AI lead's product name
      const leadProductFirstWord = (lead.product || '').trim().split(/\s+/)[0]?.toLowerCase();
      const matchedProduct = leadProductFirstWord
        ? products.find(p => p.name.toLowerCase().split(/\s+/)[0] === leadProductFirstWord)
        : undefined;

      return {
        id: crypto.randomUUID(),
        date: new Date().toISOString().split('T')[0],
        client_name: lead.full_name || '',
        contact_number: lead.phone || '',
        alt_phone: '',
        product_id: matchedProduct?.id || '',
        source: lead.source || 'SocialBox',
        remark: [lead.notes, lead.product ? `Product: ${lead.product}` : ''].filter(Boolean).join(' | '),
        _socialbox_id: lead.id,
      };
    });

    // Don't mark as transferred yet — just open bulk form with prefill
    setPendingTransferIds(selected.map(l => l.id));
    setSelectedIds(new Set());
    setPrefillLeads(mappedLeads);
    setShowBulkForm(true);
  };

  const handleBulkCreateSuccess = async () => {
    if (pendingTransferIds.length > 0) {
      try {
        await markTransferred.mutateAsync(pendingTransferIds);
        queryClient.invalidateQueries({ queryKey: ['socialbox-stored-leads'] });
      } catch (err) {
        console.error('Failed to mark transferred:', err);
      }
      setPendingTransferIds([]);
    }
  };

  const handleDelete = async () => {
    const selected = leads.filter(l => selectedIds.has(l.id));
    if (selected.length === 0) {
      toast.error('Please select leads to delete');
      return;
    }

    try {
      await deleteLeads.mutateAsync(selected.map(l => l.id));
      queryClient.invalidateQueries({ queryKey: ['socialbox-stored-leads'] });
      setSelectedIds(new Set());
      toast.success(`${selected.length} lead(s) deleted`);
    } catch (err) {
      toast.error('Failed to delete leads');
    }
  };

  if (configLoading || storedLoading) {
    return (
      <div className="flex items-center justify-center p-12">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!config) {
    return (
      <div className="space-y-6 animate-fade-in">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Brain className="h-6 w-6" />
            AI Leads
          </h1>
          <p className="text-muted-foreground">Auto-sync leads from SocialBox</p>
        </div>
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12 text-center">
            <AlertCircle className="h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold mb-2">SocialBox Not Connected</h3>
            <p className="text-muted-foreground mb-4 max-w-md">
              SocialBox connect garna Settings &gt; AI Connect tab ma januhosn ra API token enter garnuhos.
            </p>
            <Button variant="outline" onClick={() => window.location.href = '/admin/settings?tab=ai-connect'}>
              Go to Settings
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Brain className="h-6 w-6" />
            AI Leads
          </h1>
          <p className="text-muted-foreground">
            Manual pull from SocialBox
            {fetchLeads.isPending && <Loader2 className="h-3 w-3 ml-2 inline animate-spin" />}
          </p>
          {duplicateCount > 0 && (
            <div className="mt-1.5 inline-flex items-center gap-1.5 rounded-md border border-destructive/30 bg-destructive/10 px-2.5 py-1 text-xs font-medium text-destructive">
              <AlertCircle className="h-3.5 w-3.5" />
              Double: {duplicateCount} leads
            </div>
          )}
        </div>
        <div className="flex items-center gap-2">
          <Select value={sourceFilter} onValueChange={setSourceFilter}>
            <SelectTrigger className="w-[160px]">
              <SelectValue placeholder="Filter source" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Sources</SelectItem>
              {availableSources.map(src => (
                <SelectItem key={src} value={src}>{src}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button variant="outline" onClick={handleManualPull} disabled={fetchLeads.isPending} title="Pull new leads from SocialBox">
            <RefreshCw className={`h-4 w-4 mr-1 ${fetchLeads.isPending ? 'animate-spin' : ''}`} />
            Pull
          </Button>
        </div>
      </div>

      {filteredLeads.length > 0 ? (
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-base">AI Leads ({filteredLeads.length}{sourceFilter !== 'all' ? ` · ${sourceFilter}` : ''})</CardTitle>
                <CardDescription>Select leads to Refill or Delete</CardDescription>
              </div>
              <div className="flex items-center gap-2">
                {selectedIds.size > 0 && (
                  <Badge variant="secondary">{selectedIds.size} selected</Badge>
                )}
                <Button variant="destructive" onClick={handleDelete} disabled={selectedIds.size === 0} size="sm">
                  <Trash2 className="h-4 w-4 mr-1" />
                  Delete
                </Button>
                <Button onClick={handleTransfer} disabled={selectedIds.size === 0} size="sm">
                  <ArrowRight className="h-4 w-4 mr-1" />
                  Refill ({selectedIds.size})
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b text-left">
                    <th className="p-2 w-10">
                      <Checkbox
                        checked={selectedIds.size === filteredLeads.length && filteredLeads.length > 0}
                        onCheckedChange={toggleAll}
                      />
                    </th>
                    <th className="p-2">Name</th>
                    <th className="p-2">Phone</th>
                    <th className="p-2">Product</th>
                    <th className="p-2">Source</th>
                    <th className="p-2">Status</th>
                    <th className="p-2">Notes</th>
                    <th className="p-2">Date</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredLeads.map(lead => (
                    <tr key={lead.id} className="border-b hover:bg-muted/50 cursor-pointer" onClick={() => toggleSelect(lead.id)}>
                      <td className="p-2">
                        <Checkbox
                          checked={selectedIds.has(lead.id)}
                          onCheckedChange={() => toggleSelect(lead.id)}
                        />
                      </td>
                      <td className="p-2 font-medium">{lead.full_name}</td>
                      <td className="p-2 whitespace-nowrap">
                        {lead.phone}
                        {(() => {
                          const cleanPhone = (lead.phone || '').replace(/\D/g, '');
                          const count = cleanPhone.length >= 10 ? (phoneCounts[cleanPhone] || 0) : 0;
                          return count > 1 ? (
                            <Badge variant="destructive" className="ml-1.5 text-[10px] px-1.5 py-0">
                              Double{count > 2 ? ` ×${count}` : ''}
                            </Badge>
                          ) : null;
                        })()}
                      </td>
                      <td className="p-2">{lead.product || '-'}</td>
                      <td className="p-2">
                        <Badge variant="outline" className="text-xs">{lead.source || 'SocialBox'}</Badge>
                      </td>
                      <td className="p-2">
                        <Badge variant={lead.status === 'new' ? 'default' : 'secondary'} className="text-xs">
                          {lead.status}
                        </Badge>
                      </td>
                      <td className="p-2 max-w-[200px] truncate text-muted-foreground">{lead.notes || '-'}</td>
                      <td className="p-2 text-muted-foreground">
                        {lead.created_at ? new Date(lead.created_at).toLocaleDateString() : '-'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12 text-center">
            <RefreshCw className="h-10 w-10 text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold mb-2">No Active Leads</h3>
            <p className="text-muted-foreground">New leads from SocialBox will appear here automatically</p>
          </CardContent>
        </Card>
      )}

      <BulkAddLeadsForm
        open={showBulkForm}
        onOpenChange={setShowBulkForm}
        prefillData={prefillLeads}
        onSuccess={handleBulkCreateSuccess}
      />
    </div>
  );
}
