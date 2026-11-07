import {
  ArrowDownOutlined,
  ArrowUpOutlined,
  CheckCircleFilled,
  ExclamationCircleFilled,
  MinusCircleOutlined,
  QuestionCircleOutlined,
} from '@ant-design/icons';
import { Tooltip, theme } from 'antd';
import type { GlobalToken } from 'antd';
import type { ReactNode } from 'react';
import {
  ASSESSMENT_LABEL,
  deltaDirection,
  formatDelta,
  formatSigned,
  type Assessment,
} from '../lib/format';

function assessmentColors(assessment: Assessment, token: GlobalToken) {
  switch (assessment) {
    case 'better':
      return { text: token.colorSuccessText, icon: token.colorSuccess, bg: token.colorSuccessBg };
    case 'worse':
      return { text: token.colorErrorText, icon: token.colorError, bg: token.colorErrorBg };
    default:
      return { text: token.colorTextSecondary, icon: token.colorTextSecondary, bg: token.colorFill };
  }
}

const DIRECTION_ICON = {
  up: <ArrowUpOutlined aria-hidden />,
  down: <ArrowDownOutlined aria-hidden />,
  flat: null,
};

const DIRECTION_WORD = { up: 'рост', down: 'снижение', flat: 'без изменений' };

/**
 * Дельта числом: стрелка показывает знак (рост / снижение), цвет — оценку из trend.
 * Поэтому «Найдено проблем ↑ +9» красная, а «Доля корректных целей ↑ +3» зелёная.
 */
export function DeltaValue({
  delta,
  unit,
  assessment,
  suffix,
  size = 'default',
}: {
  delta: number;
  unit: string;
  assessment: Assessment;
  suffix?: ReactNode;
  size?: 'default' | 'small';
}) {
  const { token } = theme.useToken();
  const direction = deltaDirection(delta);
  const colors = assessmentColors(assessment, token);
  return (
    <span
      className="kkd-num"
      style={{
        color: colors.text,
        fontWeight: token.fontWeightStrong,
        fontSize: size === 'small' ? token.fontSizeSM : token.fontSize,
        whiteSpace: 'nowrap',
      }}
    >
      <span className="kkd-visually-hidden">{DIRECTION_WORD[direction]}: </span>
      {DIRECTION_ICON[direction]} {formatDelta(delta, unit)}
      {suffix}
    </span>
  );
}

const ASSESSMENT_ICON: Record<Assessment, ReactNode> = {
  better: <CheckCircleFilled aria-hidden />,
  worse: <ExclamationCircleFilled aria-hidden />,
  same: <MinusCircleOutlined aria-hidden />,
  neutral: <QuestionCircleOutlined aria-hidden />,
};

/** Оценка словом и иконкой: «Лучше», «Хуже», «Без изменений», «Без оценки». */
export function AssessmentBadge({ assessment }: { assessment: Assessment }) {
  const { token } = theme.useToken();
  const colors = assessmentColors(assessment, token);
  const badge = (
    <span
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 4,
        padding: '0 8px',
        borderRadius: 20,
        background: colors.bg,
        color: colors.text,
        fontSize: token.fontSizeSM,
        lineHeight: '20px',
        fontWeight: 500,
        whiteSpace: 'nowrap',
      }}
    >
      <span style={{ color: colors.icon }}>{ASSESSMENT_ICON[assessment]}</span>
      <span>
        <span className="kkd-visually-hidden">Оценка: </span>
        {ASSESSMENT_LABEL[assessment]}
      </span>
    </span>
  );
  if (assessment !== 'neutral') return badge;
  return (
    <Tooltip title="Для этой метрики рост не означает ни «лучше», ни «хуже» — API не даёт оценку">
      <span tabIndex={0}>{badge}</span>
    </Tooltip>
  );
}

/** Изменение счётчика без оценки (у строк «по важности» и «по правилам» API не отдаёт trend). */
export function NeutralChange({ delta, comparedTo }: { delta: number | null; comparedTo?: string }) {
  const { token } = theme.useToken();
  if (delta === null) {
    return <span style={{ color: token.colorTextTertiary, fontSize: token.fontSizeSM }}>нет сравнения</span>;
  }
  if (delta === 0) {
    return <span style={{ color: token.colorTextSecondary, fontSize: token.fontSizeSM }}>без изменений</span>;
  }
  const direction = deltaDirection(delta);
  return (
    <span className="kkd-num" style={{ color: token.colorTextSecondary, fontSize: token.fontSizeSM, whiteSpace: 'nowrap' }}>
      <span className="kkd-visually-hidden">{DIRECTION_WORD[direction]}: </span>
      {DIRECTION_ICON[direction]} {formatSigned(delta)}
      {comparedTo ? ` к ${comparedTo}` : ''}
    </span>
  );
}
