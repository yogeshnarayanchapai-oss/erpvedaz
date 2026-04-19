import { useCallback, useMemo, useState } from 'react';

export const DEFAULT_PAGE_SIZE = 100;

/**
 * Server-side pagination hook.
 * Returns page state + Supabase `.range(from, to)` values.
 *
 * Usage:
 *   const { page, setPage, from, to, pageSize, reset } = usePagination();
 *   const { data, count } = await supabase
 *     .from('orders')
 *     .select('*', { count: 'exact' })
 *     .range(from, to);
 */
export function usePagination(initialPage = 1, pageSize: number = DEFAULT_PAGE_SIZE) {
  const [page, setPageState] = useState(initialPage);

  const { from, to } = useMemo(() => {
    const f = (page - 1) * pageSize;
    return { from: f, to: f + pageSize - 1 };
  }, [page, pageSize]);

  const setPage = useCallback((p: number) => {
    setPageState(Math.max(1, p));
  }, []);

  const reset = useCallback(() => setPageState(1), []);

  return { page, setPage, reset, from, to, pageSize };
}

/**
 * Compute pagination metadata from a total record count.
 */
export function getPaginationMeta(totalCount: number, page: number, pageSize: number = DEFAULT_PAGE_SIZE) {
  const totalPages = Math.max(1, Math.ceil((totalCount || 0) / pageSize));
  const safePage = Math.min(Math.max(1, page), totalPages);
  const startRecord = totalCount === 0 ? 0 : (safePage - 1) * pageSize + 1;
  const endRecord = Math.min(safePage * pageSize, totalCount);
  return {
    totalPages,
    page: safePage,
    startRecord,
    endRecord,
    hasPrev: safePage > 1,
    hasNext: safePage < totalPages,
  };
}
