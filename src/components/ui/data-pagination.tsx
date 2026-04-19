import { Button } from "@/components/ui/button";
import { ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight } from "lucide-react";

interface DataPaginationProps {
  page: number;
  totalPages: number;
  total: number;
  from: number;
  to: number;
  onPageChange: (page: number) => void;
  className?: string;
  itemLabel?: string; // e.g. "orders", "leads"
}

/**
 * Reusable pagination footer: « ‹  Page X of Y  › »  with "Showing A–B of N" label.
 * Hidden when there is only a single page of data.
 */
export function DataPagination({
  page,
  totalPages,
  total,
  from,
  to,
  onPageChange,
  className = "",
  itemLabel = "items",
}: DataPaginationProps) {
  if (total === 0) return null;

  const goFirst = () => onPageChange(1);
  const goPrev = () => onPageChange(Math.max(1, page - 1));
  const goNext = () => onPageChange(Math.min(totalPages, page + 1));
  const goLast = () => onPageChange(totalPages);

  const isFirst = page <= 1;
  const isLast = page >= totalPages;

  return (
    <div
      className={`flex flex-col sm:flex-row items-center justify-between gap-3 py-3 px-1 border-t mt-2 ${className}`}
    >
      <div className="text-sm text-muted-foreground">
        Showing <span className="font-medium text-foreground">{from.toLocaleString()}</span>
        {"–"}
        <span className="font-medium text-foreground">{to.toLocaleString()}</span> of{" "}
        <span className="font-medium text-foreground">{total.toLocaleString()}</span> {itemLabel}
      </div>

      <div className="flex items-center gap-1">
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={goFirst}
          disabled={isFirst}
          aria-label="First page"
        >
          <ChevronsLeft className="h-4 w-4" />
        </Button>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={goPrev}
          disabled={isFirst}
        >
          <ChevronLeft className="h-4 w-4 mr-1" /> Previous
        </Button>
        <div className="px-3 text-sm font-medium whitespace-nowrap">
          Page {page} of {totalPages}
        </div>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={goNext}
          disabled={isLast}
        >
          Next <ChevronRight className="h-4 w-4 ml-1" />
        </Button>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={goLast}
          disabled={isLast}
          aria-label="Last page"
        >
          <ChevronsRight className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}
