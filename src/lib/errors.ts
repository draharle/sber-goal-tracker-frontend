import type { ApiError } from '../api/http';

export type ErrorKind =
  /** прогон упал или ещё идёт — данных нет, нужно выбрать другой прогон */
  | 'run-unavailable'
  /** в адресе неизвестный прогон / подразделение / проблема */
  | 'not-found'
  /** параметры фильтра API не принял */
  | 'bad-params'
  /** сеть, таймаут, сервер лежит — поможет «Повторить» */
  | 'connection';

export interface ErrorView {
  kind: ErrorKind;
  title: string;
  description: string;
}

/** Ошибка API → что сказать человеку. Сообщение от API показываем как есть: оно уже по-русски. */
export function describeError(error: ApiError): ErrorView {
  switch (error.code) {
    case 'RUN_FAILED':
      return { kind: 'run-unavailable', title: 'Прогон завершился с ошибкой', description: error.message };
    case 'RUN_IN_PROGRESS':
      return { kind: 'run-unavailable', title: 'Прогон ещё выполняется', description: error.message };
    case 'RUN_NOT_FOUND':
      return { kind: 'not-found', title: 'Прогон не найден', description: error.message };
    case 'UNIT_NOT_FOUND':
      return { kind: 'not-found', title: 'Подразделение не найдено', description: error.message };
    case 'ISSUE_NOT_FOUND':
      return { kind: 'not-found', title: 'Проблема не найдена', description: error.message };
    case 'INVALID_PARAM':
      return { kind: 'bad-params', title: 'Неверные параметры фильтра', description: error.message };
    case 'TIMEOUT':
      return {
        kind: 'connection',
        title: 'Сервер отвечает слишком долго',
        description: `${error.message}. Попробуйте ещё раз.`,
      };
    case 'NETWORK_ERROR':
    case 'SERVER_UNAVAILABLE':
      return {
        kind: 'connection',
        title: 'Не удалось получить данные',
        description: `${error.message}. Проверьте, что mock API запущен, и повторите.`,
      };
    default:
      if (error.status === 422) {
        return { kind: 'bad-params', title: 'Неверные параметры запроса', description: error.message };
      }
      return { kind: 'connection', title: 'Не удалось получить данные', description: error.message };
  }
}
