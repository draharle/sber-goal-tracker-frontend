import {
  CheckCircleOutlined,
  ExclamationCircleOutlined,
  InfoCircleOutlined,
  PlusCircleOutlined,
  StopOutlined,
  SyncOutlined,
} from '@ant-design/icons';
import { Tag, theme } from 'antd';
import type { GlobalToken } from 'antd';
import type { ReactNode } from 'react';
import type { DeltaStatus, Severity } from '../api/types';

// Подписи совпадают со справочником /api/meta (severities, delta_statuses).
export const SEVERITY_LABEL: Record<Severity, string> = {
  critical: 'Критичная',
  major: 'Существенная',
  minor: 'Незначительная',
};

export const DELTA_STATUS_LABEL: Record<DeltaStatus, string> = {
  new: 'Новая',
  persisting: 'Сохраняется',
  resolved: 'Исправлена',
};

interface TagLook {
  icon: ReactNode;
  iconColor: string;
  textColor: string;
  background: string;
  border: string;
}

// Цвет не единственный носитель смысла: у каждого тега есть слово и своя иконка.
// Текст держим контрастным (≥ 4.5:1): у «существенной» и «незначительной» он основного цвета,
// а цвет уровня несут фон, рамка и иконка.
function severityLook(severity: Severity, token: GlobalToken): TagLook {
  switch (severity) {
    case 'critical':
      return {
        icon: <StopOutlined aria-hidden />,
        iconColor: token.colorError,
        textColor: token.colorErrorText,
        background: token.colorErrorBg,
        border: token.colorError,
      };
    case 'major':
      return {
        icon: <ExclamationCircleOutlined aria-hidden />,
        iconColor: token.colorWarningText,
        textColor: token.colorText,
        background: token.colorWarningBg,
        border: token.colorWarning,
      };
    default:
      return {
        icon: <InfoCircleOutlined aria-hidden />,
        iconColor: token.colorTextSecondary,
        textColor: token.colorText,
        background: token.colorFill,
        border: token.colorBorder,
      };
  }
}

function deltaStatusLook(status: DeltaStatus, token: GlobalToken): TagLook {
  switch (status) {
    case 'new':
      return {
        icon: <PlusCircleOutlined aria-hidden />,
        iconColor: token.colorErrorText,
        textColor: token.colorText,
        background: token.colorErrorBg,
        border: token.colorErrorBg,
      };
    case 'resolved':
      return {
        icon: <CheckCircleOutlined aria-hidden />,
        iconColor: token.colorSuccessText,
        textColor: token.colorText,
        background: token.colorSuccessBg,
        border: token.colorSuccessBg,
      };
    default:
      return {
        icon: <SyncOutlined aria-hidden />,
        iconColor: token.colorTextSecondary,
        textColor: token.colorText,
        background: token.colorFill,
        border: token.colorFill,
      };
  }
}

function LookTag({ look, children }: { look: TagLook; children: ReactNode }) {
  return (
    <Tag
      bordered
      style={{
        color: look.textColor,
        background: look.background,
        borderColor: look.border,
        marginInlineEnd: 0,
        whiteSpace: 'nowrap',
      }}
    >
      <span style={{ color: look.iconColor, marginInlineEnd: 4 }}>{look.icon}</span>
      {children}
    </Tag>
  );
}

export function SeverityTag({ severity, children }: { severity: Severity; children?: ReactNode }) {
  const { token } = theme.useToken();
  return <LookTag look={severityLook(severity, token)}>{children ?? SEVERITY_LABEL[severity]}</LookTag>;
}

export function DeltaStatusTag({ status }: { status: DeltaStatus }) {
  const { token } = theme.useToken();
  return <LookTag look={deltaStatusLook(status, token)}>{DELTA_STATUS_LABEL[status]}</LookTag>;
}

export { deltaStatusLook, severityLook };
