import { useEffect, useState, useCallback } from 'react';
import { Button, Table, Upload, message, Popconfirm, Space, Typography, List, Card, Tag } from 'antd';
import { UploadOutlined, DownloadOutlined, DeleteOutlined } from '@ant-design/icons';
import { useTranslation } from 'react-i18next';
import { formatDateTime } from '@/utils/format';
import type { ColumnsType } from 'antd/es/table';
import { getFiles, uploadFile, downloadFileById, deleteFile } from '@/api/files';
import type { FileResponse } from '@/types/file';
import { usePagination } from '@/hooks/usePagination';
import { useBreakpoint } from '@/hooks/useBreakpoint';
import { useAuthStore } from '@/stores/authStore';
import { Role } from '@/types/enums';

const { Title } = Typography;

export default function FilesPage() {
  const { t } = useTranslation();
  const [data, setData] = useState<FileResponse[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const { pagination, antPagination } = usePagination();
  const hasRole = useAuthStore((s) => s.hasRole);
  const { isMobile } = useBreakpoint();
  const canUpload = hasRole(Role.super_admin, Role.question_admin, Role.teacher);
  const canDelete = hasRole(Role.super_admin, Role.question_admin);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const res = await getFiles(pagination);
      setData(res.data.data);
      setTotal(res.data.total);
    } finally {
      setLoading(false);
    }
  }, [pagination]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const handleUpload = async (file: File) => {
    try {
      await uploadFile(file);
      message.success(t('files.fileUploaded'));
      fetchData();
    } catch { /* handled */ }
    return false;
  };

  const handleDownload = (record: FileResponse) => {
    downloadFileById(record.id, record.originalName);
  };

  const handleDelete = async (id: string) => {
    await deleteFile(id);
    message.success(t('files.fileDeleted'));
    fetchData();
  };

  const formatSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  const columns: ColumnsType<FileResponse> = [
    { title: t('common.name'), dataIndex: 'originalName', key: 'originalName', ellipsis: true },
    { title: t('common.type'), dataIndex: 'mimeType', key: 'mimeType', width: 180 },
    { title: t('files.size'), key: 'size', width: 100, render: (_, r) => formatSize(r.size) },
    {
      title: t('files.uploadedAt'),
      dataIndex: 'createdAt',
      key: 'createdAt',
      width: 180,
      render: (v: string) => formatDateTime(v),
    },
    {
      title: t('common.actions'),
      key: 'actions',
      width: 160,
      render: (_, record) => (
        <Space>
          <Button type="link" icon={<DownloadOutlined />} onClick={() => handleDownload(record)}>
            {t('common.download')}
          </Button>
          {canDelete && (
            <Popconfirm title={t('files.deleteFile')} onConfirm={() => handleDelete(record.id)}>
              <Button type="link" danger icon={<DeleteOutlined />}>{t('common.delete')}</Button>
            </Popconfirm>
          )}
        </Space>
      ),
    },
  ];

  return (
    <div>
      <div style={{ marginBottom: 16, display: 'flex', justifyContent: 'space-between', flexWrap: 'wrap', gap: 8 }}>
        <Title level={4}>{t('files.title')}</Title>
        {canUpload && (
          <Upload accept="image/*,.pdf,.xlsx,.docx,.pptx,.txt,.zip,.tar,.gz" showUploadList={false} beforeUpload={handleUpload}>
            <Button type="primary" icon={<UploadOutlined />}>{t('common.upload')}</Button>
          </Upload>
        )}
      </div>

      {isMobile ? (
        <List
          loading={loading}
          dataSource={data}
          pagination={{ ...antPagination, total, simple: true }}
          renderItem={(record) => (
            <List.Item style={{ padding: 0, marginBottom: 8 }}>
              <Card>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                  <strong style={{ fontSize: 16, wordBreak: 'break-all' }}>{record.originalName}</strong>
                  <Tag>{formatSize(record.size)}</Tag>
                </div>
                <div style={{ marginTop: 4, color: 'var(--muted)', fontSize: 13, wordBreak: 'break-all' }}>
                  {record.mimeType}
                </div>
                <div style={{ marginTop: 4, color: 'var(--muted)', fontSize: 13 }}>
                  {formatDateTime(record.createdAt)}
                </div>
                <Space style={{ marginTop: 12 }}>
                  <Button size="small" icon={<DownloadOutlined />} onClick={() => handleDownload(record)}>
                    {t('common.download')}
                  </Button>
                  {canDelete && (
                    <Popconfirm title={t('files.deleteFile')} onConfirm={() => handleDelete(record.id)}>
                      <Button size="small" danger icon={<DeleteOutlined />}>{t('common.delete')}</Button>
                    </Popconfirm>
                  )}
                </Space>
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
