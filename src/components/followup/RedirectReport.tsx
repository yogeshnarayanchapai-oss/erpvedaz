import { useState, useMemo } from 'react';
import { format } from 'date-fns';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Download, FileText } from 'lucide-react';
import { useFollowupOrders, useFollowupStaff } from '@/hooks/useFollowupOrders';
import { useCallingStaff } from '@/hooks/useStaff';
import { useAuth } from '@/contexts/AuthContext';

interface RedirectReportProps {
  dateFrom: string;
  dateTo: string;
}

export function RedirectReport({ dateFrom, dateTo }: RedirectReportProps) {
  const { user, profile } = useAuth();
  const isAdmin = profile?.role === 'ADMIN';
  
  const [callingStaffFilter, setCallingStaffFilter] = useState('all');
  const [followupStaffFilter, setFollowupStaffFilter] = useState(isAdmin ? 'all' : user?.id || 'all');
  const [deliveryFilter, setDeliveryFilter] = useState('all');

  const { data: orders = [], isLoading } = useFollowupOrders({
    dateFrom,
    dateTo,
    status: 'REDIRECT',
    deliveryLocation: deliveryFilter,
  });

  const { data: callingStaff = [] } = useCallingStaff();
  const { data: followupStaff = [] } = useFollowupStaff();

  const filteredOrders = useMemo(() => {
    return orders.filter(order => {
      const matchesCalling = callingStaffFilter === 'all' || order.sales_person_id === callingStaffFilter;
      const matchesFollowup = followupStaffFilter === 'all' || order.redirected_by_user_id === followupStaffFilter;
      return matchesCalling && matchesFollowup;
    });
  }, [orders, callingStaffFilter, followupStaffFilter]);

  const getDeliveryBadge = (location: string | null) => {
    if (location === 'INSIDE_VALLEY') {
      return <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">Inside Valley</Badge>;
    }
    if (location === 'OUTSIDE_VALLEY') {
      return <Badge variant="outline" className="bg-orange-50 text-orange-700 border-orange-200">Outside Valley</Badge>;
    }
    return <Badge variant="secondary">Unknown</Badge>;
  };

  const exportToCSV = () => {
    const headers = ['Date', 'Client', 'Contact', 'Product', 'Delivery', 'Branch', 'Calling Staff', 'Follow-up Staff', 'Status', 'Remark'];
    const rows = filteredOrders.map(order => [
      order.order_date ? format(new Date(order.order_date), 'yyyy-MM-dd') : '',
      (order.leads as any)?.client_name || '',
      (order.leads as any)?.contact_number || '',
      (order.products as any)?.name || '',
      order.delivery_location === 'INSIDE_VALLEY' ? 'Inside Valley' : 'Outside Valley',
      order.destination_branch || '',
      (order.profiles as any)?.name || '',
      (order.redirected_by as any)?.name || '',
      'REDIRECT',
      order.delivery_notes || '',
    ]);

    const csvContent = [
      headers.join(','),
      ...rows.map(row => row.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(',')),
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `redirect-report-${dateFrom}-to-${dateTo}.csv`;
    link.click();
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between flex-wrap gap-4">
          <CardTitle className="flex items-center gap-2">
            <FileText className="w-5 h-5" />
            Redirect Report
          </CardTitle>
          <div className="flex items-center gap-2 flex-wrap">
            <Select value={deliveryFilter} onValueChange={setDeliveryFilter}>
              <SelectTrigger className="w-[150px]">
                <SelectValue placeholder="Delivery" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Deliveries</SelectItem>
                <SelectItem value="INSIDE_VALLEY">Inside Valley</SelectItem>
                <SelectItem value="OUTSIDE_VALLEY">Outside Valley</SelectItem>
              </SelectContent>
            </Select>
            <Select value={callingStaffFilter} onValueChange={setCallingStaffFilter}>
              <SelectTrigger className="w-[150px]">
                <SelectValue placeholder="Calling Staff" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Calling</SelectItem>
                {callingStaff.map((staff) => (
                  <SelectItem key={staff.id} value={staff.id}>
                    {staff.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {isAdmin && (
              <Select value={followupStaffFilter} onValueChange={setFollowupStaffFilter}>
                <SelectTrigger className="w-[150px]">
                  <SelectValue placeholder="Follow-up Staff" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Follow-up</SelectItem>
                  {followupStaff.map((staff) => (
                    <SelectItem key={staff.id} value={staff.id}>
                      {staff.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
            <Button variant="outline" size="sm" onClick={exportToCSV}>
              <Download className="w-4 h-4 mr-2" />
              Export CSV
            </Button>
          </div>
        </div>
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
                <TableHead className="table-header">Delivery</TableHead>
                <TableHead className="table-header">Branch</TableHead>
                <TableHead className="table-header">Calling Staff</TableHead>
                <TableHead className="table-header">Follow-up Staff</TableHead>
                <TableHead className="table-header">Status</TableHead>
                <TableHead className="table-header">Remark</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredOrders.map((order) => (
                <TableRow key={order.id}>
                  <TableCell className="text-muted-foreground">
                    {order.order_date ? format(new Date(order.order_date), 'dd MMM') : '-'}
                  </TableCell>
                  <TableCell className="font-medium">
                    {(order.leads as any)?.client_name || '-'}
                  </TableCell>
                  <TableCell>{(order.leads as any)?.contact_number || '-'}</TableCell>
                  <TableCell>{(order.products as any)?.name || '-'}</TableCell>
                  <TableCell>{getDeliveryBadge(order.delivery_location)}</TableCell>
                  <TableCell>{order.destination_branch || '-'}</TableCell>
                  <TableCell>{(order.profiles as any)?.name || '-'}</TableCell>
                  <TableCell>
                    {(order.redirected_by as any)?.name || '-'}
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline" className="bg-red-50 text-red-700 border-red-200">
                      REDIRECT
                    </Badge>
                  </TableCell>
                  <TableCell className="max-w-[200px] truncate">
                    {order.delivery_notes || '-'}
                  </TableCell>
                </TableRow>
              ))}
              {filteredOrders.length === 0 && (
                <TableRow>
                  <TableCell colSpan={10} className="text-center py-8 text-muted-foreground">
                    {isLoading ? 'Loading...' : 'No redirected orders found'}
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  );
}
