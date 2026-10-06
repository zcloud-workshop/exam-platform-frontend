import { useState, useEffect, useCallback, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import {
  Table, Button, Modal, Form, Input, message, Popconfirm, Space, Select, Switch, Tabs, Tag,
  List, Card, Upload, Alert, Dropdown,
} from 'antd';
import { PlusOutlined, ShareAltOutlined, DownloadOutlined, UploadOutlined } from '@ant-design/icons';
import { saveBlob } from '@/api/helpers';
import { createBankFromExcel, exportQuestions, importQuestions } from '@/api/questions';
import type { ImportResult } from '@/types/question';
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
  createBankFromArchive,
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
  const [importFile, setImportFile] = useState<File | null>(null);
  const [importTargetId, setImportTargetId] = useState('new');
  const [importName, setImportName] = useState('');
  const [readingFile, setReadingFile] = useState(false);
  const [excelSummary, setExcelSummary] = useState<ImportResult | null>(null);
  const [exportingId, setExportingId] = useState<string | null>(null);
  const [bankRevision, setBankRevision] = useState(0);
  const fileReadId = useRef(0);

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
    return banks;
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

  const canImport = (bank: QuestionBankResponse) => {
    return isOwnerOrAdmin(bank) || bank.permission === 'owner' || bank.permission === 'editor';
  };

  const handleExport = async (bank: QuestionBankResponse, format: string) => {
    if (exportingId) return;
    setExportingId(bank.id);
    try {
      if (format === 'excel') {
        await exportQuestions(bank.id, undefined, `${bank.name}.xlsx`);
      } else {
        const res = await exportBankArchive(bank.id);
        const blob = new Blob([JSON.stringify(res.data, null, 2)], { type: 'application/json' });
        saveBlob(blob, `${bank.name}-archive.json`);
      }
      message.success(t('questionBanks_page.exported'));
    } catch { /* handled by interceptor */ }
    finally { setExportingId(null); }
  };

  const openImportModal = (bankId = 'new') => {
    fileReadId.current++;
    setImportArchive(null);
    setImportFile(null);
    setImportTargetId(bankId);
    setImportName('');
    setImportMode('skip');
    setImportSummary(null);
    setExcelSummary(null);
    setReadingFile(false);
    setImportModalOpen(true);
  };

  const transferActions = (bank: QuestionBankResponse) => (
    <>
      <Dropdown
        trigger={['click']}
        menu={{
          items: [
            { key: 'json', label: t('questionBanks_page.jsonFormat') },
            { key: 'excel', label: t('questionBanks_page.excelFormat') },
          ],
          onClick: ({ key }) => handleExport(bank, key),
        }}
      >
        <Button size="small" icon={<DownloadOutlined />} loading={exportingId === bank.id} disabled={!!exportingId}>
          {t('questionBanks_page.exportBank')}
        </Button>
      </Dropdown>
      {canImport(bank) && (
        <Button size="small" icon={<UploadOutlined />} onClick={() => openImportModal(bank.id)}>
          {t('questionBanks_page.importBank')}
        </Button>
      )}
    </>
  );

  const importUploadProps: UploadProps = {
    accept: '.json,.xlsx',
    maxCount: 1,
    showUploadList: false,
    disabled: importing || readingFile,
    beforeUpload: async (file) => {
      const readId = ++fileReadId.current;
      setImportArchive(null);
      setImportFile(null);
      setImportName('');
      if (file.size > 10 * 1024 * 1024) {
        message.error(t('questionBanks_page.fileTooLarge'));
        return false;
      }
      const extension = file.name.split('.').pop()?.toLowerCase();
      if (extension !== 'json' && extension !== 'xlsx') {
        message.error(t('questionBanks_page.invalidFileType'));
        return false;
      }
      if (extension === 'xlsx') {
        setImportFile(file);
        setImportName(file.name.replace(/\.xlsx$/i, ''));
        return false;
      }
      setReadingFile(true);
      try {
        const parsed = JSON.parse(await file.text()) as BankArchive | null;
        if (fileReadId.current !== readId) return false;
        if (!parsed?.meta || typeof parsed.meta.name !== 'string' || !Array.isArray(parsed.categories) || !Array.isArray(parsed.questions)) {
          message.error(t('questionBanks_page.invalidArchive'));
          return false;
        }
        if (parsed.meta.version !== 1) {
          message.error(t('questionBanks_page.unsupportedVersion'));
          return false;
        }
        setImportArchive(parsed);
        setImportFile(file);
        setImportName(parsed.meta.name);
      } catch {
        if (fileReadId.current === readId) message.error(t('questionBanks_page.invalidJson'));
      } finally {
        if (fileReadId.current === readId) setReadingFile(false);
      }
      return false;
    },
  };

  const handleImportSubmit = async () => {
    if (!importFile || importing || readingFile) return;
    if (importTargetId === 'new' && !importName.trim()) {
      message.error(t('questionBanks_page.nameRequired'));
      return;
    }
    setImporting(true);
    try {
      if (importArchive) {
        const res = importTargetId === 'new'
          ? await createBankFromArchive(importArchive, importName.trim())
          : await importBankArchive(importTargetId, importArchive, importMode);
        setImportSummary('summary' in res.data ? res.data.summary : res.data);
      } else {
        const res = importTargetId === 'new'
          ? await createBankFromExcel(importFile, importName.trim())
          : await importQuestions(importTargetId, importFile);
        const summary = 'summary' in res.data ? res.data.summary : res.data;
        setExcelSummary(summary);
        setImportSummary({
          categoriesImported: 0,
          questionsImported: summary.success,
          skipped: 0,
          errors: summary.errors.map((error) => ({
            message: `${t('questions_page.row', { row: error.row })}: ${error.message}`,
          })),
        });
      }
      const banks = await fetchAllBanks();
      if (currentBank?.id === importTargetId) {
        const updated = banks.find((bank) => bank.id === currentBank.id);
        if (updated) setCurrentBank(updated);
        setBankRevision((revision) => revision + 1);
      }
      await fetchData();
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
            {transferActions(currentBank)}
            {isOwner && (
              <Button icon={<ShareAltOutlined />} onClick={() => openShareModal(currentBank.id)}>
                {t('questionBanks_page.share')}
              </Button>
            )}
          </Space>
        </div>
        <Tabs key={`${currentBank.id}-${bankRevision}`} items={tabItems} />
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
        <Space wrap>
          <Button type="link" size="small" onClick={() => handleEnter(record)}>
            {t('questionBanks_page.enter')}
          </Button>
          {transferActions(record)}
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
            <Space wrap>
              <Button icon={<UploadOutlined />} onClick={() => openImportModal()}>
                {t('questionBanks_page.importBank')}
              </Button>
              <Button type="primary" icon={<PlusOutlined />} onClick={openCreate}>
                {t('questionBanks_page.createBank')}
              </Button>
            </Space>
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
                      {transferActions(record)}
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
        title={t('questionBanks_page.importBank')}
        open={importModalOpen}
        closable={!importing}
        maskClosable={!importing}
        keyboard={!importing}
        onCancel={() => { fileReadId.current++; setImportModalOpen(false); }}
        footer={null}
        width={isMobile ? '90%' : 560}
        destroyOnClose
      >
        {!importSummary ? (
          <Space direction="vertical" style={{ width: '100%' }} size="middle">
            <Alert type="info" showIcon message={t('questionBanks_page.formatHint')} />
            <div>
              <div style={{ marginBottom: 8 }}>{t('questionBanks_page.importTarget')}</div>
              <Select
                value={importTargetId}
                onChange={setImportTargetId}
                disabled={importing}
                style={{ width: '100%' }}
                options={[
                  { value: 'new', label: t('questionBanks_page.newBankTarget') },
                  ...allBanks.filter(canImport).map((bank) => ({ value: bank.id, label: bank.name })),
                ]}
              />
            </div>
            {importTargetId === 'new' && (
              <Input
                aria-label={t('questionBanks_page.name')}
                placeholder={t('questionBanks_page.nameRequired')}
                value={importName}
                onChange={(event) => setImportName(event.target.value)}
                disabled={importing}
              />
            )}
            <Upload {...importUploadProps}>
              <Button icon={<UploadOutlined />} loading={readingFile}>{t('questionBanks_page.chooseFile')}</Button>
            </Upload>
            {importArchive && (
              <div style={{ color: 'var(--muted)' }}>
                {t('questionBanks_page.archiveLoaded', { name: importArchive.meta.name, categories: importArchive.categories.length, questions: importArchive.questions.length })}
              </div>
            )}
            {importFile && !importArchive && <div>{importFile.name}</div>}
            {importArchive && importTargetId !== 'new' && (
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <span>{t('questionBanks_page.conflictMode')}</span>
                <Select
                  value={importMode}
                  onChange={setImportMode}
                  disabled={importing}
                  style={{ width: 200 }}
                  options={[
                    { label: t('questionBanks_page.skip'), value: 'skip' },
                    { label: t('questionBanks_page.overwrite'), value: 'overwrite' },
                    { label: t('questionBanks_page.merge'), value: 'merge' },
                  ]}
                />
              </div>
            )}
            {importArchive && importTargetId !== 'new' && importMode === 'overwrite' && (
              <Alert type="warning" showIcon message={t('questionBanks_page.overwriteWarning')} />
            )}
            <Button
              type="primary"
              block
              disabled={!importFile || readingFile || (importTargetId === 'new' && !importName.trim())}
              loading={importing}
              onClick={handleImportSubmit}
            >
              {t('questionBanks_page.startImport')}
            </Button>
          </Space>
        ) : (
          <Space direction="vertical" style={{ width: '100%' }} size="small">
            <Alert
              type={importSummary.errors.length > 0 ? 'warning' : 'success'}
              showIcon
              message={excelSummary
                ? t('questions_page.imported', { success: excelSummary.success, total: excelSummary.total, failed: excelSummary.failed })
                : t('questionBanks_page.importSummary', { categories: importSummary.categoriesImported, questions: importSummary.questionsImported, skipped: importSummary.skipped })}
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
              disabled={importing}
              onClick={() => {
                setImportModalOpen(false);
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
