import { CheckCircleOutlined, RightOutlined } from '@ant-design/icons';
import { theme } from 'antd';
import type { DeltaStatus, Severity, Summary } from '../api/types';
import { formatNumber, pluralRu } from '../lib/format';
import { rulesToFix } from '../lib/summary';
import { NeutralChange } from './Delta';
import { Heading } from './Heading';
import { DELTA_STATUS_LABEL, SEVERITY_LABEL, SeverityTag, deltaStatusLook } from './StatusTags';

const COUNTER_ORDER: DeltaStatus[] = ['new', 'persisting', 'resolved'];

const COUNTER_HINT: Record<DeltaStatus, string> = {
  new: 'появились в этом прогоне',
  persisting: 'были и в прошлом прогоне',
  resolved: 'были в прошлом, сейчас исправлены',
};

interface DeltaCountersProps {
  delta: Summary['delta'];
  comparedToId: string | null;
  activeStatuses: DeltaStatus[];
  onSelect: (status: DeltaStatus) => void;
}

/** Счётчики new / persisting / resolved. Клик открывает таблицу с этим фильтром. */
function DeltaCounters({ delta, comparedToId, activeStatuses, onSelect }: DeltaCountersProps) {
  const { token } = theme.useToken();
  const noComparison = comparedToId === null || COUNTER_ORDER.every((s) => delta[s] === null);

  return (
    <section aria-labelledby="delta-heading" className="kkd-panel">
      <Heading level={3} id="delta-heading" size="card">
        {noComparison ? 'Изменения с прошлого прогона' : `Изменения с ${comparedToId}`}
      </Heading>
      {noComparison ? (
        <p style={{ margin: '12px 0 0', color: token.colorTextTertiary }}>
          Нет данных для сравнения: это первый прогон, сравнивать не с чем. Новые, сохранившиеся и
          исправленные проблемы появятся со следующего прогона.
        </p>
      ) : (
        <ul className="kkd-list" style={{ marginTop: 12 }}>
          {COUNTER_ORDER.map((status) => {
            const count = delta[status] ?? 0;
            const look = deltaStatusLook(status, token);
            const pressed = activeStatuses.length === 1 && activeStatuses[0] === status;
            return (
              <li key={status}>
                <button
                  type="button"
                  className="kkd-clickable"
                  aria-pressed={pressed}
                  aria-label={`${DELTA_STATUS_LABEL[status]}: ${count} — показать в таблице`}
                  onClick={() => onSelect(status)}
                  style={{ background: look.background, padding: '10px 12px' }}
                >
                  <span style={{ color: look.iconColor, fontSize: 18 }}>{look.icon}</span>
                  <span style={{ flex: 1 }}>
                    <span style={{ display: 'block', fontWeight: 500 }}>{DELTA_STATUS_LABEL[status]}</span>
                    <span style={{ display: 'block', fontSize: token.fontSizeSM, color: token.colorTextSecondary }}>
                      {COUNTER_HINT[status]}
                    </span>
                  </span>
                  <span className="kkd-num" style={{ fontSize: token.fontSizeHeading4, fontWeight: token.fontWeightStrong }}>
                    {formatNumber(count)}
                  </span>
                  <RightOutlined aria-hidden style={{ color: token.colorTextTertiary }} />
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}

interface PrioritiesProps {
  summary: Summary;
  activeRules: string[];
  activeSeverities: Severity[];
  onSelectSeverity: (severity: Severity) => void;
  onSelectRule: (ruleCode: string) => void;
}

/** «Что исправлять первым»: проблемы по важности и по правилам, критичное сверху. */
function Priorities({ summary, activeRules, activeSeverities, onSelectSeverity, onSelectRule }: PrioritiesProps) {
  const { token } = theme.useToken();
  const comparedToId = summary.compared_to?.id;
  const rules = rulesToFix(summary.issues_by_rule);
  const noIssues = summary.issues_by_severity.every((row) => row.current === 0);

  return (
    <section aria-labelledby="priorities-heading" className="kkd-panel">
      <Heading level={3} id="priorities-heading" size="card">
        Что исправлять первым
      </Heading>

      <ul className="kkd-list" style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, margin: '12px 0 16px' }}>
        {summary.issues_by_severity.map((row) => {
          const pressed = activeSeverities.length === 1 && activeSeverities[0] === row.code;
          return (
            <li key={row.code}>
              <button
                type="button"
                className="kkd-clickable"
                aria-pressed={pressed}
                aria-label={`${SEVERITY_LABEL[row.code]}: ${row.current} — показать в таблице`}
                onClick={() => onSelectSeverity(row.code)}
                style={{ width: 'auto', border: `1px solid ${token.colorBorderSecondary}` }}
              >
                <SeverityTag severity={row.code}>{row.title}</SeverityTag>
                <span className="kkd-num" style={{ fontWeight: token.fontWeightStrong, fontSize: token.fontSizeLG }}>
                  {formatNumber(row.current)}
                </span>
                <NeutralChange delta={row.delta} />
              </button>
            </li>
          );
        })}
      </ul>

      {noIssues ? (
        <p style={{ margin: 0, color: token.colorSuccessText, display: 'flex', gap: 8, alignItems: 'center' }}>
          <CheckCircleOutlined aria-hidden />
          В этом прогоне проблем не найдено — исправлять нечего.
        </p>
      ) : (
        <>
          <p style={{ margin: '0 0 8px', color: token.colorTextSecondary, fontSize: token.fontSizeSM }}>
            Сначала критичные, внутри одной важности — где проблем больше.
            {comparedToId ? ` Рядом — изменение к ${comparedToId}.` : ''}
          </p>
          <ul className="kkd-list">
            {rules.map((rule) => {
              const pressed = activeRules.length === 1 && activeRules[0] === rule.code;
              return (
                <li key={rule.code}>
                  <button
                    type="button"
                    className="kkd-clickable kkd-rule-row"
                    aria-pressed={pressed}
                    aria-label={`${rule.title}: ${rule.current} ${pluralRu(rule.current, 'проблема', 'проблемы', 'проблем')} — показать в таблице`}
                    onClick={() => onSelectRule(rule.code)}
                    disabled={rule.current === 0}
                    title={rule.current === 0 ? 'Сейчас проблем по правилу нет' : undefined}
                    style={{ background: pressed ? token.colorPrimaryBg : undefined }}
                  >
                    <SeverityTag severity={rule.severity} />
                    <span style={{ minWidth: 0 }}>
                      <span style={{ display: 'block' }}>{rule.title}</span>
                      <span style={{ display: 'block', fontSize: token.fontSizeSM, color: token.colorTextTertiary }}>
                        {rule.code}
                      </span>
                    </span>
                    <span className="kkd-num" style={{ fontWeight: token.fontWeightStrong, textAlign: 'right' }}>
                      {formatNumber(rule.current)}
                    </span>
                    <span style={{ textAlign: 'right' }}>
                      <NeutralChange delta={rule.delta} />
                    </span>
                  </button>
                </li>
              );
            })}
          </ul>
        </>
      )}
    </section>
  );
}

interface FixFirstProps {
  summary: Summary;
  activeStatuses: DeltaStatus[];
  activeRules: string[];
  activeSeverities: Severity[];
  onSelectStatus: (status: DeltaStatus) => void;
  onSelectSeverity: (severity: Severity) => void;
  onSelectRule: (ruleCode: string) => void;
}

export function FixFirst(props: FixFirstProps) {
  const { summary } = props;
  return (
    <section aria-labelledby="fix-heading" style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <Heading level={2} id="fix-heading">
        Найденные проблемы и дельта
      </Heading>
      <div className="kkd-grid kkd-grid--fix">
        <DeltaCounters
          delta={summary.delta}
          comparedToId={summary.compared_to?.id ?? null}
          activeStatuses={props.activeStatuses}
          onSelect={props.onSelectStatus}
        />
        <Priorities
          summary={summary}
          activeRules={props.activeRules}
          activeSeverities={props.activeSeverities}
          onSelectSeverity={props.onSelectSeverity}
          onSelectRule={props.onSelectRule}
        />
      </div>
    </section>
  );
}
