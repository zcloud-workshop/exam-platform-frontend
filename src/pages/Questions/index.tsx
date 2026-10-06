import { useEffect, useState, useCallback } from 'react';
import {
  Button, Table, Modal, Form, Input, Select, InputNumber, Space, Tag, Popconfirm,
  message, TreeSelect, Radio, Checkbox, Divider, Upload, List, Card,
} from 'antd';
import { PlusOutlined, UploadOutlined, DownloadOutlined, MinusCircleOutlined, EditOutlined, DeleteOutlined } from '@ant-design/icons';
import type { ColumnsType } from 'antd/es/table';
import { useTranslation } from 'react-i18next';
import {
  getQuestions, createQuestion, updateQuestion, deleteQuestion, exportQuestions, importQuestions,
} from '@/api/questions';
import { getCategoryTree } from '@/api/categories';
import type { QuestionResponse, CreateQuestionRequest, QueryQuestionParams } from '@/types/question';
import type { CategoryResponse } from '@/types/category';
import { QuestionType } from '@/types/enums';
import { getQuestionTypeLabel, getDifficultyLabel, QUESTION_TYPE_OPTIONS, DIFFICULTY_OPTIONS } from '@/utils/constants';
import { usePagination } from '@/hooks/usePagination';
import { useBankStore } from '@/stores/bankStore';
import { useBreakpoint } from '@/hooks/useBreakpoint';

function buildCategoryTree(list: CategoryResponse[]): any[] {
  return list.map((c) => ({
    value: c.id,
    title: c.name,
    children: c.children ? buildCategoryTree(c.children) : undefined,
  }));
}

// options array [{ zh, en }] -> { A: 'zh text', B: 'zh text' }
function optionsToObj(list: { zh: string; en: string }[] | undefined, field: 'zh' | 'en'): Record<string, string> {
  if (!list) return {};
  const result: Record<string, string> = {};
  list.forEach((item, i) => {
    const label = String.fromCharCode(65 + i);
    if (item[field]) result[label] = item[field];
  });
  return result;
}

/** Transform form values to API payload.
 *  表单始终保留 zh / en 两栏, 由 locale 字段决定哪一栏作为主语言 (写入 title/options/answer),
 *  另一栏写入 translations. 这样主语言可在 zh/en 间自由切换. */
function formToPayload(values: any, bankId: string) {
  const { type, difficulty, score, categoryId, locale, zhTitle, enTitle, zhAnalysis, enAnalysis, zhAnswer, enAnswer, options } = values;

  const primary: 'zh' | 'en' = locale === 'en' ? 'en' : 'zh';
  const secondary: 'zh' | 'en' = primary === 'zh' ? 'en' : 'zh';

  const primaryTitle = primary === 'zh' ? zhTitle : enTitle;
  const primaryAnalysis = primary === 'zh' ? zhAnalysis : enAnalysis;
  const secondaryTitle = primary === 'zh' ? enTitle : zhTitle;
  const secondaryAnalysis = primary === 'zh' ? enAnalysis : zhAnalysis;
  const primaryAnswerText = primary === 'zh' ? zhAnswer : enAnswer;
  const secondaryAnswerText = primary === 'zh' ? enAnswer : zhAnswer;

  const payload: any = {
    type, difficulty, score, categoryId, bankId,
    locale: primary,
    title: primaryTitle,
    analysis: primaryAnalysis || null,
  };

  // 主语言选项 (single / multiple)
  if (type === 'single' || type === 'multiple') {
    payload.options = optionsToObj(options, primary);
  }

  // 答案: 主语言 (单选/多选/判断题答案是字母, 与语言无关; 文本题取主语言栏)
  if (type === 'single' || type === 'multiple') {
    payload.answer = Array.isArray(values.answer) ? values.answer.join(',') : values.answer;
  } else if (type === 'true_false') {
    payload.answer = values.answer;
  } else {
    payload.answer = primaryAnswerText;
  }

  // 次语言翻译
  const secTranslation: any = {};
  if (secondaryTitle) secTranslation.title = secondaryTitle;
  if (secondaryAnalysis) secTranslation.analysis = secondaryAnalysis;
  if (type === 'single' || type === 'multiple') {
    const secOpts = optionsToObj(options, secondary);
    if (Object.keys(secOpts).length > 0) secTranslation.options = secOpts;
  } else if (type !== 'true_false') {
    if (secondaryAnswerText) secTranslation.answer = secondaryAnswerText;
  }
  if (Object.keys(secTranslation).length > 0) {
    payload.translations = { [secondary]: secTranslation };
  }

  return payload;
}

