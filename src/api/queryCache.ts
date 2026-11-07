// Маленький кэш запросов вместо React Query.
// Что он даёт:
// 1. Дедупликация: ключ — путь запроса. Пока запрос по ключу идёт или уже выполнен,
//    второй компонент с тем же ключом новый запрос не отправляет.
// 2. Отмена устаревших: когда ключ больше никому не нужен (сменили фильтр, подразделение),
//    его незавершённый запрос отменяется через AbortController.
// 3. Кэш результатов: результаты завершённого прогона не меняются, поэтому возврат
//    к уже открытому фильтру показывается сразу, без запроса.
import { ApiError, getJson, isAbortError } from './http';

export type QueryStatus = 'idle' | 'loading' | 'success' | 'error';

export interface QueryState<T> {
  status: QueryStatus;
  data: T | undefined;
  error: ApiError | undefined;
}

interface Entry {
  state: QueryState<unknown>;
  controller: AbortController | undefined;
  listeners: Set<() => void>;
  abortTimer: ReturnType<typeof setTimeout> | undefined;
  lastUsed: number;
}

const MAX_ENTRIES = 100;
const IDLE: QueryState<never> = Object.freeze({ status: 'idle', data: undefined, error: undefined });

const entries = new Map<string, Entry>();

function getEntry(key: string): Entry {
  let entry = entries.get(key);
  if (!entry) {
    entry = { state: IDLE, controller: undefined, listeners: new Set(), abortTimer: undefined, lastUsed: 0 };
    entries.set(key, entry);
  }
  entry.lastUsed = Date.now();
  return entry;
}

function setState(entry: Entry, state: QueryState<unknown>): void {
  entry.state = state;
  entry.listeners.forEach((listener) => listener());
}

/** Выбрасываем самые давние записи, которые сейчас никто не слушает. */
function evict(): void {
  if (entries.size <= MAX_ENTRIES) return;
  const unused = [...entries.entries()]
    .filter(([, e]) => e.listeners.size === 0 && !e.controller)
    .sort((a, b) => a[1].lastUsed - b[1].lastUsed);
  for (const [key] of unused.slice(0, entries.size - MAX_ENTRIES)) entries.delete(key);
}

/** Запустить (или перезапустить) запрос по ключу. Старые данные остаются видны, пока идёт новый. */
export function fetchQuery(key: string): void {
  const entry = getEntry(key);
  entry.controller?.abort();
  const controller = new AbortController();
  entry.controller = controller;
  setState(entry, { status: 'loading', data: entry.state.data, error: undefined });

  getJson<unknown>(key, controller.signal).then(
    (data) => {
      if (controller.signal.aborted) return;
      entry.controller = undefined;
      setState(entry, { status: 'success', data, error: undefined });
      evict();
    },
    (error: unknown) => {
      if (controller.signal.aborted || isAbortError(error)) return;
      entry.controller = undefined;
      const apiError =
        error instanceof ApiError ? error : new ApiError(0, 'NETWORK_ERROR', 'Нет связи с сервером API');
      setState(entry, { status: 'error', data: undefined, error: apiError });
    },
  );
}

/**
 * Подписка компонента на ключ (используется через useSyncExternalStore).
 * Если данных ещё нет или прошлый запрос упал — запускаем запрос.
 * Отписка последнего слушателя отменяет незавершённый запрос — но не сразу, а в следующем
 * тике: React в StrictMode отписывается и тут же подписывается снова, и запрос не должен дублироваться.
 */
export function subscribeQuery(key: string, listener: () => void): () => void {
  const entry = getEntry(key);
  if (entry.abortTimer) {
    clearTimeout(entry.abortTimer);
    entry.abortTimer = undefined;
  }
  const status = entry.state.status;
  if (!entry.controller && (status === 'idle' || status === 'error')) fetchQuery(key);
  entry.listeners.add(listener);

  return () => {
    entry.listeners.delete(listener);
    if (entry.listeners.size > 0 || !entry.controller) return;
    entry.abortTimer = setTimeout(() => {
      entry.abortTimer = undefined;
      if (entry.listeners.size > 0 || !entry.controller) return;
      entry.controller.abort();
      entry.controller = undefined;
      // Запрос отменён — данных нет. Следующий подписчик запросит заново.
      entry.state = entry.state.data === undefined ? IDLE : { ...entry.state, status: 'success' };
    }, 0);
  };
}

export function getQueryState<T>(key: string | null): QueryState<T> {
  if (key === null) return IDLE;
  return (entries.get(key)?.state ?? IDLE) as QueryState<T>;
}

/** Для тестов: очистить кэш. */
export function clearQueryCache(): void {
  entries.forEach((e) => e.controller?.abort());
  entries.clear();
}
