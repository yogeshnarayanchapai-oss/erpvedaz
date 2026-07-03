import { ReactNode } from 'react';
import { cn } from '@/lib/utils';

interface StatCardProps {
  title: string;
  value: string | number;
  icon?: ReactNode;
  description?: string;
  trend?: {
    value: number;
    isPositive: boolean;
  };
  variant?: 'default' | 'primary' | 'success' | 'warning' | 'destructive' | 'info';
  onClick?: () => void;
  className?: string;
  valueClassName?: string;
  compare?: { pct: number; positive: boolean } | null;
}


const variantStyles = {
  default: 'bg-card border-border',
  primary: 'bg-primary/5 border-primary/20',
  success: 'bg-success/5 border-success/20',
  warning: 'bg-warning/5 border-warning/20',
  destructive: 'bg-destructive/5 border-destructive/20',
  info: 'bg-info/5 border-info/20',
};

const iconStyles = {
  default: 'bg-muted text-muted-foreground',
  primary: 'bg-primary/10 text-primary',
  success: 'bg-success/10 text-success',
  warning: 'bg-warning/10 text-warning',
  destructive: 'bg-destructive/10 text-destructive',
  info: 'bg-info/10 text-info',
};

export function StatCard({ title, value, icon, description, trend, variant = 'default', onClick, className, valueClassName }: StatCardProps) {
  const Component = onClick ? 'button' : 'div';
  
  return (
    <Component 
      className={cn(
        'stat-card border animate-fade-in w-full text-left touch-target',
        variantStyles[variant],
        onClick && 'active:scale-[0.98] transition-transform',
        className
      )}
      onClick={onClick}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="space-y-0.5 md:space-y-1 min-w-0 flex-1">
          <p className="stat-label truncate sm:overflow-visible sm:text-clip sm:whitespace-normal">{title}</p>
          <p className={cn('stat-value truncate sm:overflow-visible sm:text-clip', valueClassName)}>{value}</p>
          {description && (
            <p className="text-[10px] md:text-xs text-muted-foreground truncate sm:overflow-visible sm:whitespace-normal">{description}</p>
          )}
          {trend && (
            <p className={cn(
              'text-[10px] md:text-xs font-medium',
              trend.isPositive ? 'text-success' : 'text-destructive'
            )}>
              {trend.isPositive ? '↑' : '↓'} {Math.abs(trend.value)}%
            </p>
          )}
        </div>
        {icon && (
          <div className={cn('p-1.5 md:p-2.5 rounded-lg shrink-0', iconStyles[variant])}>
            {icon}
          </div>
        )}
      </div>
    </Component>
  );
}
