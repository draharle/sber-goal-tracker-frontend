import { InfoCircleOutlined } from '@ant-design/icons';
import { Skeleton, Tooltip, theme } from 'antd';
import type { Metric, Run } from '../api/types';
import { assessmentOf, comparisonKind, formatSigned, formatValue } from '../lib/format';
import { splitMetrics } from '../lib/summary';
import { AssessmentBadge, DeltaValue } from './Delta';
import { Heading } from './Heading';

interface MetricCardProps {
  metric: Metric;
  comparedTo: Run | null;
  compact?: boolean;
}

/**
 * Карточка метрики. Три разных случая (см. comparisonKind):
 * - есть значение и прошлое → значение, дельта со знаком и отдельно оценка «лучше / хуже»;
 * - значение есть, прошлого нет → «нет данных для сравнения», а не 0;
 * - значения нет (null) → «нет данных», а не 0.
 */
export function MetricCard({ metric, comparedTo, compact = false }: MetricCardProps) {
  const { token } = theme.useToken();
  const kind = comparisonKind(metric);
  const assessment = assessmentOf(metric);
  const titleId = `metric-${metric.key}`;
  const valueSize = compact ? token.fontSizeHeading4 : token.fontSizeHeading2;

  const showPct = metric.unit !== '%' && metric.delta_pct !== null && metric.delta !== 0;

  return (
    <section
      aria-labelledby={titleId}
      className="kkd-panel"
      style={{ padding: compact ? '12px 16px' : '20px 24px', display: 'flex', flexDirection: 'column', gap: compact ? 4 : 8 }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8 }}>
        <Heading level={3} size="card" id={titleId} style={{ color: token.colorTextSecondary, fontWeight: 500 }}>
          {metric.title}
        </Heading>
        <Tooltip title={`Как считается: ${metric.formula}`}>
          <button
            type="button"
            className="kkd-clickable"
            aria-label={`Как считается «${metric.title}»: ${metric.formula}`}
            style={{ width: 'auto', padding: 2, color: token.colorTextTertiary }}
          >
            <InfoCircleOutlined aria-hidden />
          </button>
        </Tooltip>
      </div>

      {kind === 'no-value' ? (
        <div style={{ fontSize: compact ? token.fontSize : token.fontSizeHeading4, lineHeight: compact ? '28px' : '38px', color: token.colorTextTertiary }}>
          Нет данных
        </div>
      ) : (
        <div className="kkd-num" style={{ fontSize: valueSize, lineHeight: compact ? '28px' : '38px', fontWeight: token.fontWeightStrong }}>
          {formatValue(metric.value!, metric.unit)}
        </div>
      )}

      {kind === 'compared' && (
        <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 8 }}>
          <DeltaValue
            delta={metric.delta!}
            unit={metric.unit}
            assessment={assessment}
            size={compact ? 'small' : 'default'}
            suffix={showPct ? ` (${formatSigned(metric.delta_pct!)} %)` : undefined}
          />
          <AssessmentBadge assessment={assessment} />
        </div>
      )}

      <div style={{ fontSize: token.fontSizeSM, lineHeight: '20px', color: kind === 'compared' ? token.colorTextSecondary : token.colorTextTertiary }}>
        {kind === 'compared' && comparedTo && (
          <>
            Было {formatValue(metric.previous!, metric.unit)} в {comparedTo.id}
          </>
        )}
        {kind === 'no-previous' && 'Нет данных для сравнения'}
        {kind === 'no-value' &&
          (metric.previous !== null
            ? `Не рассчитано: нет данных для расчёта. Было ${formatValue(metric.previous, metric.unit)}`
            : 'Не рассчитано: нет данных для расчёта')}
      </div>
    </section>
  );
}

export function MetricCards({ metrics, comparedTo }: { metrics: Metric[]; comparedTo: Run | null }) {
  const { primary, secondary } = splitMetrics(metrics);
  return (
    <section aria-labelledby="metrics-heading" style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <Heading level={2} id="metrics-heading">
        Метрики качества
      </Heading>
      <div className="kkd-grid kkd-grid--primary">
        {primary.map((m) => (
          <MetricCard key={m.key} metric={m} comparedTo={comparedTo} />
        ))}
      </div>
      {secondary.length > 0 && (
        <div className="kkd-grid kkd-grid--secondary" aria-label="Дополнительные метрики" role="group">
          {secondary.map((m) => (
            <MetricCard key={m.key} metric={m} comparedTo={comparedTo} compact />
          ))}
        </div>
      )}
    </section>
  );
}

export function MetricCardsSkeleton() {
  return (
    <div aria-busy="true" aria-label="Загрузка метрик" style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <Skeleton.Input active size="small" style={{ width: 200 }} />
      <div className="kkd-grid kkd-grid--primary">
        {[0, 1, 2, 3].map((i) => (
          <div key={i} className="kkd-panel">
            <Skeleton active title={{ width: '60%' }} paragraph={{ rows: 2, width: ['40%', '80%'] }} />
          </div>
        ))}
      </div>
    </div>
  );
}

