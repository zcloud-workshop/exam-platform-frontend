import { useEffect, useState, useCallback } from 'react';
import {
  Button, Table, Modal, Form, Input, Select, DatePicker, message, Popconfirm, Space,
  List, Card, Switch, Tag,
} from 'antd';
import { PlusOutlined } from '@ant-design/icons';
import { getAllPages } from '@/utils/pagination';
import { formatDateTime } from '@/utils/format';
import type { ColumnsType } from 'antd/es/table';
import dayjs from 'dayjs';
import { useTranslation } from 'react-i18next';
import { getExams, createExam, updateExam, deleteExam } from '@/api/exams';
import { getPapers } from '@/api/papers';
import { getUsers } from '@/api/users';
import type { ExamResponse, CreateExamRequest } from '@/types/exam';
import type { PaperResponse } from '@/types/paper';
import type { UserResponse } from '@/types/user';
import { usePagination } from '@/hooks/usePagination';
import { useBreakpoint } from '@/hooks/useBreakpoint';
import { useAuthStore } from '@/stores/authStore';
import { useBankStore } from '@/stores/bankStore';
import { Role } from '@/types/enums';
import { useNavigate } from 'react-router';

const { RangePicker } = DatePicker;

export default function ExamsPage() {
  const { t } = useTranslation();
  const [data, setData] = useState<ExamResponse[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [papers, setPapers] = useState<PaperResponse[]>([]);
  const [students, setStudents] = useState<UserResponse[]>([]);
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<ExamResponse | null>(null);
  const [form] = Form.useForm();
  const { pagination, antPagination } = usePagination();
  const hasRole = useAuthStore((s) => s.hasRole);
  const navigate = useNavigate();
  const currentBank = useBankStore((s) => s.currentBank);
  const { isMobile } = useBreakpoint();

  const permission = currentBank?.permission;
  const canManageExams = permission === 'owner' || permission === 'exam_manager';
  const canDelete = permission === 'owner';
  const isStudent = hasRole(Role.student);

  const fetchData = useCallback(async () => {
    if (!currentBank) return;
    setLoading(true);
    try {
      const res = await getExams({ ...pagination, bankId: currentBank.id });
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
    form.setFieldsValue({ showScore: false, studentIds: [] });
    const [pRes, uRes] = await Promise.all([
      getAllPages(getPapers),
      getUsers(),
    ]);
    setPapers(pRes);
    setStudents(uRes.data.filter((u) => u.role === Role.student));
    setModalOpen(true);
  };

  const openEdit = async (exam: ExamResponse) => {
    setEditing(exam);
    form.setFieldsValue({
      name: exam.name,
      timeRange: [dayjs(exam.startTime), dayjs(exam.endTime)],
      showScore: exam.showScore,
      studentIds: exam.participants?.map((p) => p.userId) ?? [],
    });
    const [pRes, uRes] = await Promise.all([
      getAllPages(getPapers),
      getUsers(),
    ]);
    setPapers(pRes);
    setStudents(uRes.data.filter((u) => u.role === Role.student));
    setModalOpen(true);
  };

  const handleSubmit = async () => {
    const values = await form.validateFields();
    const [startTime, endTime] = values.timeRange;
    const showScore = values.showScore ?? false;
    if (editing) {
      await updateExam(editing.id, {
        name: values.name,
        startTime: startTime.toISOString(),
        endTime: endTime.toISOString(),
        showScore,
        studentIds: values.studentIds ?? [],
      });
      message.success(t('exams_page.examUpdated'));
    } else {
      await createExam({
        name: values.name,
        paperId: values.paperId,
        startTime: startTime.toISOString(),
        endTime: endTime.toISOString(),
        showScore,
        studentIds: values.studentIds ?? [],
      } as CreateExamRequest);
      message.success(t('exams_page.examCreated'));
    }
    setModalOpen(false);
    fetchData();
  };

  const handleDelete = async (id: string) => {
    await deleteExam(id);
    message.success(t('exams_page.examDeleted'));
    fetchData();
  };

  const columns: ColumnsType<ExamResponse> = [
    { title: t('common.name'), dataIndex: 'name', key: 'name' },
    { title: t('exams_page.paper'), key: 'paper', render: (_: any, r: ExamResponse) => r.paper?.name },
    {
      title: t('exams_page.startTime'),
      dataIndex: 'startTime',
      key: 'startTime',
      render: (v: string) => formatDateTime(v),
    },
    {
      title: t('exams_page.endTime'),
      dataIndex: 'endTime',
      key: 'endTime',
      render: (v: string) => formatDateTime(v),
    },
    {
      title: t('exams_page.showScore'),
      dataIndex: 'showScore',
      key: 'showScore',
      width: 110,
      render: (v: boolean) => (
        <Tag color={v ? 'green' : 'default'}>{v ? t('common.yes') : t('common.no')}</Tag>
      ),
    },
    {
      title: t('common.actions'),
      key: 'actions',
      width: 240,
      render: (_: any, record: ExamResponse) => (
        <Space>
          {isStudent && (
            <Button type="link" size="small" onClick={() => navigate(`/exams/${record.id}/take`)}>
              {t('exams_page.takeExam')}
            </Button>
          )}
          {canManageExams && <Button type="link" size="small" onClick={() => openEdit(record)}>{t('common.edit')}</Button>}
          {canDelete && (
            <Popconfirm title={t('exams_page.deleteExam')} onConfirm={() => handleDelete(record.id)}>
              <Button type="link" size="small" danger>{t('common.delete')}</Button>
            </Popconfirm>
          )}
          {!isStudent && (
            <Button type="link" size="small" onClick={() => navigate(`/exams/${record.id}/records`)}>
              {t('exams_page.records')}
            </Button>
          )}
        </Space>
      ),
    },
  ];

  return (
    <div>
      <div style={{ marginBottom: 16, display: 'flex', justifyContent: 'space-between', flexWrap: 'wrap', gap: 8 }}>
        <h2>{t('exams_page.title')}</h2>
        {canManageExams && (
          <Button type="primary" icon={<PlusOutlined />} onClick={openCreate}>
            {t('exams_page.createExam')}
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
                  {record.paper?.name ?? '-'}
                </div>
                <div style={{ marginTop: 4, color: 'var(--muted)', fontSize: 13 }}>
                  {formatDateTime(record.startTime)} ~ {formatDateTime(record.endTime)}
                </div>
                <div style={{ marginTop: 4, color: 'var(--muted)', fontSize: 13 }}>
                  {t('exams_page.showScore')}: {record.showScore ? t('common.yes') : t('common.no')}
                </div>
                <Space wrap style={{ marginTop: 10 }}>
                  {isStudent && (
                    <Button size="small" type="primary" onClick={() => navigate(`/exams/${record.id}/take`)}>
                      {t('exams_page.takeExam')}
                    </Button>
                  )}
                  {canManageExams && <Button size="small" onClick={() => openEdit(record)}>{t('common.edit')}</Button>}
                  {canDelete && (
                    <Popconfirm title={t('exams_page.deleteExam')} onConfirm={() => handleDelete(record.id)}>
                      <Button size="small" danger>{t('common.delete')}</Button>
                    </Popconfirm>
                  )}
                  {!isStudent && (
                    <Button size="small" onClick={() => navigate(`/exams/${record.id}/records`)}>
                      {t('exams_page.records')}
                    </Button>
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
        title={editing ? t('exams_page.editExam') : t('exams_page.createExam')}
        open={modalOpen}
        onOk={handleSubmit}
        onCancel={() => setModalOpen(false)}
        destroyOnClose
      >
        <Form form={form} layout="vertical">
          <Form.Item name="name" label={t('common.name')} rules={[{ required: true }]}>
            <Input />
          </Form.Item>
          {!editing && (
            <Form.Item name="paperId" label={t('exams_page.paper')} rules={[{ required: true }]}>
              <Select
                showSearch
                optionFilterProp="label"
                options={papers.map((p) => ({ value: p.id, label: `${p.name} (${t('exams_page.durationMin', { duration: p.duration })})` }))}
              />
            </Form.Item>
          )}
          <Form.Item name="timeRange" label={t('exams_page.timeRange')} rules={[{ required: true }]}>
            <RangePicker showTime format="YYYY-MM-DD HH:mm" style={{ width: '100%' }} />
          </Form.Item>
          <Form.Item name="showScore" label={t('exams_page.showScoreLabel')} valuePropName="checked">
            <Switch />
          </Form.Item>
          <Form.Item name="studentIds" label={t('exams_page.students')}>
            <Select
              mode="multiple"
              showSearch
              optionFilterProp="label"
              placeholder={t('exams_page.selectStudents')}
              options={students.map((student) => ({
                value: student.id,
                label: student.username,
              }))}
            />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
}
