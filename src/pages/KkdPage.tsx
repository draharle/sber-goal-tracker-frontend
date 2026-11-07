import { Button, Layout } from 'antd';
import { useCallback, useEffect, useMemo } from 'react';
import { issuePath, issuesPath, PATHS, summaryPath } from '../api/endpoints';
import type { DeltaStatus, IssueDetail, IssuesResponse, Meta, RunsResponse, Severity, Summary } from '../api/types';
import { ContextStrip } from '../components/ContextStrip';
import { ErrorResult } from '../components/ErrorResult';
import { FixFirst } from '../components/FixFirst';
import { IssueModal } from '../components/IssueModal';
import { IssuesTable } from '../components/IssuesTable';
import { MetricCards, MetricCardsSkeleton } from '../components/MetricCards';
import { PageHeader } from '../components/PageHeader';
import { EmptyUnit, RunUnavailable, SlowHint, SlowLoading } from '../components/States';
import { useApiQuery } from '../hooks/useApiQuery';
import { usePageState } from '../hooks/usePageState';
import { describeError } from '../lib/errors';
import { DEFAULT_STATE, type PageState } from '../lib/pageState';
import { latestCompletedRun } from '../lib/runs';
import { isEmptyUnit } from '../lib/summary';

/**
 * Страница модуля ККД. Порядок блоков — порядок вопросов руководителя:
 * 1) где я и с чем сравниваю → 2) стало лучше или хуже (метрики) →
 * 3) что исправлять первым (дельта, важность, правила) → 4) сам список проблем.
 */
