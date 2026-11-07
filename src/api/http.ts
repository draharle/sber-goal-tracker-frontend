// Тонкий слой над fetch: базовый адрес из окружения, единый формат ошибок, таймаут и отмена.

/** Базовый адрес API. Пусто — тот же origin, /api проксирует Vite (dev) или nginx (Docker). */
export const API_BASE_URL: string = (import.meta.env.VITE_API_URL ?? '').replace(/\/+$/, '');

/** Сколько ждём ответ, прежде чем показать ошибку «сервер не ответил». */
export const REQUEST_TIMEOUT_MS = 15_000;

/** Коды, которые придумывает сам фронтенд (у API своих таких нет). */
export type ClientErrorCode = 'NETWORK_ERROR' | 'TIMEOUT' | 'SERVER_UNAVAILABLE' | 'BAD_RESPONSE';

export class ApiError extends Error {
  readonly status: number;
  readonly code: string;

  constructor(status: number, code: string, message: string) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.code = code;
  }
}

/**
 * Превращает ответ с ошибкой в ApiError.
 * API отдаёт ошибки в формате {"error": {"code", "message"}}; если тела нет
 * (например, 502 от прокси, когда mock API не запущен) — считаем сервер недоступным.
 */
export function toApiError(status: number, body: unknown): ApiError {
  const error = (body as { error?: { code?: unknown; message?: unknown } } | null)?.error;
  if (error && typeof error.code === 'string') {
    const message = typeof error.message === 'string' ? error.message : `Ошибка ${status}`;
    return new ApiError(status, error.code, message);
  }
  if (status >= 500) {
    return new ApiError(status, 'SERVER_UNAVAILABLE', `Сервер API недоступен (код ${status})`);
  }
  return new ApiError(status, `HTTP_${status}`, `Сервер вернул ошибку ${status}`);
}

export function isAbortError(error: unknown): boolean {
  return error instanceof DOMException && error.name === 'AbortError';
}

/**
 * GET-запрос к API. signal — отмена снаружи (устаревший запрос), плюс свой таймаут.
 * При отмене снаружи пробрасывается AbortError — его вызывающий код просто игнорирует.
 */
export async function getJson<T>(path: string, signal?: AbortSignal): Promise<T> {
  const controller = new AbortController();
  let timedOut = false;
  const timer = setTimeout(() => {
    timedOut = true;
    controller.abort();
  }, REQUEST_TIMEOUT_MS);
  const onOuterAbort = () => controller.abort();
  if (signal?.aborted) controller.abort();
  signal?.addEventListener('abort', onOuterAbort);

  try {
    let response: Response;
    try {
      response = await fetch(`${API_BASE_URL}${path}`, {
        signal: controller.signal,
        headers: { Accept: 'application/json' },
      });
    } catch (error) {
      if (timedOut) {
        throw new ApiError(0, 'TIMEOUT', 'Сервер не ответил за 15 секунд');
      }
      if (isAbortError(error)) throw error;
      throw new ApiError(0, 'NETWORK_ERROR', 'Нет связи с сервером API');
    }

    let body: unknown = null;
    try {
      body = await response.json();
    } catch (error) {
      if (timedOut) throw new ApiError(0, 'TIMEOUT', 'Сервер не ответил за 15 секунд');
      if (isAbortError(error)) throw error;
      body = null;
    }

    if (!response.ok) throw toApiError(response.status, body);
    if (body === null) throw new ApiError(response.status, 'BAD_RESPONSE', 'Сервер вернул пустой ответ');
    return body as T;
  } finally {
    clearTimeout(timer);
    signal?.removeEventListener('abort', onOuterAbort);
  }
}
