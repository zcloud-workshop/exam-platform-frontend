import { Button, Dropdown, Space } from 'antd';
import { DesktopOutlined, GlobalOutlined, MoonOutlined, SunOutlined } from '@ant-design/icons';
import { useTranslation } from 'react-i18next';
import { useLocaleStore } from '@/stores/localeStore';
import { useThemeStore } from '@/stores/themeStore';

export default function Preferences() {
  const { t } = useTranslation();
  const { locale, setLocale } = useLocaleStore();
  const { mode, setMode } = useThemeStore();
  const modes = [
    { key: 'light', label: t('preferences.light'), icon: <SunOutlined />, onClick: () => setMode('light') },
    { key: 'dark', label: t('preferences.dark'), icon: <MoonOutlined />, onClick: () => setMode('dark') },
    { key: 'system', label: t('preferences.system'), icon: <DesktopOutlined />, onClick: () => setMode('system') },
  ];

  return (
    <Space size={2}>
      <Dropdown trigger={['click']} placement="bottomRight" menu={{ items: modes, selectedKeys: [mode] }}>
        <Button type="text" aria-label={t('preferences.theme')} title={t('preferences.theme')}
          icon={mode === 'system' ? <DesktopOutlined /> : mode === 'dark' ? <MoonOutlined /> : <SunOutlined />} />
      </Dropdown>
      <Dropdown trigger={['click']} placement="bottomRight" menu={{
        selectedKeys: [locale],
        items: [
          { key: 'zh', label: '简体中文', onClick: () => setLocale('zh') },
          { key: 'en', label: 'English', onClick: () => setLocale('en') },
        ],
      }}>
        <Button type="text" icon={<GlobalOutlined />} aria-label={t('preferences.language')} title={t('preferences.language')} />
      </Dropdown>
    </Space>
  );
}
