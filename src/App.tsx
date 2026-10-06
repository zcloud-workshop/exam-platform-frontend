import { useEffect, useLayoutEffect } from 'react';
import { App as AntApp, ConfigProvider } from 'antd';
import AppRouter from '@/router';
import { useThemeStore } from '@/stores/themeStore';
import ThemeProvider from '@/components/ThemeProvider';
import { useAuthStore } from '@/stores/authStore';
import { getMe } from '@/api/auth';
import '@/locales';

ConfigProvider.config({ holderRender: (children) => <ThemeProvider>{children}</ThemeProvider> });

export default function App() {
  const { mode, systemDark, setSystemDark } = useThemeStore();
  const setUser = useAuthStore((s) => s.setUser);
  const clearAuth = useAuthStore((s) => s.clearAuth);

  useLayoutEffect(() => {
    document.documentElement.dataset.theme = mode === 'system' ? (systemDark ? 'dark' : 'light') : mode;
  }, [mode, systemDark]);

  useEffect(() => {
    const query = window.matchMedia('(prefers-color-scheme: dark)');
    const sync = () => setSystemDark(query.matches);
    sync();
    query.addEventListener('change', sync);
    return () => query.removeEventListener('change', sync);
  }, [setSystemDark]);

  useEffect(() => {
    getMe()
      .then((res) => setUser(res.data))
      .catch(() => clearAuth());
  }, [clearAuth, setUser]);

  return (
    <ThemeProvider>
      <AntApp><AppRouter /></AntApp>
    </ThemeProvider>
  );
}