export function KkdPage() {
  const [state, update] = usePageState();

  // Справочник и список прогонов грузятся параллельно и один раз за сессию (кэш по ключу).
  const meta = useApiQuery<Meta>(PATHS.meta);
  const runs = useApiQuery<RunsResponse>(PATHS.runs);
  const runList = runs.data?.items;
  const latest = runList ? latestCompletedRun(runList) : undefined;
  const runId = state.run ?? latest?.id ?? null;
  const selectedRun = runList?.find((r) => r.id === runId);

  // Прогон не указан в адресе → подставляем последний успешный, чтобы ссылка стала воспроизводимой.
  useEffect(() => {
    if (!state.run && latest) {
      update({ run: latest.id, page: state.page, issue: state.issue }, { replace: true });
    }
  }, [state.run, state.page, state.issue, latest, update]);

  // Неизвестные коды правил из адреса не отправляем: API ответит 422.
  const rules = useMemo(() => {
    if (!meta.data) return state.rules;
    const known = new Set(meta.data.rules.map((r) => r.code));
    return state.rules.filter((code) => known.has(code));
  }, [meta.data, state.rules]);

  // У упавшего или ещё идущего прогона результатов нет — заранее известно, что API ответит 409,
  // поэтому сводку и таблицу не запрашиваем. Если прогона нет в списке — спрашиваем API, он скажет 404.
  const runHasResults = selectedRun ? selectedRun.status === 'completed' : true;
  const ready = meta.data !== undefined && runList !== undefined && runId !== null && runHasResults;

  const summary = useApiQuery<Summary>(ready ? summaryPath(runId, state.unit) : null);
  const issues = useApiQuery<IssuesResponse>(
    ready
      ? issuesPath({
          runId,
          unitId: state.unit,
          rules,
          severities: state.severities,
          statuses: state.statuses,
          sort: state.sort,
          page: state.page,
          pageSize: state.pageSize,
        })
      : null,
    { keepPreviousData: true },
  );
  const issue = useApiQuery<IssueDetail>(ready && state.issue ? issuePath(state.issue, runId) : null);

  // Страница за пределами списка (например, page=99 в ссылке) → на последнюю существующую.
  const issuesData = issues.data;
  useEffect(() => {
    if (!issuesData || issues.isPreviousData) return;
    const lastPage = Math.max(1, Math.ceil(issuesData.total / state.pageSize));
    if (state.page > lastPage) update({ page: lastPage }, { replace: true });
  }, [issuesData, issues.isPreviousData, state.page, state.pageSize, update]);

  useEffect(() => {
    const unitName = summary.data?.unit.name;
    document.title = unitName ? `ККД · ${unitName} · ${runId}` : 'ККД — качество данных по целям';
  }, [summary.data, runId]);

  const changeUnit = useCallback((unit: string) => update({ unit }), [update]);
  const changeRun = useCallback((run: string) => update({ run }), [update]);
  const changeTable = useCallback((patch: Partial<PageState>) => update(patch), [update]);
  const openIssue = useCallback((id: string) => update({ issue: id }), [update]);
  const closeIssue = useCallback(() => update({ issue: null }), [update]);

  // Клик по счётчику или правилу: фильтр в таблицу и прокрутка к ней.
  const showInTable = useCallback(
    (patch: Partial<PageState>) => {
      update({ rules: [], severities: [], statuses: [], ...patch });
      requestAnimationFrame(() => {
        const heading = document.getElementById('issues-heading');
        heading?.scrollIntoView({ behavior: 'smooth', block: 'start' });
        heading?.focus({ preventScroll: true });
      });
    },
    [update],
  );
  const selectStatus = useCallback((s: DeltaStatus) => showInTable({ statuses: [s] }), [showInTable]);
  const selectSeverity = useCallback((s: Severity) => showInTable({ severities: [s] }), [showInTable]);
  const selectRule = useCallback((code: string) => showInTable({ rules: [code] }), [showInTable]);

  const resetAll = () => update({ ...DEFAULT_STATE, run: latest?.id ?? null });

  const renderContent = () => {
    // Без справочника и списка прогонов страница не работает вообще.
    const bootError = meta.error ?? runs.error;
    if (bootError) {
      return (
        <ErrorResult
          error={bootError}
          onRetry={() => {
            if (meta.error) meta.refetch();
            if (runs.error) runs.refetch();
          }}
        />
      );
    }
    if (!meta.data || !runList) {
      return <SlowLoading rows={6} label="Загрузка справочников" />;
    }

    const units = meta.data.units;
    const context = (
      <ContextStrip
        units={units}
        unitId={state.unit}
        run={selectedRun}
        runs={runList}
        comparedTo={summary.data ? summary.data.compared_to : undefined}
        onUnitChange={changeUnit}
      />
    );

    if (selectedRun && !runHasResults) {
      return (
        <>
          {context}
          <RunUnavailable run={selectedRun} runs={runList} onSelectRun={changeRun} onRefresh={runs.refetch} />
        </>
      );
    }

    if (summary.error) {
      const view = describeError(summary.error);
      return (
        <>
          {context}
          {view.kind === 'run-unavailable' && selectedRun ? (
            <RunUnavailable
              run={selectedRun}
              runs={runList}
              apiMessage={summary.error.message}
              onSelectRun={changeRun}
              onRefresh={runs.refetch}
            />
          ) : (
            <ErrorResult
              error={summary.error}
              onRetry={summary.refetch}
              actions={
                view.kind === 'not-found' ? (
                  <Button type="primary" onClick={resetAll}>
                    Открыть весь блок, последний прогон
                  </Button>
                ) : undefined
              }
            />
          )}
        </>
      );
    }

    if (!summary.data) {
      return (
        <>
          {context}
          <MetricCardsSkeleton />
          <SlowHint />
        </>
      );
    }

    if (isEmptyUnit(summary.data)) {
      const unit = units.find((u) => u.id === state.unit);
      const parent = unit?.parent_id ? units.find((u) => u.id === unit.parent_id) : undefined;
      return (
        <>
          {context}
          <EmptyUnit unit={unit} parent={parent} onUnitChange={changeUnit} />
        </>
      );
    }

    return (
      <>
        {context}
        <MetricCards metrics={summary.data.metrics} comparedTo={summary.data.compared_to} />
        <FixFirst
          summary={summary.data}
          activeStatuses={state.statuses}
          activeRules={rules}
          activeSeverities={state.severities}
          onSelectStatus={selectStatus}
          onSelectSeverity={selectSeverity}
          onSelectRule={selectRule}
        />
        <IssuesTable
          meta={meta.data}
          state={{ ...state, rules }}
          query={issues}
          isFirstRun={summary.data.compared_to === null}
          onChange={changeTable}
          onOpenIssue={openIssue}
        />
      </>
    );
  };

  return (
    <Layout style={{ minHeight: '100vh' }}>
      <a className="kkd-skip-link" href="#main">
        Перейти к содержимому
      </a>
      <PageHeader
        meta={meta.data}
        runs={runList}
        unitId={state.unit}
        runId={runId}
        latestRunId={latest?.id}
        onUnitChange={changeUnit}
        onRunChange={changeRun}
      />
      <Layout.Content id="main" className="kkd-main" tabIndex={-1}>
        <div className="kkd-main__inner">{renderContent()}</div>
      </Layout.Content>
      {meta.data && (
        <IssueModal open={state.issue !== null && ready} runId={runId} meta={meta.data} query={issue} onClose={closeIssue} />
      )}
    </Layout>
  );
}
