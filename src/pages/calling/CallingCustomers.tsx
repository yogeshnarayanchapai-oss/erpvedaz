import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Users, Search } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { useCustomers } from '@/hooks/useCustomers';
import { format } from 'date-fns';
import { useAuth } from '@/contexts/AuthContext';

export default function CallingCustomers() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [search, setSearch] = useState('');

  const { data: customers, isLoading } = useCustomers({
    search,
  });

  // Filter to show only customers from this staff's orders
  const myCustomers = customers?.filter(customer => {
    // This is a simplified filter - in production, you'd query orders 
    // to get customers from this staff's orders only
    return true;
  });

  const getRtoColor = (rtoPercent: number) => {
    if (rtoPercent <= 5) return 'default';
    if (rtoPercent <= 15) return 'secondary';
    return 'destructive';
  };

  return (
    <div className="space-y-6 p-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <Users className="h-8 w-8" />
            My Customers
          </h1>
          <p className="text-muted-foreground mt-1">
            View customers from your orders
          </p>
        </div>
      </div>

      {/* Search */}
      <Card className="p-4">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search by name or phone..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
      </Card>

      {/* Customers Table */}
      <Card>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-12">#</TableHead>
              <TableHead>Customer Name</TableHead>
              <TableHead>Phone Number</TableHead>
              <TableHead className="text-right">Total Orders</TableHead>
              <TableHead className="text-right">Total Spent</TableHead>
              <TableHead>Last Order</TableHead>
              <TableHead className="text-right">RTO %</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow>
                <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                  Loading customers...
                </TableCell>
              </TableRow>
            ) : !myCustomers || myCustomers.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                  No customers found
                </TableCell>
              </TableRow>
            ) : (
              myCustomers.map((customer, index) => {
                const rtoPercent = customer.total_orders > 0
                  ? (customer.rto_orders / customer.total_orders) * 100
                  : 0;

                return (
                  <TableRow
                    key={customer.id}
                    className="cursor-pointer hover:bg-muted/50"
                    onClick={() => navigate(`/calling/customers/${customer.id}`)}
                  >
                    <TableCell className="font-medium">{index + 1}</TableCell>
                    <TableCell className="font-medium">
                      {customer.customer_name || 'N/A'}
                    </TableCell>
                    <TableCell>{customer.phone_number}</TableCell>
                    <TableCell className="text-right">{customer.total_orders}</TableCell>
                    <TableCell className="text-right">
                      Rs. {customer.total_order_value?.toLocaleString() || 0}
                    </TableCell>
                    <TableCell>
                      {customer.last_order_date
                        ? format(new Date(customer.last_order_date), 'dd MMM yyyy')
                        : 'N/A'}
                    </TableCell>
                    <TableCell className="text-right">
                      <Badge variant={getRtoColor(rtoPercent)}>
                        {rtoPercent.toFixed(1)}%
                      </Badge>
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
