import { useEffect, useState, useCallback } from 'react';
import { Table, Input, Select, DatePicker, Space, Typography, List, Card, Tag } from 'antd';
import { useTranslation } from 'react-i18next';
import { formatDateTime } from '@/utils/format';
import type { ColumnsType } from 'antd/es/table';
import { getLogs } from '@/api/logs';
import type { LogResponse, QueryLogParams } from '@/types/log';
import { usePagination } from '@/hooks/usePagination';
import { useBreakpoint } from '@/hooks/useBreakpoint';

const { Title } = Typography;
const { RangePicker } = DatePicker;

const actionValues = ['CREATE', 'UPDATE', 'DELETE'] as const;

export default function LogsPage() {
  const { t } = useTranslation();
  const [data, setData] = useState<LogResponse[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const { pagination, antPagination, reset } = usePagination();
  const [filters, setFilters] = useState<QueryLogParams>({});
  const { isMobile } = useBreakpoint();

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const res = await getLogs({ ...pagination, ...filters });
      setData(res.data.data);
      setTotal(res.data.total);
    } finally {
      setLoading(false);
    }
  }, [pagination, filters]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const actionOptions = actionValues.map((v) => ({ value: v, label: t(`logActions.${v}`) }));

  const columns: ColumnsType<LogResponse> = [
    { title: t('common.username'), dataIndex: 'username', key: 'username', width: 120 },
    { title: t('logs_page.action'), dataIndex: 'action', key: 'action', width: 100, render: (action: string) => t(`logActions.${action}`, { defaultValue: action }) },
    { title: t('logs_page.resource'), dataIndex: 'resource', key: 'resource', width: 120 },
    { title: t('logs_page.method'), dataIndex: 'method', key: 'method', width: 80 },
    { title: t('logs_page.path'), dataIndex: 'path', key: 'path', ellipsis: true },
    { title: 'IP', dataIndex: 'ip', key: 'ip', width: 140 },
    {
      title: t('logs_page.time'),
      dataIndex: 'createdAt',
      key: 'createdAt',
      width: 180,
      render: (v: string) => formatDateTime(v),
    },
  ];

  return (
    <div>
      <Title level={4}>{t('logs_page.title')}</Title>

      <Space style={{ marginBottom: 16 }} wrap>
        <Input
          placeholder={t('common.username')}
          allowClear
          style={{ width: 160 }}
          onChange={(e) => { setFilters((f) => ({ ...f, username: e.target.value || undefined })); reset(); }}
        />
        <Select
          placeholder={t('logs_page.action')}
          allowClear
          style={{ width: 120 }}
          options={actionOptions}
          onChange={(v) => { setFilters((f) => ({ ...f, action: v })); reset(); }}
        />
        <Input
          placeholder={t('logs_page.resource')}
          allowClear
          style={{ width: 140 }}
          onChange={(e) => { setFilters((f) => ({ ...f, resource: e.target.value || undefined })); reset(); }}
        />
        <RangePicker
          showTime
          onChange={(dates) => {
            setFilters((f) => ({
              ...f,
              startDate: dates?.[0]?.toISOString(),
              endDate: dates?.[1]?.toISOString(),
            }));
            reset();
          }}
        />
      </Space>

      {isMobile ? (
        <List
          loading={loading}
          dataSource={data}
          pagination={{ ...antPagination, total, simple: true }}
          renderItem={(record) => (
            <List.Item style={{ padding: 0, marginBottom: 8 }}>
              <Card size="small">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                  <strong>{record.username}</strong>
                  <Tag>{t(`logActions.${record.action}`, { defaultValue: record.action })}</Tag>
                </div>
                <div style={{ marginTop: 4, color: 'var(--muted)', fontSize: 13, wordBreak: 'break-all' }}>
                  {record.method} {record.path}
                </div>
                <div style={{ marginTop: 4, color: 'var(--muted)', fontSize: 13 }}>
                  {record.resource} · IP {record.ip}
                </div>
                <div style={{ marginTop: 4, color: 'var(--muted)', fontSize: 13 }}>
                  {formatDateTime(record.createdAt)}
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
