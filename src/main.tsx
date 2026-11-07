import '@fontsource/inter/400.css';
import '@fontsource/inter/500.css';
import '@fontsource/inter/600.css';
import './styles.css';

import { App as AntApp, ConfigProvider } from 'antd';
import ruRU from 'antd/locale/ru_RU';
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { KkdPage } from './pages/KkdPage';
import { ThemeCssVars } from './theme/ThemeCssVars';
import { appTheme } from './theme/theme';

// Один ConfigProvider с темой из UI-KIT на всё приложение — поверх него свои не создаём.
createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ConfigProvider theme={appTheme} locale={ruRU}>
      <AntApp>
        <ThemeCssVars />
        <KkdPage />
      </AntApp>
    </ConfigProvider>
  </StrictMode>,
);
