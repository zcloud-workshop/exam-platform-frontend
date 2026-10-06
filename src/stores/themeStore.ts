import { create } from 'zustand';

export type ThemeMode = 'light' | 'dark' | 'system';

function readTheme(): ThemeMode {
  try {
    const saved = localStorage.getItem('theme');
    if (saved === 'light' || saved === 'dark') return saved;
  } catch { /* Use the system preference when storage is unavailable. */ }
  return 'system';
}

interface ThemeState {
  mode: ThemeMode;
  systemDark: boolean;
  setMode: (mode: ThemeMode) => void;
  setSystemDark: (dark: boolean) => void;
}

export const useThemeStore = create<ThemeState>((set) => ({
  mode: readTheme(),
  systemDark: window.matchMedia('(prefers-color-scheme: dark)').matches,
  setMode: (mode) => {
    try { localStorage.setItem('theme', mode); } catch { /* Keep the session preference. */ }
    set({ mode });
  },
  setSystemDark: (systemDark) => set({ systemDark }),
}));
