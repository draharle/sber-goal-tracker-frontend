import { CloseCircleOutlined, LoadingOutlined } from '@ant-design/icons';
import { Layout, Select, Skeleton, Tag, TreeSelect, theme } from 'antd';
import { useMemo } from 'react';
import type { Meta, Run } from '../api/types';
import { formatDate } from '../lib/format';
import { ancestorIds, buildUnitTree } from '../lib/units';
import { Heading } from './Heading';

interface PageHeaderProps {
  meta: Meta | undefined;
  runs: Run[] | undefined;
  unitId: string;
  runId: string | null;
  latestRunId: string | undefined;
  onUnitChange: (unitId: string) => void;
  onRunChange: (runId: string) => void;
}

function RunLabel({ run, isLatest }: { run: Run; isLatest: boolean }) {
  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}>
      <span>
        {run.id} · {formatDate(run.snapshot_date)}
      </span>
      {run.status === 'failed' && (
        <Tag color="error" icon={<CloseCircleOutlined aria-hidden />} style={{ marginInlineEnd: 0 }}>
          ошибка
        </Tag>
      )}
      {run.status === 'running' && (
        <Tag icon={<LoadingOutlined aria-hidden />} style={{ marginInlineEnd: 0 }}>
          выполняется
        </Tag>
      )}
      {run.status === 'completed' && run.compared_to_run_id === null && <Tag style={{ marginInlineEnd: 0 }}>первый</Tag>}
      {isLatest && (
        <Tag color="processing" style={{ marginInlineEnd: 0 }}>
          последний
        </Tag>
      )}
    </span>
  );
}

/** Шапка: название модуля и выбор контекста — подразделение и прогон. Влияют на всю страницу. */
export function PageHeader({ meta, runs, unitId, runId, latestRunId, onUnitChange, onRunChange }: PageHeaderProps) {
  const { token } = theme.useToken();
  const treeData = useMemo(() => (meta ? buildUnitTree(meta.units) : []), [meta]);
  const expanded = useMemo(() => (meta ? ancestorIds(meta.units, unitId) : []), [meta, unitId]);

  return (
    <Layout.Header
      className="kkd-header"
      style={{ background: token.colorBgContainer, height: 'auto', minHeight: 72, lineHeight: 'normal', padding: 0 }}
    >
      <div className="kkd-header__inner" style={{ minHeight: 72, paddingTop: 8, paddingBottom: 8 }}>
        <div>
          <div style={{ fontSize: token.fontSizeSM, color: token.colorTextSecondary }}>Управление целями</div>
          <Heading level={1} size="page">
            Контроль качества данных
          </Heading>
        </div>

        <div className="kkd-header__controls">
          <div className="kkd-field">
            <label className="kkd-field__label" htmlFor="unit-select">
              Подразделение
            </label>
            {meta ? (
              <TreeSelect
                id="unit-select"
                style={{ width: 380 }}
                value={unitId}
                treeData={treeData}
                treeDefaultExpandedKeys={expanded}
                fieldNames={{ label: 'title', value: 'value', children: 'children' }}
                showSearch
                filterTreeNode={(input, node) =>
                  String((node as unknown as { searchText?: string }).searchText ?? '').includes(input.toLowerCase())
                }
                treeLine
                popupMatchSelectWidth={false}
                onChange={(value: string) => onUnitChange(value)}
              />
            ) : (
              <Skeleton.Input active style={{ width: 380 }} />
            )}
          </div>

          <div className="kkd-field">
            <label className="kkd-field__label" htmlFor="run-select">
              Прогон
            </label>
            {runs ? (
              <Select
                id="run-select"
                style={{ width: 300 }}
                value={runId ?? undefined}
                placeholder="Выберите прогон"
                onChange={(value: string) => onRunChange(value)}
                optionLabelProp="label"
                options={runs.map((run) => ({
                  value: run.id,
                  label: <RunLabel run={run} isLatest={run.id === latestRunId} />,
                }))}
              />
            ) : (
              <Skeleton.Input active style={{ width: 300 }} />
            )}
          </div>
        </div>
      </div>
    </Layout.Header>
  );
}
