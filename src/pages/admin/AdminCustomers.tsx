import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Users, Search, Download, Trash2 } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { Badge } from '@/components/ui/badge';
import { useCustomers } from '@/hooks/useCustomers';
import { useEffectiveRole } from '@/hooks/useEffectiveRole';
import { supabase } from '@/integrations/supabase/client';
import { useQueryClient } from '@tanstack/react-query';
import { format } from 'date-fns';
import { toast } from 'sonner';

export default function AdminCustomers() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { effectiveRole } = useEffectiveRole();
  const [search, setSearch] = useState('');
  const [rtoSegment, setRtoSegment] = useState<'all' | 'low' | 'medium' | 'high'>('all');
  const [customerType, setCustomerType] = useState<'all' | 'new' | 'returning'>('all');
  const [valueSegment, setValueSegment] = useState<'all' | 'high' | 'medium' | 'low'>('all');
  const [city, setCity] = useState('');
  const [status, setStatus] = useState('all');
  const [selectedCustomers, setSelectedCustomers] = useState<string[]>([]);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const isAdmin = effectiveRole === 'OWNER'; // OWNER displays as "Admin"

  const { data: customers, isLoading } = useCustomers({
    search,
    rtoSegment,
    customerType,
    valueSegment,
    city,
    status,
  });

  const handleSelectAll = (checked: boolean) => {
    if (checked && customers) {
      setSelectedCustomers(customers.map(c => c.id));
    } else {
      setSelectedCustomers([]);
    }
  };

  const handleSelectCustomer = (customerId: string, checked: boolean) => {
    if (checked) {
      setSelectedCustomers(prev => [...prev, customerId]);
    } else {
      setSelectedCustomers(prev => prev.filter(id => id !== customerId));
    }
  };

  const exportCustomersToCSV = () => {
    const dataToExport = selectedCustomers.length > 0 
      ? customers?.filter(c => selectedCustomers.includes(c.id)) 
      : customers;

    if (!dataToExport || dataToExport.length === 0) {
      toast.error('No customers to export');
      return;
    }

    const headers = ['Name', 'Phone', 'Alt Phone', 'City', 'Province', 'Full Address', 'Total Orders', 'Delivered Orders', 'RTO Orders', 'Total Spent', 'First Order', 'Last Order', 'Status'];
    const csvRows = [headers.join(',')];

    dataToExport.forEach(customer => {
      const rtoPercent = customer.total_orders > 0 
        ? ((customer.rto_orders || 0) / customer.total_orders * 100).toFixed(1)
        : '0';
      const row = [
        `"${customer.customer_name || ''}"`,
        customer.phone_number || '',
        customer.alt_phone || '',
        `"${customer.city || ''}"`,
        `"${customer.province || ''}"`,
        `"${customer.full_address || ''}"`,
        customer.total_orders || 0,
        customer.delivered_orders || 0,
        customer.rto_orders || 0,
        customer.total_order_value || 0,
        customer.first_order_date || '',
        customer.last_order_date || '',
        customer.status || 'ACTIVE',
      ];
      csvRows.push(row.join(','));
    });

    const csvString = csvRows.join('\n');
    const blob = new Blob([csvString], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `customers_export_${format(new Date(), 'yyyy-MM-dd')}.csv`;
    link.click();
    window.URL.revokeObjectURL(url);
    toast.success(`Exported ${dataToExport.length} customers`);
  };

  const isAllSelected = customers && customers.length > 0 && selectedCustomers.length === customers.length;

  const getRtoColor = (rtoPercent: number) => {
    if (rtoPercent <= 5) return 'default';
    if (rtoPercent <= 15) return 'secondary';
    return 'destructive';
  };

  const getCustomerTag = (customer: any) => {
    const totalValue = customer.total_order_value || 0;
    const rtoPercent = customer.total_orders > 0 
      ? ((customer.rto_orders || 0) / customer.total_orders) * 100 
      : 0;

    if (totalValue >= 10000) return { label: 'High Value', color: 'bg-primary' };
    if (rtoPercent > 15) return { label: 'RTO Risk', color: 'bg-destructive' };
    if (customer.total_orders === 1) return { label: 'New', color: 'bg-blue-500' };
    return null;
  };

  const clearFilters = () => {
    setSearch('');
    setRtoSegment('all');
    setCustomerType('all');
    setValueSegment('all');
    setCity('');
    setStatus('all');
  };

  const handleDeleteCustomer = async (customerId: string) => {
    setDeletingId(customerId);
    try {
      const { error } = await supabase
        .from('customers')
        .delete()
        .eq('id', customerId);

      if (error) throw error;
      
      toast.success('Customer deleted successfully');
      queryClient.invalidateQueries({ queryKey: ['customers'] });
      setSelectedCustomers(prev => prev.filter(id => id !== customerId));
    } catch (error: any) {
      toast.error(`Failed to delete customer: ${error.message}`);
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <div className="space-y-6 p-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <Users className="h-8 w-8" />
            Customers
          </h1>
          <p className="text-muted-foreground mt-1">
            Manage and track customer information and order history
          </p>
        </div>
        <Button onClick={exportCustomersToCSV} variant="outline" className="gap-2">
          <Download className="w-4 h-4" />
          Export {selectedCustomers.length > 0 ? `(${selectedCustomers.length})` : 'All'}
        </Button>
      </div>

      {/* Filters */}
      <Card className="p-6">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="lg:col-span-2 relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground z-10" />
            <Input
              placeholder="Search by name or phone..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9"
            />
          </div>

          <Select value={rtoSegment} onValueChange={(val: any) => setRtoSegment(val)}>
            <SelectTrigger>
              <SelectValue placeholder="RTO Filter" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All RTO</SelectItem>
              <SelectItem value="low">Low RTO (≤5%)</SelectItem>
              <SelectItem value="medium">Medium RTO (5-15%)</SelectItem>
              <SelectItem value="high">High RTO (over 15%)</SelectItem>
            </SelectContent>
          </Select>

          <Select value={customerType} onValueChange={(val: any) => setCustomerType(val)}>
            <SelectTrigger>
              <SelectValue placeholder="Customer Type" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Customers</SelectItem>
              <SelectItem value="new">New Customers</SelectItem>
              <SelectItem value="returning">Returning Customers</SelectItem>
            </SelectContent>
          </Select>

          <Select value={valueSegment} onValueChange={(val: any) => setValueSegment(val)}>
            <SelectTrigger>
              <SelectValue placeholder="Value Segment" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Values</SelectItem>
              <SelectItem value="high">High Value (≥Rs 10k)</SelectItem>
              <SelectItem value="medium">Medium Value (Rs 5-10k)</SelectItem>
              <SelectItem value="low">Low Value (under Rs 5k)</SelectItem>
            </SelectContent>
          </Select>

          <Input
            type="text"
            placeholder="Filter by city..."
            value={city}
            onChange={(e) => setCity(e.target.value)}
          />

          <Select value={status} onValueChange={setStatus}>
            <SelectTrigger>
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Status</SelectItem>
              <SelectItem value="ACTIVE">Active</SelectItem>
              <SelectItem value="BLOCKED">Blocked</SelectItem>
            </SelectContent>
          </Select>

          <Button
            variant="outline"
            onClick={clearFilters}
            className="lg:col-span-2"
          >
            Clear All Filters
          </Button>
        </div>
      </Card>

      {/* Customers Table */}
      <Card>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-[50px]">
                <Checkbox
                  checked={isAllSelected}
                  onCheckedChange={handleSelectAll}
                  aria-label="Select all"
                />
              </TableHead>
              <TableHead>Customer Name</TableHead>
              <TableHead>Phone</TableHead>
              <TableHead>City</TableHead>
              <TableHead className="text-center">Total Orders</TableHead>
              <TableHead className="text-right">Total Spent</TableHead>
              <TableHead>Last Order</TableHead>
              <TableHead className="text-center">RTO %</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-center">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow>
                <TableCell colSpan={10} className="text-center py-8 text-muted-foreground">
                  Loading customers...
                </TableCell>
              </TableRow>
            ) : !customers || customers.length === 0 ? (
              <TableRow>
                <TableCell colSpan={10} className="text-center py-8 text-muted-foreground">
                  No customers found
                </TableCell>
              </TableRow>
            ) : (
              customers.map((customer) => {
                const rtoPercent = customer.total_orders > 0
                  ? ((customer.rto_orders || 0) / customer.total_orders) * 100
                  : 0;
                const tag = getCustomerTag(customer);

                return (
                  <TableRow
                    key={customer.id}
                    className="cursor-pointer hover:bg-muted/50"
                  >
                    <TableCell onClick={(e) => e.stopPropagation()}>
                      <Checkbox
                        checked={selectedCustomers.includes(customer.id)}
                        onCheckedChange={(checked) => handleSelectCustomer(customer.id, !!checked)}
                        aria-label={`Select ${customer.customer_name}`}
                      />
                    </TableCell>
                    <TableCell onClick={() => navigate(`/admin/customers/${customer.id}`)}>
                      <div className="flex items-center gap-2">
                        <span className="font-medium">{customer.customer_name || 'N/A'}</span>
                        {tag && (
                          <Badge className={`${tag.color} text-white text-xs`}>
                            {tag.label}
                          </Badge>
                        )}
                      </div>
                    </TableCell>
                    <TableCell onClick={() => navigate(`/admin/customers/${customer.id}`)}>{customer.phone_number}</TableCell>
                    <TableCell onClick={() => navigate(`/admin/customers/${customer.id}`)}>{customer.city || 'N/A'}</TableCell>
                    <TableCell onClick={() => navigate(`/admin/customers/${customer.id}`)} className="text-center">{customer.total_orders || 0}</TableCell>
                    <TableCell onClick={() => navigate(`/admin/customers/${customer.id}`)} className="text-right">
                      Rs {(customer.total_order_value || 0).toLocaleString()}
                    </TableCell>
                    <TableCell onClick={() => navigate(`/admin/customers/${customer.id}`)}>
                      {customer.last_order_date
                        ? format(new Date(customer.last_order_date), 'dd MMM yyyy')
                        : 'No orders'}
                    </TableCell>
                    <TableCell onClick={() => navigate(`/admin/customers/${customer.id}`)} className="text-center">
                      <Badge variant={getRtoColor(rtoPercent)}>
                        {rtoPercent.toFixed(1)}%
                      </Badge>
                    </TableCell>
                    <TableCell onClick={() => navigate(`/admin/customers/${customer.id}`)}>
                      <Badge variant={customer.status === 'ACTIVE' ? 'default' : 'destructive'}>
                        {customer.status || 'ACTIVE'}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-center">
                      <div className="flex items-center justify-center gap-2">
                        <Button size="sm" variant="outline" onClick={() => navigate(`/admin/customers/${customer.id}`)}>
                          View
                        </Button>
                        {isAdmin && (
                          <AlertDialog>
                            <AlertDialogTrigger asChild>
                              <Button 
                                size="sm" 
                                variant="destructive"
                                disabled={deletingId === customer.id}
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                              <AlertDialogHeader>
                                <AlertDialogTitle>Delete Customer?</AlertDialogTitle>
                                <AlertDialogDescription>
                                  This will permanently delete {customer.customer_name || 'this customer'} ({customer.phone_number}). This action cannot be undone.
                                </AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel>Cancel</AlertDialogCancel>
                                <AlertDialogAction
                                  onClick={() => handleDeleteCustomer(customer.id)}
                                  className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                                >
                                  Delete
                                </AlertDialogAction>
                              </AlertDialogFooter>
                            </AlertDialogContent>
                          </AlertDialog>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
      </Card>
    </div>
  );
}
