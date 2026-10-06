import { useEffect, useState, useCallback } from 'react';
import {
  Button, Table, Modal, Form, Input, InputNumber, message, Popconfirm, Space, Transfer, Alert,
  List, Card,
} from 'antd';
import { PlusOutlined } from '@ant-design/icons';
import { getAllPages } from '@/utils/pagination';
import type { ColumnsType } from 'antd/es/table';
import { useTranslation } from 'react-i18next';
import { getPapers, createPaper, updatePaper, deletePaper, getPaper } from '@/api/papers';
import { getQuestions } from '@/api/questions';
import type { PaperResponse, CreatePaperRequest } from '@/types/paper';
import type { QuestionResponse } from '@/types/question';
import { getQuestionTypeLabel } from '@/utils/constants';
import { usePagination } from '@/hooks/usePagination';
import { useBankStore } from '@/stores/bankStore';
import { useBreakpoint } from '@/hooks/useBreakpoint';

export default function PapersPage() {
  const { t } = useTranslation();
  const [data, setData] = useState<PaperResponse[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<PaperResponse | null>(null);
  const [form] = Form.useForm();
  const { pagination, antPagination } = usePagination();
  const [allQuestions, setAllQuestions] = useState<QuestionResponse[]>([]);
  const [selectedKeys, setSelectedKeys] = useState<string[]>([]);
  const currentBank = useBankStore((s) => s.currentBank);
  const { isMobile } = useBreakpoint();
  const permission = currentBank?.permission;
  const canEdit = permission === 'owner' || permission === 'editor';
  const canDelete = permission === 'owner';

  const fetchData = useCallback(async () => {
    if (!currentBank) return;
    setLoading(true);
    try {
      const res = await getPapers({ ...pagination, bankId: currentBank.id });
      setData(res.data.data);
      setTotal(res.data.total);
    } finally {
      setLoading(false);
    }
  }, [pagination, currentBank]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const openCreate = async () => {
    setEditing(null);
    form.resetFields();
    setSelectedKeys([]);
    const qRes = await getAllPages((params) => getQuestions({ ...params, bankId: currentBank!.id }));
    setAllQuestions(qRes);
    setModalOpen(true);
  };

  const openEdit = async (paper: PaperResponse) => {
    setEditing(paper);
    form.setFieldsValue({
      name: paper.name,
      duration: paper.duration,
      totalScore: paper.totalScore,
    });
    const detail = await getPaper(paper.id);
    setSelectedKeys(detail.data.questions.map((q) => q.questionId));
    const qRes = await getAllPages((params) => getQuestions({ ...params, bankId: currentBank!.id }));
    setAllQuestions(qRes);
    setModalOpen(true);
  };

  const handleSubmit = async () => {
    const values = await form.validateFields();
    const payload = { ...values, questionIds: selectedKeys, bankId: currentBank!.id };
    if (editing) {
      await updatePaper(editing.id, payload);
      message.success(t('papers.paperUpdated'));
    } else {
      await createPaper(payload as CreatePaperRequest);
      message.success(t('papers.paperCreated'));
    }
    setModalOpen(false);
    fetchData();
  };

  const handleDelete = async (id: string) => {
    await deletePaper(id);
    message.success(t('papers.paperDeleted'));
    fetchData();
  };

  const columns: ColumnsType<PaperResponse> = [
    { title: t('common.name'), dataIndex: 'name', key: 'name' },
    { title: t('papers.durationMin'), dataIndex: 'duration', key: 'duration', width: 130 },
    { title: t('papers.totalScore'), dataIndex: 'totalScore', key: 'totalScore', width: 120 },
    {
      title: t('papers.questions'),
      key: 'questions',
      width: 120,
      render: (_: any, r: PaperResponse) => r._count?.exams ?? 0,
    },
    {
      title: t('common.actions'),
      key: 'actions',
      width: 160,
      render: (_: any, record: PaperResponse) => (
        <Space>
          {canEdit && <Button type="link" size="small" onClick={() => openEdit(record)}>{t('common.edit')}</Button>}
          {canDelete && (
            <Popconfirm title={t('papers.deletePaper')} onConfirm={() => handleDelete(record.id)}>
              <Button type="link" size="small" danger>{t('common.delete')}</Button>
            </Popconfirm>
          )}
        </Space>
      ),
    },
  ];

  if (!currentBank) {
    return <Alert type="info" message={t('questionBanks_page.noBankSelected')} showIcon />;
  }

  const transferDataSource = allQuestions.map((q) => ({
    key: q.id,
    title: q.title,
    description: `${getQuestionTypeLabel(q.type)} | ${t('common.points', { score: q.score })}`,
  }));

  return (
    <div>
      <div style={{ marginBottom: 16, display: 'flex', justifyContent: 'space-between', flexWrap: 'wrap', gap: 8 }}>
        <h2>{t('papers.title')}</h2>
        {canEdit && (
          <Button type="primary" icon={<PlusOutlined />} onClick={openCreate}>
            {t('papers.createPaper')}
          </Button>
        )}
      </div>

      {isMobile ? (
        <List
          loading={loading}
          dataSource={data}
          pagination={{ ...antPagination, total, simple: true }}
          renderItem={(record) => (
            <List.Item style={{ padding: 0, marginBottom: 8 }}>
              <Card size="small">
                <strong style={{ fontSize: 16 }}>{record.name}</strong>
                <div style={{ marginTop: 4, color: 'var(--muted)', fontSize: 13 }}>
                  {t('exams_page.durationMin', { duration: record.duration })} · {t('papers.totalScore')}: {record.totalScore} · {record._count?.exams ?? 0} {t('exams_page.title')}
                </div>
                <Space style={{ marginTop: 10 }}>
                  {canEdit && <Button size="small" onClick={() => openEdit(record)}>{t('common.edit')}</Button>}
                  {canDelete && (
                    <Popconfirm title={t('papers.deletePaper')} onConfirm={() => handleDelete(record.id)}>
                      <Button size="small" danger>{t('common.delete')}</Button>
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

      <Modal
        title={editing ? t('papers.editPaper') : t('papers.createPaper')}
        open={modalOpen}
        onOk={handleSubmit}
        onCancel={() => setModalOpen(false)}
        width={isMobile ? '95%' : 720}
        destroyOnClose
      >
        <Form form={form} layout="vertical">
          <Form.Item name="name" label={t('common.name')} rules={[{ required: true }]}>
            <Input />
          </Form.Item>
          <Space size="large">
            <Form.Item name="duration" label={t('papers.durationMin')} rules={[{ required: true }]}>
              <InputNumber min={1} />
            </Form.Item>
            <Form.Item name="totalScore" label={t('papers.totalScore')}>
              <InputNumber min={1} />
            </Form.Item>
          </Space>
          <Form.Item label={t('papers.questionSelector')}>
            <Transfer
              dataSource={transferDataSource}
              targetKeys={selectedKeys}
              onChange={(keys) => setSelectedKeys(keys as string[])}
              render={(item) => `${item.title} (${item.description})`}
              listStyle={{ width: 300, height: 300 }}
              showSearch
              filterOption={(input, item) => (item.title ?? '').toLowerCase().includes(input.toLowerCase())}
              oneWay
            />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
}
