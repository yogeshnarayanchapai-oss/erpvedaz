import React, { ReactNode } from 'react';
import { useBreakpoint } from '@/hooks/useBreakpoint';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { cn } from '@/lib/utils';
import { Checkbox } from '@/components/ui/checkbox';

export interface Column<T> {
  key: string;
  header: string;
  cell: (item: T) => ReactNode;
  mobileLabel?: string;
  hideOnMobile?: boolean;
  hideOnTablet?: boolean;
  className?: string;
  headerClassName?: string;
  sortable?: boolean;
}

interface ResponsiveTableProps<T> {
  data: T[];
  columns: Column<T>[];
  keyExtractor: (item: T) => string;
  mobileCard?: (item: T) => ReactNode;
  onRowClick?: (item: T) => void;
  emptyMessage?: string;
  className?: string;
  tableClassName?: string;
  selectedIds?: string[];
  onSelectionChange?: (ids: string[]) => void;
  showSelection?: boolean;
  stickyHeader?: boolean;
}

export function ResponsiveTable<T>({
  data,
  columns,
  keyExtractor,
  mobileCard,
  onRowClick,
  emptyMessage = 'No data found',
  className,
  tableClassName,
  selectedIds = [],
  onSelectionChange,
  showSelection = false,
  stickyHeader = false,
}: ResponsiveTableProps<T>) {
  const { isMobile, isTablet } = useBreakpoint();

  if (data.length === 0) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        {emptyMessage}
      </div>
    );
  }

  // Mobile card view
  if (isMobile && mobileCard) {
    return (
      <div className={cn('space-y-3', className)}>
        {data.map((item) => {
          const id = keyExtractor(item);
          const isSelected = selectedIds.includes(id);
          return (
            <div
              key={id}
              className={cn(
                'relative',
                onRowClick && 'cursor-pointer',
                isSelected && 'ring-2 ring-primary rounded-lg'
              )}
            >
              {showSelection && (
                <div 
                  className="absolute top-3 left-3 z-10"
                  onClick={(e) => e.stopPropagation()}
                >
                  <Checkbox
                    checked={isSelected}
                    onCheckedChange={(checked) => {
                      if (checked) {
                        onSelectionChange?.([...selectedIds, id]);
                      } else {
                        onSelectionChange?.(selectedIds.filter(i => i !== id));
                      }
                    }}
                  />
                </div>
              )}
              <div onClick={() => onRowClick?.(item)}>
                {mobileCard(item)}
              </div>
            </div>
          );
        })}
      </div>
    );
  }

  // Mobile fallback - stacked cards without custom card
  if (isMobile) {
    return (
      <div className={cn('space-y-3', className)}>
        {data.map((item) => {
          const id = keyExtractor(item);
          const isSelected = selectedIds.includes(id);
          return (
            <div
              key={id}
              onClick={() => onRowClick?.(item)}
              className={cn(
                'bg-card border border-border rounded-lg p-3 space-y-2 transition-colors',
                onRowClick && 'cursor-pointer active:bg-muted/50',
                isSelected && 'ring-2 ring-primary border-primary'
              )}
            >
              {showSelection && (
                <div 
                  className="mb-2 pb-2 border-b"
                  onClick={(e) => e.stopPropagation()}
                >
                  <Checkbox
                    checked={isSelected}
                    onCheckedChange={(checked) => {
                      if (checked) {
                        onSelectionChange?.([...selectedIds, id]);
                      } else {
                        onSelectionChange?.(selectedIds.filter(i => i !== id));
                      }
                    }}
                  />
                </div>
              )}
              {columns
                .filter((col) => !col.hideOnMobile)
                .map((col) => (
                  <div key={col.key} className="flex justify-between items-start gap-2">
                    <span className="text-xs text-muted-foreground font-medium shrink-0">
                      {col.mobileLabel || col.header}
                    </span>
                    <span className="text-sm text-right">
                      {col.cell(item)}
                    </span>
                  </div>
                ))}
            </div>
          );
        })}
      </div>
    );
  }

  // Filter columns based on screen size
  const visibleColumns = columns.filter(col => {
    if (isTablet && col.hideOnTablet) return false;
    return true;
  });

  // Desktop/Tablet table view
  return (
    <div className={cn('overflow-x-auto -mx-1 px-1', className)}>
      <Table className={tableClassName}>
        <TableHeader className={cn(stickyHeader && 'sticky top-0 z-10 bg-background')}>
          <TableRow className="bg-muted/50">
            {showSelection && (
              <TableHead className="w-12 px-3">
                <Checkbox
                  checked={selectedIds.length === data.length && data.length > 0}
                  onCheckedChange={(checked) => {
                    if (checked) {
                      onSelectionChange?.(data.map(keyExtractor));
                    } else {
                      onSelectionChange?.([]);
                    }
                  }}
                />
              </TableHead>
            )}
            {visibleColumns.map((col) => (
              <TableHead 
                key={col.key} 
                className={cn(
                  "text-xs font-semibold whitespace-nowrap",
                  col.headerClassName
                )}
              >
                {col.header}
              </TableHead>
            ))}
          </TableRow>
        </TableHeader>
        <TableBody>
          {data.map((item) => {
            const id = keyExtractor(item);
            const isSelected = selectedIds.includes(id);
            return (
              <TableRow
                key={id}
                onClick={() => onRowClick?.(item)}
                className={cn(
                  onRowClick && 'cursor-pointer',
                  isSelected && 'bg-primary/5'
                )}
              >
                {showSelection && (
                  <TableCell className="w-12 px-3" onClick={(e) => e.stopPropagation()}>
                    <Checkbox
                      checked={isSelected}
                      onCheckedChange={(checked) => {
                        if (checked) {
                          onSelectionChange?.([...selectedIds, id]);
                        } else {
                          onSelectionChange?.(selectedIds.filter(i => i !== id));
                        }
                      }}
                    />
                  </TableCell>
                )}
                {visibleColumns.map((col) => (
                  <TableCell key={col.key} className={cn("text-sm", col.className)}>
                    {col.cell(item)}
                  </TableCell>
                ))}
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </div>
  );
}
