import { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useLeads, useCreateLead } from '@/hooks/useLeads';
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
import { Plus, Send, Users, FileText, Phone, Package, ArrowRight, Clock, TrendingUp, BarChart3, PhoneOff, FileSpreadsheet } from 'lucide-react';
import { Progress } from '@/components/ui/progress';
import { format, startOfDay, endOfDay, subDays, isWithinInterval, parseISO, isToday } from 'date-fns';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend, Cell, PieChart, Pie } from 'recharts';
import { DateRangeFilter, DateRange } from '@/components/ui/DateRangeFilter';
import { getLeadStatusBadgeClass, formatStatusLabel } from '@/lib/statusColors';
import { BulkAddLeadsForm } from '@/components/leads/BulkAddLeadsForm';
import { ImportLeadsDialog } from '@/components/leads/ImportLeadsDialog';
import { AdminTransferLeadsModal } from '@/components/admin/AdminTransferLeadsModal';

export default function LeadsDashboard() {
  // Use Nepal timezone for today's date
  const today = getNepalDate();
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  
  const { data: allLeads = [], isLoading } = useLeads();
  const { data: products = [] } = useProducts();
  const { data: callingStaff = [] } = useCallingStaff();

  useEffect(() => {
    const channel = supabase
      .channel('leads-realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'leads' }, () => {
        queryClient.invalidateQueries({ queryKey: ['leads'] });
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [queryClient]);

  const [isAddOpen, setIsAddOpen] = useState(false);
  const [isImportOpen, setIsImportOpen] = useState(false);
  const [isTransferOpen, setIsTransferOpen] = useState(false);
  
  const [analyticsDateRange, setAnalyticsDateRange] = useState<DateRange>({
    from: startOfDay(subDays(new Date(), 29)),
    to: endOfDay(new Date()),
  });

  // Filter leads in LEADS team pool with IN_POOL status
  const leadsInPool = allLeads.filter(l => l.pool_status === 'IN_POOL' && !l.assigned_to_user_id);
  
  // Today's leads: all leads created today (New + FU + CNR combined)
  const todayAllLeads = allLeads.filter(l => {
    const isCreatedToday = l.date === today;
    const isReturnedToday = l.returned_to_leads_at && isToday(new Date(l.returned_to_leads_at));
    return isCreatedToday || isReturnedToday;
  });
  
  // Today's breakdown
  const todayNewCount = todayAllLeads.filter(l => l.lead_bucket === 'NEW' && l.status !== 'CALL_NOT_RECEIVED').length;
  const todayFUCount = todayAllLeads.filter(l => l.lead_bucket === 'FOLLOW_UP_POOL').length;
  const todayCNRCount = todayAllLeads.filter(l => l.lead_bucket === 'CNR_POOL' || l.status === 'CALL_NOT_RECEIVED').length;
  
  // New leads bucket count - only NEW bucket (not CNR or FU)
  const newLeads = leadsInPool.filter(l => l.lead_bucket === 'NEW' && l.status !== 'CALL_NOT_RECEIVED');
  
  // Follow-up leads count - includes leads sent to FOLLOWUP team
  const followupLeads = allLeads.filter(l => 
    l.lead_bucket === 'FOLLOW_UP_POOL' || l.current_team === 'FOLLOWUP'
  );
  
  // CNR leads count - includes both teams (LEADS and CALLING)
  const cnrLeads = allLeads.filter(l => l.lead_bucket === 'CNR_POOL' || l.status === 'CALL_NOT_RECEIVED');
  
  // Total in Queue: Only NEW leads pending assignment (not CNR, not FU)
  const totalInQueue = newLeads.length;

  // Calculate today's transfer progress
  // Total to transfer today = all leads in pool for today
  const todayAllInPool = todayAllLeads.filter(l => l.pool_status === 'IN_POOL' && !l.assigned_to_user_id).length;
  
  // Transferred today = leads assigned today (using assigned_at)
  const todayTransferredLeads = allLeads.filter(l => {
    if (!l.assigned_at) return false;
    return isToday(new Date(l.assigned_at));
  });
  
  const todayTransferredCount = todayTransferredLeads.length;
  const todayTotalForProgress = todayAllInPool + todayTransferredCount;
  const transferProgress = todayTotalForProgress > 0 ? (todayTransferredCount / todayTotalForProgress) * 100 : 0;

  // Staff Transfer Summary
  const staffTransferSummary = callingStaff.map(staff => {
    const staffLeads = allLeads.filter(l => 
      l.assigned_to_user_id === staff.id && 
      l.current_team === 'CALLING'
    );
    
    const todayTransfer = staffLeads.filter(l => l.date === today).length;
    const remaining = staffLeads.filter(l => 
      l.status !== 'CONFIRMED' && l.status !== 'CANCELLED'
    ).length;
    
    const productsTransferred = [...new Set(
      staffLeads
        .filter(l => l.date === today && l.product_id)
        .map(l => products.find(p => p.id === l.product_id)?.name)
        .filter(Boolean)
    )];

    return {
      id: staff.id,
      name: staff.name,
      todayTransfer,
      remaining,
      products: productsTransferred.join(', ') || '-',
    };
  }).filter(s => s.todayTransfer > 0 || s.remaining > 0);

  // Product Leads Summary
  const productSummary = products.map(product => {
    const productLeads = allLeads.filter(l => l.product_id === product.id);
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
  });

  // Bucket Conversion Analytics
  const bucketAnalytics = useMemo(() => {
    const filteredLeads = allLeads.filter(l => {
      if (!l.date) return false;
      const leadDate = parseISO(l.date);
      return isWithinInterval(leadDate, { start: analyticsDateRange.from, end: analyticsDateRange.to });
    });

    const newBucketLeads = filteredLeads.filter(l => l.lead_bucket === 'NEW');
    const followupBucketLeads = filteredLeads.filter(l => l.lead_bucket === 'FOLLOW_UP_POOL' || l.lead_bucket === 'FOLLOWUP');
    const cnrBucketLeads = filteredLeads.filter(l => l.lead_bucket === 'CNR_POOL');
    
    const newConfirmed = newBucketLeads.filter(l => l.status === 'CONFIRMED').length;
    const newTotal = newBucketLeads.length;
    const newConversionRate = newTotal > 0 ? ((newConfirmed / newTotal) * 100) : 0;
    
    const followupConfirmed = followupBucketLeads.filter(l => l.status === 'CONFIRMED').length;
    const followupTotal = followupBucketLeads.length;
    const followupConversionRate = followupTotal > 0 ? ((followupConfirmed / followupTotal) * 100) : 0;
    
    const cnrConfirmed = cnrBucketLeads.filter(l => l.status === 'CONFIRMED').length;
    const cnrTotal = cnrBucketLeads.length;
    const cnrConversionRate = cnrTotal > 0 ? ((cnrConfirmed / cnrTotal) * 100) : 0;
    
    const cancelledLeads = filteredLeads.filter(l => l.lead_bucket === 'CANCELLED' || l.status === 'CANCELLED').length;
    
    return {
      new: { total: newTotal, confirmed: newConfirmed, rate: newConversionRate },
      followup: { total: followupTotal, confirmed: followupConfirmed, rate: followupConversionRate },
      cnr: { total: cnrTotal, confirmed: cnrConfirmed, rate: cnrConversionRate },
      cancelled: cancelledLeads,
    };
  }, [allLeads, analyticsDateRange]);

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
          <p className="text-muted-foreground">Manage and distribute leads</p>
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
          value={todayAllLeads.length}
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

      {/* Transfer Progress Indicator */}
      <Card className="bg-gradient-to-r from-primary/5 to-success/5 border-primary/20">
        <CardContent className="pt-6">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                <ArrowRight className="w-5 h-5 text-primary" />
              </div>
              <div>
                <h3 className="font-semibold">Today's Transfer Progress</h3>
                <p className="text-sm text-muted-foreground">
                  {todayTransferredCount} of {todayTotalForProgress} today's leads transferred to calling staff
                </p>
              </div>
            </div>
            <div className="text-right">
              <span className="text-2xl font-bold text-primary">{Math.round(transferProgress)}%</span>
            </div>
          </div>
          <Progress value={transferProgress} className="h-3" />
          <div className="flex justify-between mt-2 text-xs text-muted-foreground">
            <span>Remaining in pool (today): {todayAllInPool}</span>
            <span>Transferred (today): {todayTransferredCount}</span>
          </div>
        </CardContent>
      </Card>

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
                  <TableHead className="text-center">Remaining</TableHead>
                  <TableHead>Products</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {staffTransferSummary.length > 0 ? (
                  staffTransferSummary.map((staff) => (
                    <TableRow key={staff.id}>
                      <TableCell className="font-medium">{staff.name}</TableCell>
                      <TableCell className="text-center">
                        <Badge variant="outline" className="bg-primary/10 text-primary">
                          {staff.todayTransfer}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-center">
                        <Badge variant="outline" className="bg-warning/10 text-warning">
                          {staff.remaining}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground max-w-[150px] truncate">
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
                  <TableCell className="font-medium">{lead.client_name}</TableCell>
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
