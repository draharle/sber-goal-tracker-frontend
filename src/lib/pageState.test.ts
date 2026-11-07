import { describe, expect, it } from 'vitest';
import { issuesPath } from '../api/endpoints';
import { applyPatch, DEFAULT_STATE, parsePageState, serializePageState } from './pageState';

describe('состояние страницы в адресе', () => {
  it('пустой адрес → значения по умолчанию', () => {
    expect(parsePageState('')).toEqual(DEFAULT_STATE);
  });

  it('разбирает все параметры', () => {
    const state = parsePageState(
      '?unit=CIB-REG&run=RUN-007&rule=CASCADE_NO_PARENT,KR_NO_UNIT&severity=major&status=new,resolved&sort=age&page=3&size=50&issue=ISS-8E97CCCACA',
    );
    expect(state).toEqual({
      unit: 'CIB-REG',
      run: 'RUN-007',
      rules: ['CASCADE_NO_PARENT', 'KR_NO_UNIT'],
      severities: ['major'],
      statuses: ['new', 'resolved'],
      sort: 'age',
      page: 3,
      pageSize: 50,
      issue: 'ISS-8E97CCCACA',
    });
  });

  it('мусор из испорченной ссылки отбрасывает, а не отправляет в API', () => {
    const state = parsePageState('?run=latest&severity=fatal,minor&status=gone&sort=random&page=-2&size=7&issue=<script>');
    expect(state.run).toBeNull();
    expect(state.severities).toEqual(['minor']);
    expect(state.statuses).toEqual([]);
    expect(state.sort).toBe('severity');
    expect(state.page).toBe(1);
    expect(state.pageSize).toBe(20);
    expect(state.issue).toBeNull();
  });

  it('туда и обратно без потерь; значения по умолчанию в адрес не пишутся', () => {
    const state = { ...DEFAULT_STATE, unit: 'HQ-SME', run: 'RUN-008', statuses: ['new' as const], page: 2 };
    const query = serializePageState(state);
    expect(query).toBe('?unit=HQ-SME&run=RUN-008&status=new&page=2');
    expect(parsePageState(query)).toEqual(state);
    expect(serializePageState(DEFAULT_STATE)).toBe('');
  });

  it('смена подразделения или фильтра сбрасывает страницу, смена контекста закрывает карточку', () => {
    const state = { ...DEFAULT_STATE, run: 'RUN-008', page: 4, issue: 'ISS-1' };
    expect(applyPatch(state, { severities: ['critical'] })).toMatchObject({ page: 1, issue: 'ISS-1' });
    expect(applyPatch(state, { unit: 'TX-NEW' })).toMatchObject({ page: 1, issue: null });
    expect(applyPatch(state, { page: 2 })).toMatchObject({ page: 2, issue: 'ISS-1' });
  });
});

describe('запрос списка проблем', () => {
  it('страница → limit/offset, списки фильтров — через запятую', () => {
    const path = issuesPath({
      runId: 'RUN-008',
      unitId: 'B2B',
      rules: ['GOAL_NO_KR', 'KR_WEIGHTS_SUM'],
      severities: [],
      statuses: ['new'],
      sort: 'severity',
      page: 3,
      pageSize: 20,
    });
    const url = new URL(path, 'http://x');
    expect(url.pathname).toBe('/api/kkd/issues');
    expect(Object.fromEntries(url.searchParams)).toEqual({
      run_id: 'RUN-008',
      unit_id: 'B2B',
      rule_code: 'GOAL_NO_KR,KR_WEIGHTS_SUM',
      delta_status: 'new',
      sort: 'severity',
      limit: '20',
      offset: '40',
    });
  });
});
