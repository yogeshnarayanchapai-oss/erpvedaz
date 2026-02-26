import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { ArrowDownLeft, ArrowUpRight, ShoppingCart, Package, CreditCard, Wallet, TrendingUp, TrendingDown } from 'lucide-react';
import type { TransactionType } from '@/hooks/useTransactions';

interface TransactionTypeSelectorProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSelect: (type: TransactionType) => void;
  filterTypes?: TransactionType[];
  title?: string;
}

export const TRANSACTION_TYPE_META: { type: TransactionType; label: string; shortDesc: string; icon: React.ReactNode; color: string; badgeClass: string }[] = [
  { type: 'INCOME', label: 'Income', shortDesc: 'Money received', icon: <ArrowDownLeft className="w-4 h-4" />, color: 'text-green-600 border-green-200 bg-green-50 hover:bg-green-100 dark:bg-green-950/30 dark:hover:bg-green-950/50 dark:border-green-800', badgeClass: 'bg-green-100 text-green-700 border-green-200 dark:bg-green-950/50 dark:text-green-400 dark:border-green-800' },
  { type: 'EXPENSE', label: 'Expense', shortDesc: 'Money spent', icon: <ArrowUpRight className="w-4 h-4" />, color: 'text-red-600 border-red-200 bg-red-50 hover:bg-red-100 dark:bg-red-950/30 dark:hover:bg-red-950/50 dark:border-red-800', badgeClass: 'bg-red-100 text-red-700 border-red-200 dark:bg-red-950/50 dark:text-red-400 dark:border-red-800' },
  { type: 'SALES_OUT', label: 'Sales Out', shortDesc: 'Wholesale sale', icon: <ShoppingCart className="w-4 h-4" />, color: 'text-blue-600 border-blue-200 bg-blue-50 hover:bg-blue-100 dark:bg-blue-950/30 dark:hover:bg-blue-950/50 dark:border-blue-800', badgeClass: 'bg-blue-100 text-blue-700 border-blue-200 dark:bg-blue-950/50 dark:text-blue-400 dark:border-blue-800' },
  { type: 'SALES_IN', label: 'Sales In', shortDesc: 'Purchase in', icon: <Package className="w-4 h-4" />, color: 'text-orange-600 border-orange-200 bg-orange-50 hover:bg-orange-100 dark:bg-orange-950/30 dark:hover:bg-orange-950/50 dark:border-orange-800', badgeClass: 'bg-orange-100 text-orange-700 border-orange-200 dark:bg-orange-950/50 dark:text-orange-400 dark:border-orange-800' },
  { type: 'PAYMENT_IN', label: 'Payment In', shortDesc: 'Received', icon: <Wallet className="w-4 h-4" />, color: 'text-emerald-600 border-emerald-200 bg-emerald-50 hover:bg-emerald-100 dark:bg-emerald-950/30 dark:hover:bg-emerald-950/50 dark:border-emerald-800', badgeClass: 'bg-emerald-100 text-emerald-700 border-emerald-200 dark:bg-emerald-950/50 dark:text-emerald-400 dark:border-emerald-800' },
  { type: 'PAYMENT_OUT', label: 'Payment Out', shortDesc: 'Paid out', icon: <CreditCard className="w-4 h-4" />, color: 'text-purple-600 border-purple-200 bg-purple-50 hover:bg-purple-100 dark:bg-purple-950/30 dark:hover:bg-purple-950/50 dark:border-purple-800', badgeClass: 'bg-purple-100 text-purple-700 border-purple-200 dark:bg-purple-950/50 dark:text-purple-400 dark:border-purple-800' },
  { type: 'ADJUSTMENT_PLUS' as TransactionType, label: 'Adjust +', shortDesc: 'Balance increase', icon: <TrendingUp className="w-4 h-4" />, color: 'text-amber-600 border-amber-200 bg-amber-50 hover:bg-amber-100 dark:bg-amber-950/30 dark:hover:bg-amber-950/50 dark:border-amber-800', badgeClass: 'bg-amber-100 text-amber-700 border-amber-200 dark:bg-amber-950/50 dark:text-amber-400 dark:border-amber-800' },
  { type: 'ADJUSTMENT_MINUS' as TransactionType, label: 'Adjust -', shortDesc: 'Balance decrease', icon: <TrendingDown className="w-4 h-4" />, color: 'text-yellow-600 border-yellow-200 bg-yellow-50 hover:bg-yellow-100 dark:bg-yellow-950/30 dark:hover:bg-yellow-950/50 dark:border-yellow-800', badgeClass: 'bg-yellow-100 text-yellow-700 border-yellow-200 dark:bg-yellow-950/50 dark:text-yellow-400 dark:border-yellow-800' },
];

export function getTypeMeta(type: TransactionType) {
  return TRANSACTION_TYPE_META.find(t => t.type === type);
}

export function TransactionTypeSelector({ open, onOpenChange, onSelect, filterTypes, title }: TransactionTypeSelectorProps) {
  const items = filterTypes 
    ? TRANSACTION_TYPE_META.filter(t => filterTypes.includes(t.type))
    : TRANSACTION_TYPE_META;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle className="text-sm font-medium">{title || 'Select Transaction Type'}</DialogTitle>
        </DialogHeader>
        <div className={`grid gap-2 ${items.length <= 3 ? 'grid-cols-3' : 'grid-cols-2'}`}>
          {items.map(({ type, label, shortDesc, icon, color }) => (
            <button
              key={type}
              className={`flex items-center gap-2 p-2.5 rounded-lg border text-left transition-colors cursor-pointer ${color}`}
              onClick={() => {
                onSelect(type);
                onOpenChange(false);
              }}
            >
              {icon}
              <div className="min-w-0">
                <div className="text-xs font-semibold leading-tight">{label}</div>
                <div className="text-[10px] opacity-70 leading-tight truncate">{shortDesc}</div>
              </div>
            </button>
          ))}
        </div>
      </DialogContent>
    </Dialog>
  );
}
