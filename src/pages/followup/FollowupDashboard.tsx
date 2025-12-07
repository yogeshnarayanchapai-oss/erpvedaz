import { useState, useMemo } from 'react';
import { format, subDays, startOfDay, endOfDay } from 'date-fns';
import { useLeads, useUpdateLeadStatus } from '@/hooks/useLeads';
import { useProducts } from '@/hooks/useProducts';
import { useCreateCallLog } from '@/hooks/useCallLogs';
import { useCallingStaff } from '@/hooks/useStaff';
import { useFollowupStats } from '@/hooks/useFollowupOrders';
import { StatCard } from '@/components/dashboard/StatCard';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Phone, MessageSquare, Clock, XCircle, Eye, CheckCircle, ArrowRight, Filter, Package, RotateCcw, CalendarIcon, Users } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useQueryClient } from '@tanstack/react-query';
import { FollowupOrdersTable } from '@/components/followup/FollowupOrdersTable';
import { RedirectReport } from '@/components/followup/RedirectReport';
import { DashboardDateFilter } from '@/components/dashboard/DashboardDateFilter';

type TagFilter = 'ALL' | 'TRF' | 'NO_TAG';
type ViewFilter = 'ALL' | 'REDIRECTED';

export default function FollowupDashboard() {
  const today = new Date();
  const [dateRange, setDateRange] = useState({
    from: startOfDay(today),
    to: endOfDay(today),
  });
  
  const dateFrom = format(dateRange.from, 'yyyy-MM-dd');
  const dateTo = format(dateRange.to, 'yyyy-MM-dd');

  const { data: leads = [], isLoading } = useLeads({ team: 'FOLLOWUP' });
  const { data: products = [] } = useProducts();
  const { data: callingStaff = [] } = useCallingStaff();
  const { data: stats } = useFollowupStats(dateFrom, dateTo);
  
  const updateLeadStatus = useUpdateLeadStatus();
  const createCallLog = useCreateCallLog();
  const queryClient = useQueryClient();

  const [selectedLead, setSelectedLead] = useState<any>(null);
  const [isDetailOpen, setIsDetailOpen] = useState(false);
  const [isTransferOpen, setIsTransferOpen] = useState(false);
  const [callNotes, setCallNotes] = useState('');
  const [transferStaffId, setTransferStaffId] = useState('');
  const [tagFilter, setTagFilter] = useState<TagFilter>('ALL');
  const [viewFilter, setViewFilter] = useState<ViewFilter>('ALL');
  const [activeTab, setActiveTab] = useState('leads');

  // Filter leads by tag
  const filteredLeads = useMemo(() => {
    if (tagFilter === 'ALL') return leads;
    if (tagFilter === 'TRF') return leads.filter(l => l.tag === 'TRF');
    return leads.filter(l => !l.tag);
  }, [leads, tagFilter]);

  const followupLeads = filteredLeads.filter(l => l.status === 'FOLLOW_UP');
  const cnrLeads = filteredLeads.filter(l => l.status === 'CALL_NOT_RECEIVED');
  const confirmedLeads = filteredLeads.filter(l => l.status === 'CONFIRMED');
  const cancelledLeads = filteredLeads.filter(l => l.status === 'CANCELLED');
  
  // Count TRF leads for badge
  const trfCount = leads.filter(l => l.tag === 'TRF').length;

  const openWhatsApp = (lead: any) => {
    const product = products.find(p => p.id === lead.product_id);
    const message = encodeURIComponent(`Namaste ${lead.client_name}, This is a follow-up regarding your inquiry about ${product?.name || 'our product'}.`);
    window.open(`https://wa.me/${lead.contact_number.replace(/\D/g, '')}?text=${message}`, '_blank');
  };

  const handleCall = (lead: any) => {
    window.open(`tel:${lead.contact_number}`, '_self');
  };

  const openLeadDetail = (lead: any) => {
    setSelectedLead(lead);
    setIsDetailOpen(true);
  };

  const handleStatusUpdate = async (status: 'FOLLOW_UP' | 'CALL_NOT_RECEIVED' | 'CANCELLED' | 'CONFIRMED') => {
    if (!selectedLead) return;

    try {
      await updateLeadStatus.mutateAsync({
        leadId: selectedLead.id,
        status,
        remark: callNotes,
      });

      await createCallLog.mutateAsync({
        leadId: selectedLead.id,
        outcome: status.replace('_', ' '),
        notes: callNotes,
      });

      setIsDetailOpen(false);
      setSelectedLead(null);
      setCallNotes('');
      toast.success(`Lead marked as ${status.replace('_', ' ')}`);
    } catch (error) {
      console.error(error);
    }
  };

  const handleTransferToCalling = async () => {
    if (!selectedLead || !transferStaffId) return;

    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      // Update lead
      await supabase
        .from('leads')
        .update({
          assigned_to_user_id: transferStaffId,
          current_team: 'CALLING',
          status: 'ASSIGNED',
        })
        .eq('id', selectedLead.id);

      // Create transfer record
      await supabase
        .from('lead_transfers')
        .insert({
          lead_id: selectedLead.id,
          from_team: 'FOLLOWUP',
          to_team: 'CALLING',
          to_user_id: transferStaffId,
          transferred_by_user_id: user?.id,
        });

      queryClient.invalidateQueries({ queryKey: ['leads'] });
      setIsTransferOpen(false);
      setIsDetailOpen(false);
      setSelectedLead(null);
      setTransferStaffId('');
      toast.success('Lead transferred to calling team');
    } catch (error) {
      toast.error('Failed to transfer lead');
    }
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-bold">Follow-up Dashboard</h1>
          <p className="text-muted-foreground">Manage follow-up leads and orders</p>
        </div>
        
        <div className="flex items-center gap-2 flex-wrap">
          {/* Date Filter */}
          <DashboardDateFilter value={dateRange} onChange={setDateRange} />
          
          {/* View Filter */}
          <Select value={viewFilter} onValueChange={(v) => setViewFilter(v as ViewFilter)}>
            <SelectTrigger className="w-[160px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="ALL">All Leads</SelectItem>
              <SelectItem value="REDIRECTED">Redirected Orders</SelectItem>
            </SelectContent>
          </Select>
          
          {/* Tag Filter */}
          <Select value={tagFilter} onValueChange={(v) => setTagFilter(v as TagFilter)}>
            <SelectTrigger className="w-[160px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="ALL">All Tags</SelectItem>
              <SelectItem value="TRF">
                <span className="flex items-center gap-2">
                  Transferred (TRF)
                  {trfCount > 0 && (
                    <Badge variant="secondary" className="text-xs">{trfCount}</Badge>
                  )}
                </span>
              </SelectItem>
              <SelectItem value="NO_TAG">Direct Leads</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Stats - Clickable Cards */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
        <div 
          className="cursor-pointer transition-transform hover:scale-[1.02]"
          onClick={() => {
            setActiveTab('leads');
            setTagFilter('ALL');
          }}
        >
          <StatCard
            title="Follow Ups"
            value={followupLeads.length}
            icon={<Clock className="w-5 h-5" />}
            variant="info"
          />
        </div>
        <div 
          className="cursor-pointer transition-transform hover:scale-[1.02]"
          onClick={() => {
            setActiveTab('leads');
            setTagFilter('ALL');
          }}
        >
          <StatCard
            title="CNR"
            value={cnrLeads.length}
            icon={<Phone className="w-5 h-5" />}
            variant="warning"
          />
        </div>
        <div 
          className="cursor-pointer transition-transform hover:scale-[1.02]"
          onClick={() => {
            setActiveTab('leads');
            setTagFilter('ALL');
          }}
        >
          <StatCard
            title="Confirmed"
            value={confirmedLeads.length}
            icon={<CheckCircle className="w-5 h-5" />}
            variant="success"
          />
        </div>
        <div 
          className="cursor-pointer transition-transform hover:scale-[1.02]"
          onClick={() => {
            setActiveTab('leads');
            setTagFilter('ALL');
          }}
        >
          <StatCard
            title="Cancelled"
            value={cancelledLeads.length}
            icon={<XCircle className="w-5 h-5" />}
            variant="destructive"
          />
        </div>
        <div 
          className="cursor-pointer transition-transform hover:scale-[1.02]"
          onClick={() => setActiveTab('orders')}
        >
          <StatCard
            title="Total Orders"
            value={stats?.totalOrders || 0}
            icon={<Package className="w-5 h-5" />}
            variant="primary"
          />
        </div>
        <div 
          className="cursor-pointer transition-transform hover:scale-[1.02]"
          onClick={() => setActiveTab('redirect-report')}
        >
          <StatCard
            title="Total Redirect"
            value={stats?.totalRedirect || 0}
            icon={<RotateCcw className="w-5 h-5" />}
            variant="destructive"
          />
        </div>
      </div>

      {/* Redirects by Calling Staff */}
      {stats?.staffRedirectStats && stats.staffRedirectStats.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="w-5 h-5" />
              Redirects by Calling Staff
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="table-header">Calling Staff</TableHead>
                    <TableHead className="table-header">Total Orders</TableHead>
                    <TableHead className="table-header">Redirected</TableHead>
                    <TableHead className="table-header">Redirect %</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {stats.staffRedirectStats.map((staff) => (
                    <TableRow key={staff.id}>
                      <TableCell className="font-medium">{staff.name}</TableCell>
                      <TableCell>{staff.totalOrders}</TableCell>
                      <TableCell>
                        <Badge variant="outline" className="bg-red-50 text-red-700 border-red-200">
                          {staff.redirectedOrders}
                        </Badge>
                      </TableCell>
                      <TableCell>{staff.redirectPercent}%</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Tabs for different sections */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="leads">Follow-up Leads</TabsTrigger>
          <TabsTrigger value="orders">Follow-up Orders</TabsTrigger>
          <TabsTrigger value="redirect-report">Redirect Report</TabsTrigger>
        </TabsList>

        <TabsContent value="leads" className="mt-4">
          {/* Leads Table */}
          <Card>
            <CardHeader>
              <CardTitle>Follow-up Leads</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="table-header">Date</TableHead>
                      <TableHead className="table-header">Client</TableHead>
                      <TableHead className="table-header">Contact</TableHead>
                      <TableHead className="table-header">Product</TableHead>
                      <TableHead className="table-header">Tag</TableHead>
                      <TableHead className="table-header">Status</TableHead>
                      <TableHead className="table-header">Remark</TableHead>
                      <TableHead className="table-header">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredLeads.map((lead) => (
                      <TableRow key={lead.id}>
                        <TableCell className="text-muted-foreground">
                          {format(new Date(lead.date), 'dd MMM')}
                        </TableCell>
                        <TableCell className="font-medium">{lead.client_name}</TableCell>
                        <TableCell>{lead.contact_number}</TableCell>
                        <TableCell>{lead.products?.name || '-'}</TableCell>
                        <TableCell>
                          {lead.tag === 'TRF' ? (
                            <Badge variant="outline" className="bg-amber-50 text-amber-700 border-amber-200">
                              TRF
                            </Badge>
                          ) : '-'}
                        </TableCell>
                        <TableCell>
                          <Badge variant="secondary">
                            {lead.status.replace('_', ' ')}
                          </Badge>
                        </TableCell>
                        <TableCell className="max-w-[200px] truncate">{lead.remark || '-'}</TableCell>
                        <TableCell>
                          <div className="flex items-center gap-1">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => openLeadDetail(lead)}
                              className="h-8 w-8 p-0"
                            >
                              <Eye className="w-4 h-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleCall(lead)}
                              className="h-8 w-8 p-0 text-success hover:text-success"
                            >
                              <Phone className="w-4 h-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => openWhatsApp(lead)}
                              className="h-8 w-8 p-0 text-success hover:text-success"
                            >
                              <MessageSquare className="w-4 h-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                    {filteredLeads.length === 0 && (
                      <TableRow>
                        <TableCell colSpan={8} className="text-center py-8 text-muted-foreground">
                          {isLoading ? 'Loading...' : tagFilter !== 'ALL' ? 'No leads match the filter' : 'No follow-up leads'}
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="orders" className="mt-4">
          <FollowupOrdersTable dateFrom={dateFrom} dateTo={dateTo} />
        </TabsContent>

        <TabsContent value="redirect-report" className="mt-4">
          <RedirectReport dateFrom={dateFrom} dateTo={dateTo} />
        </TabsContent>
      </Tabs>

      {/* Lead Detail Dialog */}
      <Dialog open={isDetailOpen} onOpenChange={setIsDetailOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Lead Details</DialogTitle>
          </DialogHeader>
          {selectedLead && (
            <div className="space-y-6">
              <div className="grid grid-cols-2 gap-4 p-4 bg-muted/50 rounded-lg">
                <div>
                  <p className="text-sm text-muted-foreground">Client Name</p>
                  <p className="font-medium">{selectedLead.client_name}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Contact</p>
                  <p className="font-medium">{selectedLead.contact_number}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Product</p>
                  <p className="font-medium">{selectedLead.products?.name || '-'}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Status</p>
                  <p className="font-medium">{selectedLead.status.replace('_', ' ')}</p>
                </div>
              </div>

              <div className="flex gap-2">
                <Button variant="outline" onClick={() => handleCall(selectedLead)} className="flex-1">
                  <Phone className="w-4 h-4 mr-2" />
                  Call
                </Button>
                <Button variant="outline" onClick={() => openWhatsApp(selectedLead)} className="flex-1">
                  <MessageSquare className="w-4 h-4 mr-2" />
                  WhatsApp
                </Button>
              </div>

              <div className="space-y-4 border-t pt-4">
                <div className="space-y-2">
                  <Label>Call Notes</Label>
                  <Textarea
                    placeholder="Add notes about this call..."
                    value={callNotes}
                    onChange={(e) => setCallNotes(e.target.value)}
                  />
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <Button 
                    onClick={() => handleStatusUpdate('CONFIRMED')}
                    className="bg-success hover:bg-success/90"
                    disabled={updateLeadStatus.isPending}
                  >
                    <CheckCircle className="w-4 h-4 mr-2" />
                    Confirm
                  </Button>
                  <Button 
                    variant="outline"
                    onClick={() => handleStatusUpdate('FOLLOW_UP')}
                    disabled={updateLeadStatus.isPending}
                  >
                    <Clock className="w-4 h-4 mr-2" />
                    Follow Up
                  </Button>
                  <Button 
                    variant="outline"
                    onClick={() => handleStatusUpdate('CALL_NOT_RECEIVED')}
                    disabled={updateLeadStatus.isPending}
                  >
                    <Phone className="w-4 h-4 mr-2" />
                    CNR
                  </Button>
                  <Button 
                    variant="outline"
                    onClick={() => setIsTransferOpen(true)}
                  >
                    <ArrowRight className="w-4 h-4 mr-2" />
                    Transfer
                  </Button>
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Transfer Dialog */}
      <Dialog open={isTransferOpen} onOpenChange={setIsTransferOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Transfer to Calling Staff</DialogTitle>
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
            <Button onClick={handleTransferToCalling} className="w-full" disabled={!transferStaffId}>
              Transfer Lead
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
