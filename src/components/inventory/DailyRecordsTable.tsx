import { useState } from 'react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Button } from '@/components/ui/button';
import { Trash2, Info } from 'lucide-react';
import { DailyRecord, useDeleteDailyRecord } from '@/hooks/useDailyRecords';
import { format } from 'date-fns';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';

interface Props {
  records: DailyRecord[];
}

const columnHelp: Record<string, string> = {
  date: 'The date this record applies to',
  sell: 'Total OUT qty from stock movements',
  ads_spent_npr: 'Total ads spend from Ads table',
  rto: 'Sell × RTO% of that month',
  rto_cost: 'RTO × 200 per unit',
  staff_office_cost: 'Reference Order Count (from Stock Movements) × 50',
  actual_sell: 'Sell − RTO units',
  product_cost: 'Total cost from stock movement OUT',
  actual_product_cost: 'Product Cost − (Product Cost × RTO%)',
  product_value: 'Total value from stock movement OUT',
  delivery_charge: 'Reference Order Count (from Stock Movements) × 250',
  redirect_cost: 'Sell × 20% × 50',
  actual_product_value: 'Total value from stock movement OUT',
  profit_loss: 'Actual Product Value − Actual Product Cost − Staff+Office − Ads − Delivery − Redirect − RTO Cost',
};

function HeaderWithHelp({ label, helpKey }: { label: string; helpKey: string }) {
  const [open, setOpen] = useState(false);
  const helpText = columnHelp[helpKey];

  return (
    <div className="flex items-center gap-1">
      <span>{label}</span>
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <button
            className="p-0.5 hover:bg-muted rounded-full"
            onClick={(e) => {
              e.stopPropagation();
              setOpen(!open);
            }}
          >
            <Info className="h-3 w-3 text-muted-foreground" />
          </button>
        </PopoverTrigger>
        <PopoverContent side="top" className="w-64 text-sm">
          {helpText}
        </PopoverContent>
      </Popover>
    </div>
  );
}

export function DailyRecordsTable({ records }: Props) {
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const deleteMutation = useDeleteDailyRecord();

  const formatCurrency = (val: number) => `Rs ${val.toLocaleString('en-IN', { maximumFractionDigits: 0 })}`;

  const handleDelete = async () => {
    if (deleteId) {
      await deleteMutation.mutateAsync(deleteId);
      setDeleteId(null);
    }
  };

  if (!records.length) {
    return (
      <p className="text-muted-foreground py-4">
        No daily records yet. Click "Daily Record" to add one.
      </p>
    );
  }

  return (
    <>
      <div className="overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead><HeaderWithHelp label="Date" helpKey="date" /></TableHead>
              <TableHead className="text-right"><HeaderWithHelp label="Sell" helpKey="sell" /></TableHead>
              <TableHead className="text-right"><HeaderWithHelp label="Ads (NPR)" helpKey="ads_spent_npr" /></TableHead>
              <TableHead className="text-right"><HeaderWithHelp label="RTO" helpKey="rto" /></TableHead>
              <TableHead className="text-right"><HeaderWithHelp label="RTO Cost" helpKey="rto_cost" /></TableHead>
              <TableHead className="text-right"><HeaderWithHelp label="Staff+Office" helpKey="staff_office_cost" /></TableHead>
              <TableHead className="text-right"><HeaderWithHelp label="Actual Sell" helpKey="actual_sell" /></TableHead>
              <TableHead className="text-right"><HeaderWithHelp label="Prod. Cost" helpKey="product_cost" /></TableHead>
              <TableHead className="text-right"><HeaderWithHelp label="Act. Prod. Cost" helpKey="actual_product_cost" /></TableHead>
              <TableHead className="text-right"><HeaderWithHelp label="Prod. Value" helpKey="product_value" /></TableHead>
              <TableHead className="text-right"><HeaderWithHelp label="Delivery" helpKey="delivery_charge" /></TableHead>
              <TableHead className="text-right"><HeaderWithHelp label="Redirect" helpKey="redirect_cost" /></TableHead>
              <TableHead className="text-right"><HeaderWithHelp label="Act. Prod. Value" helpKey="actual_product_value" /></TableHead>
              <TableHead className="text-right"><HeaderWithHelp label="P/L" helpKey="profit_loss" /></TableHead>
              <TableHead></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {records.map((record) => (
              <TableRow key={record.id}>
                <TableCell className="font-medium whitespace-nowrap">
                  {format(new Date(record.record_date), 'MMM dd, yyyy')}
                  {record.warehouse && (
                    <span className="ml-1 text-xs text-muted-foreground">
                      ({record.warehouse.name})
                    </span>
                  )}
                </TableCell>
                <TableCell className="text-right">{record.sell}</TableCell>
                <TableCell className="text-right text-blue-600">{formatCurrency(record.ads_spent_npr)}</TableCell>
                <TableCell className="text-right text-orange-600">{record.rto}</TableCell>
                <TableCell className="text-right text-orange-600">{formatCurrency(record.rto_cost)}</TableCell>
                <TableCell className="text-right">{formatCurrency(record.staff_office_cost)}</TableCell>
                <TableCell className="text-right text-green-600">{record.actual_sell}</TableCell>
                <TableCell className="text-right text-destructive">{formatCurrency(record.product_cost)}</TableCell>
                <TableCell className="text-right text-destructive">{formatCurrency(record.actual_product_cost)}</TableCell>
                <TableCell className="text-right">{formatCurrency(record.product_value)}</TableCell>
                <TableCell className="text-right">{formatCurrency(record.delivery_charge)}</TableCell>
                <TableCell className="text-right">{formatCurrency(record.redirect_cost)}</TableCell>
                <TableCell className="text-right text-green-600">{formatCurrency(record.actual_product_value)}</TableCell>
                <TableCell className={`text-right font-semibold ${record.profit_loss >= 0 ? 'text-green-600' : 'text-destructive'}`}>
                  {formatCurrency(record.profit_loss)}
                </TableCell>
                <TableCell>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 text-muted-foreground hover:text-destructive"
                    onClick={() => setDeleteId(record.id)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      <AlertDialog open={!!deleteId} onOpenChange={(open) => !open && setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Daily Record?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. The record will be permanently deleted.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
