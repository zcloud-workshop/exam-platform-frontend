import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import LanguageDetector from 'i18next-browser-languagedetector';
import zh from './zh';
import en from './en';
import dayjs from 'dayjs';
import 'dayjs/locale/zh-cn';
import 'dayjs/locale/en';

i18n
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    resources: {
      zh: { translation: zh },
      en: { translation: en },
    },
    fallbackLng: 'zh',
    supportedLngs: ['zh', 'en'],
    load: 'languageOnly',
    interpolation: {
      escapeValue: false,
    },
    detection: {
      order: ['localStorage', 'navigator'],
      lookupLocalStorage: 'language',
      caches: ['localStorage'],
    },
  });

function syncLocale() {
  const english = i18n.resolvedLanguage === 'en';
  dayjs.locale(english ? 'en' : 'zh-cn');
  document.documentElement.lang = english ? 'en' : 'zh-CN';
  document.title = i18n.t('menu.appName');
}

i18n.on('languageChanged', syncLocale);
syncLocale();

export default i18n;
