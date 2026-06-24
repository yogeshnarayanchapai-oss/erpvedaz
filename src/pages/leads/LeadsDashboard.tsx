import { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useLeads, useCreateLead, useLeadsForTransferSummary } from '@/hooks/useLeads';
import { useProducts } from '@/hooks/useProducts';
import { useCallingStaff } from '@/hooks/useStaff';
import { useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { getNepalDate } from '@/hooks/useDashboardStats';
import { StatCard } from '@/components/dashboard/StatCard';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Plus, Send, Users, FileText, Phone, Package, Clock, TrendingUp, BarChart3, PhoneOff, FileSpreadsheet } from 'lucide-react';
import { Progress } from '@/components/ui/progress';
import { format, startOfDay, endOfDay, subDays, isWithinInterval, parseISO, isToday } from 'date-fns';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend, Cell, PieChart, Pie } from 'recharts';
import { DateRangeFilter, DateRange } from '@/components/ui/DateRangeFilter';
import { getLeadStatusBadgeClass, formatStatusLabel } from '@/lib/statusColors';
import { BulkAddLeadsForm } from '@/components/leads/BulkAddLeadsForm';
import { ImportLeadsDialog } from '@/components/leads/ImportLeadsDialog';
import { AdminTransferLeadsModal } from '@/components/admin/AdminTransferLeadsModal';
import { TodayTransferProgress } from '@/components/admin/TodayTransferProgress';
import { useOrders } from '@/hooks/useOrders';
import { useAuth } from '@/contexts/AuthContext';
import { useEffectiveRole } from '@/hooks/useEffectiveRole';
import { useCurrentStore } from '@/contexts/CurrentStoreContext';
import { DuplicateBadge } from '@/components/leads/DuplicateBadge';

