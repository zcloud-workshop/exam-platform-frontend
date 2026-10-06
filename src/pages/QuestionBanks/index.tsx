import { useState, useEffect, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import {
  Table, Button, Modal, Form, Input, message, Popconfirm, Space, Select, Switch, Tabs, Tag,
  List, Card, Upload, Alert,
} from 'antd';
import { PlusOutlined, ShareAltOutlined, DownloadOutlined, UploadOutlined } from '@ant-design/icons';
import { getAllPages } from '@/utils/pagination';
import type { UploadProps } from 'antd';
import { useAuthStore } from '@/stores/authStore';
import { useBankStore } from '@/stores/bankStore';
import { Role, BankShareRole } from '@/types/enums';
import {
  getQuestionBanks,
  createQuestionBank,
  updateQuestionBank,
  deleteQuestionBank,
  getBankShares,
  addBankShare,
  removeBankShare,
  exportBankArchive,
  importBankArchive,
} from '@/api/question-banks';
import type {
  QuestionBankResponse,
  BankShareResponse,
  BankArchive,
  BankImportSummary,
  ArchiveImportMode,
} from '@/types/question-bank';
import { usePagination } from '@/hooks/usePagination';
import { useBreakpoint } from '@/hooks/useBreakpoint';
import CategoriesPage from '@/pages/Categories';
import QuestionsPage from '@/pages/Questions';
import PapersPage from '@/pages/Papers';
import ExamsPage from '@/pages/Exams';
import AIPage from '@/pages/AI';
import { getUsers } from '@/api/users';

export default function QuestionBanksPage() {
  const { t } = useTranslation();
  const permissionLabel = (permission: string) => t(`permissions.${permission}`, { defaultValue: permission });
  const shareRoleOptions = Object.values(BankShareRole).map((value) => ({ value, label: permissionLabel(value) }));
  const { pagination, antPagination } = usePagination();
  const { isMobile } = useBreakpoint();
  const [data, setData] = useState<QuestionBankResponse[]>([]);
  const [allBanks, setAllBanks] = useState<QuestionBankResponse[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<QuestionBankResponse | null>(null);
  const [form] = Form.useForm();

  // Share modal state
  const [shareModalOpen, setShareModalOpen] = useState(false);
  const [shareBankId, setShareBankId] = useState<string>('');
  const [shares, setShares] = useState<BankShareResponse[]>([]);
  const [teachers, setTeachers] = useState<{ id: string; username: string }[]>([]);
  const [shareForm] = Form.useForm();

  // Import archive modal state
  const [importModalOpen, setImportModalOpen] = useState(false);
  const [importArchive, setImportArchive] = useState<BankArchive | null>(null);
  const [importMode, setImportMode] = useState<ArchiveImportMode>('skip');
  const [importSummary, setImportSummary] = useState<BankImportSummary | null>(null);
  const [importing, setImporting] = useState(false);

  const isAdmin = useAuthStore((s) => s.hasRole(Role.super_admin, Role.question_admin));
  const user = useAuthStore((s) => s.user);
  const { currentBank, setCurrentBank } = useBankStore();

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const res = await getQuestionBanks({ ...pagination });
      setData(res.data.data);
      setTotal(res.data.total);
    } finally {
      setLoading(false);
    }
  }, [pagination]);

  const fetchAllBanks = useCallback(async () => {
    const banks = await getAllPages(getQuestionBanks);
    setAllBanks(banks);
  }, []);

  useEffect(() => {
    fetchData();
    fetchAllBanks();
  }, [fetchData, fetchAllBanks]);

  const handleSave = async () => {
    const values = await form.validateFields();
    if (editing) {
      await updateQuestionBank(editing.id, values);
      message.success(t('questionBanks_page.bankUpdated'));
    } else {
      await createQuestionBank(values);
      message.success(t('questionBanks_page.bankCreated'));
    }
    setModalOpen(false);
    setEditing(null);
    form.resetFields();
    fetchData();
    fetchAllBanks();
  };

  const handleDelete = async (id: string) => {
    await deleteQuestionBank(id);
    message.success(t('questionBanks_page.bankDeleted'));
    if (currentBank?.id === id) {
      setCurrentBank(null);
    }
    fetchData();
    fetchAllBanks();
  };

  const openCreate = () => {
    setEditing(null);
    form.resetFields();
    setModalOpen(true);
  };

  const openEdit = (record: QuestionBankResponse) => {
    setEditing(record);
    form.setFieldsValue({ name: record.name, description: record.description, isPublic: record.isPublic });
    setModalOpen(true);
  };

  const handleEnter = (record: QuestionBankResponse) => {
    setCurrentBank(record);
  };

  const handleBankSwitch = (bankId: string) => {
    const bank = allBanks.find((b) => b.id === bankId);
    if (bank) {
      setCurrentBank(bank);
    }
  };

  const handleBackToList = () => {
    setCurrentBank(null);
  };

  // Share management
  const openShareModal = async (bankId: string) => {
    setShareBankId(bankId);
    shareForm.resetFields();
    try {
      const [sharesRes, usersRes] = await Promise.all([
        getBankShares(bankId),
        getUsers(),
      ]);
      setShares(sharesRes.data);
      const teacherList = usersRes.data
        .filter((u: any) => u.role === 'teacher' && u.id !== user?.sub)
        .map((u: any) => ({ id: u.id, username: u.username }));
      setTeachers(teacherList);
    } catch {
      /* handled by interceptor */
    }
    setShareModalOpen(true);
  };

  const handleAddShare = async () => {
    const values = await shareForm.validateFields();
    await addBankShare(shareBankId, values);
    message.success(t('questionBanks_page.shared'));
    shareForm.resetFields();
    const res = await getBankShares(shareBankId);
    setShares(res.data);
  };

  const handleRemoveShare = async (shareId: string) => {
    await removeBankShare(shareBankId, shareId);
    message.success(t('questionBanks_page.shareRemoved'));
    const res = await getBankShares(shareBankId);
    setShares(res.data);
  };

  const isOwnerOrAdmin = (record: QuestionBankResponse) => {
    return isAdmin || record.createdBy === user?.sub;
  };

  // 归档导出: 下载为 JSON 文件
  const handleExport = async (bankId: string) => {
    try {
      const res = await exportBankArchive(bankId);
      const bank = allBanks.find((b) => b.id === bankId) ?? currentBank;
      const filename = `${bank?.name ?? 'bank'}-archive.json`;
      const blob = new Blob([JSON.stringify(res.data, null, 2)], { type: 'application/json' });
      const link = document.createElement('a');
      link.href = URL.createObjectURL(blob);
      link.download = filename;
      link.click();
      URL.revokeObjectURL(link.href);
      message.success(t('questionBanks_page.exported'));
    } catch { /* handled by interceptor */ }
  };

  const openImportModal = () => {
    setImportArchive(null);
    setImportMode('skip');
    setImportSummary(null);
    setImportModalOpen(true);
  };

  const importUploadProps: UploadProps = {
    accept: '.json,application/json',
    maxCount: 1,
    showUploadList: false,
    beforeUpload: (file) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        try {
          const parsed = JSON.parse(e.target?.result as string) as BankArchive;
          if (!parsed.meta || !Array.isArray(parsed.categories) || !Array.isArray(parsed.questions)) {
            message.error(t('questionBanks_page.invalidArchive'));
            return;
          }
          setImportArchive(parsed);
        } catch {
          message.error(t('questionBanks_page.invalidJson'));
        }
      };
      reader.readAsText(file);
      return false; // 阻止自动上传, 仅本地解析
    },
  };

  const handleImportSubmit = async () => {
    if (!currentBank || !importArchive) return;
    setImporting(true);
    try {
      const res = await importBankArchive(currentBank.id, importArchive, importMode);
      setImportSummary(res.data);
      message.success(t('questionBanks_page.imported'));
    } catch {
      /* handled by interceptor */
    } finally {
      setImporting(false);
    }
  };

  let bankDetail;
  if (currentBank) {
    const perm = currentBank.permission ?? 'viewer';
    const isOwner = perm === 'owner';
    const canEditContent = isOwner || perm === 'editor';
    const canManageExams = isOwner || perm === 'exam_manager';

    const tabItems = [
      { key: 'categories', label: t('menu.categories'), children: <CategoriesPage /> },
      { key: 'questions', label: t('menu.questions'), children: <QuestionsPage /> },
      { key: 'papers', label: t('menu.papers'), children: <PapersPage /> },
      ...(canManageExams ? [{ key: 'exams', label: t('exams_page.title'), children: <ExamsPage /> }] : []),
      ...(canEditContent ? [{ key: 'ai', label: t('menu.ai'), children: <AIPage /> }] : []),
    ];

    bankDetail = (
      <div>
        <div style={{ marginBottom: 16, display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 8 }}>
          <Space wrap>
            <Button onClick={handleBackToList}>{t('questionBanks_page.backToList')}</Button>
            <Select
              value={currentBank.id}
              onChange={handleBankSwitch}
              style={{ width: 200 }}
              options={allBanks.map((b) => ({ value: b.id, label: b.name }))}
            />
          </Space>
          <Space wrap>
            <Tag color={isOwner ? 'blue' : 'green'}>
              {permissionLabel(perm)}
            </Tag>
            <Button icon={<DownloadOutlined />} onClick={() => handleExport(currentBank.id)}>
              {t('questionBanks_page.exportArchive')}
            </Button>
            {canEditContent && (
              <Button icon={<UploadOutlined />} onClick={openImportModal}>
                {t('questionBanks_page.importArchive')}
              </Button>
            )}
            {isOwner && (
              <Button icon={<ShareAltOutlined />} onClick={() => openShareModal(currentBank.id)}>
                {t('questionBanks_page.share')}
              </Button>
            )}
          </Space>
        </div>
        <Tabs items={tabItems} />
      </div>
    );
  }

  // 未进入题库: 显示题库列表
  const columns = [
    { title: t('common.name'), dataIndex: 'name', key: 'name' },
    {
      title: t('questionBanks_page.owner'),
      key: 'owner',
      render: (_: unknown, r: QuestionBankResponse) => r.creator?.username ?? '-',
    },
    { title: t('questionBanks_page.description'), dataIndex: 'description', key: 'description', ellipsis: true },
    { title: t('questionBanks_page.questionCount'), key: 'questions', render: (_: unknown, r: QuestionBankResponse) => r._count?.questions ?? 0 },
    { title: t('questionBanks_page.categoryCount'), key: 'categories', render: (_: unknown, r: QuestionBankResponse) => r._count?.categories ?? 0 },
    { title: t('questionBanks_page.paperCount'), key: 'papers', render: (_: unknown, r: QuestionBankResponse) => r._count?.papers ?? 0 },
    {
      title: t('questionBanks_page.permission'),
      key: 'permission',
      render: (_: unknown, r: QuestionBankResponse) => {
        const p = r.permission;
        if (!p) return <Tag>-</Tag>;
        return <Tag color={p === 'owner' ? 'blue' : 'green'}>{permissionLabel(p)}</Tag>;
      },
    },
    {
      title: t('questionBanks_page.publicPractice'),
      key: 'isPublic',
      render: (_: unknown, r: QuestionBankResponse) => (
        <Switch
          checked={r.isPublic}
          disabled={!isOwnerOrAdmin(r)}
          onChange={(checked) => {
            updateQuestionBank(r.id, { isPublic: checked }).then(() => fetchData());
          }}
        />
      ),
    },
    {
      title: t('common.actions'),
      key: 'actions',
      render: (_: unknown, record: QuestionBankResponse) => (
        <Space>
          <Button type="link" size="small" onClick={() => handleEnter(record)}>
            {t('questionBanks_page.enter')}
          </Button>
          {isOwnerOrAdmin(record) && (
            <Button type="link" size="small" onClick={() => openEdit(record)}>
              {t('common.edit')}
            </Button>
          )}
          {isOwnerOrAdmin(record) && (
            <Popconfirm title={t('common.deleteConfirm')} onConfirm={() => handleDelete(record.id)}>
              <Button type="link" size="small" danger>
                {t('common.delete')}
              </Button>
            </Popconfirm>
          )}
          {isOwnerOrAdmin(record) && (
            <Button type="link" size="small" icon={<ShareAltOutlined />} onClick={() => openShareModal(record.id)}>
              {t('questionBanks_page.share')}
            </Button>
          )}
        </Space>
      ),
    },
  ];

  return (
    <>
      {currentBank ? bankDetail : (
        <>
          <div style={{ marginBottom: 16, display: 'flex', justifyContent: 'space-between', flexWrap: 'wrap', gap: 8 }}>
            <h2>{t('questionBanks_page.title')}</h2>
            <Button type="primary" icon={<PlusOutlined />} onClick={openCreate}>
              {t('questionBanks_page.createBank')}
            </Button>
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
                      <strong style={{ fontSize: 16 }}>{record.name}</strong>
                      <Tag color={record.permission === 'owner' ? 'blue' : 'green'}>
                        {permissionLabel(record.permission ?? '-')}
                      </Tag>
                    </div>
                    <div style={{ marginTop: 4, color: 'var(--muted)', fontSize: 13 }}>
                      {record.creator?.username ?? '-'} · {t('questionBanks_page.counts', { questions: record._count?.questions ?? 0, categories: record._count?.categories ?? 0, papers: record._count?.papers ?? 0 })}
                    </div>
                    {record.description && (
                      <div style={{ marginTop: 4, color: 'var(--muted)', fontSize: 13 }}>{record.description}</div>
                    )}
                    <Space wrap style={{ marginTop: 12 }}>
                      <Button size="small" type="primary" onClick={() => handleEnter(record)}>{t('questionBanks_page.enter')}</Button>
                      {isOwnerOrAdmin(record) && (
                        <Button size="small" onClick={() => openEdit(record)}>{t('common.edit')}</Button>
                      )}
                      {isOwnerOrAdmin(record) && (
                        <Popconfirm title={t('common.deleteConfirm')} onConfirm={() => handleDelete(record.id)}>
                          <Button size="small" danger>{t('common.delete')}</Button>
                        </Popconfirm>
                      )}
                      {isOwnerOrAdmin(record) && (
                        <Button size="small" icon={<ShareAltOutlined />} onClick={() => openShareModal(record.id)}>{t('questionBanks_page.share')}</Button>
                      )}
                    </Space>
                    <div style={{ marginTop: 12, display: 'flex', alignItems: 'center', gap: 8 }}>
                      <span style={{ fontSize: 13 }}>{t('questionBanks_page.publicPractice')}</span>
                      <Switch
                        checked={record.isPublic}
                        disabled={!isOwnerOrAdmin(record)}
                        onChange={(checked) => { updateQuestionBank(record.id, { isPublic: checked }).then(() => fetchData()); }}
                      />
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
        </>
      )}

      <Modal
        title={editing ? t('questionBanks_page.editBank') : t('questionBanks_page.createBank')}
        open={modalOpen}
        onOk={handleSave}
        onCancel={() => { setModalOpen(false); setEditing(null); form.resetFields(); }}
        destroyOnClose
      >
        <Form form={form} layout="vertical">
          <Form.Item name="name" label={t('common.name')} rules={[{ required: true, message: t('questionBanks_page.nameRequired') }]}>
            <Input />
          </Form.Item>
          <Form.Item name="description" label={t('questionBanks_page.description')}>
            <Input.TextArea rows={3} />
          </Form.Item>
          <Form.Item name="isPublic" label={t('questionBanks_page.publicPractice')} valuePropName="checked">
            <Switch />
          </Form.Item>
        </Form>
      </Modal>

      <Modal
        title={t('questionBanks_page.shareBank')}
        open={shareModalOpen}
        onCancel={() => setShareModalOpen(false)}
        footer={null}
        width={isMobile ? '90%' : 600}
        destroyOnClose
      >
        <div style={{ marginBottom: 16 }}>
          <Form form={shareForm} layout="inline">
            <Form.Item name="userId" rules={[{ required: true, message: t('questionBanks_page.selectTeacher') }]}>
              <Select
                showSearch
                placeholder={t('questionBanks_page.selectTeacher')}
                style={{ width: 180 }}
                optionFilterProp="label"
                options={teachers.map((t) => ({ value: t.id, label: t.username }))}
              />
            </Form.Item>
            <Form.Item name="role" rules={[{ required: true, message: t('questionBanks_page.selectPermission') }]}>
              <Select style={{ width: 140 }} options={shareRoleOptions} />
            </Form.Item>
            <Form.Item>
              <Button type="primary" onClick={handleAddShare}>{t('common.add')}</Button>
            </Form.Item>
          </Form>
        </div>

        <Table
          rowKey="id"
          size="small"
          dataSource={shares}
          pagination={false}
          columns={[
            {
              title: t('roles.teacher'),
              dataIndex: ['user', 'username'],
              key: 'username',
            },
            {
              title: t('questionBanks_page.permissionLabel'),
              dataIndex: 'role',
              key: 'role',
              render: (role: string) => permissionLabel(role),
            },
            {
              title: t('common.actions'),
              key: 'actions',
              render: (_: unknown, record: BankShareResponse) => (
                <Popconfirm title={t('questionBanks_page.removeShareConfirm')} onConfirm={() => handleRemoveShare(record.id)}>
                  <Button type="link" size="small" danger>{t('common.remove')}</Button>
                </Popconfirm>
              ),
            },
          ]}
        />
      </Modal>

      <Modal
        title={t('questionBanks_page.importArchive')}
        open={importModalOpen}
        onCancel={() => setImportModalOpen(false)}
        footer={null}
        width={isMobile ? '90%' : 560}
        destroyOnClose
      >
        {!importSummary ? (
          <Space direction="vertical" style={{ width: '100%' }} size="middle">
            <Upload {...importUploadProps}>
              <Button icon={<UploadOutlined />}>{t('questionBanks_page.chooseArchive')}</Button>
            </Upload>
            {importArchive && (
              <div style={{ color: 'var(--muted)' }}>
                {t('questionBanks_page.archiveLoaded', { name: importArchive.meta.name, categories: importArchive.categories.length, questions: importArchive.questions.length })}
              </div>
            )}
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <span>{t('questionBanks_page.conflictMode')}</span>
              <Select
                value={importMode}
                onChange={setImportMode}
                style={{ width: 200 }}
                options={[
                  { label: t('questionBanks_page.skip'), value: 'skip' },
                  { label: t('questionBanks_page.overwrite'), value: 'overwrite' },
                  { label: t('questionBanks_page.merge'), value: 'merge' },
                ]}
              />
            </div>
            {importMode === 'overwrite' && (
              <Alert type="warning" showIcon message={t('questionBanks_page.overwriteWarning')} />
            )}
            <Button
              type="primary"
              block
              disabled={!importArchive}
              loading={importing}
              onClick={handleImportSubmit}
            >
              {t('questionBanks_page.startImport')}
            </Button>
          </Space>
        ) : (
          <Space direction="vertical" style={{ width: '100%' }} size="small">
            <Alert
              type="success"
              showIcon
              message={t('questionBanks_page.importSummary', { categories: importSummary.categoriesImported, questions: importSummary.questionsImported, skipped: importSummary.skipped })}
            />
            {importSummary.errors.length > 0 && (
              <Alert
                type="error"
                showIcon
                message={t('questionBanks_page.importErrors')}
                description={importSummary.errors.map((e, i) => (<div key={i}>{e.message}</div>))}
              />
            )}
            <Button
              block
              onClick={() => {
                setImportModalOpen(false);
                fetchData();
                fetchAllBanks();
              }}
            >
              {t('common.done')}
            </Button>
          </Space>
        )}
      </Modal>
    </>
  );
}
