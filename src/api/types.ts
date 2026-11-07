// Типы ответов mock API ККД. Формы взяты из app/main.py и app/store.py репозитория moc_api_kkd.
// Поля, которые могут прийти null, помечены явно: null значит «нет данных», а не ноль.

export type Severity = 'critical' | 'major' | 'minor';
export type DeltaStatus = 'new' | 'persisting' | 'resolved';
export type Trend = 'better' | 'worse' | 'same';
export type RunStatus = 'completed' | 'failed' | 'running';
export type IssueSort = 'severity' | 'age' | 'unit' | 'rule';
export type ObjectType = 'goal' | 'key_result';

export interface Unit {
  id: string;
  name: string;
  level: string;
  parent_id: string | null;
  depth: number;
}

export interface Rule {
  code: string;
  object_type: ObjectType;
  severity: Severity;
  title: string;
  description: string;
  recommendation: string;
}

export interface SeverityInfo {
  code: Severity;
  title: string;
  order: number;
}

export interface GoalLevel {
  code: string;
  order: number;
  title: string;
}

export interface MetricDef {
  key: string;
  title: string;
  unit: string;
  higher_is_better: boolean | null;
  formula: string;
}

export interface CodeTitle<T extends string = string> {
  code: T;
  title: string;
}

/** GET /api/meta */
export interface Meta {
  units: Unit[];
  rules: Rule[];
  severities: SeverityInfo[];
  goal_levels: GoalLevel[];
  metrics: MetricDef[];
  delta_statuses: CodeTitle<DeltaStatus>[];
}

export interface RunTotals {
  goals_active: number;
  key_results: number;
  issues_total: number;
  critical: number;
  major: number;
  minor: number;
  clean_goals_share: number | null;
}

export interface Run {
  id: string;
  number: number;
  status: RunStatus;
  trigger: 'schedule' | 'manual';
  snapshot_date: string;
  started_at: string;
  finished_at: string | null;
  compared_to_run_id: string | null;
  error: string | null;
  totals?: RunTotals | null;
}

export interface Page<T> {
  items: T[];
  total: number;
  limit: number;
  offset: number;
}

/** GET /api/runs */
export type RunsResponse = Page<Run>;

export interface Metric extends MetricDef {
  value: number | null;
  previous: number | null;
  delta: number | null;
  delta_pct: number | null;
  trend: Trend | null;
}

export interface CountRow {
  code: string;
  title: string;
  current: number;
  previous: number | null;
  delta: number | null;
}

export interface RuleCountRow extends CountRow {
  severity: Severity;
  object_type: ObjectType;
}

export interface UnitView {
  id: string;
  name: string;
  level: string;
  parent_id: string | null;
  path: { id: string; name: string }[];
}

/** GET /api/kkd/summary */
export interface Summary {
  run: Run;
  compared_to: Run | null;
  unit: UnitView;
  metrics: Metric[];
  issues_by_severity: (CountRow & { code: Severity })[];
  issues_by_rule: RuleCountRow[];
  delta: { new: number | null; persisting: number | null; resolved: number | null };
}

export interface Owner {
  id: string;
  full_name: string;
  position: string;
}

export interface Issue {
  id: string;
  rule_code: string;
  rule_title: string;
  severity: Severity;
  object_type: ObjectType;
  object_id: string;
  goal_id: string;
  goal_title: string;
  goal_level: string;
  kr_id: string | null;
  kr_title: string | null;
  unit_id: string;
  unit_name: string;
  details: string;
  actual: string | number | null;
  expected: string | number | null;
  recommendation: string;
  owner: Owner | null;
  delta_status: DeltaStatus;
  first_detected_run_id: string | null;
  first_detected_at: string | null;
  runs_in_row: number | null;
}

/** GET /api/kkd/issues */
export interface IssuesResponse extends Page<Issue> {
  run_id: string;
}

export interface IssueHistoryPoint {
  run_id: string;
  snapshot_date: string;
  run_status: RunStatus;
  /** true — проблема была в прогоне, false — не было, null — прогон без результатов */
  present: boolean | null;
}

/** GET /api/kkd/issues/{id} */
export interface IssueDetail extends Issue {
  history: IssueHistoryPoint[];
}
