import React from 'react';
import { cn } from '@/lib/utils';
import { useBreakpoint } from '@/hooks/useBreakpoint';

interface ResponsiveFormLayoutProps {
  children: React.ReactNode;
  className?: string;
}

// A wrapper that makes form grids responsive
export function ResponsiveFormLayout({ children, className }: ResponsiveFormLayoutProps) {
  return (
    <div
      className={cn(
        "grid gap-4",
        "grid-cols-1 sm:grid-cols-2 lg:grid-cols-3",
        className
      )}
    >
      {children}
    </div>
  );
}

// A full-width form field
interface FormFieldFullProps {
  children: React.ReactNode;
  className?: string;
}

export function FormFieldFull({ children, className }: FormFieldFullProps) {
  return (
    <div className={cn("col-span-full", className)}>
      {children}
    </div>
  );
}

// A responsive button group
interface ResponsiveButtonGroupProps {
  children: React.ReactNode;
  align?: 'start' | 'center' | 'end' | 'between';
  className?: string;
  stack?: boolean;
}

export function ResponsiveButtonGroup({
  children,
  align = 'end',
  className,
  stack = false,
}: ResponsiveButtonGroupProps) {
  const { isMobile } = useBreakpoint();

  const alignClass = {
    start: 'justify-start',
    center: 'justify-center',
    end: 'justify-end',
    between: 'justify-between',
  };

  if (isMobile || stack) {
    return (
      <div className={cn("flex flex-col-reverse gap-2 w-full", className)}>
        {children}
      </div>
    );
  }

  return (
    <div className={cn("flex items-center gap-3", alignClass[align], className)}>
      {children}
    </div>
  );
}

// Page container with proper padding
interface PageContainerProps {
  children: React.ReactNode;
  className?: string;
  header?: React.ReactNode;
}

export function PageContainer({ children, className, header }: PageContainerProps) {
  return (
    <div className={cn("flex flex-col min-h-full", className)}>
      {header}
      <div className="flex-1 p-3 md:p-6 space-y-4 md:space-y-6">
        {children}
      </div>
    </div>
  );
}

// Section card with responsive padding
interface SectionCardProps {
  children: React.ReactNode;
  title?: string;
  description?: string;
  actions?: React.ReactNode;
  className?: string;
  noPadding?: boolean;
}

export function SectionCard({
  children,
  title,
  description,
  actions,
  className,
  noPadding = false,
}: SectionCardProps) {
  return (
    <div
      className={cn(
        "bg-card border rounded-lg",
        !noPadding && "p-3 md:p-5",
        className
      )}
    >
      {(title || actions) && (
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 mb-4">
          <div>
            {title && <h2 className="font-semibold text-base md:text-lg">{title}</h2>}
            {description && (
              <p className="text-sm text-muted-foreground mt-0.5">{description}</p>
            )}
          </div>
          {actions && <div className="shrink-0">{actions}</div>}
        </div>
      )}
      {children}
    </div>
  );
}

// Stats row with responsive columns
interface StatsRowProps {
  children: React.ReactNode;
  className?: string;
  columns?: 2 | 3 | 4;
}

export function StatsRow({ children, className, columns = 4 }: StatsRowProps) {
  const colClass = {
    2: 'grid-cols-2',
    3: 'grid-cols-2 md:grid-cols-3',
    4: 'grid-cols-2 md:grid-cols-4',
  };

  return (
    <div className={cn("grid gap-3 md:gap-4", colClass[columns], className)}>
      {children}
    </div>
  );
}
