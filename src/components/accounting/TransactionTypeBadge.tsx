import { RefreshCw } from 'lucide-react';
import type { TransactionType } from '@/hooks/useTransactions';
import { getTypeMeta } from './TransactionTypeSelector';

interface Props {
  type: TransactionType;
  onChangeType?: () => void;
}

export function TransactionTypeBadge({ type, onChangeType }: Props) {
  const meta = getTypeMeta(type);
  if (!meta) return null;

  return (
    <button
      type="button"
      onClick={onChangeType}
      className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full border text-xs font-medium transition-colors cursor-pointer hover:opacity-80 ${meta.badgeClass}`}
      title="Click to change type"
    >
      {meta.icon}
      {meta.label}
      {onChangeType && <RefreshCw className="w-3 h-3 opacity-50" />}
    </button>
  );
}
