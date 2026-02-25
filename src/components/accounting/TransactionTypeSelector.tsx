import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { ArrowDownLeft, ArrowUpRight, ShoppingCart, Package, CreditCard, Wallet } from 'lucide-react';
import type { TransactionType } from '@/hooks/useTransactions';

interface TransactionTypeSelectorProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSelect: (type: TransactionType) => void;
}

const TYPES: { type: TransactionType; label: string; description: string; icon: React.ReactNode; color: string }[] = [
  { type: 'INCOME', label: 'Income', description: 'Money received (salary, commission, etc.)', icon: <ArrowDownLeft className="w-5 h-5" />, color: 'text-green-600 border-green-200 bg-green-50 hover:bg-green-100 dark:bg-green-950/30 dark:hover:bg-green-950/50 dark:border-green-800' },
  { type: 'EXPENSE', label: 'Expense', description: 'Money spent (bills, purchases, etc.)', icon: <ArrowUpRight className="w-5 h-5" />, color: 'text-red-600 border-red-200 bg-red-50 hover:bg-red-100 dark:bg-red-950/30 dark:hover:bg-red-950/50 dark:border-red-800' },
  { type: 'SALES_OUT', label: 'Sales Out', description: 'Wholesale sale to party (credit/cash)', icon: <ShoppingCart className="w-5 h-5" />, color: 'text-blue-600 border-blue-200 bg-blue-50 hover:bg-blue-100 dark:bg-blue-950/30 dark:hover:bg-blue-950/50 dark:border-blue-800' },
  { type: 'SALES_IN', label: 'Sales In', description: 'Purchase from supplier (credit/cash)', icon: <Package className="w-5 h-5" />, color: 'text-orange-600 border-orange-200 bg-orange-50 hover:bg-orange-100 dark:bg-orange-950/30 dark:hover:bg-orange-950/50 dark:border-orange-800' },
  { type: 'PAYMENT_IN', label: 'Payment In', description: 'Payment received from party', icon: <Wallet className="w-5 h-5" />, color: 'text-emerald-600 border-emerald-200 bg-emerald-50 hover:bg-emerald-100 dark:bg-emerald-950/30 dark:hover:bg-emerald-950/50 dark:border-emerald-800' },
  { type: 'PAYMENT_OUT', label: 'Payment Out', description: 'Payment made to party', icon: <CreditCard className="w-5 h-5" />, color: 'text-purple-600 border-purple-200 bg-purple-50 hover:bg-purple-100 dark:bg-purple-950/30 dark:hover:bg-purple-950/50 dark:border-purple-800' },
];

export function TransactionTypeSelector({ open, onOpenChange, onSelect }: TransactionTypeSelectorProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Select Transaction Type</DialogTitle>
        </DialogHeader>
        <div className="grid grid-cols-1 gap-2 py-2">
          {TYPES.map(({ type, label, description, icon, color }) => (
            <Button
              key={type}
              variant="outline"
              className={`h-auto p-4 justify-start gap-3 ${color}`}
              onClick={() => {
                onSelect(type);
                onOpenChange(false);
              }}
            >
              {icon}
              <div className="text-left">
                <div className="font-semibold">{label}</div>
                <div className="text-xs opacity-75 font-normal">{description}</div>
              </div>
            </Button>
          ))}
        </div>
      </DialogContent>
    </Dialog>
  );
}
