import React, { ReactNode } from 'react';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { ChevronRight } from 'lucide-react';

interface DataField {
  label: string;
  value: ReactNode;
  className?: string;
  highlight?: boolean;
  fullWidth?: boolean;
}

interface MobileDataCardProps {
  title: string;
  subtitle?: string;
  badge?: {
    text: string;
    variant?: 'default' | 'secondary' | 'destructive' | 'outline';
    className?: string;
  };
  fields: DataField[];
  actions?: ReactNode;
  onClick?: () => void;
  className?: string;
  showArrow?: boolean;
  selected?: boolean;
  children?: ReactNode;
}

export function MobileDataCard({
  title,
  subtitle,
  badge,
  fields,
  actions,
  onClick,
  className,
  showArrow = false,
  selected = false,
  children,
}: MobileDataCardProps) {
  return (
    <Card
      className={cn(
        'p-3 space-y-2.5 transition-all',
        onClick && 'cursor-pointer active:scale-[0.99] active:bg-muted/30',
        selected && 'ring-2 ring-primary border-primary',
        className
      )}
      onClick={onClick}
    >
      {/* Header */}
      <div className="flex items-start justify-between gap-2">
        <div className="flex-1 min-w-0">
          <h3 className="font-medium text-sm text-foreground truncate">{title}</h3>
          {subtitle && (
            <p className="text-xs text-muted-foreground truncate mt-0.5">{subtitle}</p>
          )}
        </div>
        <div className="flex items-center gap-2 shrink-0">
          {badge && (
            <Badge
              variant={badge.variant || 'default'}
              className={cn('text-[10px] px-1.5 py-0', badge.className)}
            >
              {badge.text}
            </Badge>
          )}
          {showArrow && onClick && (
            <ChevronRight className="w-4 h-4 text-muted-foreground" />
          )}
        </div>
      </div>

      {/* Fields Grid */}
      {fields.length > 0 && (
        <div className="grid grid-cols-2 gap-x-3 gap-y-1.5">
          {fields.map((field, index) => (
            <div 
              key={index} 
              className={cn(
                'space-y-0.5', 
                field.className,
                field.fullWidth && 'col-span-2'
              )}
            >
              <p className="text-[10px] text-muted-foreground uppercase tracking-wide">
                {field.label}
              </p>
              <p className={cn(
                "text-sm",
                field.highlight && "font-semibold text-primary"
              )}>
                {field.value || '-'}
              </p>
            </div>
          ))}
        </div>
      )}

      {/* Custom children */}
      {children}

      {/* Actions */}
      {actions && (
        <div 
          className="flex items-center justify-end gap-2 pt-2 border-t border-border"
          onClick={(e) => e.stopPropagation()}
        >
          {actions}
        </div>
      )}
    </Card>
  );
}

// Simple stat card for mobile
interface MobileStatCardProps {
  label: string;
  value: ReactNode;
  icon?: ReactNode;
  trend?: {
    value: string;
    positive?: boolean;
  };
  onClick?: () => void;
  className?: string;
}

export function MobileStatCard({
  label,
  value,
  icon,
  trend,
  onClick,
  className,
}: MobileStatCardProps) {
  return (
    <Card
      className={cn(
        'p-3 transition-colors',
        onClick && 'cursor-pointer active:bg-muted/50',
        className
      )}
      onClick={onClick}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="flex-1 min-w-0">
          <p className="text-xs text-muted-foreground truncate">{label}</p>
          <p className="text-xl font-bold mt-0.5">{value}</p>
          {trend && (
            <p className={cn(
              "text-xs mt-1",
              trend.positive ? "text-green-600" : "text-red-600"
            )}>
              {trend.value}
            </p>
          )}
        </div>
        {icon && (
          <div className="shrink-0 text-muted-foreground">
            {icon}
          </div>
        )}
      </div>
    </Card>
  );
}
