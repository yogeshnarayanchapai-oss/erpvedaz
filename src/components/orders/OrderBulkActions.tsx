import { Trash2, FileDown, Truck, Printer, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';

interface OrderBulkActionsProps {
  selectedCount: number;
  onPrint: () => void;
  onDelete: () => void;
  onExport: () => void;
  onExportCourier: () => void;
  onSubmitToCourier: () => void;
  onBulkStatusUpdate?: () => void;
}

export function OrderBulkActions({
  selectedCount,
  onPrint,
  onDelete,
  onExport,
  onExportCourier,
  onSubmitToCourier,
  onBulkStatusUpdate,
}: OrderBulkActionsProps) {
  if (selectedCount === 0) return null;

  return (
    <div className="flex items-center gap-2 p-4 bg-muted/50 rounded-lg border flex-wrap">
      <Badge variant="secondary" className="mr-2">
        {selectedCount} selected
      </Badge>
      <Button size="sm" variant="outline" onClick={onPrint}>
        <Printer className="h-4 w-4 mr-2" />
        Print
      </Button>
      {onBulkStatusUpdate && (
        <Button size="sm" variant="outline" onClick={onBulkStatusUpdate}>
          <RefreshCw className="h-4 w-4 mr-2" />
          Update Status
        </Button>
      )}
      <Button size="sm" variant="outline" onClick={onExport}>
        <FileDown className="h-4 w-4 mr-2" />
        Export CSV
      </Button>
      <Button size="sm" variant="outline" onClick={onExportCourier}>
        <FileDown className="h-4 w-4 mr-2" />
        Courier Excel
      </Button>
      <Button size="sm" variant="outline" onClick={onSubmitToCourier}>
        <Truck className="h-4 w-4 mr-2" />
        Submit to Courier
      </Button>
      <Button size="sm" variant="destructive" onClick={onDelete}>
        <Trash2 className="h-4 w-4 mr-2" />
        Delete
      </Button>
    </div>
  );
}
