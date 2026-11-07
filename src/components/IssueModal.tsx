import { BulbOutlined, CheckOutlined, CloseOutlined, ExclamationOutlined } from '@ant-design/icons';
import { Alert, Button, Descriptions, Modal, Skeleton, theme } from 'antd';
import type { GlobalToken } from 'antd';
import type { IssueDetail, IssueHistoryPoint, Meta } from '../api/types';
import type { ApiQueryResult } from '../hooks/useApiQuery';
import { formatDate, pluralRu } from '../lib/format';
import { ErrorResult } from './ErrorResult';
import { Heading } from './Heading';
import { DeltaStatusTag, SeverityTag } from './StatusTags';

interface IssueModalProps {
  open: boolean;
  runId: string | null;
  meta: Meta;
  query: ApiQueryResult<IssueDetail>;
  onClose: () => void;
}

/** Значение «факт / ожидание» как есть. null — поле пустое, это не ноль. */
function showValue(value: string | number | null, token: GlobalToken) {
  if (value === null || value === '') return <span style={{ color: token.colorTextTertiary }}>пусто (не заполнено)</span>;
  return String(value);
}

function historyLook(point: IssueHistoryPoint, token: GlobalToken) {
  if (point.present === null) {
    return {
      icon: <CloseOutlined aria-hidden />,
      label: point.run_status === 'failed' ? 'прогон с ошибкой' : 'нет данных',
      background: token.colorFill,
      color: token.colorTextSecondary,
    };
  }
  if (point.present) {
    return { icon: <ExclamationOutlined aria-hidden />, label: 'была', background: token.colorErrorBg, color: token.colorErrorText };
  }
  return { icon: <CheckOutlined aria-hidden />, label: 'не было', background: token.colorSuccessBg, color: token.colorSuccessText };
}

/** Карточка проблемы: что не так, факт и ожидание, что делать, история по прогонам. */
export function IssueModal({ open, runId, meta, query, onClose }: IssueModalProps) {
  const { token } = theme.useToken();
  const issue = query.data;
  const rule = issue ? meta.rules.find((r) => r.code === issue.rule_code) : undefined;
  const goalLevel = issue ? meta.goal_levels.find((l) => l.code === issue.goal_level)?.title ?? issue.goal_level : '';

  return (
    <Modal
      open={open}
      onCancel={onClose}
      width={840}
      title={issue ? issue.rule_title : 'Карточка проблемы'}
      footer={<Button onClick={onClose}>Закрыть</Button>}
      destroyOnHidden
    >
      {query.error ? (
        <ErrorResult compact error={query.error} onRetry={query.refetch} />
      ) : !issue ? (
        <div aria-busy="true" aria-label="Загрузка карточки проблемы">
          <Skeleton active paragraph={{ rows: 8 }} />
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, alignItems: 'center' }}>
            <SeverityTag severity={issue.severity} />
            <DeltaStatusTag status={issue.delta_status} />
            <span style={{ color: token.colorTextTertiary, fontSize: token.fontSizeSM }}>
              {issue.rule_code} · {issue.id}
            </span>
          </div>

          <section aria-labelledby="issue-what">
            <Heading level={3} size="card" id="issue-what">
              Что не так
            </Heading>
            <p style={{ margin: '4px 0 0' }}>{issue.details}</p>
            {rule && (
              <p style={{ margin: '4px 0 0', color: token.colorTextSecondary }}>Правило: {rule.description}</p>
            )}
          </section>

          <Descriptions
            bordered
            size="small"
            column={2}
            items={[
              { key: 'actual', label: 'Факт', children: showValue(issue.actual, token) },
              { key: 'expected', label: 'Ожидается', children: showValue(issue.expected, token) },
              {
                key: 'goal',
                label: 'Цель',
                span: 2,
                children: (
                  <>
                    {issue.goal_title}{' '}
                    <span style={{ color: token.colorTextSecondary }}>
                      · {issue.goal_id} · {goalLevel}
                    </span>
                  </>
                ),
              },
              ...(issue.kr_id
                ? [
                    {
                      key: 'kr',
                      label: 'Ключевой результат',
                      span: 2,
                      children: (
                        <>
                          {issue.kr_title} <span style={{ color: token.colorTextSecondary }}>· {issue.kr_id}</span>
                        </>
                      ),
                    },
                  ]
                : []),
              { key: 'unit', label: 'Подразделение', children: issue.unit_name },
              {
                key: 'owner',
                label: 'Ответственный',
                children: issue.owner ? (
                  <>
                    {issue.owner.full_name}
                    <div style={{ color: token.colorTextSecondary, fontSize: token.fontSizeSM }}>{issue.owner.position}</div>
                  </>
                ) : (
                  <span style={{ color: token.colorTextTertiary }}>не назначен</span>
                ),
              },
              {
                key: 'first',
                label: 'Впервые найдена',
                children: issue.first_detected_run_id
                  ? `${issue.first_detected_run_id} от ${formatDate(issue.first_detected_at)}`
                  : '—',
              },
              {
                key: 'streak',
                label: 'Подряд',
                children:
                  issue.runs_in_row === null
                    ? '—'
                    : `${issue.runs_in_row} ${pluralRu(issue.runs_in_row, 'успешный прогон', 'успешных прогона', 'успешных прогонов')}`,
              },
            ]}
          />

          <Alert
            type="info"
            showIcon
            icon={<BulbOutlined aria-hidden />}
            message="Как исправить"
            description={issue.recommendation}
          />

          <section aria-labelledby="issue-history">
            <Heading level={3} size="card" id="issue-history" style={{ marginBottom: 8 }}>
              История по прогонам
            </Heading>
            <ol className="kkd-history">
              {issue.history.map((point) => {
                const look = historyLook(point, token);
                const current = point.run_id === runId;
                return (
                  <li
                    key={point.run_id}
                    className="kkd-history-cell"
                    style={{
                      background: look.background,
                      borderColor: current ? token.colorPrimary : 'transparent',
                    }}
                  >
                    <span style={{ fontWeight: token.fontWeightStrong }}>
                      {point.run_id}
                      {current && <span className="kkd-visually-hidden"> (выбранный прогон)</span>}
                    </span>
                    <span style={{ color: token.colorTextSecondary }}>{formatDate(point.snapshot_date)}</span>
                    <span style={{ color: look.color }}>
                      {look.icon} {look.label}
                    </span>
                  </li>
                );
              })}
            </ol>
            <p style={{ margin: '8px 0 0', fontSize: token.fontSizeSM, color: token.colorTextSecondary }}>
              «была» — проблема найдена в прогоне, «не было» — не найдена, «прогон с ошибкой» — результатов нет.
              Рамкой выделен выбранный прогон.
            </p>
          </section>
        </div>
      )}
    </Modal>
  );
}
