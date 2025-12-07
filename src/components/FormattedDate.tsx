import { useDateMode } from '@/contexts/DateModeContext';
import { formatDateWithMode } from '@/lib/nepaliDate';

interface FormattedDateProps {
  date: Date | string | null | undefined;
  fallback?: string;
}

export function FormattedDate({ date, fallback = '-' }: FormattedDateProps) {
  const { dateMode } = useDateMode();

  if (!date) return <>{fallback}</>;

  try {
    return <>{formatDateWithMode(date, dateMode)}</>;
  } catch {
    return <>{fallback}</>;
  }
}
