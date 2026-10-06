import { useState } from 'react';
import { Outlet, useNavigate, useLocation } from 'react-router';
import { Layout, Menu, Button, Dropdown, Space, Drawer } from 'antd';
import {
  DashboardOutlined,
  UserOutlined,
  FolderOutlined,
  AuditOutlined,
  LogoutOutlined,
  MenuFoldOutlined,
  MenuUnfoldOutlined,
  DatabaseOutlined,
  MenuOutlined,
  BookOutlined,
} from '@ant-design/icons';
import type { MenuProps } from 'antd';
import { useTranslation } from 'react-i18next';
import { useAuthStore } from '@/stores/authStore';
import { useBankStore } from '@/stores/bankStore';
import Brand from './Brand';
import Preferences from './Preferences';
import { Role } from '@/types/enums';
import { getRoleLabel } from '@/utils/constants';
import { useBreakpoint } from '@/hooks/useBreakpoint';
import { logout as logoutApi } from '@/api/auth';

const { Header, Sider, Content } = Layout;

export default function AppLayout() {
  const { t } = useTranslation();
  const { isMobile } = useBreakpoint();
  const [collapsed, setCollapsed] = useState(false);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();
  const { user, clearAuth } = useAuthStore();
  const { setCurrentBank } = useBankStore();

  const userRole = user?.role as Role;

  const menuItems: MenuProps['items'] = [
    { key: '/dashboard', icon: <DashboardOutlined />, label: t('menu.dashboard') },
    { key: '/practice/mine', icon: <BookOutlined />, label: t('menu.myPractice') },
    ...(userRole === Role.super_admin
      ? [
          { key: '/admin/users', icon: <UserOutlined />, label: t('menu.users') },
          { key: '/admin/logs', icon: <AuditOutlined />, label: t('menu.logs') },
        ]
      : []),
    { key: '/question-banks', icon: <DatabaseOutlined />, label: t('menu.questionBanks') },
    { key: '/files', icon: <FolderOutlined />, label: t('menu.files') },
  ];

  const selectedKeys = [location.pathname];

  const handleMenuClick: MenuProps['onClick'] = ({ key }) => {
    navigate(key);
    setDrawerOpen(false);
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
        setCurrentBank(null);
        navigate('/');
      },
    },
  ];

  const siderInner = (
    <>
      <div className="sidebar-brand"><Brand compact={!isMobile && collapsed} /></div>
      <Menu
        className="sidebar-menu"
        mode="inline"
        selectedKeys={selectedKeys}
        items={menuItems}
        onClick={handleMenuClick}
      />
    </>
  );

  return (
    <Layout style={{ minHeight: '100vh' }}>
      {isMobile ? (
        <Drawer
          placement="left"
          open={drawerOpen}
          onClose={() => setDrawerOpen(false)}
          width={220}
          title={t('menu.navigation')}
          styles={{ body: { padding: 0 } }}
        >
          {siderInner}
        </Drawer>
      ) : (
        <Sider className="app-sider" trigger={null} collapsible collapsed={collapsed} width={232}>
          {siderInner}
        </Sider>
      )}
      <Layout>
        <Header className="app-header">
          <Space size={4}>
            {isMobile ? (
              <Button
                type="text"
                aria-label={t('menu.navigation')}
                icon={<MenuOutlined />}
                onClick={() => setDrawerOpen(true)}
              />
            ) : (
              <Button
                type="text"
                aria-label={t(collapsed ? 'menu.expand' : 'menu.collapse')}
                icon={collapsed ? <MenuUnfoldOutlined /> : <MenuFoldOutlined />}
                onClick={() => setCollapsed(!collapsed)}
              />
            )}
            {!isMobile && <span className="workspace-title">{t('menu.workspace')}</span>}
          </Space>
          <Space size={4}>
            <Preferences />
            <Dropdown menu={{ items: userMenuItems }} placement="bottomRight">
              <Button type="text" aria-label={t('menu.account')}>
                <UserOutlined />
                {!isMobile && ` ${user?.username} (${user ? getRoleLabel(userRole) : ''})`}
              </Button>
            </Dropdown>
          </Space>
        </Header>
        <Content className="app-content"><Outlet /></Content>
      </Layout>
    </Layout>
  );
}
