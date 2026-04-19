import { useEffect, useMemo, useState } from 'react';
import { DEFAULT_PAGE_SIZE } from './usePagination';

/**
 * Client-side row pagination helper.
 * Slices an already-fetched array into pages of `pageSize`.
 *
 * Use this when:
 *  - The data hook already applies server-side filters (date range, status, etc.)
 *  - You just need to slice the result into 100-row pages for the UI
 *
 * Auto-resets to page 1 whenever the underlying total count changes
 * significantly (e.g., filter change shrinks the result set below current page).
 */
export function useClientPagination<T>(rows: T[], pageSize: number = DEFAULT_PAGE_SIZE) {
  const [page, setPage] = useState(1);
  const totalCount = rows.length;
  const totalPages = Math.max(1, Math.ceil(totalCount / pageSize));

  // Clamp page if data shrank
  useEffect(() => {
    if (page > totalPages) setPage(1);
  }, [totalPages, page]);

  const pagedRows = useMemo(() => {
    const start = (page - 1) * pageSize;
    return rows.slice(start, start + pageSize);
  }, [rows, page, pageSize]);

  const reset = () => setPage(1);

  return { page, setPage, pagedRows, totalCount, pageSize, totalPages, reset };
}
