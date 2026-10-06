import i18n from '@/locales';

export function formatDateTime(value: string) {
  return new Intl.DateTimeFormat(i18n.resolvedLanguage === 'en' ? 'en-US' : 'zh-CN', {
    year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit',
  }).format(new Date(value));
}
