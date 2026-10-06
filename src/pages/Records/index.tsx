import { useEffect, useState } from 'react';
import { useParams } from 'react-router';
import { Card, Table, Statistic, Row, Col, Tag, Typography, List } from 'antd';
import { useTranslation } from 'react-i18next';
import { formatDateTime } from '@/utils/format';
import type { ColumnsType } from 'antd/es/table';
import { getRecords, getStats } from '@/api/records';
import type { RecordResponse, StatsResponse } from '@/types/record';
import { RecordStatus } from '@/types/enums';
import { usePagination } from '@/hooks/usePagination';
import { useBreakpoint } from '@/hooks/useBreakpoint';

const { Title } = Typography;

export default function RecordsPage() {
  const { t } = useTranslation();
  const { id: examId } = useParams<{ id: string }>();
  const [data, setData] = useState<RecordResponse[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [stats, setStats] = useState<StatsResponse | null>(null);
  const { pagination, antPagination } = usePagination();
  const { isMobile } = useBreakpoint();

  useEffect(() => {
    if (!examId) return;
    const load = async () => {
      setLoading(true);
      try {
        const [recordRes, statsRes] = await Promise.all([
          getRecords(examId, pagination),
          getStats(examId),
        ]);
        setData(recordRes.data.data);
        setTotal(recordRes.data.total);
        setStats(statsRes.data);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [examId, pagination]);

  const columns: ColumnsType<RecordResponse> = [
    { title: t('records.student'), key: 'student', render: (_, r) => r.user?.username ?? '-' },
    {
      title: t('common.status'),
      dataIndex: 'status',
      key: 'status',
      render: (s: RecordStatus) => (
        <Tag color={s === RecordStatus.submitted ? 'green' : 'default'}>
          {s === RecordStatus.draft ? t('recordStatus.draft') : t('recordStatus.submitted')}
        </Tag>
      ),
    },
    {
      title: t('common.score'),
      dataIndex: 'score',
      key: 'score',
      render: (s: number | null) => s ?? '-',
    },
    {
      title: t('records.submittedAt'),
      dataIndex: 'submittedAt',
      key: 'submittedAt',
      render: (v: string | null) => v ? formatDateTime(v) : '-',
    },
  ];

  return (
    <div>
      <Title level={4}>{t('records.title')}</Title>

      {stats && (
        <Row gutter={16} style={{ marginBottom: 16 }}>
          <Col xs={12} md={6}><Card><Statistic title={t('records.count')} value={stats.count} /></Card></Col>
          <Col xs={12} md={6}><Card><Statistic title={t('records.max')} value={stats.max} /></Card></Col>
          <Col xs={12} md={6}><Card><Statistic title={t('records.min')} value={stats.min} /></Card></Col>
          <Col xs={12} md={6}><Card><Statistic title={t('records.average')} value={stats.avg} precision={1} /></Card></Col>
        </Row>
      )}

      {isMobile ? (
        <List
          loading={loading}
          dataSource={data}
          pagination={{ ...antPagination, total, simple: true }}
          renderItem={(record) => (
            <List.Item style={{ padding: 0, marginBottom: 8 }}>
              <Card size="small">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                  <strong>{record.user?.username ?? '-'}</strong>
                  <Tag color={record.status === RecordStatus.submitted ? 'green' : 'default'}>
                    {record.status === RecordStatus.draft ? t('recordStatus.draft') : t('recordStatus.submitted')}
                  </Tag>
                </div>
                <div style={{ marginTop: 4, color: 'var(--muted)', fontSize: 13 }}>
                  {t('common.score')}: {record.score ?? '-'}
                </div>
                <div style={{ marginTop: 4, color: 'var(--muted)', fontSize: 13 }}>
                  {record.submittedAt ? formatDateTime(record.submittedAt) : '-'}
                </div>
              </Card>
            </List.Item>
          )}
        />
      ) : (
        <Table
          rowKey="id"
          columns={columns}
          dataSource={data}
          loading={loading}
          pagination={{ ...antPagination, total }}
          scroll={{ x: 'max-content' }}
        />
      )}
    </div>
  );
}
