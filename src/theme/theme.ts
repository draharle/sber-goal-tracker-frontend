// Тема Ant Design из справочника UI-KIT.md (репозиторий mock API).
// Это единственное место в проекте, где написаны hex-цвета. Компоненты берут цвета
// и размеры из темы через theme.useToken(), поэтому смена кита = правка одного файла.
import type { ThemeConfig } from 'antd';

export const appTheme: ThemeConfig = {
  token: {
    // акцент и семантика — раздел 1 UI-KIT
    colorPrimary: '#056cfd',
    colorInfo: '#056cfd',
    colorSuccess: '#039306',
    colorWarning: '#faad14',
    colorError: '#d43629',
    colorLink: '#1b4de3',
    // акцент: hover / active / фон — раздел 2 UI-KIT
    colorPrimaryHover: '#1b4de3',
    colorPrimaryActive: '#0f2cc4',
    colorPrimaryBg: '#ddeafd',
    // семантика: фон и текст — таблица «Семантика» раздела 2 UI-KIT
    colorSuccessBg: '#e3edd8',
    colorSuccessText: '#007802',
    colorWarningBg: '#fffbe6',
    colorWarningText: '#ca820e',
    colorErrorBg: '#fce3d9',
    colorErrorText: '#b81301',
    colorInfoBg: '#d5edfa',
    colorInfoText: '#036c8f',
    // текст
    colorText: '#312921',
    colorTextSecondary: '#76726C',
    colorTextTertiary: '#9d9b99',
    // фоны и границы (тёплая, а не серая основа)
    colorBgContainer: '#fefcfa',
    colorBgElevated: '#fefcfa',
    colorBgLayout: '#f7f3f0',
    colorFill: '#eae4de',
    colorBorder: '#EAE7E5',
    colorBorderSecondary: '#e8e5e2',
    // типографика; к Inter добавлены системные запасные шрифты
    fontFamily: '"Inter", -apple-system, "Segoe UI", Roboto, Arial, sans-serif',
    fontSize: 14,
    lineHeight: 1.5714,
    fontWeightStrong: 600,
    fontSizeHeading1: 38,
    fontSizeHeading2: 30,
    fontSizeHeading3: 24,
    fontSizeHeading4: 20,
    fontSizeHeading5: 16,
    // геометрия
    borderRadius: 6,
    borderRadiusSM: 4,
    borderRadiusLG: 8,
    controlHeight: 32,
    controlHeightSM: 24,
    controlHeightLG: 40,
  },
  components: {
    Button: {
      paddingInline: 12,
      defaultColor: '#322c26',
      defaultBorderColor: '#eae4de',
      defaultHoverColor: '#1b4de3',
      defaultHoverBorderColor: '#1b4de3',
    },
    Layout: { bodyBg: '#fefcfa', siderBg: '#f7f3f0', headerHeight: 72, headerPadding: 0 },
    Menu: {
      itemBg: '#f7f3f0',
      itemColor: '#322c26',
      itemHeight: 32,
      itemHoverBg: '#eae4de',
      itemSelectedBg: '#d9e3f8',
      itemSelectedColor: '#1b4de3',
    },
    Table: { headerBg: '#fefcfa' },
    Select: { optionSelectedBg: '#ddeafd', optionSelectedColor: '#1b4de3' },
    // модальные окна — радиус 28px (раздел 4 UI-KIT)
    Modal: { titleFontSize: 20, colorBgMask: 'rgba(50, 44, 38, 0.07)', borderRadiusLG: 28 },
    Tag: { defaultBg: '#f7f3f0' },
    Tooltip: { colorText: '#e4e6e2', colorBgBase: '#90928d' },
    Divider: { colorSplit: '#eae4de' },
  },
};
