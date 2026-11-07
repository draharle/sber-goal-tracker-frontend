import { InfoCircleOutlined, SwapOutlined, WarningOutlined } from '@ant-design/icons';
import { Breadcrumb, Skeleton, theme } from 'antd';
import type { Run, Unit } from '../api/types';
import { formatDate } from '../lib/format';
import { skippedRuns } from '../lib/runs';
import { ancestorIds } from '../lib/units';
import { Heading } from './Heading';

interface ContextStripProps {
  units: Unit[];
  unitId: string;
  run: Run | undefined;
  runs: Run[];
  /** compared_to из /api/kkd/summary; undefined — сводка ещё грузится или недоступна. */
  comparedTo: Run | null | undefined;
  onUnitChange: (unitId: string) => void;
}

/**
 * Где мы и с чем сравниваем: путь подразделения, прогон и прогон сравнения.
 * Сравнение пишем явно — «лучше / хуже» без него ничего не значит.
 */
export function ContextStrip({ units, unitId, run, runs, comparedTo, onUnitChange }: ContextStripProps) {
  const { token } = theme.useToken();
  const unitsById = new Map(units.map((u) => [u.id, u]));
  const path = ancestorIds(units, unitId);
  const unit = unitsById.get(unitId);
  const skipped = run && comparedTo ? skippedRuns(runs, run, comparedTo) : [];

  return (
    <section aria-label="Контекст отчёта" style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
      {path.length > 1 && (
        <Breadcrumb
          items={path.map((id, index) => {
            const name = unitsById.get(id)?.name ?? id;
            const last = index === path.length - 1;
            return last
              ? { title: name }
              : {
                  title: (
                    <a
                      href={`?unit=${encodeURIComponent(id)}`}
                      onClick={(event) => {
                        event.preventDefault();
                        onUnitChange(id);
                      }}
                    >
                      {name}
                    </a>
                  ),
                };
          })}
        />
      )}
      <Heading level={2}>{unit?.name ?? unitId}</Heading>

      <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: '4px 16px', color: token.colorTextSecondary }}>
        {run && (
          <span>
            Прогон <strong style={{ color: token.colorText }}>{run.id}</strong> от {formatDate(run.snapshot_date)}
            {run.trigger === 'manual' ? ' (внеплановый)' : ''}
          </span>
        )}
        {comparedTo === undefined ? (
          run?.status === 'completed' ? <Skeleton.Input active size="small" style={{ width: 240 }} /> : null
        ) : comparedTo === null ? (
          <span style={{ display: 'inline-flex', gap: 6, alignItems: 'center', color: token.colorText }}>
            <InfoCircleOutlined aria-hidden style={{ color: token.colorInfo }} />
            Первый прогон — сравнивать не с чем
          </span>
        ) : (
          <span style={{ display: 'inline-flex', gap: 6, alignItems: 'center', color: token.colorText }}>
            <SwapOutlined aria-hidden style={{ color: token.colorPrimary }} />
            Сравнение с <strong>{comparedTo.id}</strong> от {formatDate(comparedTo.snapshot_date)}
          </span>
        )}
        {skipped.length > 0 && (
          <span style={{ display: 'inline-flex', gap: 6, alignItems: 'center', color: token.colorText }}>
            <WarningOutlined aria-hidden style={{ color: token.colorWarning }} />
            {skipped
              .map((r) => `${r.id} пропущен: ${r.status === 'failed' ? 'завершился с ошибкой' : 'нет результатов'}`)
              .join('; ')}
          </span>
        )}
      </div>
    </section>
  );
}
