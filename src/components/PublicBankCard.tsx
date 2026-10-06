import { Button, Card, Typography } from 'antd';
import { ArrowRightOutlined, BookOutlined } from '@ant-design/icons';
import { useNavigate } from 'react-router';
import { useTranslation } from 'react-i18next';
import type { PublicBankResponse } from '@/api/practice';

export default function PublicBankCard({ bank }: { bank: PublicBankResponse }) {
  const { t } = useTranslation();
  const navigate = useNavigate();
  return (
    <Card className="bank-card" hoverable actions={[
      <Button key="start" type="text" onClick={() => navigate(`/practice/${bank.id}`)}>
        {t('practice.start')} <ArrowRightOutlined />
      </Button>,
    ]}>
      <span className="bank-card-icon"><BookOutlined /></span>
      <h3>{bank.name}</h3>
      <Typography.Paragraph ellipsis={{ rows: 2 }} type="secondary" style={{ minHeight: 44 }}>
        {bank.description || t('practice.bankDescription')}
      </Typography.Paragraph>
      <Typography.Text type="secondary">
        {t('practice.questionCount', { count: bank._count?.questions ?? 0 })}
      </Typography.Text>
    </Card>
  );
}
