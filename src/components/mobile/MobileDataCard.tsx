import { ReactNode } from 'react';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

interface MobileDataCardProps {
  title: string;
  subtitle?: string;
  badge?: {
    text: string;
    variant?: 'default' | 'secondary' | 'destructive' | 'outline';
    className?: string;
  };
  fields: {
    label: string;
    value: ReactNode;
    className?: string;
  }[];
  actions?: ReactNode;
  onClick?: () => void;
  className?: string;
}

export function MobileDataCard({
  title,
  subtitle,
  badge,
  fields,
  actions,
  onClick,
  className,
}: MobileDataCardProps) {
  return (
    <Card
      className={cn(
        'p-4 space-y-3 transition-colors',
        onClick && 'cursor-pointer active:bg-muted/50',
        className
      )}
      onClick={onClick}
    >
      {/* Header */}
      <div className="flex items-start justify-between gap-2">
        <div className="flex-1 min-w-0">
          <h3 className="font-medium text-foreground truncate">{title}</h3>
          {subtitle && (
            <p className="text-sm text-muted-foreground truncate">{subtitle}</p>
          )}
        </div>
        {badge && (
          <Badge
            variant={badge.variant || 'default'}
            className={cn('shrink-0', badge.className)}
          >
            {badge.text}
          </Badge>
        )}
      </div>

      {/* Fields Grid */}
      <div className="grid grid-cols-2 gap-2 text-sm">
        {fields.map((field, index) => (
          <div key={index} className={cn('space-y-0.5', field.className)}>
            <p className="text-xs text-muted-foreground">{field.label}</p>
            <p className="font-medium text-foreground">{field.value}</p>
          </div>
        ))}
      </div>

      {/* Actions */}
      {actions && (
        <div className="flex items-center gap-2 pt-2 border-t border-border">
          {actions}
        </div>
      )}
    </Card>
  );
}
