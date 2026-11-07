import { ClearOutlined } from '@ant-design/icons';
import { Button, Empty, Select, Skeleton, Table, Typography, theme } from 'antd';
import type { TableColumnsType } from 'antd';
import type { ReactNode } from 'react';
import type { DeltaStatus, Issue, IssueSort, IssuesResponse, Meta, Severity } from '../api/types';
import type { ApiQueryResult } from '../hooks/useApiQuery';
import { formatNumber, pluralRu } from '../lib/format';
import { PAGE_SIZES, hasIssueFilters, type PageState } from '../lib/pageState';
import { ErrorResult } from './ErrorResult';
import { Heading } from './Heading';
import { DELTA_STATUS_LABEL, DeltaStatusTag, SEVERITY_LABEL, SeverityTag } from './StatusTags';

const SORT_OPTIONS: { value: IssueSort; label: string }[] = [
  { value: 'severity', label: 'По важности' },
  { value: 'age', label: 'Дольше всего висят' },
  { value: 'unit', label: 'По подразделению' },
  { value: 'rule', label: 'По правилу' },
];

interface IssuesTableProps {
  meta: Meta;
  state: PageState;
  query: ApiQueryResult<IssuesResponse>;
  isFirstRun: boolean;
  onChange: (patch: Partial<PageState>) => void;
  onOpenIssue: (issueId: string) => void;
}

