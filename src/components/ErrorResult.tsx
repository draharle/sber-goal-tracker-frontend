import { ReloadOutlined } from '@ant-design/icons';
import { Button, Result, Space } from 'antd';
import type { ReactNode } from 'react';
import type { ApiError } from '../api/http';
import { describeError } from '../lib/errors';

interface ErrorResultProps {
  error: ApiError;
  /** «Повторить» — для ошибок связи. */
  onRetry?: () => void;
  /** Свои действия (выбрать другой прогон, сбросить фильтры). */
  actions?: ReactNode;
  compact?: boolean;
}

/** Ошибка вместо блока с данными: понятный заголовок, текст от API и что можно сделать. */
export function ErrorResult({ error, onRetry, actions, compact }: ErrorResultProps) {
  const view = describeError(error);
  const status = view.kind === 'connection' ? 'error' : 'warning';
  const retry =
    view.kind === 'connection' && onRetry ? (
      <Button type="primary" icon={<ReloadOutlined aria-hidden />} onClick={onRetry}>
        Повторить
      </Button>
    ) : null;

  return (
    <div role="alert" className={compact ? undefined : 'kkd-panel'}>
      <Result
        status={status}
        title={view.title}
        subTitle={view.description}
        extra={
          actions || retry ? (
            <Space wrap style={{ justifyContent: 'center' }}>
              {actions}
              {retry}
            </Space>
          ) : undefined
        }
        style={compact ? { padding: '16px 0' } : undefined}
      />
    </div>
  );
}
