import { ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { getPaginationMeta } from '@/hooks/usePagination';

interface DataPaginationProps {
  page: number;
  pageSize: number;
  totalCount: number;
  onPageChange: (page: number) => void;
  className?: string;
  isLoading?: boolean;
  /** Optional label for the items (e.g., "orders", "leads"). Defaults to "records". */
  itemLabel?: string;
}

/**
 * Reusable server-side pagination control.
 * Shows: "Showing X–Y of Z records" + First / Prev / Page X of Y / Next / Last buttons.
 */
export function DataPagination({
  page,
  pageSize,
  totalCount,
  onPageChange,
  className,
  isLoading,
  itemLabel = 'records',
}: DataPaginationProps) {
  const meta = getPaginationMeta(totalCount, page, pageSize);

  if (totalCount === 0) {
    return (
      <div className={cn('flex items-center justify-center py-3 text-sm text-muted-foreground', className)}>
        No {itemLabel} found
      </div>
    );
  }

  return (
    <div
      className={cn(
        'flex flex-col sm:flex-row items-center justify-between gap-3 py-3 border-t border-border bg-background',
        className,
      )}
    >
      <div className="text-xs sm:text-sm text-muted-foreground">
        Showing <span className="font-medium text-foreground">{meta.startRecord.toLocaleString()}</span>–
        <span className="font-medium text-foreground">{meta.endRecord.toLocaleString()}</span> of{' '}
        <span className="font-medium text-foreground">{totalCount.toLocaleString()}</span> {itemLabel}
      </div>

      <div className="flex items-center gap-1">
        <Button
          variant="outline"
          size="sm"
          onClick={() => onPageChange(1)}
          disabled={!meta.hasPrev || isLoading}
          aria-label="First page"
          className="h-8 w-8 p-0"
        >
          <ChevronsLeft className="h-4 w-4" />
        </Button>
        <Button
          variant="outline"
          size="sm"
          onClick={() => onPageChange(meta.page - 1)}
          disabled={!meta.hasPrev || isLoading}
          aria-label="Previous page"
          className="h-8 px-2"
        >
          <ChevronLeft className="h-4 w-4" />
          <span className="hidden sm:inline ml-1">Prev</span>
        </Button>

        <div className="px-3 text-xs sm:text-sm font-medium whitespace-nowrap">
          Page {meta.page} of {meta.totalPages}
        </div>

        <Button
          variant="outline"
          size="sm"
          onClick={() => onPageChange(meta.page + 1)}
          disabled={!meta.hasNext || isLoading}
          aria-label="Next page"
          className="h-8 px-2"
        >
          <span className="hidden sm:inline mr-1">Next</span>
          <ChevronRight className="h-4 w-4" />
        </Button>
        <Button
          variant="outline"
          size="sm"
          onClick={() => onPageChange(meta.totalPages)}
          disabled={!meta.hasNext || isLoading}
          aria-label="Last page"
          className="h-8 w-8 p-0"
        >
          <ChevronsRight className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}
