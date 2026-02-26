import { TRANSACTION_TYPE_META } from '@/components/accounting/TransactionTypeSelector';
import type { TransactionType } from '@/hooks/useTransactions';

interface InlineTypeSelectorProps {
  currentType: TransactionType;
  allowedTypes: TransactionType[];
  onSelect: (type: TransactionType) => void;
}

export function InlineTypeSelector({ currentType, allowedTypes, onSelect }: InlineTypeSelectorProps) {
  const items = TRANSACTION_TYPE_META.filter(t => allowedTypes.includes(t.type));

  return (
    <div className="space-y-1.5">
      <label className="text-xs font-medium text-muted-foreground">Transaction Type</label>
      <div className="flex flex-wrap gap-1.5">
        {items.map(({ type, label, icon, color }) => (
          <button
            key={type}
            type="button"
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md border text-left transition-all cursor-pointer ${color} ${
              currentType === type ? 'ring-2 ring-primary ring-offset-1 opacity-100 shadow-sm' : 'opacity-60 hover:opacity-90'
            }`}
            onClick={() => onSelect(type)}
          >
            <span className="w-3.5 h-3.5 shrink-0 [&>svg]:w-3.5 [&>svg]:h-3.5">{icon}</span>
            <span className="text-xs font-semibold whitespace-nowrap">{label}</span>
          </button>
        ))}
      </div>
    </div>
  );
}
