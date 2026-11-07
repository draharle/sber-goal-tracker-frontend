// Форматирование чисел, дельты и дат. Здесь ничего не считается заново:
// числа приходят из API как есть, мы только решаем, как их написать.
import type { Metric, Trend } from '../api/types';

const MINUS = '−'; // типографский минус «−», а не дефис

const numberFormat = new Intl.NumberFormat('ru-RU', { maximumFractionDigits: 2 });

export function formatNumber(value: number): string {
  return numberFormat.format(value);
}

/** «%» у значения и «п.п.» у разницы процентов: 36,4 % → 61,9 % — это −25,5 п.п., а не −25,5 %. */
export function formatValue(value: number, unit: string): string {
  return `${formatNumber(value)} ${unit}`;
}

/** Число со знаком: +9, −25,5, 0. Знак ставим сами, чтобы минус был «−», а не дефисом. */
export function formatSigned(value: number): string {
  if (value === 0) return '0';
  const sign = value > 0 ? '+' : MINUS;
  return `${sign}${formatNumber(Math.abs(value))}`;
}

export function deltaUnit(metricUnit: string): string {
  return metricUnit === '%' ? 'п.п.' : metricUnit;
}

export function formatDelta(delta: number, metricUnit: string): string {
  return `${formatSigned(delta)} ${deltaUnit(metricUnit)}`;
}

/** '2026-10-26' → '26.10.2026'. Без Date, чтобы часовой пояс не сдвинул день. */
export function formatDate(isoDate: string | null | undefined): string {
  if (!isoDate) return '—';
  const match = /^(\d{4})-(\d{2})-(\d{2})/.exec(isoDate);
  if (!match) return isoDate;
  return `${match[3]}.${match[2]}.${match[1]}`;
}

export type DeltaDirection = 'up' | 'down' | 'flat';

/** Направление числа — только про знак. Хорошо это или плохо, говорит trend, а не знак. */
export function deltaDirection(delta: number): DeltaDirection {
  if (delta > 0) return 'up';
  if (delta < 0) return 'down';
  return 'flat';
}

export type Assessment = Trend | 'neutral';

/**
 * Оценка «лучше / хуже» строго из поля trend. Если у метрики нет направления «хорошо»
 * (higher_is_better = null, например «Активные цели»), API отдаёт trend = null —
 * показываем нейтрально, а не красим по знаку.
 */
export function assessmentOf(metric: Pick<Metric, 'trend'>): Assessment {
  return metric.trend ?? 'neutral';
}

export const ASSESSMENT_LABEL: Record<Assessment, string> = {
  better: 'Лучше',
  worse: 'Хуже',
  same: 'Без изменений',
  neutral: 'Без оценки',
};

export type ComparisonKind =
  /** значения нет: в подразделении нечего считать (например, нет активных целей) */
  | 'no-value'
  /** значение есть, прошлого нет: первый прогон или в прошлом прогоне считать было нечего */
  | 'no-previous'
  /** есть и значение, и прошлое — показываем дельту */
  | 'compared';

export function comparisonKind(metric: Pick<Metric, 'value' | 'previous' | 'delta'>): ComparisonKind {
  if (metric.value === null) return 'no-value';
  if (metric.previous === null || metric.delta === null) return 'no-previous';
  return 'compared';
}

export function pluralRu(n: number, one: string, few: string, many: string): string {
  const mod10 = n % 10;
  const mod100 = n % 100;
  if (mod10 === 1 && mod100 !== 11) return one;
  if (mod10 >= 2 && mod10 <= 4 && (mod100 < 12 || mod100 > 14)) return few;
  return many;
}
