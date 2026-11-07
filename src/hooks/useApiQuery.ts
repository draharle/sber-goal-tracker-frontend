import { useCallback, useRef, useSyncExternalStore } from 'react';
import type { ApiError } from '../api/http';
import { fetchQuery, getQueryState, subscribeQuery } from '../api/queryCache';

export interface ApiQueryResult<T> {
  data: T | undefined;
  error: ApiError | undefined;
  /** Данных по текущему ключу ещё нет, запрос идёт. */
  isLoading: boolean;
  /** Идёт любой запрос, в том числе повторный при уже показанных данных. */
  isFetching: boolean;
  /** data взята из прошлого ключа (keepPreviousData), пока грузится новый. */
  isPreviousData: boolean;
  refetch: () => void;
}

interface Options {
  /** Показывать данные прошлого ключа, пока грузится новый (таблица при смене страницы). */
  keepPreviousData?: boolean;
}

/**
 * Данные из API по пути-ключу. key = null — запрос пока не нужен (не хватает параметров).
 */
export function useApiQuery<T>(key: string | null, options: Options = {}): ApiQueryResult<T> {
  const subscribe = useCallback(
    (listener: () => void) => (key === null ? () => {} : subscribeQuery(key, listener)),
    [key],
  );
  const getSnapshot = useCallback(() => getQueryState<T>(key), [key]);
  const state = useSyncExternalStore(subscribe, getSnapshot);

  const lastData = useRef<T | undefined>(undefined);
  if (state.data !== undefined) lastData.current = state.data;

  const refetch = useCallback(() => {
    if (key !== null) fetchQuery(key);
  }, [key]);

  const pending = key !== null && (state.status === 'idle' || state.status === 'loading');
  const usePrevious = options.keepPreviousData && state.data === undefined && pending;

  return {
    data: usePrevious ? lastData.current : state.data,
    error: state.error,
    isLoading: pending && state.data === undefined,
    isFetching: pending,
    isPreviousData: Boolean(usePrevious && lastData.current !== undefined),
    refetch,
  };
}
