import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router';
import { Layout, Button, Row, Col, Typography, Empty, Spin, Space } from 'antd';
import {
  BookOutlined, ScheduleOutlined,
  SafetyCertificateOutlined, ArrowRightOutlined, CheckCircleOutlined,
} from '@ant-design/icons';
import { useTranslation } from 'react-i18next';
import { getPublicBanks } from '@/api/practice';
import type { PublicBankResponse } from '@/api/practice';
import { useAuthStore } from '@/stores/authStore';
import PublicBankCard from '@/components/PublicBankCard';
import PublicHeader from '@/components/Layout/PublicHeader';

const { Content } = Layout;
const { Title, Paragraph } = Typography;

const PREVIEW_COUNT = 4;

export default function HomePage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const user = useAuthStore((s) => s.user);
  const [banks, setBanks] = useState<PublicBankResponse[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetch = async () => {
      try {
        const res = await getPublicBanks();
        setBanks(res.data);
      } catch {
        // The request interceptor displays the error.
      } finally {
        setLoading(false);
      }
    };
    fetch();
  }, []);

  const handleExam = () => navigate(user ? '/exams' : '/login');

  return (
    <Layout style={{ minHeight: '100vh' }}>
      <PublicHeader />

      <Content className="page-container">
        <section className="hero">
          <div>
            <span className="eyebrow">{t('home.heroBadge')}</span>
            <Title level={1}>{t('home.heroTitle')}</Title>
            <Paragraph type="secondary" className="hero-description">{t('home.heroSubtitle')}</Paragraph>
            <Space size={12} wrap>
              <Button type="primary" size="large" onClick={() => navigate('/practice')}>
                {t('home.ctaPractice')} <ArrowRightOutlined />
              </Button>
              <Button size="large" icon={<ScheduleOutlined />} onClick={handleExam}>{t('home.ctaExam')}</Button>
            </Space>
            <div className="hero-note"><CheckCircleOutlined />{t('home.practiceNote')}</div>
          </div>
          <div className="learning-path">
            <div className="learning-path-heading"><BookOutlined />{t('home.pathTitle')}</div>
            {[1, 2, 3].map((step) => (
              <div className="path-step" key={step}>
                <span className="step-number">0{step}</span>
                <div><strong>{t(`home.step${step}Title`)}</strong><p>{t(`home.step${step}Desc`)}</p></div>
              </div>
            ))}
          </div>
        </section>

        <section>
          <div className="page-heading">
            <div>
              <Title level={3}>{t('home.banksPreviewTitle')}</Title>
              <p className="section-description">{t('practice.heroSubtitle')}</p>
            </div>
            <Button type="text" onClick={() => navigate('/practice')}>{t('home.viewAll')} <ArrowRightOutlined /></Button>
          </div>
          {loading ? (
            <Spin size="large" style={{ display: 'block', margin: '48px auto' }} />
          ) : banks.length === 0 ? (
            <div className="empty-panel"><Empty description={t('practice.noPublicBanks')} /></div>
          ) : (
            <Row gutter={[20, 20]}>
              {banks.slice(0, PREVIEW_COUNT).map((bank) => (
                <Col key={bank.id} xs={24} sm={12} lg={6}><PublicBankCard bank={bank} /></Col>
              ))}
            </Row>
          )}
        </section>
      </Content>
      <div className="page-container" style={{ paddingBlock: 0 }}>
        <footer className="public-footer"><span>{t('menu.appName')}</span><span><SafetyCertificateOutlined /> {t('home.footer')}</span></footer>
      </div>
    </Layout>
  );
}
