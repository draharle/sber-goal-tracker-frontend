// Состояние страницы живёт в query-строке адреса: подразделение, прогон, фильтры, страница,
// открытая карточка. Ссылку можно отправить коллеге — он увидит то же самое.
import type { DeltaStatus, IssueSort, Severity } from '../api/types';

export interface PageState {
  unit: string;
  /** null — прогон не выбран явно: берём последний успешный из списка прогонов. */
  run: string | null;
  rules: string[];
  severities: Severity[];
  statuses: DeltaStatus[];
  sort: IssueSort;
  page: number;
  pageSize: number;
  /** id открытой карточки проблемы */
  issue: string | null;
}

export const DEFAULT_UNIT = 'B2B';
export const PAGE_SIZES = [10, 20, 50] as const;

export const DEFAULT_STATE: PageState = {
  unit: DEFAULT_UNIT,
  run: null,
  rules: [],
  severities: [],
  statuses: [],
  sort: 'severity',
  page: 1,
  pageSize: 20,
  issue: null,
};

const SEVERITIES: readonly Severity[] = ['critical', 'major', 'minor'];
const STATUSES: readonly DeltaStatus[] = ['new', 'persisting', 'resolved'];
const SORTS: readonly IssueSort[] = ['severity', 'age', 'unit', 'rule'];

const RUN_ID = /^RUN-\d{3,}$/;
const CODE = /^[A-Z][A-Z0-9_]*$/;
const UNIT_ID = /^[A-Z0-9][A-Z0-9-]*$/;
const ISSUE_ID = /^ISS-[A-Z0-9]+$/;

function list<T extends string>(raw: string | null, allowed: (v: string) => v is T): T[] {
  if (!raw) return [];
  const values = raw.split(',').map((v) => v.trim()).filter(allowed);
  return [...new Set(values)];
}

const oneOf =
  <T extends string>(values: readonly T[]) =>
  (v: string): v is T =>
    (values as readonly string[]).includes(v);

function positiveInt(raw: string | null, fallback: number): number {
  if (raw === null || !/^\d+$/.test(raw)) return fallback;
  const n = Number(raw);
  return n >= 1 ? n : fallback;
}

/**
 * Разбор query-строки. Мусор и неизвестные значения отбрасываются молча — страница не ломается
 * от руками испорченной ссылки, а API не получает параметры, на которые ответит 422.
 */
export function parsePageState(search: string): PageState {
  const p = new URLSearchParams(search);
  const unit = p.get('unit');
  const run = p.get('run');
  const sort = p.get('sort');
  const size = positiveInt(p.get('size'), DEFAULT_STATE.pageSize);
  const issue = p.get('issue');
  return {
    unit: unit && UNIT_ID.test(unit) ? unit : DEFAULT_UNIT,
    run: run && RUN_ID.test(run) ? run : null,
    rules: list(p.get('rule'), (v): v is string => CODE.test(v)),
    severities: list(p.get('severity'), oneOf(SEVERITIES)),
    statuses: list(p.get('status'), oneOf(STATUSES)),
    sort: sort && oneOf(SORTS)(sort) ? sort : DEFAULT_STATE.sort,
    page: positiveInt(p.get('page'), 1),
    pageSize: (PAGE_SIZES as readonly number[]).includes(size) ? size : DEFAULT_STATE.pageSize,
    issue: issue && ISSUE_ID.test(issue) ? issue : null,
  };
}

/** Обратно в query-строку. Значения по умолчанию не пишем — ссылка короче. */
export function serializePageState(state: PageState): string {
  const p = new URLSearchParams();
  if (state.unit !== DEFAULT_UNIT) p.set('unit', state.unit);
  if (state.run) p.set('run', state.run);
  if (state.rules.length) p.set('rule', state.rules.join(','));
  if (state.severities.length) p.set('severity', state.severities.join(','));
  if (state.statuses.length) p.set('status', state.statuses.join(','));
  if (state.sort !== DEFAULT_STATE.sort) p.set('sort', state.sort);
  if (state.page !== 1) p.set('page', String(state.page));
  if (state.pageSize !== DEFAULT_STATE.pageSize) p.set('size', String(state.pageSize));
  if (state.issue) p.set('issue', state.issue);
  const text = p.toString();
  return text ? `?${text}` : '';
}

export function hasIssueFilters(state: PageState): boolean {
  return state.rules.length > 0 || state.severities.length > 0 || state.statuses.length > 0;
}

/**
 * Применить изменение. Смена подразделения, прогона или фильтров сбрасывает страницу таблицы на первую:
 * иначе можно оказаться на 5-й странице списка, в котором 2 строки.
 */
export function applyPatch(state: PageState, patch: Partial<PageState>): PageState {
  const next = { ...state, ...patch };
  const scopeChanged = 'unit' in patch || 'run' in patch;
  const filtersChanged = 'rules' in patch || 'severities' in patch || 'statuses' in patch || 'sort' in patch || 'pageSize' in patch;
  if ((scopeChanged || filtersChanged) && !('page' in patch)) next.page = 1;
  if (scopeChanged && !('issue' in patch)) next.issue = null;
  return next;
}
