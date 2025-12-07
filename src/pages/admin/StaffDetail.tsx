import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { format, startOfDay, endOfDay } from 'date-fns';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { DashboardDateFilter } from '@/components/dashboard/DashboardDateFilter';
import { DateRange } from '@/hooks/useSalesByDateRange';
import { 
  useStaffProfile, 
  useStaffDetailSummary, 
  useStaffLeads, 
  useStaffOrders,
  useStaffDailyPerformance 
} from '@/hooks/useStaffDetail';
import { 
  ArrowLeft, Users, ShoppingCart, CheckCircle, TrendingUp, 
  DollarSign, Target, Phone 
} from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend, Bar, ComposedChart } from 'recharts';
import { LeadDetailSheet } from '@/components/leads/LeadDetailSheet';
import { supabase } from '@/integrations/supabase/client';
import { Lead } from '@/hooks/useLeads';

const statusColors: Record<string, string> = {
  CONFIRMED: 'bg-green-500',
  DELIVERED: 'bg-blue-500',
  DISPATCHED: 'bg-purple-500',
  PENDING: 'bg-yellow-500',
  CANCELLED: 'bg-red-500',
  RTO: 'bg-orange-500',
};

const leadStatusColors: Record<string, string> = {
  CONFIRMED: 'bg-green-500',
  NEW: 'bg-blue-500',
  FOLLOW_UP: 'bg-yellow-500',
  CALL_NOT_RECEIVED: 'bg-orange-500',
  CANCELLED: 'bg-red-500',
};

