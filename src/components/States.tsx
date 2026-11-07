import { ReloadOutlined } from '@ant-design/icons';
import { Button, Empty, Result, Skeleton, Space, theme } from 'antd';
import { useEffect, useState } from 'react';
import type { Run, Unit } from '../api/types';
import { formatDate } from '../lib/format';
import { nearestCompletedRuns } from '../lib/runs';

interface RunUnavailableProps {
  run: Run;
  runs: Run[];
  /** Текст ошибки от API (409 RUN_FAILED / RUN_IN_PROGRESS), если запрос уже был. */
  apiMessage?: string;
  onSelectRun: (runId: string) => void;
  onRefresh: () => void;
}

/**
 * Прогон без результатов (RUN-006 упал, или прогон ещё идёт). Ни сводки, ни таблицы у него нет —
 * говорим почему и сразу предлагаем соседние успешные прогоны.
 */
export function RunUnavailable({ run, runs, apiMessage, onSelectRun, onRefresh }: RunUnavailableProps) {
  const { newer, older } = nearestCompletedRuns(runs, run.number);
  const running = run.status === 'running';
  const reason = running
    ? 'Прогон ещё выполняется — результаты появятся после завершения.'
    : run.error ?? apiMessage ?? 'Прогон завершился с ошибкой — результатов у него нет.';

  return (
    <div role="alert" className="kkd-panel">
      <Result
        status={running ? 'info' : 'warning'}
        title={running ? `Прогон ${run.id} ещё выполняется` : `Прогон ${run.id} от ${formatDate(run.snapshot_date)} завершился с ошибкой`}
        subTitle={`${reason} Выберите другой прогон.`}
        extra={
          <Space wrap style={{ justifyContent: 'center' }}>
            {newer && (
              <Button type="primary" onClick={() => onSelectRun(newer.id)}>
                Открыть {newer.id} от {formatDate(newer.snapshot_date)}
              </Button>
            )}
            {older && (
              <Button type={newer ? 'default' : 'primary'} onClick={() => onSelectRun(older.id)}>
                Открыть {older.id} от {formatDate(older.snapshot_date)}
              </Button>
            )}
            {running && (
              <Button icon={<ReloadOutlined aria-hidden />} onClick={onRefresh}>
                Обновить статус
              </Button>
            )}
          </Space>
        }
      />
    </div>
  );
}

interface EmptyUnitProps {
  unit: Unit | undefined;
  parent: Unit | undefined;
  onUnitChange: (unitId: string) => void;
}

/** Подразделение без активных целей (TX-NEW): метрики null — считать нечего, это не «0 проблем». */
export function EmptyUnit({ unit, parent, onUnitChange }: EmptyUnitProps) {
  const { token } = theme.useToken();
  return (
    <div className="kkd-panel" style={{ padding: '40px 24px' }}>
      <Empty
        description={
          <div style={{ maxWidth: 560, margin: '0 auto' }}>
            <div style={{ fontSize: token.fontSizeLG, fontWeight: token.fontWeightStrong, color: token.colorText }}>
              В подразделении «{unit?.name ?? 'выбранном'}» нет активных целей
            </div>
            <p style={{ margin: '8px 0 0', color: token.colorTextSecondary }}>
              Метрики качества не рассчитываются: проверять нечего. Это не «0 проблем», а отсутствие данных.
              Когда цели появятся, они попадут в следующий прогон.
            </p>
          </div>
        }
      >
        {parent && (
          <Button type="primary" onClick={() => onUnitChange(parent.id)}>
            Перейти к «{parent.name}»
          </Button>
        )}
      </Empty>
    </div>
  );
}

/** Через 3 секунды ожидания — подпись «дольше обычного», чтобы скелетон не выглядел зависанием. */
export function SlowHint() {
  const { token } = theme.useToken();
  const [slow, setSlow] = useState(false);
  useEffect(() => {
    const timer = setTimeout(() => setSlow(true), 3000);
    return () => clearTimeout(timer);
  }, []);
  if (!slow) return null;
  return (
    <p role="status" style={{ margin: 0, color: token.colorTextSecondary }}>
      Сервер отвечает дольше обычного, ждём…
    </p>
  );
}

export function SlowLoading({ rows = 4, label }: { rows?: number; label: string }) {
  return (
    <div className="kkd-panel" aria-busy="true" aria-label={label} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      <Skeleton active paragraph={{ rows }} />
      <SlowHint />
    </div>
  );
}
