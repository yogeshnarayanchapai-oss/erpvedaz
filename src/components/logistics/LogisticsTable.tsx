import { useState } from 'react';
import { format } from 'date-fns';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { History, ExternalLink } from 'lucide-react';
import { OrderHistoryTimeline } from './OrderHistoryTimeline';
import { LogisticsOrder } from '@/hooks/useLogistics';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface LogisticsTableProps {
  orders: LogisticsOrder[];
  selectedOrders: Set<string>;
  onToggleOrder: (id: string) => void;
  onToggleAll: () => void;
  onRefresh: () => void;
  isLoading: boolean;
}

const statusColors: Record<string, string> = {
  PENDING_PICKUP: 'bg-muted text-muted-foreground',
  PICKED_UP: 'bg-info/10 text-info',
  IN_TRANSIT: 'bg-primary/10 text-primary',
  OUT_FOR_DELIVERY: 'bg-warning/10 text-warning',
  DELIVERED: 'bg-success/10 text-success',
  CANCELED: 'bg-destructive/10 text-destructive',
  RTO: 'bg-destructive/10 text-destructive',
  RETURNED_TO_SELLER: 'bg-destructive/10 text-destructive',
};

export function LogisticsTable({
  orders,
  selectedOrders,
  onToggleOrder,
  onToggleAll,
  onRefresh,
  isLoading,
}: LogisticsTableProps) {
  const [historyOrderId, setHistoryOrderId] = useState<string | null>(null);
  const [historyOrderInfo, setHistoryOrderInfo] = useState<{ clientName: string; orderDate: string }>();

  const handleStatusUpdate = async (orderId: string, status: string) => {
    const { error } = await supabase
      .from('logistics_orders')
      .update({ delivery_status: status as any, status_updated_at: new Date().toISOString() })
      .eq('id', orderId);

    if (error) {
      toast.error('Failed to update status');
    } else {
      toast.success('Status updated successfully');
      onRefresh();
    }
  };

  const openHistory = (order: LogisticsOrder) => {
    setHistoryOrderId(order.id);
    setHistoryOrderInfo({
      clientName: order.customer_name,
      orderDate: order.created_at,
    });
  };

  if (isLoading) {
    return <div className="text-center py-8 text-muted-foreground">Loading orders...</div>;
  }

  if (orders.length === 0) {
    return <div className="text-center py-8 text-muted-foreground">No orders found</div>;
  }

  return (
    <>
      <OrderHistoryTimeline
        orderId={historyOrderId}
        orderInfo={historyOrderInfo}
        open={!!historyOrderId}
        onOpenChange={(open) => !open && setHistoryOrderId(null)}
      />

      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-[50px]">
                <Checkbox
                  checked={selectedOrders.size === orders.length && orders.length > 0}
                  onCheckedChange={onToggleAll}
                />
              </TableHead>
              <TableHead>Order ID</TableHead>
              <TableHead>Customer</TableHead>
              <TableHead>Phone</TableHead>
              <TableHead>City</TableHead>
              <TableHead>Address</TableHead>
              <TableHead>Product</TableHead>
              <TableHead>Qty</TableHead>
              <TableHead>COD</TableHead>
              <TableHead>AWB / Tracking</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Courier</TableHead>
              <TableHead>Remarks</TableHead>
              <TableHead>Last Update</TableHead>
              <TableHead className="w-[100px]">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {orders.map((order) => (
              <TableRow key={order.id}>
                <TableCell>
                  <Checkbox
                    checked={selectedOrders.has(order.id)}
                    onCheckedChange={() => onToggleOrder(order.id)}
                  />
                </TableCell>
                <TableCell className="font-mono text-xs">
                  {order.orders?.id?.substring(0, 8) || order.id.substring(0, 8)}
                </TableCell>
                <TableCell className="font-medium">{order.customer_name}</TableCell>
                <TableCell>{order.customer_phone}</TableCell>
                <TableCell>{order.full_address?.split(',')[0] || '-'}</TableCell>
                <TableCell className="max-w-[200px] truncate" title={order.full_address}>
                  {order.full_address}
                </TableCell>
                <TableCell>{order.product_name || '-'}</TableCell>
                <TableCell>{order.quantity}</TableCell>
                <TableCell>NPR {order.cod_amount?.toLocaleString() || 0}</TableCell>
                <TableCell>
                  <div className="flex flex-col gap-1">
                    {order.tracking_id && (
                      <span className="font-mono text-xs">{order.tracking_id}</span>
                    )}
                    {order.courier_order_id && (
                      <span className="font-mono text-xs text-muted-foreground">{order.courier_order_id}</span>
                    )}
                  </div>
                </TableCell>
                <TableCell>
                  <Select
                    value={order.delivery_status}
                    onValueChange={(v) => handleStatusUpdate(order.id, v)}
                  >
                    <SelectTrigger className={`w-[160px] ${statusColors[order.delivery_status]}`}>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="PENDING_PICKUP">Pending Pickup</SelectItem>
                      <SelectItem value="PICKED_UP">Picked Up</SelectItem>
                      <SelectItem value="IN_TRANSIT">In Transit</SelectItem>
                      <SelectItem value="OUT_FOR_DELIVERY">Out for Delivery</SelectItem>
                      <SelectItem value="DELIVERED">Delivered</SelectItem>
                      <SelectItem value="RTO">RTO</SelectItem>
                      <SelectItem value="CANCELED">Canceled</SelectItem>
                    </SelectContent>
                  </Select>
                </TableCell>
                <TableCell>
                  <Badge variant="outline">{order.courier}</Badge>
                </TableCell>
                <TableCell className="max-w-[150px] truncate text-xs text-muted-foreground">
                  {order.courier_status || '-'}
                </TableCell>
                <TableCell className="text-xs text-muted-foreground whitespace-nowrap">
                  {format(new Date(order.status_updated_at || order.updated_at), 'dd MMM HH:mm')}
                </TableCell>
                <TableCell>
                  <div className="flex gap-1">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => openHistory(order)}
                    >
                      <History className="w-4 h-4" />
                    </Button>
                    {order.tracking_id && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => window.open(`https://track.example.com/${order.tracking_id}`, '_blank')}
                      >
                        <ExternalLink className="w-4 h-4" />
                      </Button>
                    )}
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </>
  );
}
