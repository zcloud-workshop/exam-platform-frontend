import { useState, useEffect } from 'react';
import { Card, Tabs, Form, Input, Select, InputNumber, Button, Table, Space, Typography, message, TreeSelect, Alert, Modal, Tag, Divider } from 'antd';
import { RobotOutlined, TranslationOutlined } from '@ant-design/icons';
import { useTranslation } from 'react-i18next';
import { generateQuestions, generateAnalysis, rulePaperCompose, aiPaperCompose, translateQuestion } from '@/api/ai';
import { updateQuestion } from '@/api/questions';
import { getAllPages } from '@/utils/pagination';
import { getCategoryTree } from '@/api/categories';
import { getQuestions } from '@/api/questions';
import type { CategoryResponse } from '@/types/category';
import type { QuestionResponse, QuestionTranslation } from '@/types/question';
import type { AiTranslationDraft } from '@/types/ai';
import { QuestionType } from '@/types/enums';
import { getQuestionTypeLabel } from '@/utils/constants';
import { useBankStore } from '@/stores/bankStore';
const { Title, Text, Paragraph } = Typography;

function buildCatOptions(list: CategoryResponse[]): any[] {
  return list.map((c) => ({
    value: c.id,
    title: c.name,
    children: c.children ? buildCatOptions(c.children) : undefined,
  }));
}

