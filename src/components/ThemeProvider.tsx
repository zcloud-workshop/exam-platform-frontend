import type { ReactNode } from 'react';
import { ConfigProvider, theme } from 'antd';
import zhCN from 'antd/es/locale/zh_CN';
import enUS from 'antd/es/locale/en_US';
import { useLocaleStore } from '@/stores/localeStore';
import { useThemeStore } from '@/stores/themeStore';

export default function ThemeProvider({ children }: { children: ReactNode }) {
  const locale = useLocaleStore((s) => s.locale);
  const { mode, systemDark } = useThemeStore();
  const dark = mode === 'dark' || (mode === 'system' && systemDark);

  return (
    <ConfigProvider
      locale={locale === 'en' ? enUS : zhCN}
      theme={{
        algorithm: dark ? theme.darkAlgorithm : theme.defaultAlgorithm,
        token: {
          colorPrimary: dark ? '#49bca7' : '#157c6a',
          colorInfo: dark ? '#49bca7' : '#157c6a',
          colorBgBase: dark ? '#141d20' : '#ffffff',
          colorBgContainer: dark ? '#172224' : '#ffffff',
          colorBgElevated: dark ? '#1c2a2b' : '#ffffff',
          colorBgLayout: dark ? '#101719' : '#f5f7f6',
          colorTextBase: dark ? '#e7eeec' : '#203530',
          colorText: dark ? '#e7eeec' : '#203530',
          colorTextSecondary: dark ? '#9bada6' : '#657873',
          colorBorder: dark ? '#31423d' : '#dbe4df',
          borderRadius: 10,
          fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", "PingFang SC", "Microsoft YaHei", sans-serif',
          controlHeight: 36,
        },
        components: {
          Layout: { headerBg: dark ? '#141d20' : '#ffffff', siderBg: dark ? '#141d20' : '#ffffff' },
          Menu: { itemHeight: 44, itemBorderRadius: 8, itemMarginBlock: 6 },
          Card: { borderRadiusLG: 16 },
          Button: { primaryShadow: 'none', fontWeight: 500 },
          Table: { cellPaddingBlock: 16 },
        },
      }}
    >
      {children}
    </ConfigProvider>
  );
}
