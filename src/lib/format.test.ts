import { describe, expect, it } from 'vitest';
import {
  assessmentOf,
  comparisonKind,
  deltaDirection,
  formatDate,
  formatDelta,
  formatSigned,
  formatValue,
  pluralRu,
} from './format';

describe('формат дельты', () => {
  it('ставит знак и типографский минус, ноль без знака', () => {
    expect(formatSigned(9)).toBe('+9');
    expect(formatSigned(-25.5)).toBe('−25,5');
    expect(formatSigned(0)).toBe('0');
  });

  it('разница процентов — в п.п., а штук — в штуках', () => {
    expect(formatDelta(-25.5, '%')).toBe('−25,5 п.п.');
    expect(formatDelta(9, 'шт.')).toBe('+9 шт.');
    expect(formatValue(36.4, '%')).toBe('36,4 %');
  });

  it('направление — только знак числа', () => {
    expect(deltaDirection(4)).toBe('up');
    expect(deltaDirection(-0.01)).toBe('down');
    expect(deltaDirection(0)).toBe('flat');
  });
});

describe('оценка «лучше / хуже»', () => {
  it('берётся из trend, а не из знака: рост проблем — хуже', () => {
    // issues_total: delta +9, higher_is_better=false → API отдаёт trend=worse
    expect(assessmentOf({ trend: 'worse' })).toBe('worse');
    expect(assessmentOf({ trend: 'better' })).toBe('better');
    expect(assessmentOf({ trend: 'same' })).toBe('same');
  });

  it('метрика без направления (higher_is_better=null → trend=null) — нейтрально', () => {
    expect(assessmentOf({ trend: null })).toBe('neutral');
  });
});

describe('сравнение: null — это не ноль', () => {
  it('первый прогон: previous и delta null → «нет данных для сравнения»', () => {
    expect(comparisonKind({ value: 73.9, previous: null, delta: null })).toBe('no-previous');
  });

  it('значение null (нет целей) → «нет данных»', () => {
    expect(comparisonKind({ value: null, previous: null, delta: null })).toBe('no-value');
  });

  it('ноль — это настоящее значение, сравнение есть', () => {
    expect(comparisonKind({ value: 0, previous: 0, delta: 0 })).toBe('compared');
  });
});

describe('даты и склонения', () => {
  it('ISO-дата → ДД.ММ.ГГГГ без сдвига часового пояса', () => {
    expect(formatDate('2026-10-26')).toBe('26.10.2026');
    expect(formatDate('2026-11-02T06:00:00+03:00')).toBe('02.11.2026');
    expect(formatDate(null)).toBe('—');
  });

  it('склоняет «прогон»', () => {
    expect(pluralRu(1, 'прогон', 'прогона', 'прогонов')).toBe('прогон');
    expect(pluralRu(3, 'прогон', 'прогона', 'прогонов')).toBe('прогона');
    expect(pluralRu(7, 'прогон', 'прогона', 'прогонов')).toBe('прогонов');
    expect(pluralRu(12, 'прогон', 'прогона', 'прогонов')).toBe('прогонов');
    expect(pluralRu(21, 'прогон', 'прогона', 'прогонов')).toBe('прогон');
  });
});
