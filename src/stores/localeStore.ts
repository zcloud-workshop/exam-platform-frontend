import { create } from 'zustand';
import i18n from '@/locales';

type Locale = 'zh' | 'en';

interface LocaleState {
  locale: Locale;
  setLocale: (locale: Locale) => void;
}

export const useLocaleStore = create<LocaleState>(() => ({
  locale: i18n.resolvedLanguage === 'en' ? 'en' : 'zh',

  setLocale: (locale: Locale) => {
    i18n.changeLanguage(locale);
  },
}));

i18n.on('languageChanged', () => {
  useLocaleStore.setState({ locale: i18n.resolvedLanguage === 'en' ? 'en' : 'zh' });
});
