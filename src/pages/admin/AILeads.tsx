import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Loader2, Download, ArrowRight, RefreshCw, Brain, AlertCircle } from 'lucide-react';
import { useFetchSocialBoxLeads, useSocialBoxConfig, type SocialBoxLead } from '@/hooks/useSocialBoxLeads';
import { BulkAddLeadsForm } from '@/components/leads/BulkAddLeadsForm';
import { useProducts } from '@/hooks/useProducts';
import { toast } from 'sonner';

export default function AILeads() {
  const { data: config, isLoading: configLoading } = useSocialBoxConfig();
  const fetchLeads = useFetchSocialBoxLeads();
  const { data: products = [] } = useProducts();
  const [leads, setLeads] = useState<SocialBoxLead[]>([]);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [showBulkForm, setShowBulkForm] = useState(false);
  const [prefillLeads, setPrefillLeads] = useState<any[]>([]);

  const handleFetch = async () => {
    const result = await fetchLeads.mutateAsync({
      status: statusFilter !== 'all' ? statusFilter : undefined,
      limit: 100,
    });
    setLeads(result || []);
    setSelectedIds(new Set());
    if (result?.length) {
      toast.success(`${result.length} leads fetched from SocialBox`);
    } else {
      toast.info('No leads found matching the criteria');
    }
  };

  const toggleSelect = (id: string) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const toggleAll = () => {
    if (selectedIds.size === leads.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(leads.map(l => l.id)));
    }
  };

  const handleTransfer = () => {
    const selected = leads.filter(l => selectedIds.has(l.id));
    if (selected.length === 0) {
      toast.error('Please select at least one lead to transfer');
      return;
    }

    // Find matching product by name
    const mappedLeads = selected.map(lead => {
      const matchedProduct = products.find(p => 
        p.name.toLowerCase().includes(lead.product?.toLowerCase() || '') ||
        lead.product?.toLowerCase().includes(p.name.toLowerCase())
      );

      return {
        id: crypto.randomUUID(),
        date: new Date().toISOString().split('T')[0],
        client_name: lead.full_name || '',
        contact_number: lead.phone || '',
        alt_phone: '',
        product_id: matchedProduct?.id || '',
        source: 'SocialBox',
        remark: [lead.notes, lead.product ? `Product: ${lead.product}` : ''].filter(Boolean).join(' | '),
      };
    });

    setPrefillLeads(mappedLeads);
    setShowBulkForm(true);
  };

  if (configLoading) {
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
          <p className="text-muted-foreground">Pull leads from SocialBox automatically</p>
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
          <p className="text-muted-foreground">Pull & transfer leads from SocialBox</p>
        </div>
        <div className="flex items-center gap-2">
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-[140px]">
              <SelectValue placeholder="Filter status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Status</SelectItem>
              <SelectItem value="new">New</SelectItem>
              <SelectItem value="hot">Hot</SelectItem>
              <SelectItem value="follow_up">Follow Up</SelectItem>
              <SelectItem value="closed">Closed</SelectItem>
            </SelectContent>
          </Select>
          <Button onClick={handleFetch} disabled={fetchLeads.isPending}>
            {fetchLeads.isPending ? (
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <Download className="h-4 w-4 mr-2" />
            )}
            Pull Leads
          </Button>
        </div>
      </div>

      {leads.length > 0 && (
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-base">SocialBox Leads ({leads.length})</CardTitle>
                <CardDescription>Select leads and click Transfer to import them</CardDescription>
              </div>
              <div className="flex items-center gap-2">
                {selectedIds.size > 0 && (
                  <Badge variant="secondary">{selectedIds.size} selected</Badge>
                )}
                <Button onClick={handleTransfer} disabled={selectedIds.size === 0} size="sm">
                  <ArrowRight className="h-4 w-4 mr-1" />
                  Transfer ({selectedIds.size})
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
                        checked={selectedIds.size === leads.length && leads.length > 0}
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
                  {leads.map(lead => (
                    <tr key={lead.id} className="border-b hover:bg-muted/50 cursor-pointer" onClick={() => toggleSelect(lead.id)}>
                      <td className="p-2">
                        <Checkbox
                          checked={selectedIds.has(lead.id)}
                          onCheckedChange={() => toggleSelect(lead.id)}
                        />
                      </td>
                      <td className="p-2 font-medium">{lead.full_name}</td>
                      <td className="p-2">{lead.phone}</td>
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
      )}

      {leads.length === 0 && !fetchLeads.isPending && (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12 text-center">
            <RefreshCw className="h-10 w-10 text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold mb-2">No Leads Fetched Yet</h3>
            <p className="text-muted-foreground">Click "Pull Leads" button to fetch leads from SocialBox</p>
          </CardContent>
        </Card>
      )}

      {/* Bulk Entry Form with prefilled data */}
      <BulkAddLeadsForm
        open={showBulkForm}
        onOpenChange={setShowBulkForm}
        prefillData={prefillLeads}
      />
    </div>
  );
}
