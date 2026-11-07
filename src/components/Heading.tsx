import { theme } from 'antd';
import type { CSSProperties, ReactNode } from 'react';

interface HeadingProps {
  /** Уровень в разметке (h1–h4) — для структуры и скринридеров. */
  level: 1 | 2 | 3 | 4;
  /** Визуальный размер по UI-KIT: page и section — 20/600/28, card — 14/600/22. */
  size?: 'page' | 'section' | 'card';
  id?: string;
  tabIndex?: number;
  style?: CSSProperties;
  children: ReactNode;
}

/**
 * Заголовок: семантика (h1/h2/h3) отдельно от визуального размера.
 * У Typography.Title размер привязан к уровню (h1 = 38px), а по киту заголовок страницы — 20px.
 */
export function Heading({ level, size = 'section', id, tabIndex, style, children }: HeadingProps) {
  const { token } = theme.useToken();
  const Tag = `h${level}` as const;
  const isCard = size === 'card';
  return (
    <Tag
      id={id}
      tabIndex={tabIndex}
      style={{
        margin: 0,
        color: token.colorText,
        fontWeight: token.fontWeightStrong,
        fontSize: isCard ? token.fontSize : token.fontSizeHeading4,
        lineHeight: isCard ? `${Math.round(token.fontSize * token.lineHeight)}px` : '28px',
        outline: 'none',
        ...style,
      }}
    >
      {children}
    </Tag>
  );
}
