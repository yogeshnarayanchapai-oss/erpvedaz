import { Badge } from '@/components/ui/badge';
import { TaskPerformance } from '@/hooks/useTasks';
import { cn } from '@/lib/utils';

interface TaskPerformanceBadgeProps {
  type: TaskPerformance;
  label: string;
  className?: string;
}

export function TaskPerformanceBadge({ type, label, className }: TaskPerformanceBadgeProps) {
  const config: Record<TaskPerformance, string> = {
    EARLY: 'bg-emerald-500/15 text-emerald-700 border-emerald-500/30',
    ON_TIME: 'bg-emerald-500/15 text-emerald-600 border-emerald-500/30',
    LATE: 'bg-orange-500/15 text-orange-600 border-orange-500/30',
    OVERDUE: 'bg-red-500/15 text-red-600 border-red-500/30',
    ON_TRACK: 'bg-blue-500/15 text-blue-600 border-blue-500/30',
  };

  return (
    <Badge variant="outline" className={cn(config[type], className)}>
      {label}
    </Badge>
  );
}
