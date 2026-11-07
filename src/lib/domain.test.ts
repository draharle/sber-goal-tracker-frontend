import { describe, expect, it } from 'vitest';
import { toApiError } from '../api/http';
import type { Metric, Run, RuleCountRow, Unit } from '../api/types';
import { describeError } from './errors';
import { latestCompletedRun, nearestCompletedRuns, skippedRuns } from './runs';
import { isEmptyUnit, rulesToFix, splitMetrics } from './summary';
import { ancestorIds, buildUnitTree } from './units';

const unit = (id: string, parent_id: string | null): Unit => ({ id, name: id, level: 'unit', parent_id, depth: 0 });

describe('дерево подразделений', () => {
  const units = [unit('B2B', null), unit('HQ-TX', 'B2B'), unit('TX-NEW', 'HQ-TX'), unit('HQ-SME', 'B2B'), unit('LOST', 'NOPE')];

  it('собирает дерево из плоского списка с parent_id', () => {
    const tree = buildUnitTree(units);
    expect(tree.map((n) => n.value)).toEqual(['B2B', 'LOST']);
    expect(tree[0].children.map((n) => n.value)).toEqual(['HQ-TX', 'HQ-SME']);
    expect(tree[0].children[0].children.map((n) => n.value)).toEqual(['TX-NEW']);
  });

  it('путь от корня до подразделения', () => {
    expect(ancestorIds(units, 'TX-NEW')).toEqual(['B2B', 'HQ-TX', 'TX-NEW']);
    expect(ancestorIds(units, 'UNKNOWN')).toEqual([]);
  });
});

const run = (number: number, status: Run['status']): Run => ({
  id: `RUN-00${number}`,
  number,
  status,
  trigger: 'schedule',
  snapshot_date: '2026-10-01',
  started_at: '',
  finished_at: null,
  compared_to_run_id: null,
  error: null,
});

describe('прогоны', () => {
  // как в /api/runs: новые сверху
  const runs = [run(8, 'completed'), run(7, 'completed'), run(6, 'failed'), run(5, 'completed')];

  it('последний успешный — первый completed в списке', () => {
    expect(latestCompletedRun(runs)?.id).toBe('RUN-008');
    expect(latestCompletedRun([run(9, 'running'), ...runs])?.id).toBe('RUN-008');
  });

  it('RUN-007 сравнивается с RUN-005 — RUN-006 пропущен', () => {
    expect(skippedRuns(runs, runs[1], runs[3]).map((r) => r.id)).toEqual(['RUN-006']);
    expect(skippedRuns(runs, runs[0], runs[1])).toEqual([]);
    expect(skippedRuns(runs, runs[3], null)).toEqual([]);
  });

  it('для упавшего прогона предлагает соседние успешные', () => {
    const { newer, older } = nearestCompletedRuns(runs, 6);
    expect(newer?.id).toBe('RUN-007');
    expect(older?.id).toBe('RUN-005');
  });
});

const metric = (key: string, value: number | null): Metric => ({
  key,
  title: key,
  unit: '%',
  higher_is_better: true,
  formula: '',
  value,
  previous: null,
  delta: null,
  delta_pct: null,
  trend: null,
});

describe('сводка', () => {
  it('TX-NEW: активных целей 0 → пустое состояние', () => {
    expect(isEmptyUnit({ metrics: [metric('clean_goals_share', null), metric('goals_active', 0)] })).toBe(true);
    expect(isEmptyUnit({ metrics: [metric('clean_goals_share', 36.4), metric('goals_active', 22)] })).toBe(false);
  });

  it('главные метрики идут первыми, неизвестные новые — в дополнительные', () => {
    const { primary, secondary } = splitMetrics([
      metric('goals_active', 1),
      metric('issues_total', 1),
      metric('clean_goals_share', 1),
      metric('brand_new_metric', 1),
    ]);
    expect(primary.map((m) => m.key)).toEqual(['clean_goals_share', 'issues_total']);
    expect(secondary.map((m) => m.key)).toEqual(['goals_active', 'brand_new_metric']);
  });

  it('«что исправлять первым»: по важности, затем по числу; пустые правила скрыты', () => {
    const row = (code: string, severity: RuleCountRow['severity'], current: number, previous: number | null): RuleCountRow => ({
      code,
      title: code,
      severity,
      object_type: 'goal',
      current,
      previous,
      delta: previous === null ? null : current - previous,
    });
    const sorted = rulesToFix([
      row('MINOR_A', 'minor', 9, 9),
      row('MAJOR_A', 'major', 4, 0),
      row('MAJOR_B', 'major', 5, 0),
      row('EMPTY', 'critical', 0, 0),
      row('CRIT', 'critical', 1, null),
      row('FIXED', 'minor', 0, 3),
    ]);
    expect(sorted.map((r) => r.code)).toEqual(['CRIT', 'MAJOR_B', 'MAJOR_A', 'MINOR_A', 'FIXED']);
  });
});

describe('ошибки API', () => {
  it('единый формат {"error": {code, message}} → понятный текст', () => {
    const error = toApiError(409, {
      error: { code: 'RUN_FAILED', message: 'Прогон RUN-006 завершился с ошибкой — результатов нет' },
    });
    expect(error.code).toBe('RUN_FAILED');
    expect(describeError(error)).toEqual({
      kind: 'run-unavailable',
      title: 'Прогон завершился с ошибкой',
      description: 'Прогон RUN-006 завершился с ошибкой — результатов нет',
    });
  });

  it('502 без тела (mock API не запущен) → ошибка связи с «Повторить»', () => {
    const error = toApiError(502, null);
    expect(error.code).toBe('SERVER_UNAVAILABLE');
    expect(describeError(error).kind).toBe('connection');
  });
});
