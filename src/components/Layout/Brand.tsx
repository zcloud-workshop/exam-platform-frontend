import { ReadOutlined } from '@ant-design/icons';
import { Link } from 'react-router';
import { useTranslation } from 'react-i18next';

export default function Brand({ compact = false }: { compact?: boolean }) {
  const { t } = useTranslation();
  return (
    <Link to="/" className="brand" aria-label={t('menu.appName')}>
      <span className="brand-mark"><ReadOutlined /></span>
      {!compact && <span>{t('menu.appName')}</span>}
    </Link>
  );
}
