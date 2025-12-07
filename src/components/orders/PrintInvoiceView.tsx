import { format } from 'date-fns';
import { OrderItem } from '@/hooks/useOrderItems';

interface PrintInvoiceViewProps {
  order: {
    order_number?: number;
    id: string;
    created_at: string;
    quantity: number;
    amount: number | null;
    payment_status: string;
    is_cod: boolean;
    delivery_notes?: string | null;
    leads?: {
      client_name: string;
      contact_number: string;
      full_address?: string | null;
    } | null;
    customers?: {
      customer_name?: string;
      phone_number: string;
      city?: string;
      full_address?: string | null;
    } | null;
    products?: {
      name: string;
    } | null;
    branches?: {
      branch_name: string;
      district?: string | null;
    } | null;
  };
  orderItems?: OrderItem[];
}

export function PrintInvoiceView({ order, orderItems = [] }: PrintInvoiceViewProps) {
  const customerName = order.leads?.client_name || order.customers?.customer_name || 'N/A';
  const customerPhone = order.leads?.contact_number || order.customers?.phone_number || 'N/A';
  const customerAddress = order.leads?.full_address || order.customers?.full_address || 'N/A';
  const customerCity = order.customers?.city || order.branches?.district || '';
  
  // Calculate totals from order items if available, otherwise use order amount
  const hasItems = orderItems.length > 0;
  const itemsSubtotal = hasItems 
    ? orderItems.reduce((sum, item) => sum + item.total_price, 0)
    : (order.amount || 0) * order.quantity;
  
  const subtotal = itemsSubtotal;
  const deliveryCharge = 0;
  const total = subtotal + deliveryCharge;

  return (
    <div className="max-w-4xl mx-auto p-8 bg-background">
      <style>{`
        @media print {
          body { print-color-adjust: exact; -webkit-print-color-adjust: exact; }
          .no-print { display: none !important; }
        }
      `}</style>
      
      {/* Print Button */}
      <div className="flex justify-end mb-4 no-print">
        <button
          onClick={() => window.print()}
          className="px-4 py-2 bg-primary text-primary-foreground rounded hover:bg-primary/90"
        >
          Print Invoice
        </button>
      </div>

      {/* Invoice */}
      <div className="border-2 border-border p-8 bg-card">
        {/* Header */}
        <div className="border-b-2 border-border pb-6 mb-6">
          <h1 className="text-3xl font-bold text-foreground mb-2">INVOICE</h1>
          <div className="flex justify-between items-start">
            <div>
              <p className="text-sm text-muted-foreground">Invoice Number</p>
              <p className="text-lg font-semibold">
                {order.order_number ? `#${order.order_number}` : `#${order.id.slice(0, 8)}`}
              </p>
            </div>
            <div className="text-right">
              <p className="text-sm text-muted-foreground">Date</p>
              <p className="text-lg font-semibold">
                {format(new Date(order.created_at), 'MMM dd, yyyy')}
              </p>
            </div>
          </div>
        </div>

        {/* Customer Details */}
        <div className="mb-8">
          <h2 className="text-sm font-semibold text-muted-foreground mb-3">BILL TO</h2>
          <div className="space-y-1">
            <p className="text-lg font-semibold text-foreground">{customerName}</p>
            <p className="text-sm text-foreground">{customerPhone}</p>
            <p className="text-sm text-foreground">{customerAddress}</p>
            {customerCity && <p className="text-sm text-foreground">{customerCity}</p>}
          </div>
        </div>

        {/* Items Table */}
        <table className="w-full mb-8">
          <thead>
            <tr className="border-b-2 border-border">
              <th className="text-left py-3 text-sm font-semibold text-foreground">ITEM</th>
              <th className="text-center py-3 text-sm font-semibold text-foreground">QTY</th>
              <th className="text-right py-3 text-sm font-semibold text-foreground">RATE</th>
              <th className="text-right py-3 text-sm font-semibold text-foreground">AMOUNT</th>
            </tr>
          </thead>
          <tbody>
            {hasItems ? (
              orderItems.map((item) => (
                <tr key={item.id} className="border-b border-border">
                  <td className="py-4 text-foreground">{item.product_name}</td>
                  <td className="text-center py-4 text-foreground">{item.quantity}</td>
                  <td className="text-right py-4 text-foreground">
                    Rs. {item.unit_price.toLocaleString()}
                  </td>
                  <td className="text-right py-4 text-foreground">
                    Rs. {item.total_price.toLocaleString()}
                  </td>
                </tr>
              ))
            ) : (
              <tr className="border-b border-border">
                <td className="py-4 text-foreground">{order.products?.name || 'Product'}</td>
                <td className="text-center py-4 text-foreground">{order.quantity}</td>
                <td className="text-right py-4 text-foreground">
                  Rs. {order.amount?.toLocaleString()}
                </td>
                <td className="text-right py-4 text-foreground">
                  Rs. {subtotal.toLocaleString()}
                </td>
              </tr>
            )}
          </tbody>
        </table>

        {/* Totals */}
        <div className="flex justify-end mb-8">
          <div className="w-64 space-y-2">
            <div className="flex justify-between text-foreground">
              <span>Subtotal:</span>
              <span>Rs. {subtotal.toLocaleString()}</span>
            </div>
            <div className="flex justify-between text-foreground">
              <span>Delivery Charge:</span>
              <span>Rs. {deliveryCharge.toLocaleString()}</span>
            </div>
            <div className="flex justify-between text-lg font-bold border-t-2 border-border pt-2 text-foreground">
              <span>TOTAL:</span>
              <span>Rs. {total.toLocaleString()}</span>
            </div>
          </div>
        </div>

        {/* Payment Info */}
        <div className="border-t-2 border-border pt-6">
          <div className="flex justify-between items-center">
            <div>
              <p className="text-sm text-muted-foreground mb-1">Payment Method</p>
              <p className="font-semibold text-foreground">
                {order.is_cod ? 'Cash on Delivery (COD)' : 'Online Payment'}
              </p>
            </div>
            <div className="text-right">
              <p className="text-sm text-muted-foreground mb-1">Payment Status</p>
              <p className="font-semibold text-foreground">{order.payment_status}</p>
            </div>
          </div>
          {order.delivery_notes && (
            <div className="mt-4">
              <p className="text-sm text-muted-foreground mb-1">Delivery Notes</p>
              <p className="text-sm text-foreground">{order.delivery_notes}</p>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="mt-8 pt-6 border-t border-border text-center text-sm text-muted-foreground">
          <p>Thank you for your business!</p>
        </div>
      </div>
    </div>
  );
}