export default function AIPage() {
  const { t } = useTranslation();
  const [categories, setCategories] = useState<any[]>([]);
  const [genLoading, setGenLoading] = useState(false);
  const [generatedQuestions, setGeneratedQuestions] = useState<QuestionResponse[]>([]);
  const [analysisLoading, setAnalysisLoading] = useState(false);
  const [questions, setQuestions] = useState<QuestionResponse[]>([]);
  const [ruleLoading, setRuleLoading] = useState(false);
  const [aiLoading, setAiLoading] = useState(false);
  // AI 翻译相关状态
  const [translateLoading, setTranslateLoading] = useState(false);
  const [translateModalOpen, setTranslateModalOpen] = useState(false);
  const [translatingQuestion, setTranslatingQuestion] = useState<QuestionResponse | null>(null);
  const [translateTarget, setTranslateTarget] = useState<'zh' | 'en'>('en');
  const [saveLoading, setSaveLoading] = useState(false);
  const [translateForm] = Form.useForm();
  const currentBank = useBankStore((s) => s.currentBank);
  const permission = currentBank?.permission;
  const canUseAI = permission === 'owner' || permission === 'editor';

  useEffect(() => {
    if (!currentBank) return;
    getCategoryTree(currentBank.id).then((res) => setCategories(buildCatOptions(res.data)));
    getAllPages((params) => getQuestions({ ...params, bankId: currentBank.id })).then(setQuestions);
  }, [currentBank]);

  const handleGenerate = async (values: any) => {
    setGenLoading(true);
    try {
      const res = await generateQuestions({ ...values, bankId: currentBank!.id });
      setGeneratedQuestions(res.data.questions);
      message.success(t('ai_page.generated', { count: res.data.count }));
    } catch { /* handled */ }
    setGenLoading(false);
  };

  const handleAnalysis = async (questionId: string) => {
    setAnalysisLoading(true);
    try {
      const res = await generateAnalysis(questionId);
      message.success(t('ai_page.analysisGenerated'));
      setQuestions((prev) => prev.map((q) => (q.id === questionId ? res.data : q)));
    } catch { /* handled */ }
    setAnalysisLoading(false);
  };

  const handleRulePaper = async (values: any) => {
    setRuleLoading(true);
    try {
      await rulePaperCompose({ ...values, bankId: currentBank!.id });
      message.success(t('ai_page.paperComposed'));
    } catch { /* handled */ }
    setRuleLoading(false);
  };

  const handleAiPaper = async (values: any) => {
    setAiLoading(true);
    try {
      await aiPaperCompose({ ...values, bankId: currentBank!.id });
      message.success(t('ai_page.aiPaperComposed'));
    } catch { /* handled */ }
    setAiLoading(false);
  };

  // === AI 翻译 ===

  // 目标语言 = 主语言之外的语言
  const targetLocaleOf = (q: QuestionResponse): 'zh' | 'en' =>
    q.locale === 'en' ? 'zh' : 'en';

  // 是否已有目标语言翻译
  const hasTranslation = (q: QuestionResponse): boolean => {
    const target = targetLocaleOf(q);
    return Boolean((q.translations as Record<string, any> | null)?.[target]);
  };

  const openTranslate = async (q: QuestionResponse) => {
    const target = targetLocaleOf(q);
    setTranslatingQuestion(q);
    setTranslateTarget(target);
    translateForm.resetFields();
    setTranslateModalOpen(true);
    setTranslateLoading(true);
    try {
      const res = await translateQuestion(q.id, { targetLocale: target });
      const d: AiTranslationDraft = res.data.translation;
      // 预填表单: AI 草稿
      translateForm.setFieldsValue({
        title: d.title,
        options: d.options ? Object.entries(d.options).map(([, v]) => v as string) : undefined,
        answer: d.answer,
        analysis: d.analysis,
      });
      message.success(t('ai_page.translated'));
    } catch {
      setTranslateModalOpen(false);
      /* handled */
    }
    setTranslateLoading(false);
  };

  const handleSaveTranslation = async () => {
    if (!translatingQuestion) return;
    const values = await translateForm.validateFields();
    const translation: QuestionTranslation = { title: values.title };
    // 选项: 文本数组 → 对象 {A,B,...}
    if (Array.isArray(values.options)) {
      const opts: Record<string, string> = {};
      values.options.forEach((text: string, i: number) => {
        if (text) opts[String.fromCharCode(65 + i)] = text;
      });
      if (Object.keys(opts).length > 0) translation.options = opts;
    }
    if (values.answer) translation.answer = values.answer;
    if (values.analysis) translation.analysis = values.analysis;

    setSaveLoading(true);
    try {
      const updated = await updateQuestion(translatingQuestion.id, {
        translations: { [translateTarget]: translation },
      });
      setQuestions((prev) => prev.map((q) => (q.id === translatingQuestion.id ? updated.data : q)));
      message.success(t('ai_page.saved'));
      setTranslateModalOpen(false);
    } catch { /* handled */ }
    setSaveLoading(false);
  };

  if (!currentBank) {
    return <Alert type="info" message={t('questionBanks_page.noBankSelected')} showIcon />;
  }

  const catSelect = (
    <TreeSelect
      allowClear
      placeholder={t('ai_page.selectCategory')}
      treeData={categories}
      treeDefaultExpandAll
      showSearch
      treeNodeFilterProp="title"
    />
  );

  return (
    <div>
      <Title level={4}>{t('ai_page.title')}</Title>
      <Tabs items={[
        {
          key: 'generate',
          label: t('ai_page.generateQuestions'),
          children: (
            <Card>
              <Form layout="vertical" onFinish={handleGenerate} style={{ maxWidth: 500 }}>
                <Form.Item name="topic" label={t('ai_page.topic')} rules={[{ required: true }]}>
                  <Input placeholder={t('ai_page.topicPlaceholder')} />
                </Form.Item>
                <Space size="large">
                  <Form.Item name="type" label={t('common.type')} rules={[{ required: true }]}>
                    <Select options={Object.values(QuestionType).map((v) => ({ value: v, label: getQuestionTypeLabel(v) }))} style={{ width: 160 }} />
                  </Form.Item>
                  <Form.Item name="count" label={t('ai_page.count')} initialValue={5}>
                    <InputNumber min={1} max={20} />
                  </Form.Item>
                  <Form.Item name="difficulty" label={t('common.difficulty')}>
                    <InputNumber min={1} max={5} />
                  </Form.Item>
                </Space>
                <Form.Item name="categoryId" label={t('common.category')}>{catSelect}</Form.Item>
                <Form.Item>
                  <Button type="primary" htmlType="submit" icon={<RobotOutlined />} loading={genLoading} disabled={!canUseAI}>{t('ai_page.generate')}</Button>
                </Form.Item>
              </Form>
              {generatedQuestions.length > 0 && (
                <Table
                  rowKey="id"
                  size="small"
                  dataSource={generatedQuestions}
                  columns={[
                    { title: t('common.title'), dataIndex: 'title', ellipsis: true },
                    { title: t('common.type'), dataIndex: 'type', render: (t) => getQuestionTypeLabel(t as QuestionType) },
                    { title: t('common.answer'), dataIndex: 'answer', ellipsis: true },
                  ]}
                  pagination={false}
                />
              )}
            </Card>
          ),
        },
        {
          key: 'analysis',
          label: t('ai_page.generateAnalysis'),
          children: (
            <Card>
              <Table
                rowKey="id"
                size="small"
                dataSource={questions}
                columns={[
                  { title: t('common.title'), dataIndex: 'title', ellipsis: true },
                  { title: t('common.type'), dataIndex: 'type', render: (t) => getQuestionTypeLabel(t as QuestionType), width: 120 },
                  {
                    title: t('common.analysis'),
                    dataIndex: 'analysis',
                    ellipsis: true,
                    render: (v: string | null) => v || <Text type="secondary">{t('ai_page.noAnalysis')}</Text>,
                  },
                  {
                    title: t('common.actions'),
                    width: 120,
                    render: (_: any, r: QuestionResponse) => (
                      <Button size="small" icon={<RobotOutlined />} loading={analysisLoading} onClick={() => handleAnalysis(r.id)} disabled={!canUseAI}>
                        {t('ai_page.generate')}
                      </Button>
                    ),
                  },
                ]}
                pagination={{ pageSize: 10 }}
              />
            </Card>
          ),
        },
        {
          key: 'rule-paper',
          label: t('ai_page.rulePaper'),
          children: (
            <Card>
              <Form layout="vertical" onFinish={handleRulePaper} style={{ maxWidth: 600 }}>
                <Form.Item name="name" label={t('ai_page.paperName')} rules={[{ required: true }]}>
                  <Input />
                </Form.Item>
                <Space size="large">
                  <Form.Item name="duration" label={t('papers.durationMin')} rules={[{ required: true }]}>
                    <InputNumber min={1} />
                  </Form.Item>
                  <Form.Item name="totalScore" label={t('papers.totalScore')} rules={[{ required: true }]}>
                    <InputNumber min={1} />
                  </Form.Item>
                </Space>
                <Form.List name="rules">
                  {(fields, { add, remove }) => (
                    <>
                      {fields.map((field, idx) => (
                        <Space key={field.key} style={{ display: 'flex', marginBottom: 8 }} align="baseline">
                          <Form.Item name={[field.name, 'type']} label={t('common.type')}>
                            <Select options={Object.values(QuestionType).map((v) => ({ value: v, label: getQuestionTypeLabel(v) }))} style={{ width: 140 }} allowClear placeholder={t('common.any')} />
                          </Form.Item>
                          <Form.Item name={[field.name, 'difficulty']} label={t('common.difficulty')}>
                            <InputNumber min={1} max={5} placeholder={t('common.any')} />
                          </Form.Item>
                          <Form.Item name={[field.name, 'count']} label={t('ai_page.count')} rules={[{ required: true }]}>
                            <InputNumber min={1} />
                          </Form.Item>
                          <Form.Item name={[field.name, 'scorePerQuestion']} label={t('ai_page.scorePerQuestion')} rules={[{ required: true }]}>
                            <InputNumber min={1} />
                          </Form.Item>
                          <Button danger onClick={() => remove(idx)}>{t('ai_page.remove')}</Button>
                        </Space>
                      ))}
                      <Form.Item>
                        <Button type="dashed" onClick={() => add()}>{t('ai_page.addRule')}</Button>
                      </Form.Item>
                    </>
                  )}
                </Form.List>
                <Form.Item>
                  <Button type="primary" htmlType="submit" loading={ruleLoading} disabled={!canUseAI}>{t('ai_page.composePaper')}</Button>
                </Form.Item>
              </Form>
            </Card>
          ),
        },
        {
          key: 'ai-paper',
          label: t('ai_page.aiPaper'),
          children: (
            <Card>
              <Form layout="vertical" onFinish={handleAiPaper} style={{ maxWidth: 500 }}>
                <Form.Item name="name" label={t('ai_page.paperName')} rules={[{ required: true }]}>
                  <Input />
                </Form.Item>
                <Space size="large">
                  <Form.Item name="duration" label={t('papers.durationMin')} rules={[{ required: true }]}>
                    <InputNumber min={1} />
                  </Form.Item>
                  <Form.Item name="totalScore" label={t('papers.totalScore')} rules={[{ required: true }]}>
                    <InputNumber min={1} />
                  </Form.Item>
                </Space>
                <Form.Item name="subject" label={t('ai_page.subject')} rules={[{ required: true }]}>
                  <Input placeholder={t('ai_page.subjectPlaceholder')} />
                </Form.Item>
                <Form.Item name="difficultyPreference" label={t('ai_page.difficultyPreference')}>
                  <Input placeholder={t('ai_page.difficultyPlaceholder')} />
                </Form.Item>
                <Form.Item name="categoryId" label={t('common.category')}>{catSelect}</Form.Item>
                <Form.Item>
                  <Button type="primary" htmlType="submit" icon={<RobotOutlined />} loading={aiLoading} disabled={!canUseAI}>{t('ai_page.aiCompose')}</Button>
                </Form.Item>
              </Form>
            </Card>
          ),
        },
        {
          key: 'translate',
          label: <span><TranslationOutlined /> {t('ai_page.translate')}</span>,
          children: (
            <Card>
              <Paragraph type="secondary">{t('ai_page.translateDesc')}</Paragraph>
              <Table
                rowKey="id"
                size="small"
                dataSource={questions}
                loading={false}
                pagination={{ pageSize: 10 }}
                columns={[
                  { title: t('common.title'), dataIndex: 'title', ellipsis: true },
                  { title: t('common.type'), dataIndex: 'type', width: 120, render: (v) => getQuestionTypeLabel(v as QuestionType) },
                  {
                    title: t('questions_page.primaryLanguage'), dataIndex: 'locale', width: 110,
                    render: (v: string) => <Tag color="blue">{t(`languages.${v}`)}</Tag>,
                  },
                  {
                    title: t('ai_page.targetLanguage'), width: 120,
                    render: (_: any, r: QuestionResponse) => (
                      <Tag color="geekblue">{t(`languages.${targetLocaleOf(r)}`)}</Tag>
                    ),
                  },
                  {
                    title: t('common.status'), width: 110,
                    render: (_: any, r: QuestionResponse) =>
                      hasTranslation(r)
                        ? <Tag color="green">{t('ai_page.hasTranslation')}</Tag>
                        : <Tag>{t('ai_page.noTranslation')}</Tag>,
                  },
                  {
                    title: t('common.actions'), width: 120,
                    render: (_: any, r: QuestionResponse) => (
                      <Button
                        size="small"
                        icon={<TranslationOutlined />}
                        loading={translateLoading && translatingQuestion?.id === r.id}
                        onClick={() => openTranslate(r)}
                        disabled={!canUseAI}
                      >
                        {t('ai_page.translateQuestion')}
                      </Button>
                    ),
                  },
                ]}
              />
            </Card>
          ),
        },
      ]} />

      {/* AI 翻译修订弹窗 */}
      <Modal
        title={`${t('ai_page.translate')} → ${t(`languages.${translateTarget}`)}`}
        open={translateModalOpen}
        onOk={handleSaveTranslation}
        onCancel={() => setTranslateModalOpen(false)}
        confirmLoading={saveLoading}
        okText={t('ai_page.saveToBank')}
        width={720}
        destroyOnClose
      >
        {translatingQuestion && (
          <Alert
            style={{ marginBottom: 16 }}
            type="info"
            message={`${t('ai_page.targetLanguage')}: ${t(`languages.${translateTarget}`)}`}
            description={
              <Text type="secondary" style={{ fontSize: 12 }}>
                {translatingQuestion.title}
              </Text>
            }
          />
        )}
        {translateLoading ? (
          <div style={{ textAlign: 'center', padding: 40 }}>
            <RobotOutlined style={{ fontSize: 28 }} />
            <div style={{ marginTop: 12 }}>{t('ai_page.translating')}</div>
          </div>
        ) : (
          <Form form={translateForm} layout="vertical">
            <Form.Item name="title" label={t('common.title')} rules={[{ required: true }]}>
              <Input.TextArea rows={2} />
            </Form.Item>
            {translatingQuestion && (translatingQuestion.type === 'single' || translatingQuestion.type === 'multiple') && (
              <>
                <Divider>{t('questions_page.optionsLabel')}</Divider>
                <Form.List name="options">
                  {(fields) => (
                    <>
                      {fields.map((field) => (
                        <Space key={field.key} style={{ display: 'flex', marginBottom: 8 }} align="baseline">
                          <span style={{ fontWeight: 'bold', width: 24 }}>{String.fromCharCode(65 + field.name)}.</span>
                          <Form.Item {...field} noStyle>
                            <Input style={{ width: 460 }} />
                          </Form.Item>
                        </Space>
                      ))}
                    </>
                  )}
                </Form.List>
              </>
            )}
            {translatingQuestion && translatingQuestion.type !== 'true_false' && (
              <Form.Item name="answer" label={t('common.answer')}>
                <Input.TextArea rows={translatingQuestion.type === 'program' ? 6 : 2} />
              </Form.Item>
            )}
            <Form.Item name="analysis" label={t('common.analysis')}>
              <Input.TextArea rows={3} />
            </Form.Item>
          </Form>
        )}
      </Modal>
    </div>
  );
}
