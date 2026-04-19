import { useEffect, useMemo, useState } from "react";

/**
 * Generic client-side pagination over an already-fetched array.
 * - Defaults to 100 items per page.
 * - Auto-resets to page 1 when `resetKey` changes (filters, search, etc.).
 * - Clamps current page if total shrinks.
 */
export function useClientPagination<T>(
  rows: T[],
  pageSize: number = 100,
  resetKey?: unknown,
) {
  const [page, setPage] = useState(1);

  // Reset to page 1 whenever filters/search change.
  useEffect(() => {
    setPage(1);
  }, [resetKey]);

  const total = rows.length;
  const totalPages = Math.max(1, Math.ceil(total / pageSize));

  // Clamp page if data shrinks.
  useEffect(() => {
    if (page > totalPages) setPage(totalPages);
  }, [page, totalPages]);

  const pagedRows = useMemo(() => {
    const start = (page - 1) * pageSize;
    return rows.slice(start, start + pageSize);
  }, [rows, page, pageSize]);

  const from = total === 0 ? 0 : (page - 1) * pageSize + 1;
  const to = Math.min(page * pageSize, total);

  return {
    page,
    setPage,
    pageSize,
    total,
    totalPages,
    pagedRows,
    from,
    to,
  };
}
