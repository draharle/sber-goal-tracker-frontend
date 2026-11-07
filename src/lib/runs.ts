import type { Run } from '../api/types';

/** Список прогонов приходит новыми сверху; последний успешный — первый со статусом completed. */
export function latestCompletedRun(runs: Run[]): Run | undefined {
  return runs.find((run) => run.status === 'completed');
}

/**
 * Прогоны между текущим и тем, с которым сравниваем. Например, RUN-007 сравнивается с RUN-005,
 * потому что RUN-006 упал — это надо сказать явно, иначе руководитель решит, что сравнивают
 * с прошлой неделей.
 */
export function skippedRuns(runs: Run[], run: Pick<Run, 'number'>, comparedTo: Pick<Run, 'number'> | null): Run[] {
  if (!comparedTo) return [];
  return runs
    .filter((r) => r.number > comparedTo.number && r.number < run.number)
    .sort((a, b) => a.number - b.number);
}

/** Ближайшие успешные прогоны вокруг выбранного — что предложить вместо упавшего. */
export function nearestCompletedRuns(runs: Run[], runNumber: number): { newer?: Run; older?: Run } {
  const completed = runs.filter((r) => r.status === 'completed');
  const newer = completed.filter((r) => r.number > runNumber).sort((a, b) => a.number - b.number)[0];
  const older = completed.filter((r) => r.number < runNumber).sort((a, b) => b.number - a.number)[0];
  return { newer, older };
}
