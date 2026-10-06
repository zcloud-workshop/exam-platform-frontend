import { useState } from 'react';
import { useLocation, useNavigate } from 'react-router';
import { Form, Input, Button, Card, Typography, message, Layout } from 'antd';
import { UserOutlined, LockOutlined, KeyOutlined } from '@ant-design/icons';
import { useTranslation } from 'react-i18next';
import { login, register } from '@/api/auth';
import { useAuthStore } from '@/stores/authStore';
import PublicHeader from '@/components/Layout/PublicHeader';

const { Title, Paragraph } = Typography;

interface LoginForm {
  username: string;
  password: string;
  inviteCode?: string;
  confirmPassword?: string;
}

export default function LoginPage() {
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();
  const isRegister = location.pathname === '/register';
  const setUser = useAuthStore((s) => s.setUser);
  const { t } = useTranslation();

  const onFinish = async (values: LoginForm) => {
    setLoading(true);
    try {
      if (isRegister) {
        await register({ username: values.username, password: values.password, inviteCode: values.inviteCode! });
        message.success(t('auth.registerSuccess'));
        navigate('/login', { state: { ...location.state, username: values.username }, replace: true });
        return;
      }
      const res = await login({ username: values.username, password: values.password });
      setUser(res.data.user);
      message.success(t('auth.loginSuccess'));
      const practiceBankId: unknown = (location.state as { practiceBankId?: unknown } | null)?.practiceBankId;
      navigate(typeof practiceBankId === 'string' ? `/practice/${encodeURIComponent(practiceBankId)}` : '/dashboard');
    } catch {
      // error handled by interceptor
    } finally {
      setLoading(false);
    }
  };

  return (
    <Layout style={{ minHeight: '100vh' }}>
      <PublicHeader />
      <main className="login-main">
        <div className="login-intro">
          <span className="eyebrow">{t('home.heroBadge')}</span>
          <Title level={1}>{t('auth.introTitle')}</Title>
          <p>{t('auth.introDescription')}</p>
        </div>
        <Card className="login-card">
          <Title level={2} style={{ margin: '0 0 8px' }}>{t(isRegister ? 'auth.register' : 'auth.welcomeBack')}</Title>
          <Paragraph type="secondary">{t(isRegister ? 'auth.registerDescription' : 'auth.loginDescription')}</Paragraph>
        <Form key={isRegister ? 'register' : 'login'} name={isRegister ? 'register' : 'login'}
          initialValues={{ username: (location.state as { username?: string } | null)?.username }}
          onFinish={onFinish} size="large" layout="vertical">
          <Form.Item name="username" label={t('common.username')} rules={[{ required: true, message: t('auth.usernamePlaceholder') }]}>
            <Input autoComplete="username" prefix={<UserOutlined />} placeholder={t('common.username')} />
          </Form.Item>
          <Form.Item name="password" label={t('common.password')} rules={[
            { required: true, message: t('auth.passwordPlaceholder') },
            ...(isRegister ? [{ min: 6, message: t('common.minChars', { min: 6 }) }] : []),
          ]}>
            <Input.Password autoComplete={isRegister ? 'new-password' : 'current-password'} prefix={<LockOutlined />} placeholder={t('common.password')} />
          </Form.Item>
          {isRegister && (
            <>
              <Form.Item name="confirmPassword" label={t('common.confirmPassword')} dependencies={['password']} rules={[
                { required: true, message: t('common.required') },
                ({ getFieldValue }) => ({
                  validator(_, value) {
                    return !value || getFieldValue('password') === value
                      ? Promise.resolve()
                      : Promise.reject(new Error(t('users.passwordMismatch')));
                  },
                }),
              ]}>
                <Input.Password autoComplete="new-password" prefix={<LockOutlined />} />
              </Form.Item>
              <Form.Item name="inviteCode" label={t('auth.inviteCode')} rules={[
                { required: true, message: t('auth.inviteCodePlaceholder') },
                { pattern: /^\s*[a-fA-F0-9]{32}\s*$/, message: t('auth.inviteCodeInvalid') },
              ]}>
                <Input prefix={<KeyOutlined />} placeholder={t('auth.inviteCodePlaceholder')} autoComplete="off" />
              </Form.Item>
            </>
          )}
          <Form.Item>
            <Button type="primary" htmlType="submit" loading={loading} block>
              {t(isRegister ? 'auth.register' : 'auth.login')}
            </Button>
          </Form.Item>
        </Form>
          <Button type="link" block style={{ marginTop: 16 }} onClick={() => navigate(isRegister ? '/login' : '/register', { state: location.state })}>
            {t(isRegister ? 'auth.backToLogin' : 'auth.goToRegister')}
          </Button>
        </Card>
      </main>
    </Layout>
  );
}