/** Transform question response to form values for editing.
 *  按 question.locale 判断主语言, 将主语言内容回填到对应栏, 翻译回填到另一栏. */
function questionToForm(q: QuestionResponse) {
  const primary: 'zh' | 'en' = q.locale === 'en' ? 'en' : 'zh';
  const secondary: 'zh' | 'en' = primary === 'zh' ? 'en' : 'zh';
  const tr = (q.translations as Record<string, any>)?.[secondary] || {};

  // 选项: 主语言从 q.options, 次语言从翻译取
  let options: { zh: string; en: string }[] = [];
  if (q.type === 'single' || q.type === 'multiple') {
    const primaryOpts = q.options && typeof q.options === 'object' ? (q.options as Record<string, string>) : {};
    const secondaryOpts = tr.options && typeof tr.options === 'object' ? (tr.options as Record<string, string>) : {};
    const labels = Object.keys(primaryOpts);
    options = labels.map((label) => ({
      zh: (primary === 'zh' ? primaryOpts[label] : secondaryOpts[label]) || '',
      en: (primary === 'en' ? primaryOpts[label] : secondaryOpts[label]) || '',
    }));
  }

  // 答案: 文本题按主/次语言拆分, 客观题答案不变
  let answer: any = q.answer;
  let zhAnswer = '';
  let enAnswer = '';
  if (q.type === 'multiple') {
    answer = q.answer ? q.answer.split(',') : [];
  }
  if (['fill', 'short', 'program'].includes(q.type)) {
    zhAnswer = primary === 'zh' ? q.answer : (tr.answer || '');
    enAnswer = primary === 'en' ? q.answer : (tr.answer || '');
  }

  // 标题/解析: 按 locale 分流到 zh / en 栏
  const zhTitle = primary === 'zh' ? q.title : (tr.title || '');
  const enTitle = primary === 'zh' ? (tr.title || '') : q.title;
  const zhAnalysis = primary === 'zh' ? (q.analysis || '') : (tr.analysis || '');
  const enAnalysis = primary === 'zh' ? (tr.analysis || '') : (q.analysis || '');

  return {
    type: q.type,
    difficulty: q.difficulty,
    score: q.score,
    categoryId: q.categoryId,
    locale: primary,
    zhTitle,
    enTitle,
    zhAnalysis,
    enAnalysis,
    options,
    answer,
    zhAnswer,
    enAnswer,
  };
}

