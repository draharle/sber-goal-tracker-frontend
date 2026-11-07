import { theme } from 'antd';
import { useLayoutEffect } from 'react';

/**
 * Мостик «тема antd → CSS-переменные» для своих стилей (styles.css): фокус-рамки, hover,
 * сетки. Значения берутся из токенов темы, поэтому в CSS тоже нет ни одного hex.
 * Переменные вешаются на <html>, чтобы их видели и порталы (модальные окна, выпадающие списки).
 */
export function ThemeCssVars() {
  const { token } = theme.useToken();

  useLayoutEffect(() => {
    const vars: Record<string, string | number> = {
      '--kkd-color-primary': token.colorPrimary,
      '--kkd-color-primary-bg': token.colorPrimaryBg,
      '--kkd-color-text': token.colorText,
      '--kkd-color-text-secondary': token.colorTextSecondary,
      '--kkd-color-text-tertiary': token.colorTextTertiary,
      '--kkd-color-bg-container': token.colorBgContainer,
      '--kkd-color-bg-layout': token.colorBgLayout,
      '--kkd-color-fill': token.colorFill,
      '--kkd-color-border': token.colorBorder,
      '--kkd-color-border-secondary': token.colorBorderSecondary,
      '--kkd-radius': `${token.borderRadius}px`,
      '--kkd-radius-lg': `${token.borderRadiusLG}px`,
      '--kkd-font-family': token.fontFamily,
    };
    const root = document.documentElement.style;
    for (const [name, value] of Object.entries(vars)) root.setProperty(name, String(value));
  }, [token]);

  return null;
}