export default function StaffDetail() {
  const { staffId } = useParams<{ staffId: string }>();
  const navigate = useNavigate();
  
  const [dateRange, setDateRange] = useState<DateRange>({
    from: startOfDay(new Date()),
    to: endOfDay(new Date()),
  });
  const [selectedLeadId, setSelectedLeadId] = useState<string | null>(null);

  const { data: profile, isLoading: profileLoading } = useStaffProfile(staffId || '');
  const { data: summary, isLoading: summaryLoading } = useStaffDetailSummary(staffId || '', dateRange);
  const { data: leads = [] } = useStaffLeads(staffId || '', dateRange);
  const { data: orders = [] } = useStaffOrders(staffId || '', dateRange);
  const { data: dailyPerformance = [] } = useStaffDailyPerformance(staffId || '', 30);

  // Fetch full lead data when selected
  const { data: selectedLead } = useQuery({
    queryKey: ['lead-detail', selectedLeadId],
    queryFn: async () => {
      if (!selectedLeadId) return null;
      const { data, error } = await supabase
        .from('leads')
        .select(`
          *,
          products(name),
          assigned_to:profiles!leads_assigned_to_user_id_fkey(name),
          created_by_staff:profiles!leads_created_by_user_id_fkey(name),
          branches(branch_name, district, arrival_time, contact_phone, base_charge, area_covered)
        `)
        .eq('id', selectedLeadId)
        .maybeSingle();
      if (error) throw error;
      return data as Lead | null;
    },
    enabled: !!selectedLeadId,
  });

  if (!staffId) {
    return <div>Staff ID not found</div>;
  }

  const isLoading = profileLoading || summaryLoading;
  const formatCurrency = (val: number) => `Rs ${val.toLocaleString()}`;

  const chartData = dailyPerformance.map(d => ({
    date: format(new Date(d.date), 'MMM dd'),
    sales: d.sales,
    orders: d.orders,
  }));

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <h1 className="text-2xl font-bold">{profile?.name || 'Loading...'}</h1>
            <div className="flex items-center gap-2 mt-1">
              <Badge variant="secondary">{profile?.role || 'Staff'}</Badge>
              {profile?.email && (
                <span className="text-sm text-muted-foreground">{profile.email}</span>
              )}
            </div>
          </div>
        </div>
        <DashboardDateFilter value={dateRange} onChange={setDateRange} />
      </div>

      {isLoading ? (
        <div className="text-muted-foreground">Loading...</div>
      ) : (
        <>
          {/* Summary Cards */}
          <div className="grid gap-4 md:grid-cols-3 lg:grid-cols-6">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Leads Received</CardTitle>
                <Users className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{summary?.leadsReceived || 0}</div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Orders Handled</CardTitle>
                <ShoppingCart className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{summary?.ordersHandled || 0}</div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Confirmed Orders</CardTitle>
                <CheckCircle className="h-4 w-4 text-green-500" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-green-600">{summary?.confirmedOrders || 0}</div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Conversion Rate</CardTitle>
                <TrendingUp className="h-4 w-4 text-blue-500" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-blue-600">
                  {(summary?.conversionRate || 0).toFixed(1)}%
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Sales</CardTitle>
                <DollarSign className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{formatCurrency(summary?.totalSales || 0)}</div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Avg Order Value</CardTitle>
                <Target className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{formatCurrency(summary?.avgOrderValue || 0)}</div>
              </CardContent>
            </Card>
          </div>

          {/* Performance Chart */}
          <Card>
            <CardHeader>
              <CardTitle>Performance Timeline (Last 30 Days)</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-72">
                {chartData.length > 0 ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <ComposedChart data={chartData}>
                      <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                      <XAxis dataKey="date" className="text-xs" />
                      <YAxis yAxisId="left" className="text-xs" tickFormatter={(v) => `Rs ${(v/1000).toFixed(0)}k`} />
                      <YAxis yAxisId="right" orientation="right" className="text-xs" />
                      <Tooltip 
                        contentStyle={{ 
                          backgroundColor: 'hsl(var(--card))', 
                          border: '1px solid hsl(var(--border))',
                          borderRadius: '8px'
                        }}
                        formatter={(value: number, name: string) => [
                          name === 'sales' ? formatCurrency(value) : value,
                          name === 'sales' ? 'Sales' : 'Orders'
                        ]}
                      />
                      <Legend />
                      <Bar yAxisId="right" dataKey="orders" name="Orders" fill="hsl(var(--chart-2))" />
                      <Line yAxisId="left" type="monotone" dataKey="sales" name="Sales" stroke="hsl(var(--chart-1))" strokeWidth={2} />
                    </ComposedChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="h-full flex items-center justify-center text-muted-foreground">
                    No performance data available
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Tabs for Leads and Orders */}
          <Tabs defaultValue="leads">
            <TabsList>
              <TabsTrigger value="leads">Leads ({leads.length})</TabsTrigger>
              <TabsTrigger value="orders">Orders ({orders.length})</TabsTrigger>
            </TabsList>
            
            <TabsContent value="leads">
              <Card>
                <CardHeader>
                  <CardTitle>Assigned Leads</CardTitle>
                </CardHeader>
                <CardContent>
                  {leads.length === 0 ? (
                    <div className="text-center py-8 text-muted-foreground">
                      No leads found for selected period
                    </div>
                  ) : (
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Date</TableHead>
                          <TableHead>Client Name</TableHead>
                          <TableHead>Contact</TableHead>
                          <TableHead>Source</TableHead>
                          <TableHead>Status</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {leads.map(lead => (
                          <TableRow 
                            key={lead.id}
                            className="cursor-pointer hover:bg-muted/50"
                            onClick={() => setSelectedLeadId(lead.id)}
                          >
                            <TableCell>{lead.date}</TableCell>
                            <TableCell className="font-medium">{lead.client_name}</TableCell>
                            <TableCell>
                              <div className="flex items-center gap-1">
                                <Phone className="h-3 w-3" />
                                {lead.contact_number}
                              </div>
                            </TableCell>
                            <TableCell>{lead.source || '-'}</TableCell>
                            <TableCell>
                              <Badge className={leadStatusColors[lead.status || ''] || 'bg-gray-500'}>
                                {lead.status || 'NEW'}
                              </Badge>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="orders">
              <Card>
                <CardHeader>
                  <CardTitle>Orders Handled</CardTitle>
                </CardHeader>
                <CardContent>
                  {orders.length === 0 ? (
                    <div className="text-center py-8 text-muted-foreground">
                      No orders found for selected period
                    </div>
                  ) : (
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Date</TableHead>
                          <TableHead>Product</TableHead>
                          <TableHead className="text-right">Amount</TableHead>
                          <TableHead>Delivery</TableHead>
                          <TableHead>Status</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {orders.map(order => (
                          <TableRow 
                            key={order.id} 
                            className="cursor-pointer hover:bg-muted/50"
                            onClick={() => navigate(`/admin/orders/${order.id}`)}
                          >
                            <TableCell>{format(new Date(order.order_date), 'MMM dd, yyyy')}</TableCell>
                            <TableCell className="font-medium">{order.product_name || '-'}</TableCell>
                            <TableCell className="text-right">{formatCurrency(order.amount)}</TableCell>
                            <TableCell>
                              <Badge variant="outline">
                                {(order.delivery_location || '').toLowerCase().includes('inside') ? 'Inside' : 'Outside'}
                              </Badge>
                            </TableCell>
                            <TableCell>
                              <Badge className={statusColors[order.order_status] || 'bg-gray-500'}>
                                {order.order_status}
                              </Badge>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  )}
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>

          {/* Lead Detail Sheet */}
          <LeadDetailSheet
            lead={selectedLead || null}
            open={!!selectedLeadId}
            onOpenChange={(open) => !open && setSelectedLeadId(null)}
          />
        </>
      )}
    </div>
  );
}
