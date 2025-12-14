import { ReactNode } from 'react';
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

interface Column<T> {
  key: string;
  header: string;
  cell: (item: T) => ReactNode;
  mobileLabel?: string;
  hideOnMobile?: boolean;
  className?: string;
}

interface ResponsiveTableProps<T> {
  data: T[];
  columns: Column<T>[];
  keyExtractor: (item: T) => string;
  mobileCard?: (item: T) => ReactNode;
  onRowClick?: (item: T) => void;
  emptyMessage?: string;
  className?: string;
}

export function ResponsiveTable<T>({
  data,
  columns,
  keyExtractor,
  mobileCard,
  onRowClick,
  emptyMessage = 'No data found',
  className,
}: ResponsiveTableProps<T>) {
  const { isMobile } = useBreakpoint();

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
        {data.map((item) => (
          <div
            key={keyExtractor(item)}
            onClick={() => onRowClick?.(item)}
            className={cn(onRowClick && 'cursor-pointer')}
          >
            {mobileCard(item)}
          </div>
        ))}
      </div>
    );
  }

  // Mobile fallback - stacked cards without custom card
  if (isMobile) {
    return (
      <div className={cn('space-y-3', className)}>
        {data.map((item) => (
          <div
            key={keyExtractor(item)}
            onClick={() => onRowClick?.(item)}
            className={cn(
              'bg-card border border-border rounded-lg p-4 space-y-2',
              onRowClick && 'cursor-pointer active:bg-muted/50'
            )}
          >
            {columns
              .filter((col) => !col.hideOnMobile)
              .map((col) => (
                <div key={col.key} className="flex justify-between gap-2">
                  <span className="text-sm text-muted-foreground shrink-0">
                    {col.mobileLabel || col.header}:
                  </span>
                  <span className="text-sm font-medium text-right">
                    {col.cell(item)}
                  </span>
                </div>
              ))}
          </div>
        ))}
      </div>
    );
  }

  // Desktop table view
  return (
    <div className={cn('rounded-md border', className)}>
      <Table>
        <TableHeader>
          <TableRow>
            {columns.map((col) => (
              <TableHead key={col.key} className={col.className}>
                {col.header}
              </TableHead>
            ))}
          </TableRow>
        </TableHeader>
        <TableBody>
          {data.map((item) => (
            <TableRow
              key={keyExtractor(item)}
              onClick={() => onRowClick?.(item)}
              className={cn(onRowClick && 'cursor-pointer')}
            >
              {columns.map((col) => (
                <TableCell key={col.key} className={col.className}>
                  {col.cell(item)}
                </TableCell>
              ))}
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
