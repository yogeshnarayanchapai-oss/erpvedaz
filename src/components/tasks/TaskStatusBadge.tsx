import { Badge } from '@/components/ui/badge';
import { TaskStatus } from '@/hooks/useTasks';
import { cn } from '@/lib/utils';

interface TaskStatusBadgeProps {
  status: TaskStatus;
  className?: string;
}

export function TaskStatusBadge({ status, className }: TaskStatusBadgeProps) {
  const config = {
    PENDING: {
      label: 'Pending',
      className: 'bg-amber-500/15 text-amber-600 border-amber-500/30',
    },
    IN_PROGRESS: {
      label: 'In Progress',
      className: 'bg-blue-500/15 text-blue-600 border-blue-500/30',
    },
    COMPLETED: {
      label: 'Completed',
      className: 'bg-emerald-500/15 text-emerald-600 border-emerald-500/30',
    },
  };

  const { label, className: badgeClass } = config[status];

  return (
    <Badge variant="outline" className={cn(badgeClass, className)}>
      {label}
    </Badge>
  );
}
