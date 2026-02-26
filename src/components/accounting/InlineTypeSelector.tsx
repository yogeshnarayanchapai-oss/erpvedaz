import { TRANSACTION_TYPE_META } from '@/components/accounting/TransactionTypeSelector';
import type { TransactionType } from '@/hooks/useTransactions';

interface InlineTypeSelectorProps {
  currentType: TransactionType;
  allowedTypes: TransactionType[];
  onSelect: (type: TransactionType) => void;
}

export function InlineTypeSelector({ currentType, allowedTypes, onSelect }: InlineTypeSelectorProps) {
  const items = TRANSACTION_TYPE_META.filter((t) => allowedTypes.includes(t.type));

  return (
    <div className="space-y-2">
      <label className="text-sm font-medium">Transaction Type</label>
      <div className="grid grid-cols-3 gap-2">
        {items.map(({ type, label, shortDesc, icon, color }) =>
        <button
          key={type}
          type="button"
          className={`flex items-center gap-2 p-2.5 rounded-lg border text-left transition-colors cursor-pointer ${color} ${
          currentType === type ? 'ring-2 ring-primary ring-offset-1' : 'opacity-70 hover:opacity-100'}`
          }
          onClick={() => onSelect(type)}>

            {icon}
            <div className="min-w-0 text-secondary-foreground">
              <div className="text-xs font-semibold leading-tight">{label}</div>
              <div className="text-[10px] opacity-70 leading-tight truncate">{shortDesc}</div>
            </div>
          </button>
        )}
      </div>
    </div>);

}