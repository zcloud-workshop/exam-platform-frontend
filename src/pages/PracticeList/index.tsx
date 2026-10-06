import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router';
import { Layout, Button, Row, Col, Typography, Empty, Spin } from 'antd';
import { ArrowLeftOutlined } from '@ant-design/icons';
import { useTranslation } from 'react-i18next';
import { getPublicBanks } from '@/api/practice';
import type { PublicBankResponse } from '@/api/practice';
import PublicBankCard from '@/components/PublicBankCard';
import PublicHeader from '@/components/Layout/PublicHeader';

const { Content } = Layout;
const { Title, Paragraph } = Typography;

export default function PracticeListPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
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

  return (
    <Layout style={{ minHeight: '100vh' }}>
      <PublicHeader />

      <Content className="page-container">
        <div style={{ marginBottom: 24, display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
          <Button type="text" aria-label={t('practice.backToHome')} icon={<ArrowLeftOutlined />} onClick={() => navigate('/')} />
          <Title level={3} style={{ margin: 0 }}>{t('practice.heroTitle')}</Title>
        </div>
        <Paragraph type="secondary" style={{ marginBottom: 24 }}>
          {t('practice.heroSubtitle')}
        </Paragraph>

        {loading ? (
          <Spin size="large" style={{ display: 'block', margin: '64px auto' }} />
        ) : banks.length === 0 ? (
          <Empty description={t('practice.noPublicBanks')} />
        ) : (
          <Row gutter={[24, 24]}>
            {banks.map((bank) => (
              <Col key={bank.id} xs={24} sm={12} md={8} lg={6}>
                <PublicBankCard bank={bank} />
              </Col>
            ))}
          </Row>
        )}
      </Content>
    </Layout>
  );
}