export default function LeadsDashboard() {
  // Use Nepal timezone for today's date
  const today = getNepalDate();
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const { user, profile } = useAuth();
  const { effectiveRole } = useEffectiveRole();
  const { currentStore } = useCurrentStore();
  const currentStoreId = currentStore?.id;
  
  // Check if user is Admin/Owner (sees all store data) or LEADS role (sees only own data)
  const isAdminOrOwner = effectiveRole === 'ADMIN' || effectiveRole === 'OWNER' || effectiveRole === 'MANAGER';
  const currentUserId = user?.id;
  
  // IMPORTANT: For non-admin users, avoid fetching the entire store lead pool (can be huge).
  // We fetch creator-scoped leads at the DB level and pause until we have a user id.
  const leadsQueryFilters = useMemo(
    () => (isAdminOrOwner ? undefined : { createdByUserId: currentUserId ?? null }),
    [isAdminOrOwner, currentUserId]
  );

  const { data: allLeads = [], isLoading } = useLeads(leadsQueryFilters);
  const { data: products = [] } = useProducts();
  const { data: callingStaff = [] } = useCallingStaff();
  const { data: orders = [] } = useOrders({ dateFrom: today, dateTo: today });
  
  // Separate query for Staff Transfer Summary - includes ALL leads (including confirmed)
  // This ensures "Today Transfer" count doesn't decrease when leads are confirmed
  const { data: allLeadsForTransferSummary = [] } = useLeadsForTransferSummary();
  
  // Filter leads based on role: Admin/Owner sees all, LEADS role sees only their own created/handled leads
  // RLS already filters leads at database level, but we apply additional client-side filter for LEADS role
  const filteredLeads = useMemo(() => {
    // If user ID isn't loaded yet, return empty to prevent showing wrong data
    if (!currentUserId) return [];
    
    if (isAdminOrOwner) return allLeads;
    // LEADS role: only show leads they created (RLS already filters, this is extra safety)
    return allLeads.filter(l => l.created_by_user_id === currentUserId);
  }, [allLeads, isAdminOrOwner, currentUserId]);
  
  // Filter orders based on role
  const filteredOrders = useMemo(() => {
    if (isAdminOrOwner) return orders;
    // LEADS role: only show orders from leads they created
    return orders.filter(o => {
      const lead = allLeads.find(l => l.id === o.lead_id);
      return lead?.created_by_user_id === currentUserId;
    });
  }, [orders, allLeads, isAdminOrOwner, currentUserId]);

  useEffect(() => {
    if (!currentStoreId) return;
    const channel = supabase
      .channel(`leads-dashboard-rt-${currentStoreId}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'leads', filter: `store_id=eq.${currentStoreId}` }, () => {
        queryClient.invalidateQueries({ queryKey: ['leads'] });
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [queryClient, currentStoreId]);

  const [isAddOpen, setIsAddOpen] = useState(false);
  const [isImportOpen, setIsImportOpen] = useState(false);
  const [isTransferOpen, setIsTransferOpen] = useState(false);
  
  const [analyticsDateRange, setAnalyticsDateRange] = useState<DateRange>({
    from: startOfDay(subDays(new Date(), 29)),
    to: endOfDay(new Date()),
  });

  // Filter leads in LEADS team pool with IN_POOL status
  const leadsInPool = filteredLeads.filter(l => l.pool_status === 'IN_POOL' && !l.assigned_to_user_id);
  
  // Today's leads breakdown by lead.date (the date when lead was created/transferred to LEADS team)
  const todayLeadsByDate = filteredLeads.filter(l => l.date === today);
  
  // New = leads created via lead form (NEW bucket, not CNR or FU status)
  const todayNewCount = todayLeadsByDate.filter(l => 
    l.lead_bucket === 'NEW' && 
    l.status !== 'CALL_NOT_RECEIVED' && 
    l.status !== 'FOLLOW_UP'
  ).length;
  
  // FU = leads reassigned/transferred from followup (FOLLOW_UP_POOL bucket or FOLLOW_UP status)
  const todayFUCount = todayLeadsByDate.filter(l => 
    l.lead_bucket === 'FOLLOW_UP_POOL' || l.status === 'FOLLOW_UP'
  ).length;
  
  // CNR = leads reassigned/transferred as CNR (CNR_POOL bucket or CALL_NOT_RECEIVED status)
  const todayCNRCount = todayLeadsByDate.filter(l => 
    l.lead_bucket === 'CNR_POOL' || l.status === 'CALL_NOT_RECEIVED'
  ).length;
  
  // Total Today's Leads = sum of all buckets
  const todayTotalLeads = todayNewCount + todayFUCount + todayCNRCount;
  
  // New leads bucket count - only NEW bucket (not CNR or FU)
  const newLeads = leadsInPool.filter(l => l.lead_bucket === 'NEW' && l.status !== 'CALL_NOT_RECEIVED');
  
  // Follow-up leads count - includes leads with FOLLOW_UP status or sent to FOLLOWUP team
  const followupLeads = filteredLeads.filter(l => 
    l.lead_bucket === 'FOLLOW_UP_POOL' || l.current_team === 'FOLLOWUP' || l.status === 'FOLLOW_UP'
  );
  
  // CNR leads count - includes both teams (LEADS and CALLING)
  const cnrLeads = filteredLeads.filter(l => l.lead_bucket === 'CNR_POOL' || l.status === 'CALL_NOT_RECEIVED');
  
  // Total in Queue: Only NEW leads pending assignment (not CNR, not FU)
  const totalInQueue = newLeads.length;


  // Fetch today's transfers from lead_transfers table (historical, never changes on reassignment)
  const [todayTransfers, setTodayTransfers] = useState<{ to_user_id: string; from_user_id: string | null; transferred_at: string; lead_id: string; created_by_user_id: string | null; product_id: string | null }[]>([]);
  
  useEffect(() => {
    async function fetchTodayTransfers() {
      if (!currentStoreId) return;
      
      const todayDate = getNepalDate();
      // Fetch from lead_transfers table with lead info (created_by_user_id, product_id, store_id)
      const { data, error } = await supabase
        .from('lead_transfers')
        .select('to_user_id, from_user_id, transferred_at, lead_id, leads!inner(created_by_user_id, product_id, store_id)')
        .not('to_user_id', 'is', null)
        .eq('leads.store_id', currentStoreId)
        .gte('transferred_at', `${todayDate}T00:00:00+05:45`)
        .lte('transferred_at', `${todayDate}T23:59:59+05:45`);
      
      if (!error && data) {
        setTodayTransfers(data.map(d => ({
          to_user_id: d.to_user_id!,
          from_user_id: (d as any).from_user_id || null,
          transferred_at: (d as any).transferred_at,
          lead_id: d.lead_id,
          created_by_user_id: (d.leads as any)?.created_by_user_id || null,
          product_id: (d.leads as any)?.product_id || null
        })));
      }
    }
    fetchTodayTransfers();
    
    // Subscribe to lead_transfers changes for real-time updates
    const transfersChannel = supabase
      .channel('lead-transfers-dashboard')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'lead_transfers' }, () => {
        fetchTodayTransfers();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(transfersChannel);
    };
  }, [today, currentStoreId]);

  // Staff Transfer Summary - shows Calling Staff list
  // Uses leads.assigned_at for historical counting - aggregates ALL assignments today
  // For LEADS role: shows calling staff who received leads from THIS user
  // For Admin/Owner: shows calling staff with combined data from ALL creators in store
  const staffTransferSummary = useMemo(() => {
    // Helper function to calculate product counts
    type TransferLead = { product_id: string | null; products?: { name: string } | null };
    const calculateProducts = (leads: TransferLead[]) => {
      const productCounts: Record<string, number> = {};
      leads.forEach(lead => {
        if (lead.product_id) {
          const productName = lead.products?.name || products.find(p => p.id === lead.product_id)?.name;
          if (productName) {
            productCounts[productName] = (productCounts[productName] || 0) + 1;
          }
        }
      });
      const productEntries = Object.entries(productCounts);
      const fullProductList = productEntries.map(([name, qty]) => `${name} (${qty})`).join(', ');
      const shortProductList = productEntries.map(([name, qty]) => `${name.split(' ')[0]} (${qty})`).join(', ');
      const displayProducts = fullProductList.length > 40 ? shortProductList : fullProductList;
      return { displayProducts: displayProducts || '-', fullProductList: fullProductList || '-' };
    };

    // Helper: compute first-assign vs reassign counts from a list of transfers.
    // Group by lead_id, take earliest transfer; if its from_user_id is null => first assign, else reassign.
    const calcAssignBreakdown = (transfers: { lead_id: string; from_user_id: string | null; transferred_at: string }[]) => {
      const byLead = new Map<string, { from_user_id: string | null; transferred_at: string }[]>();
      transfers.forEach(t => {
        if (!byLead.has(t.lead_id)) byLead.set(t.lead_id, []);
        byLead.get(t.lead_id)!.push({ from_user_id: t.from_user_id, transferred_at: t.transferred_at });
      });
      let firstAssign = 0;
      let reassign = 0;
      byLead.forEach(list => {
        const earliest = list.sort((a, b) => new Date(a.transferred_at).getTime() - new Date(b.transferred_at).getTime())[0];
        if (earliest.from_user_id === null) firstAssign++;
        else reassign++;
      });
      return { firstAssign, reassign };
    };

    // For LEADS role: Show calling staff who received leads CREATED by this LEADS user
    if (!isAdminOrOwner && currentUserId) {
      return callingStaff.map(staff => {
        const transfersToStaffToday = todayTransfers.filter(t => 
          t.to_user_id === staff.id && 
          t.created_by_user_id === currentUserId
        );
        const uniqueLeadIds = [...new Set(transfersToStaffToday.map(t => t.lead_id))];
        const todayTransfer = uniqueLeadIds.length;
        const { firstAssign, reassign } = calcAssignBreakdown(transfersToStaffToday);
        
        const currentStaffLeads = allLeadsForTransferSummary.filter(l => 
          l.created_by_user_id === currentUserId && 
          l.assigned_to_user_id === staff.id
        );
        const remaining = currentStaffLeads.filter(l => l.status === 'ASSIGNED').length;
        
        const todayTransferredLeads = allLeadsForTransferSummary.filter(l => uniqueLeadIds.includes(l.id));
        const { displayProducts, fullProductList } = calculateProducts(todayTransferredLeads);
        
        return {
          id: staff.id,
          name: staff.name,
          todayTransfer,
          firstAssign,
          reassign,
          remaining,
          products: displayProducts,
          fullProducts: fullProductList,
        };
      }).filter(s => s.todayTransfer >= 1);
    }
    
    // Admin/Owner: show all calling staff with combined data from ALL creators in store
    return callingStaff.map(staff => {
      const transfersToStaffToday = todayTransfers.filter(t => t.to_user_id === staff.id);
      const uniqueLeadIds = [...new Set(transfersToStaffToday.map(t => t.lead_id))];
      const todayTransfer = uniqueLeadIds.length;
      const { firstAssign, reassign } = calcAssignBreakdown(transfersToStaffToday);
      
      const currentStaffLeads = allLeadsForTransferSummary.filter(l => l.assigned_to_user_id === staff.id);
      const remaining = currentStaffLeads.filter(l => l.status === 'ASSIGNED').length;
      
      const todayTransferredLeads = allLeadsForTransferSummary.filter(l => uniqueLeadIds.includes(l.id));
      const { displayProducts, fullProductList } = calculateProducts(todayTransferredLeads);

      return {
        id: staff.id,
        name: staff.name,
        todayTransfer,
        firstAssign,
        reassign,
        remaining,
        products: displayProducts,
        fullProducts: fullProductList,
      };
    }).filter(s => s.todayTransfer >= 1);
  }, [isAdminOrOwner, currentUserId, todayTransfers, allLeadsForTransferSummary, callingStaff, products]);

  // Product Leads Summary - uses filtered leads based on role
  const productSummary = useMemo(() => {
    return products.map(product => {
      const productLeads = filteredLeads.filter(l => l.product_id === product.id);
      const leadsToday = productLeads.filter(l => l.date === today).length;
      const transferredToday = productLeads.filter(l => 
        l.date === today && l.assigned_to_user_id !== null
      ).length;
      const remainingInPool = productLeads.filter(l => 
        l.current_team === 'LEADS' && !l.assigned_to_user_id
      ).length;

      return {
        id: product.id,
        name: product.name,
        leadsToday,
        transferredToday,
        remainingInPool,
      };
    }).filter(p => p.leadsToday >= 1);
  }, [products, filteredLeads, today]);

  // Today's Progress Stats (like AdminLeads) - uses filtered leads based on role
  const todayProgressStats = useMemo(() => {
    const todayLeads = filteredLeads.filter(l => l.date === today);
    const totalTodayLeads = todayLeads.length;
    const transferredToday = filteredLeads.filter(l => {
      if (!l.assigned_at) return false;
      return isToday(new Date(l.assigned_at));
    }).length;
    const remainingTodayLeads = filteredLeads.filter(l => 
      l.status === 'ASSIGNED' || l.status === 'NEW' || !l.status
    ).length;
    
    // Today Lead = leads created from add lead form that have been transferred today (NEW bucket, transferred)
    const todayLeadsTransferred = filteredLeads.filter(l => {
      if (!l.assigned_at) return false;
      const assignedToday = isToday(new Date(l.assigned_at));
      // NEW bucket leads that got transferred
      return assignedToday && l.lead_bucket === 'NEW' && l.status !== 'CALL_NOT_RECEIVED';
    }).length;
    
    // CNR Lead = CNR leads that have been transferred or reassigned today
    const cnrLeadsTransferred = filteredLeads.filter(l => {
      if (!l.assigned_at) return false;
      const assignedToday = isToday(new Date(l.assigned_at));
      // CNR bucket/status leads that got transferred
      return assignedToday && (l.lead_bucket === 'CNR_POOL' || l.status === 'CALL_NOT_RECEIVED');
    }).length;
    
    // Total remaining in pool (filtered leads)
    const totalRemainingInPool = leadsInPool.length;
    
    return { 
      totalTodayLeads, transferredToday, remainingTodayLeads, 
      todayLeadsTransferred, cnrLeadsTransferred,
      totalRemainingInPool
    };
  }, [filteredLeads, today, leadsInPool]);

  // Bucket Conversion Analytics - uses role-filtered leads
  const bucketAnalytics = useMemo(() => {
    const dateRangeLeads = filteredLeads.filter(l => {
      if (!l.date) return false;
      const leadDate = parseISO(l.date);
      return isWithinInterval(leadDate, { start: analyticsDateRange.from, end: analyticsDateRange.to });
    });

    const newBucketLeads = dateRangeLeads.filter(l => l.lead_bucket === 'NEW');
    const followupBucketLeads = dateRangeLeads.filter(l => l.lead_bucket === 'FOLLOW_UP_POOL' || l.lead_bucket === 'FOLLOWUP');
    const cnrBucketLeads = dateRangeLeads.filter(l => l.lead_bucket === 'CNR_POOL');
    
    const newConfirmed = newBucketLeads.filter(l => l.status === 'CONFIRMED').length;
    const newTotal = newBucketLeads.length;
    const newConversionRate = newTotal > 0 ? ((newConfirmed / newTotal) * 100) : 0;
    
    const followupConfirmed = followupBucketLeads.filter(l => l.status === 'CONFIRMED').length;
    const followupTotal = followupBucketLeads.length;
    const followupConversionRate = followupTotal > 0 ? ((followupConfirmed / followupTotal) * 100) : 0;
    
    const cnrConfirmed = cnrBucketLeads.filter(l => l.status === 'CONFIRMED').length;
    const cnrTotal = cnrBucketLeads.length;
    const cnrConversionRate = cnrTotal > 0 ? ((cnrConfirmed / cnrTotal) * 100) : 0;
    
    const cancelledLeads = dateRangeLeads.filter(l => l.lead_bucket === 'CANCELLED' || l.status === 'CANCELLED').length;
    
    return {
      new: { total: newTotal, confirmed: newConfirmed, rate: newConversionRate },
      followup: { total: followupTotal, confirmed: followupConfirmed, rate: followupConversionRate },
      cnr: { total: cnrTotal, confirmed: cnrConfirmed, rate: cnrConversionRate },
      cancelled: cancelledLeads,
    };
  }, [filteredLeads, analyticsDateRange]);

  const conversionChartData = useMemo(() => [
    { 
      name: 'New Leads', 
      total: bucketAnalytics.new.total, 
      confirmed: bucketAnalytics.new.confirmed,
      rate: bucketAnalytics.new.rate.toFixed(1),
    },
    { 
      name: 'Follow-up Leads', 
      total: bucketAnalytics.followup.total, 
      confirmed: bucketAnalytics.followup.confirmed,
      rate: bucketAnalytics.followup.rate.toFixed(1),
    },
    { 
      name: 'CNR Leads', 
      total: bucketAnalytics.cnr.total, 
      confirmed: bucketAnalytics.cnr.confirmed,
      rate: bucketAnalytics.cnr.rate.toFixed(1),
    },
  ], [bucketAnalytics]);

  const pieChartData = useMemo(() => [
    { name: 'New Leads', value: bucketAnalytics.new.total, fill: 'hsl(var(--primary))' },
    { name: 'Follow-up Leads', value: bucketAnalytics.followup.total, fill: 'hsl(var(--warning))' },
    { name: 'CNR Leads', value: bucketAnalytics.cnr.total, fill: 'hsl(var(--destructive))' },
    { name: 'Cancelled', value: bucketAnalytics.cancelled, fill: 'hsl(var(--muted-foreground))' },
  ].filter(item => item.value > 0), [bucketAnalytics]);

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Leads Dashboard</h1>
          <p className="text-muted-foreground">
            {isAdminOrOwner ? 'All leads in store' : 'Your leads and transfers'}
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => setIsTransferOpen(true)}>
            <Send className="w-4 h-4 mr-2" />
            Transfer Leads
          </Button>
          <Button variant="outline" onClick={() => setIsImportOpen(true)}>
            <FileSpreadsheet className="w-4 h-4 mr-2" />
            Import
          </Button>
          <Button onClick={() => setIsAddOpen(true)}>
            <Plus className="w-4 h-4 mr-2" />
            Add Leads
          </Button>
        </div>
      </div>

      <BulkAddLeadsForm open={isAddOpen} onOpenChange={setIsAddOpen} />

      <ImportLeadsDialog open={isImportOpen} onOpenChange={setIsImportOpen} portalType="LEADS" />

      <AdminTransferLeadsModal
        open={isTransferOpen} 
        onOpenChange={setIsTransferOpen}
      />

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-6 gap-4">
        <StatCard
          title="Today's Leads"
          value={todayTotalLeads}
          description={`New: ${todayNewCount} | FU: ${todayFUCount} | CNR: ${todayCNRCount}`}
          icon={<FileText className="w-5 h-5" />}
          variant="primary"
          onClick={() => navigate('/leads/all')}
          className="cursor-pointer hover:shadow-md transition-shadow"
        />
        <StatCard
          title="New Leads"
          value={newLeads.length}
          icon={<Users className="w-5 h-5" />}
          variant="info"
          onClick={() => navigate('/leads/all?bucket=NEW')}
          className="cursor-pointer hover:shadow-md transition-shadow"
        />
        <StatCard
          title="Follow-up Leads"
          value={followupLeads.length}
          icon={<Clock className="w-5 h-5" />}
          variant="warning"
          onClick={() => navigate('/leads/all?bucket=FOLLOWUP')}
          className="cursor-pointer hover:shadow-md transition-shadow"
        />
        <StatCard
          title="CNR Leads"
          value={cnrLeads.length}
          icon={<PhoneOff className="w-5 h-5" />}
          variant="destructive"
          onClick={() => navigate('/leads/all?bucket=CNR')}
          className="cursor-pointer hover:shadow-md transition-shadow"
        />
        <StatCard
          title="Total in Queue"
          value={totalInQueue}
          icon={<Phone className="w-5 h-5" />}
          variant="default"
          onClick={() => navigate('/leads/all?bucket=NEW')}
          className="cursor-pointer hover:shadow-md transition-shadow"
        />
        <StatCard
          title="Products"
          value={products.length}
          icon={<Package className="w-5 h-5" />}
          variant="success"
          onClick={() => navigate('/admin/products')}
          className="cursor-pointer hover:shadow-md transition-shadow"
        />
      </div>

      {/* Today's Transfer Progress Widget with Stats */}
      <TodayTransferProgress
        totalTodayLeads={todayProgressStats.totalTodayLeads}
        transferredToday={todayProgressStats.transferredToday}
        remainingTodayLeads={todayProgressStats.remainingTodayLeads}
        todayLeadsTransferred={todayProgressStats.todayLeadsTransferred}
        cnrLeadsTransferred={todayProgressStats.cnrLeadsTransferred}
        totalRemainingInPool={todayProgressStats.totalRemainingInPool}
      />

      {/* Bucket Conversion Analytics */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold">Bucket Conversion Analytics</h2>
          <DateRangeFilter value={analyticsDateRange} onChange={setAnalyticsDateRange} />
        </div>
        <p className="text-sm text-muted-foreground">
          Showing data from {format(analyticsDateRange.from, 'MMM d, yyyy')} to {format(analyticsDateRange.to, 'MMM d, yyyy')}
        </p>
      </div>
      <div className="grid lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="w-5 h-5" />
              Conversion by Lead Type
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-[280px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={conversionChartData} layout="vertical" margin={{ top: 10, right: 30, left: 80, bottom: 10 }}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                  <XAxis type="number" tick={{ fill: 'hsl(var(--muted-foreground))' }} />
                  <YAxis dataKey="name" type="category" tick={{ fill: 'hsl(var(--muted-foreground))' }} width={80} />
                  <Tooltip 
                    contentStyle={{ 
                      backgroundColor: 'hsl(var(--background))', 
                      border: '1px solid hsl(var(--border))',
                      borderRadius: '8px'
                    }} 
                    formatter={(value, name) => [value, name === 'total' ? 'Total' : 'Confirmed']}
                  />
                  <Legend />
                  <Bar dataKey="total" name="Total" fill="hsl(var(--muted-foreground))" radius={[0, 4, 4, 0]} />
                  <Bar dataKey="confirmed" name="Confirmed" fill="hsl(var(--success))" radius={[0, 4, 4, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
            <div className="grid grid-cols-3 gap-4 mt-4">
              <div className="p-4 bg-primary/5 rounded-lg text-center">
                <p className="text-sm text-muted-foreground">New Leads Rate</p>
                <p className="text-2xl font-bold text-primary">{bucketAnalytics.new.rate.toFixed(1)}%</p>
                <p className="text-xs text-muted-foreground">{bucketAnalytics.new.confirmed} / {bucketAnalytics.new.total}</p>
              </div>
              <div className="p-4 bg-warning/5 rounded-lg text-center">
                <p className="text-sm text-muted-foreground">Follow-up Rate</p>
                <p className="text-2xl font-bold text-warning">{bucketAnalytics.followup.rate.toFixed(1)}%</p>
                <p className="text-xs text-muted-foreground">{bucketAnalytics.followup.confirmed} / {bucketAnalytics.followup.total}</p>
              </div>
              <div className="p-4 bg-destructive/5 rounded-lg text-center">
                <p className="text-sm text-muted-foreground">CNR Rate</p>
                <p className="text-2xl font-bold text-destructive">{bucketAnalytics.cnr.rate.toFixed(1)}%</p>
                <p className="text-xs text-muted-foreground">{bucketAnalytics.cnr.confirmed} / {bucketAnalytics.cnr.total}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <BarChart3 className="w-5 h-5" />
              Lead Distribution by Bucket
            </CardTitle>
          </CardHeader>
          <CardContent>
            {pieChartData.length > 0 ? (
              <div className="h-[280px]">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={pieChartData}
                      cx="50%"
                      cy="50%"
                      innerRadius={60}
                      outerRadius={100}
                      paddingAngle={2}
                      dataKey="value"
                      label={({ name, value, percent }) => `${name}: ${value} (${(percent * 100).toFixed(0)}%)`}
                    >
                      {pieChartData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.fill} />
                      ))}
                    </Pie>
                    <Tooltip 
                      contentStyle={{ 
                        backgroundColor: 'hsl(var(--background))', 
                        border: '1px solid hsl(var(--border))',
                        borderRadius: '8px'
                      }} 
                    />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            ) : (
              <div className="h-[280px] flex items-center justify-center text-muted-foreground">
                No lead data available
              </div>
            )}
            <div className="grid grid-cols-4 gap-2 mt-4 text-center">
              <div className="p-3 bg-primary/10 rounded-lg">
                <p className="text-xs text-muted-foreground">New</p>
                <p className="text-lg font-bold text-primary">{bucketAnalytics.new.total}</p>
              </div>
              <div className="p-3 bg-warning/10 rounded-lg">
                <p className="text-xs text-muted-foreground">Follow-up</p>
                <p className="text-lg font-bold text-warning">{bucketAnalytics.followup.total}</p>
              </div>
              <div className="p-3 bg-destructive/10 rounded-lg">
                <p className="text-xs text-muted-foreground">CNR</p>
                <p className="text-lg font-bold text-destructive">{bucketAnalytics.cnr.total}</p>
              </div>
              <div className="p-3 bg-muted rounded-lg">
                <p className="text-xs text-muted-foreground">Cancelled</p>
                <p className="text-lg font-bold text-muted-foreground">{bucketAnalytics.cancelled}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Summary Tables */}
      <div className="grid lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="w-5 h-5" />
              Staff Transfer Summary
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Staff Name</TableHead>
                  <TableHead className="text-center">Today Transfer</TableHead>
                  <TableHead className="text-center">New</TableHead>
                  <TableHead>Products</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {staffTransferSummary.length > 0 ? (
                  staffTransferSummary.map((staff) => (
                    <TableRow key={staff.id}>
                      <TableCell className="font-medium">{staff.name}</TableCell>
                      <TableCell className="text-center">
                        <div className="flex flex-col items-center gap-0.5">
                          <Badge variant="outline" className="bg-primary/10 text-primary">
                            {staff.todayTransfer}
                          </Badge>
                          <div className="text-[10px] text-muted-foreground leading-tight">
                            <span className="text-success">A: {staff.firstAssign.toLocaleString()}</span>
                            {' / '}
                            <span className="text-chart-3">R: {staff.reassign.toLocaleString()}</span>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell className="text-center">
                        <Badge variant="outline" className="bg-warning/10 text-warning">
                          {staff.remaining}
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
                      No transfers today
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Package className="w-5 h-5" />
              Product Leads Summary
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Product</TableHead>
                  <TableHead className="text-center">Leads Today</TableHead>
                  <TableHead className="text-center">Transferred</TableHead>
                  <TableHead className="text-center">Remaining</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {productSummary.map((product) => (
                  <TableRow key={product.id}>
                    <TableCell className="font-medium">{product.name}</TableCell>
                    <TableCell className="text-center">
                      <Badge variant="outline" className="bg-info/10 text-info">
                        {product.leadsToday}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-center">
                      <Badge variant="outline" className="bg-success/10 text-success">
                        {product.transferredToday}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-center">
                      <Badge variant="outline" className="bg-warning/10 text-warning">
                        {product.remainingInPool}
                      </Badge>
                    </TableCell>
                  </TableRow>
                ))}
                {products.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={4} className="text-center py-6 text-muted-foreground">
                      No products found
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>

      {/* Recent Leads Table */}
      <Card>
        <CardHeader>
          <CardTitle>Recent Leads in Pool</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Date</TableHead>
                <TableHead>Client</TableHead>
                <TableHead>Contact</TableHead>
                <TableHead>Product</TableHead>
                <TableHead>Source</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {leadsInPool.slice(0, 10).map((lead) => (
                <TableRow key={lead.id}>
                  <TableCell className="text-muted-foreground">
                    {format(new Date(lead.date), 'dd MMM')}
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
                </TableRow>
              ))}
              {leadsInPool.length === 0 && (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                    {isLoading ? 'Loading...' : 'No leads in pool'}
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
