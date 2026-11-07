// Адреса эндпоинтов. Путь с query-строкой одновременно служит ключом кэша запросов:
// одинаковые параметры → одинаковая строка → один запрос.
import type { DeltaStatus, IssueSort, Severity } from './types';

export const PATHS = {
  meta: '/api/meta',
  /** У API максимум 100 на страницу; прогонов еженедельно — этого хватает на два года. */
  runs: '/api/runs?limit=100',
} as const;

function withQuery(path: string, params: Record<string, string | number | undefined>): string {
  const query = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined && value !== '') query.set(key, String(value));
  }
  const text = query.toString();
  return text ? `${path}?${text}` : path;
}

export function summaryPath(runId: string, unitId: string): string {
  return withQuery('/api/kkd/summary', { run_id: runId, unit_id: unitId });
}

export interface IssuesQuery {
  runId: string;
  unitId: string;
  rules: string[];
  severities: Severity[];
  statuses: DeltaStatus[];
  sort: IssueSort;
  page: number;
  pageSize: number;
}

/** Страница таблицы (с 1) → limit/offset, как ждёт API. Списки фильтров — через запятую. */
export function issuesPath(q: IssuesQuery): string {
  return withQuery('/api/kkd/issues', {
    run_id: q.runId,
    unit_id: q.unitId,
    rule_code: q.rules.join(','),
    severity: q.severities.join(','),
    delta_status: q.statuses.join(','),
    sort: q.sort,
    limit: q.pageSize,
    offset: (q.page - 1) * q.pageSize,
  });
}

export function issuePath(issueId: string, runId: string): string {
  return withQuery(`/api/kkd/issues/${encodeURIComponent(issueId)}`, { run_id: runId });
}
