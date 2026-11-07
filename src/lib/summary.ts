import type { Metric, RuleCountRow, Severity, Summary } from '../api/types';

/**
 * Главные метрики — их руководитель видит первыми, крупно. Остальные идут компактной строкой.
 * Если API добавит новую метрику, она не пропадёт — попадёт в компактную строку.
 */
export const PRIMARY_METRIC_KEYS = ['clean_goals_share', 'cascade_coverage', 'issues_total', 'critical_issues'] as const;

export function splitMetrics(metrics: Metric[]): { primary: Metric[]; secondary: Metric[] } {
  const primaryKeys: readonly string[] = PRIMARY_METRIC_KEYS;
  const primary = primaryKeys
    .map((key) => metrics.find((m) => m.key === key))
    .filter((m): m is Metric => m !== undefined);
  const secondary = metrics.filter((m) => !primaryKeys.includes(m.key));
  return { primary, secondary };
}

/**
 * Подразделение без активных целей (TX-NEW): API отдаёт «Активные цели» = 0, а доли — null.
 * Считать нечего — показываем пустое состояние вместо карточек с прочерками.
 */
export function isEmptyUnit(summary: Pick<Summary, 'metrics'>): boolean {
  const goals = summary.metrics.find((m) => m.key === 'goals_active');
  if (goals) return goals.value === 0;
  return summary.metrics.length > 0 && summary.metrics.every((m) => m.value === null);
}

const SEVERITY_RANK: Record<Severity, number> = { critical: 0, major: 1, minor: 2 };

/**
 * Правила для блока «Что исправлять первым»: только те, где проблемы есть сейчас или были в прошлый раз,
 * по важности, внутри важности — где проблем больше. Это сортировка, а не пересчёт: числа из API.
 */
export function rulesToFix(rows: RuleCountRow[]): RuleCountRow[] {
  return rows
    .filter((r) => r.current > 0 || (r.previous ?? 0) > 0)
    .sort((a, b) => SEVERITY_RANK[a.severity] - SEVERITY_RANK[b.severity] || b.current - a.current);
}
