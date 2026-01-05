import { Badge } from '@/components/ui/badge';
import { TaskPriority } from '@/hooks/useTasks';
import { cn } from '@/lib/utils';

interface TaskPriorityBadgeProps {
  priority: TaskPriority;
  className?: string;
}

export function TaskPriorityBadge({ priority, className }: TaskPriorityBadgeProps) {
  const config = {
    LOW: {
      label: 'Low',
      className: 'bg-slate-500/15 text-slate-600 border-slate-500/30',
    },
    MEDIUM: {
      label: 'Medium',
      className: 'bg-amber-500/15 text-amber-600 border-amber-500/30',
    },
    HIGH: {
      label: 'High',
      className: 'bg-red-500/15 text-red-600 border-red-500/30',
    },
  };

  const { label, className: badgeClass } = config[priority];

  return (
    <Badge variant="outline" className={cn(badgeClass, className)}>
      {label}
    </Badge>
  );
}
