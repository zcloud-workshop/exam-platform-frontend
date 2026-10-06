import { Button, Dropdown } from 'antd';
import { LoginOutlined, LogoutOutlined, ThunderboltOutlined, ScheduleOutlined, DashboardOutlined, BookOutlined } from '@ant-design/icons';
import type { MenuProps } from 'antd';
import { useNavigate } from 'react-router';
import { useTranslation } from 'react-i18next';
import { useAuthStore } from '@/stores/authStore';
import { useBreakpoint } from '@/hooks/useBreakpoint';
import { logout as logoutApi } from '@/api/auth';

import Brand from './Brand';
import Preferences from './Preferences';

/**
 * Header shared by public-facing pages (home, practice list, exam list).
 * Shows the app name on the left and navigation actions on the right.
 */
export default function PublicHeader() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { isMobile } = useBreakpoint();
  const user = useAuthStore((s) => s.user);
  const clearAuth = useAuthStore((s) => s.clearAuth);

  const handleExamClick = () => {
    navigate(user ? '/exams' : '/login');
  };

  const userMenuItems: MenuProps['items'] = [
    {
      key: 'logout',
      icon: <LogoutOutlined />,
      label: t('menu.logout'),
      onClick: async () => {
        try {
          await logoutApi();
        } finally {
          clearAuth();
        }
        navigate('/');
      },
    },
  ];

  return (
    <header className="public-header">
      <div className="public-header-inner">
        <Brand />
        <nav className="public-nav" aria-label={t('menu.navigation')}>
          <Button type="text" icon={<ThunderboltOutlined />} onClick={() => navigate('/practice')}>
            {t('menu.practice')}
          </Button>
          {user && <Button type="text" icon={<BookOutlined />} aria-label={t('menu.myPractice')} onClick={() => navigate('/practice/mine')}>
            {isMobile ? null : t('menu.myPractice')}
          </Button>}
          <Button type="text" icon={<ScheduleOutlined />} onClick={handleExamClick}>
            {t('menu.exams')}
          </Button>
          <span className="header-divider" />
          <Preferences />
          {user ? (
            <Dropdown menu={{ items: userMenuItems }} placement="bottomRight">
              <Button type="primary" icon={<DashboardOutlined />} aria-label={t('menu.dashboard')} onClick={() => navigate('/dashboard')}>
                {isMobile ? null : t('menu.dashboard')}
              </Button>
            </Dropdown>
          ) : (
            <Button type="primary" icon={<LoginOutlined />} onClick={() => navigate('/login')}>
              {t('auth.login')}
            </Button>
          )}
        </nav>
      </div>
    </header>
  );
}
