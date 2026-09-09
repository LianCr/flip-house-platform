import { applyTheme } from '@cloudscape-design/components/theming';

// 只覆盖少数令牌：AWS 经典橙色主按钮 + 暖白页面底色。其余全部沿用 Cloudscape 亮色体系。
applyTheme({
  theme: {
    tokens: {
      colorBackgroundButtonPrimaryDefault: '#EC7211',
      colorBackgroundButtonPrimaryHover: '#D45B07',
      colorBackgroundButtonPrimaryActive: '#C24F04',
      colorTextButtonPrimaryDefault: '#FFFFFF',
      colorTextButtonPrimaryHover: '#FFFFFF',
      colorTextButtonPrimaryActive: '#FFFFFF',
      colorBackgroundLayoutMain: { light: '#F7F5F1', dark: '#0F1B2A' },
    },
  },
});
