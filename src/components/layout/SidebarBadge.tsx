import { cn } from '@/lib/utils';

interface SidebarBadgeProps {
  count: number;
  className?: string;
}

export function SidebarBadge({ count, className }: SidebarBadgeProps) {
  if (count <= 0) return null;

  return (
    <span
      className={cn(
        'ml-auto flex h-5 min-w-5 items-center justify-center rounded-full bg-destructive px-1.5 text-[10px] font-medium text-destructive-foreground',
        className
      )}
    >
      {count > 99 ? '99+' : count}
    </span>
  );
}