export function IssuesTable({ meta, state, query, isFirstRun, onChange, onOpenIssue }: IssuesTableProps) {
  const { token } = theme.useToken();
  const filtered = hasIssueFilters(state);
  const data = query.data;

  const columns: TableColumnsType<Issue> = [
    {
      title: 'Важность',
      dataIndex: 'severity',
      width: 150,
      render: (severity: Severity) => <SeverityTag severity={severity} />,
    },
    {
      title: 'Проблема',
      key: 'problem',
      render: (_, issue) => (
        <>
          <div>{issue.rule_title}</div>
          <Typography.Text type="secondary" style={{ fontSize: token.fontSizeSM }}>
            {issue.details}
          </Typography.Text>
        </>
      ),
    },
    {
      title: 'Цель / КР',
      key: 'object',
      render: (_, issue) => (
        <>
          <Button
            type="link"
            style={{ padding: 0, height: 'auto', whiteSpace: 'normal', textAlign: 'left' }}
            onClick={(event) => {
              event.stopPropagation();
              onOpenIssue(issue.id);
            }}
            aria-label={`Открыть карточку проблемы: ${issue.rule_title}, ${issue.goal_title}`}
          >
            {issue.goal_title}
          </Button>
          <div style={{ fontSize: token.fontSizeSM, color: token.colorTextSecondary }}>
            {issue.kr_title ? `КР: ${issue.kr_title} · ${issue.kr_id}` : issue.goal_id}
          </div>
        </>
      ),
    },
    { title: 'Подразделение', dataIndex: 'unit_name', width: 180 },
    {
      title: 'Ответственный',
      key: 'owner',
      width: 150,
      render: (_, issue) =>
        issue.owner ? (
          issue.owner.full_name
        ) : (
          <span style={{ color: token.colorTextTertiary }}>не назначен</span>
        ),
    },
    {
      title: 'Статус',
      dataIndex: 'delta_status',
      width: 130,
      render: (status: DeltaStatus) => <DeltaStatusTag status={status} />,
    },
    {
      title: 'Висит',
      key: 'age',
      width: 120,
      render: (_, issue) =>
        issue.runs_in_row === null ? (
          <span style={{ color: token.colorTextTertiary }}>—</span>
        ) : (
          <>
            <div className="kkd-num">
              {issue.runs_in_row} {pluralRu(issue.runs_in_row, 'прогон', 'прогона', 'прогонов')}
            </div>
            <div style={{ fontSize: token.fontSizeSM, color: token.colorTextSecondary }}>
              с {issue.first_detected_run_id}
            </div>
          </>
        ),
    },
  ];

  const emptyText = filtered ? (
    <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="По выбранным фильтрам проблем нет">
      <Button onClick={() => onChange({ rules: [], severities: [], statuses: [] })}>Сбросить фильтры</Button>
    </Empty>
  ) : (
    <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="В этом прогоне проблем не найдено" />
  );

  return (
    <section aria-labelledby="issues-heading" className="kkd-panel" aria-busy={query.isFetching}>
      <div className="kkd-section-head">
        <Heading level={2} id="issues-heading" tabIndex={-1}>
          Список проблем
        </Heading>
        {data && (
          <Typography.Text type="secondary" aria-live="polite">
            {filtered ? 'Найдено по фильтрам' : 'Всего'}: <span className="kkd-num">{formatNumber(data.total)}</span>
          </Typography.Text>
        )}
      </div>

      <div className="kkd-filters" role="group" aria-label="Фильтры списка проблем">
        <FilterField label="Правило" id="filter-rule">
          <Select
            id="filter-rule"
            mode="multiple"
            allowClear
            maxTagCount="responsive"
            placeholder="Все правила"
            style={{ width: 280 }}
            value={state.rules}
            onChange={(rules: string[]) => onChange({ rules })}
            optionFilterProp="label"
            options={meta.rules.map((rule) => ({ value: rule.code, label: rule.title }))}
          />
        </FilterField>
        <FilterField label="Важность" id="filter-severity">
          <Select
            id="filter-severity"
            mode="multiple"
            allowClear
            maxTagCount="responsive"
            placeholder="Любая"
            style={{ width: 200 }}
            value={state.severities}
            onChange={(severities: Severity[]) => onChange({ severities })}
            options={meta.severities.map((s) => ({ value: s.code, label: SEVERITY_LABEL[s.code] ?? s.title }))}
          />
        </FilterField>
        <FilterField label="Статус дельты" id="filter-status">
          <Select
            id="filter-status"
            mode="multiple"
            allowClear
            maxTagCount="responsive"
            placeholder="Текущие проблемы"
            style={{ width: 220 }}
            value={state.statuses}
            onChange={(statuses: DeltaStatus[]) => onChange({ statuses })}
            options={meta.delta_statuses.map((s) => ({ value: s.code, label: DELTA_STATUS_LABEL[s.code] ?? s.title }))}
          />
        </FilterField>
        <FilterField label="Сортировка" id="filter-sort">
          <Select
            id="filter-sort"
            style={{ width: 190 }}
            value={state.sort}
            onChange={(sort: IssueSort) => onChange({ sort })}
            options={SORT_OPTIONS}
          />
        </FilterField>
        <Button
          icon={<ClearOutlined aria-hidden />}
          disabled={!filtered}
          onClick={() => onChange({ rules: [], severities: [], statuses: [] })}
        >
          Сбросить фильтры
        </Button>
      </div>

      {(isFirstRun || state.statuses.length === 0) && (
        <p style={{ margin: '0 0 12px', fontSize: token.fontSizeSM, color: token.colorTextSecondary }}>
          {isFirstRun
            ? 'Первый прогон: сравнивать не с чем, поэтому все проблемы отмечены как новые.'
            : 'Показаны проблемы этого прогона. Исправленные с прошлого прогона — в фильтре «Статус дельты: Исправлена».'}
        </p>
      )}

      {query.error ? (
        <ErrorResult
          compact
          error={query.error}
          onRetry={query.refetch}
          actions={
            filtered ? (
              <Button onClick={() => onChange({ rules: [], severities: [], statuses: [] })}>Сбросить фильтры</Button>
            ) : undefined
          }
        />
      ) : !data ? (
        <Skeleton active paragraph={{ rows: 8 }} title={false} />
      ) : (
        <Table<Issue>
          rowKey="id"
          size="middle"
          columns={columns}
          dataSource={data.items}
          loading={query.isFetching}
          locale={{ emptyText }}
          rowClassName={() => 'kkd-table-row'}
          onRow={(issue) => ({ onClick: () => onOpenIssue(issue.id) })}
          pagination={{
            current: state.page,
            pageSize: state.pageSize,
            total: data.total,
            showSizeChanger: true,
            pageSizeOptions: PAGE_SIZES.map(String),
            showTotal: (total, [from, to]) => `${from}–${to} из ${total}`,
            hideOnSinglePage: false,
            onChange: (page, pageSize) =>
              pageSize !== state.pageSize ? onChange({ pageSize }) : onChange({ page }),
          }}
        />
      )}
    </section>
  );
}

function FilterField({ label, id, children }: { label: string; id: string; children: ReactNode }) {
  return (
    <div className="kkd-field">
      <label className="kkd-field__label" htmlFor={id}>
        {label}
      </label>
      {children}
    </div>
  );
}