export default function QuestionsPage() {
  const { t } = useTranslation();
  const [data, setData] = useState<QuestionResponse[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [categories, setCategories] = useState<any[]>([]);
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<QuestionResponse | null>(null);
  const [form] = Form.useForm();
  const { pagination, antPagination, reset } = usePagination();
  const [filters, setFilters] = useState<QueryQuestionParams>({});
  const currentBank = useBankStore((s) => s.currentBank);
  const { isMobile } = useBreakpoint();
  const permission = currentBank?.permission;
  const canEdit = permission === 'owner' || permission === 'editor';
  const canDelete = permission === 'owner';

  const questionType = Form.useWatch('type', form) || QuestionType.single;
  const showOptions = questionType === 'single' || questionType === 'multiple';
  const needTextAnswer = questionType === 'fill' || questionType === 'short' || questionType === 'program';
  // 主语言 (zh / en), 决定哪一栏作为标题/答案的源语言
  const primaryLocale: 'zh' | 'en' = Form.useWatch('locale', form) === 'en' ? 'en' : 'zh';
  const primaryLabel = t(`languages.${primaryLocale}`);
  const secondaryLabel = t(`languages.${primaryLocale === 'zh' ? 'en' : 'zh'}`);

  const fetchData = useCallback(async () => {
    if (!currentBank) return;
    setLoading(true);
    try {
      const res = await getQuestions({ ...pagination, ...filters, bankId: currentBank.id });
      setData(res.data.data);
      setTotal(res.data.total);
    } finally {
      setLoading(false);
    }
  }, [pagination, filters, currentBank]);

  useEffect(() => { fetchData(); }, [fetchData]);

  useEffect(() => {
    if (currentBank) {
      getCategoryTree(currentBank.id).then((res) => setCategories(buildCategoryTree(res.data)));
    }
  }, [currentBank]);

  const openCreate = () => {
    setEditing(null);
    form.resetFields();
    form.setFieldsValue({
      type: QuestionType.single,
      difficulty: 1,
      score: 1,
      locale: 'zh',
      options: [{ zh: '', en: '' }, { zh: '', en: '' }, { zh: '', en: '' }, { zh: '', en: '' }],
    });
    setModalOpen(true);
  };

  const openEdit = (q: QuestionResponse) => {
    setEditing(q);
    const vals = questionToForm(q);
    form.setFieldsValue(vals);
    setModalOpen(true);
  };

  const handleSubmit = async () => {
    const values = await form.validateFields();
    const payload = formToPayload(values, currentBank!.id);
    if (editing) {
      await updateQuestion(editing.id, payload);
      message.success(t('questions_page.questionUpdated'));
    } else {
      await createQuestion(payload as CreateQuestionRequest);
      message.success(t('questions_page.questionCreated'));
    }
    setModalOpen(false);
    fetchData();
  };

  const handleDelete = async (id: string) => {
    await deleteQuestion(id);
    message.success(t('questions_page.questionDeleted'));
    fetchData();
  };

  const handleImport = async (file: File) => {
    try {
      const res = await importQuestions(currentBank!.id, file);
      const { total: totalCount, success, failed, errors } = res.data;
      message.success(t('questions_page.imported', { success, total: totalCount, failed }));
      if (errors.length > 0) {
        Modal.error({
          title: t('questions_page.importErrors'),
          content: errors.map((e) => `${t('questions_page.row', { row: e.row })}: ${e.message}`).join('\n'),
        });
      }
      fetchData();
    } catch { /* handled by interceptor */ }
    return false;
  };

  const columns: ColumnsType<QuestionResponse> = [
    { title: t('common.title'), dataIndex: 'title', key: 'title', ellipsis: true, width: 300 },
    {
      title: t('common.type'), dataIndex: 'type', key: 'type', width: 130,
      render: (type: QuestionType) => <Tag>{getQuestionTypeLabel(type)}</Tag>,
    },
    {
      title: t('common.difficulty'), dataIndex: 'difficulty', key: 'difficulty', width: 100,
      render: (d: number) => getDifficultyLabel(d),
    },
    { title: t('common.score'), dataIndex: 'score', key: 'score', width: 80 },
    { title: t('common.answer'), dataIndex: 'answer', key: 'answer', ellipsis: true, width: 200 },
    {
      title: t('common.actions'), key: 'actions', width: 160,
      render: (_: any, record: QuestionResponse) => (
        <Space>
          {canEdit && <Button type="link" size="small" onClick={() => openEdit(record)}>{t('common.edit')}</Button>}
          {canDelete && (
            <Popconfirm title={t('questions_page.deleteQuestion')} onConfirm={() => handleDelete(record.id)}>
              <Button type="link" size="small" danger>{t('common.delete')}</Button>
            </Popconfirm>
          )}
        </Space>
      ),
    },
  ];

  // Get option labels for answer radio/checkbox
  const optionsFields = Form.useWatch('options', form) || [];
  const optionLabels = optionsFields.map((_: any, i: number) => String.fromCharCode(65 + i));

  return (
    <div>
      <div style={{ marginBottom: 16, display: 'flex', justifyContent: 'space-between', flexWrap: 'wrap', gap: 8 }}>
        <Space wrap>
          {canEdit && (
            <>
              <Upload accept=".xlsx" showUploadList={false} beforeUpload={handleImport}>
                <Button icon={<UploadOutlined />}>{t('common.import')}</Button>
              </Upload>
              <Button icon={<DownloadOutlined />} onClick={() => exportQuestions(currentBank!.id)}>{t('common.export')}</Button>
            </>
          )}
        </Space>
        {canEdit && (
          <Button type="primary" icon={<PlusOutlined />} onClick={openCreate}>{t('questions_page.createQuestion')}</Button>
        )}
      </div>

      <Space style={{ marginBottom: 16 }} wrap>
        <Input
          placeholder={t('common.keyword')} allowClear style={{ width: 200 }}
          onChange={(e) => { setFilters((f) => ({ ...f, keyword: e.target.value || undefined })); reset(); }}
        />
        <Select
          placeholder={t('common.type')} allowClear style={{ width: 150 }}
          options={QUESTION_TYPE_OPTIONS}
          onChange={(v) => { setFilters((f) => ({ ...f, type: v })); reset(); }}
        />
        <Select
          placeholder={t('common.difficulty')} allowClear style={{ width: 130 }}
          options={DIFFICULTY_OPTIONS}
          onChange={(v) => { setFilters((f) => ({ ...f, difficulty: v })); reset(); }}
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
                <div style={{ fontSize: 14, marginBottom: 6, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                  {record.title}
                </div>
                <Space wrap size={4}>
                  <Tag>{getQuestionTypeLabel(record.type)}</Tag>
                  <Tag>{getDifficultyLabel(record.difficulty)}</Tag>
                  <Tag color="blue">{record.score}{t('common.score')}</Tag>
                </Space>
                {(canEdit || canDelete) && (
                  <Space style={{ marginTop: 10 }}>
                    {canEdit && <Button size="small" icon={<EditOutlined />} onClick={() => openEdit(record)}>{t('common.edit')}</Button>}
                    {canDelete && (
                      <Popconfirm title={t('questions_page.deleteQuestion')} onConfirm={() => handleDelete(record.id)}>
                        <Button size="small" danger icon={<DeleteOutlined />}>{t('common.delete')}</Button>
                      </Popconfirm>
                    )}
                  </Space>
                )}
              </Card>
            </List.Item>
          )}
        />
      ) : (
        <Table rowKey="id" columns={columns} dataSource={data} loading={loading} pagination={{ ...antPagination, total }} scroll={{ x: 'max-content' }} />
      )}

      <Modal
        title={editing ? t('questions_page.editQuestion') : t('questions_page.createQuestion')}
        open={modalOpen}
        onOk={handleSubmit}
        onCancel={() => setModalOpen(false)}
        width={isMobile ? '95%' : 820}
        destroyOnClose
      >
        <Form form={form} layout="vertical">
          {/* Basic info */}
          <Space size="middle" wrap>
            <Form.Item name="type" label={t('common.type')} rules={[{ required: true }]}>
              <Select options={QUESTION_TYPE_OPTIONS} style={{ width: 150 }} />
            </Form.Item>
            <Form.Item name="difficulty" label={t('common.difficulty')}>
              <InputNumber min={1} max={5} />
            </Form.Item>
            <Form.Item name="score" label={t('common.score')}>
              <InputNumber min={1} />
            </Form.Item>
            <Form.Item name="categoryId" label={t('common.category')}>
              <TreeSelect
                allowClear style={{ width: 200 }}
                placeholder={t('ai_page.selectCategory')}
                treeData={categories} treeDefaultExpandAll showSearch treeNodeFilterProp="title"
              />
            </Form.Item>
            <Form.Item name="locale" label={t('questions_page.primaryLanguage')}>
              <Radio.Group optionType="button" buttonStyle="solid">
                <Radio value="zh">{t('languages.zh')}</Radio>
                <Radio value="en">{t('languages.en')}</Radio>
              </Radio.Group>
            </Form.Item>
          </Space>

          {/* Title - bilingual. 左栏为主语言, 右栏为次语言 */}
          <Divider>{t('common.title')}</Divider>
          <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap' }}>
            <Form.Item
              name={primaryLocale === 'zh' ? 'zhTitle' : 'enTitle'}
              label={`${primaryLabel} *`}
              rules={[{ required: true, message: t('questions_page.titleRequired') }]}
              style={{ flex: 1, minWidth: 240 }}
            >
              <Input.TextArea rows={2} placeholder={t('questions_page.titlePlaceholder', { language: primaryLabel })} />
            </Form.Item>
            <Form.Item
              name={primaryLocale === 'zh' ? 'enTitle' : 'zhTitle'}
              label={secondaryLabel}
              style={{ flex: 1, minWidth: 240 }}
            >
              <Input.TextArea rows={2} placeholder={t('questions_page.titlePlaceholder', { language: secondaryLabel })} />
            </Form.Item>
          </div>

          {/* Options - only for single / multiple */}
          {showOptions && (
            <>
              <Divider>{t('questions_page.optionsLabel')}</Divider>
              <Form.List name="options">
                {(fields, { add, remove }) => (
                  <>
                    {fields.map(({ key, name, ...restField }) => {
                      const primaryField = primaryLocale === 'zh' ? 'zh' : 'en';
                      const secondaryField = primaryLocale === 'zh' ? 'en' : 'zh';
                      return (
                        <div key={key} className="question-option-row">
                          <span style={{ fontWeight: 'bold', width: 24 }}>{String.fromCharCode(65 + name)}.</span>
                          <Form.Item {...restField} name={[name, primaryField]} rules={[{ required: true, message: t('questions_page.optionRequired') }]}>
                            <Input placeholder={primaryLabel} />
                          </Form.Item>
                          <Form.Item {...restField} name={[name, secondaryField]}>
                            <Input placeholder={secondaryLabel} />
                          </Form.Item>
                          {fields.length > 2 && (
                            <Button type="text" danger aria-label={t('common.remove')} icon={<MinusCircleOutlined />} onClick={() => remove(name)} />
                          )}
                        </div>
                      );
                    })}
                    {fields.length < 8 && (
                      <Button type="dashed" onClick={() => add({ zh: '', en: '' })} block icon={<PlusOutlined />}>
                        {t('questions_page.addOption')}
                      </Button>
                    )}
                  </>
                )}
              </Form.List>
            </>
          )}

          {/* Answer - type specific */}
          <Divider>{t('common.answer')}</Divider>

          {questionType === 'single' && (
            <Form.Item name="answer" label={t('questions_page.correctAnswer')} rules={[{ required: true, message: t('questions_page.selectAnswer') }]}>
              <Radio.Group>
                {optionLabels.map((l: string) => (
                  <Radio key={l} value={l}>{l}</Radio>
                ))}
              </Radio.Group>
            </Form.Item>
          )}

          {questionType === 'multiple' && (
            <Form.Item name="answer" label={t('questions_page.correctAnswer')} rules={[{ required: true, message: t('questions_page.selectAnswer') }]}>
              <Checkbox.Group>
                {optionLabels.map((l: string) => (
                  <Checkbox key={l} value={l}>{l}</Checkbox>
                ))}
              </Checkbox.Group>
            </Form.Item>
          )}

          {questionType === 'true_false' && (
            <Form.Item name="answer" label={t('questions_page.correctAnswer')} rules={[{ required: true, message: t('questions_page.selectAnswer') }]}>
              <Radio.Group>
                <Radio value="true">{t('examTaking.true_')}</Radio>
                <Radio value="false">{t('examTaking.false_')}</Radio>
              </Radio.Group>
            </Form.Item>
          )}

          {needTextAnswer && (
            <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap' }}>
              <Form.Item
                name={primaryLocale === 'zh' ? 'zhAnswer' : 'enAnswer'}
                label={`${primaryLabel} *`}
                rules={[{ required: true, message: t('questions_page.answerRequired') }]}
                style={{ flex: 1, minWidth: 240 }}
              >
                {questionType === 'fill' ? (
                  <Input placeholder={t('questions_page.answerPlaceholder', { language: primaryLabel })} />
                ) : (
                  <Input.TextArea rows={questionType === 'program' ? 8 : 3} placeholder={t('questions_page.answerPlaceholder', { language: primaryLabel })} />
                )}
              </Form.Item>
              <Form.Item
                name={primaryLocale === 'zh' ? 'enAnswer' : 'zhAnswer'}
                label={secondaryLabel}
                style={{ flex: 1, minWidth: 240 }}
              >
                {questionType === 'fill' ? (
                  <Input placeholder={t('questions_page.answerPlaceholder', { language: secondaryLabel })} />
                ) : (
                  <Input.TextArea rows={questionType === 'program' ? 8 : 3} placeholder={t('questions_page.answerPlaceholder', { language: secondaryLabel })} />
                )}
              </Form.Item>
            </div>
          )}

          {/* Analysis - bilingual */}
          <Divider>{t('common.analysis')}</Divider>
          <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap' }}>
            <Form.Item
              name={primaryLocale === 'zh' ? 'zhAnalysis' : 'enAnalysis'}
              label={primaryLabel}
              style={{ flex: 1, minWidth: 240 }}
            >
              <Input.TextArea rows={3} placeholder={t('questions_page.analysisPlaceholder', { language: primaryLabel })} />
            </Form.Item>
            <Form.Item
              name={primaryLocale === 'zh' ? 'enAnalysis' : 'zhAnalysis'}
              label={secondaryLabel}
              style={{ flex: 1, minWidth: 240 }}
            >
              <Input.TextArea rows={3} placeholder={t('questions_page.analysisPlaceholder', { language: secondaryLabel })} />
            </Form.Item>
          </div>
        </Form>
      </Modal>
    </div>
  );
}
