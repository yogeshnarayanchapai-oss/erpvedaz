import { PrintInvoiceView } from './PrintInvoiceView';

interface BulkPrintViewProps {
  orders: Array<{
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
  }>;
}

export function BulkPrintView({ orders }: BulkPrintViewProps) {
  return (
    <div className="bg-background">
      <style>{`
        @media print {
          body { print-color-adjust: exact; -webkit-print-color-adjust: exact; }
          .no-print { display: none !important; }
          .page-break { page-break-after: always; }
        }
      `}</style>
      
      {/* Print Button */}
      <div className="flex justify-between items-center p-4 mb-4 no-print border-b">
        <h2 className="text-xl font-semibold">Print {orders.length} Invoice(s)</h2>
        <button
          onClick={() => window.print()}
          className="px-4 py-2 bg-primary text-primary-foreground rounded hover:bg-primary/90"
        >
          Print All
        </button>
      </div>

      {/* Render each invoice */}
      {orders.map((order, index) => (
        <div key={order.id} className={index < orders.length - 1 ? 'page-break' : ''}>
          <PrintInvoiceView order={order} />
        </div>
      ))}
    </div>
  );
}
