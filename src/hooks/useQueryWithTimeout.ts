import { useQuery, UseQueryOptions, UseQueryResult } from '@tanstack/react-query';
import { useRef, useCallback } from 'react';

/**
 * Wrapper around useQuery that adds:
 * 1. Request deduplication via AbortController
 * 2. Timeout protection (default 10s)
 * 3. Circuit breaker for non-critical queries
 * 
 * Prevents infinite loading states and overlapping fetches.
 */

interface TimeoutQueryOptions<TData> extends Omit<UseQueryOptions<TData, Error>, 'queryFn'> {
  queryFn: (signal: AbortSignal) => Promise<TData>;
  timeoutMs?: number;
  /** If true, failures return fallback silently instead of throwing */
  nonCritical?: boolean;
  fallback?: TData;
}

export function useQueryWithTimeout<TData>(
  options: TimeoutQueryOptions<TData>
): UseQueryResult<TData, Error> {
  const { queryFn, timeoutMs = 10000, nonCritical = false, fallback, ...queryOptions } = options;
  const abortControllerRef = useRef<AbortController | null>(null);

  const wrappedQueryFn = useCallback(async (): Promise<TData> => {
    // Cancel any in-flight request for this query
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }

    const controller = new AbortController();
    abortControllerRef.current = controller;

    // Set up timeout
    const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

    try {
      const result = await queryFn(controller.signal);
      return result;
    } catch (error: any) {
      if (error?.name === 'AbortError' || controller.signal.aborted) {
        if (nonCritical && fallback !== undefined) {
          return fallback;
        }
        throw new Error('Request timed out. Please try again.');
      }
      if (nonCritical && fallback !== undefined) {
        console.warn('Non-critical query failed, using fallback:', error?.message);
        return fallback;
      }
      throw error;
    } finally {
      clearTimeout(timeoutId);
      if (abortControllerRef.current === controller) {
        abortControllerRef.current = null;
      }
    }
  }, [queryFn, timeoutMs, nonCritical, fallback]);

  return useQuery({
    ...queryOptions,
    queryFn: wrappedQueryFn,
    retry: nonCritical ? 1 : 2,
    retryDelay: (attemptIndex) => Math.min(1000 * Math.pow(2, attemptIndex), 8000),
  } as UseQueryOptions<TData, Error>);
}
