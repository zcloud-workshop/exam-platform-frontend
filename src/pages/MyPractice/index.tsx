import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router';
import { Alert, Button, Card, Col, Collapse, Empty, Pagination, Row, Select, Space, Statistic, Tabs, Tag, Typography } from 'antd';
import { ArrowRightOutlined, BookOutlined, CheckCircleOutlined, ClockCircleOutlined, HistoryOutlined, InfoCircleOutlined, StarFilled, StarOutlined } from '@ant-design/icons';
import { useTranslation } from 'react-i18next';
import PublicHeader from '@/components/Layout/PublicHeader';
import { usePagination } from '@/hooks/usePagination';
import { useBreakpoint } from '@/hooks/useBreakpoint';
import { useLocaleStore } from '@/stores/localeStore';
import { QuestionType } from '@/types/enums';
import { formatDateTime } from '@/utils/format';
import { getQuestionTypeLabel } from '@/utils/constants';
import {
  favoritePracticeQuestion, unfavoritePracticeQuestion, getMyPracticeQuestions,
  getMyPracticeRecords, getMyPracticeSummary, getPublicBanks, removeWrongPracticeQuestion,
} from '@/api/practice';
import type {
  MyPracticeQuestionResponse, PracticeCollection, PracticeQuestionResponse,
  PracticeRecordResponse, PracticeSummaryResponse, PublicBankResponse,
} from '@/api/practice';

type PracticeTab = PracticeCollection | 'records';

export default function MyPracticePage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { isMobile } = useBreakpoint();
  const [searchParams, setSearchParams] = useSearchParams();
  const selectedTab = searchParams.get('tab');
  const tab: PracticeTab = selectedTab === 'favorites' || selectedTab === 'records' ? selectedTab : 'wrong';
  const bankId = searchParams.get('bankId') || undefined;
  const [summary, setSummary] = useState<PracticeSummaryResponse | null>(null);
  const [banks, setBanks] = useState<PublicBankResponse[]>([]);
  const [loading, setLoading] = useState(true);
  const [failed, setFailed] = useState(false);
  const [banksFailed, setBanksFailed] = useState(false);
  const [revision, setRevision] = useState(0);
  const [retry, setRetry] = useState(0);

  useEffect(() => {
    let ignore = false;
    setLoading(true);
    setFailed(false);
    getMyPracticeSummary().then((result) => {
      if (ignore) return;
      setSummary(result.data);
    }).catch(() => {
      if (!ignore) setFailed(true);
    }).finally(() => {
      if (!ignore) setLoading(false);
    });
    return () => { ignore = true; };
  }, [revision, retry]);

  useEffect(() => {
    let ignore = false;
    setBanksFailed(false);
    getPublicBanks().then((result) => {
      if (!ignore) setBanks(result.data);
    }).catch(() => {
      if (!ignore) setBanksFailed(true);
    });
    return () => { ignore = true; };
  }, [retry]);

  const changeTab = (key: string) => setSearchParams((params) => {
    params.set('tab', key);
    return params;
  });

  const changeBank = (value: string | undefined) => setSearchParams((params) => {
    if (value) params.set('bankId', value);
    else params.delete('bankId');
    return params;
  });

  const metrics = [
    { key: 'wrong' as const, title: t('practice.wrongQuestions'), value: summary?.wrongCount, icon: <BookOutlined />, action: t('practice.reviewMistakes') },
    { key: 'favorites' as const, title: t('practice.favorites'), value: summary?.favoriteCount, icon: <StarOutlined />, action: t('practice.viewFavorites') },
    { key: 'records' as const, title: t('practice.attempts'), value: summary?.attemptCount, icon: <HistoryOutlined />, action: t('practice.viewRecords') },
    { key: 'accuracy' as const, title: t('practice.accuracy'), value: summary?.gradedCount ? summary.correctCount / summary.gradedCount * 100 : undefined, icon: <CheckCircleOutlined />, action: t('practice.accuracyNote') },
  ];

  return (
    <div className="practice-shell">
      <PublicHeader />
      <main className="page-container my-practice-page">
        <div className="my-practice-heading">
          <div>
            <Typography.Title level={2}>{t('practice.myPracticeTitle')}</Typography.Title>
            <Typography.Paragraph type="secondary">{t('practice.myPracticeDescription')}</Typography.Paragraph>
          </div>
          <Button icon={<ArrowRightOutlined />} onClick={() => navigate('/practice')}>{t('practice.browseBanks')}</Button>
        </div>
        {(failed || banksFailed) && <Alert type="error" showIcon title={t('practice.personalLoadFailed')} action={<Button onClick={() => setRetry((value) => value + 1)}>{t('practice.retry')}</Button>} style={{ marginBottom: 16 }} />}
        <Row gutter={[16, 16]} className="my-practice-stats">
          {metrics.map((metric) => (
            <Col key={metric.key} xs={12} md={6}>
              <Card className={`my-practice-stat${tab === metric.key ? ' is-active' : ''}`} loading={loading && !summary}>
                <Statistic title={<span className="my-practice-stat-title">{metric.title}<span className="my-practice-stat-icon">{metric.icon}</span></span>} value={metric.value ?? '-'} precision={metric.key === 'accuracy' ? 1 : 0} suffix={metric.key === 'accuracy' && summary?.gradedCount ? '%' : undefined} />
                {metric.key === 'accuracy' ? <Typography.Text type="secondary" className="my-practice-stat-note">{isMobile ? t('practice.accuracyShortNote') : metric.action}</Typography.Text> : <Button type="text" className="my-practice-stat-link" onClick={() => changeTab(metric.key)}>{metric.action}<ArrowRightOutlined /></Button>}
              </Card>
            </Col>
          ))}
        </Row>
        <p className="my-practice-scope"><InfoCircleOutlined />{t('practice.publicOnly')}</p>
        <section className="my-practice-panel" aria-label={t('practice.myPracticeTitle')}>
          <Tabs activeKey={tab} onChange={changeTab} items={[
            { key: 'wrong', label: t(isMobile ? 'practice.wrongTab' : 'practice.wrongQuestions'), icon: isMobile ? undefined : <BookOutlined /> },
            { key: 'favorites', label: t(isMobile ? 'practice.favoritesTab' : 'practice.favorites'), icon: isMobile ? undefined : <StarOutlined /> },
            { key: 'records', label: t(isMobile ? 'practice.recordsTab' : 'practice.records'), icon: isMobile ? undefined : <HistoryOutlined /> },
          ]} />
          <MyPracticeList key={`${tab}:${bankId ?? ''}`} tab={tab} bankId={bankId} banks={banks} revision={revision} onBankChange={changeBank} onChanged={() => setRevision((value) => value + 1)} />
        </section>
      </main>
    </div>
  );
}

function MyPracticeList({ tab, bankId, banks, revision, onBankChange, onChanged }: {
  tab: PracticeTab; bankId?: string; banks: PublicBankResponse[]; revision: number;
  onBankChange: (bankId: string | undefined) => void; onChanged: () => void;
}) {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const locale = useLocaleStore((state) => state.locale);
  const { isMobile } = useBreakpoint();
  const { pagination, antPagination } = usePagination();
  const [questions, setQuestions] = useState<MyPracticeQuestionResponse[]>([]);
  const [records, setRecords] = useState<PracticeRecordResponse[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [failed, setFailed] = useState(false);
  const [retry, setRetry] = useState(0);
  const [changingQuestion, setChangingQuestion] = useState<string | null>(null);

  useEffect(() => {
    let ignore = false;
    setLoading(true);
    setFailed(false);
    const load = async () => {
      try {
        if (tab === 'records') {
          const result = await getMyPracticeRecords({ ...pagination, bankId });
          if (ignore) return;
          setRecords(result.data.data);
          setTotal(result.data.total);
        } else {
          const result = await getMyPracticeQuestions({ ...pagination, bankId, collection: tab });
          if (ignore) return;
          setQuestions(result.data.data);
          setTotal(result.data.total);
        }
      } catch {
        if (!ignore) setFailed(true);
      } finally {
        if (!ignore) setLoading(false);
      }
    };
    load();
    return () => { ignore = true; };
  }, [tab, bankId, pagination, revision, retry]);

  const practiceAgain = (question: PracticeQuestionResponse, questionBankId: string) => {
    const params = new URLSearchParams({ questionId: question.id });
    navigate(`/practice/${encodeURIComponent(questionBankId)}?${params}`);
  };

  const changeQuestion = async (question: PracticeQuestionResponse, questionBankId: string, removeWrong = false) => {
    setChangingQuestion(question.id);
    try {
      if (removeWrong) await removeWrongPracticeQuestion(question.id);
      else if (question.isFavorite) await unfavoritePracticeQuestion(questionBankId, question.id);
      else await favoritePracticeQuestion(questionBankId, question.id);
      if (tab !== 'records' && questions.length === 1 && pagination.page > 1 && (removeWrong || tab === 'favorites')) {
        antPagination.onChange(pagination.page - 1, pagination.pageSize);
      }
      onChanged();
    } catch {
      // The request interceptor displays the error; leave the item available for retry.
    } finally {
      setChangingQuestion(null);
    }
  };

  const questionHeader = (question: PracticeQuestionResponse, bank: { id: string; name: string }) => (
    <>
      <Space wrap className="my-practice-item-tags">
        <Tag className="my-practice-bank-tag">{bank.name}</Tag>
        <Tag>{getQuestionTypeLabel(question.type as QuestionType)}</Tag>
        {question.isWrong && <Tag color="error">{t('practice.wrongQuestions')}</Tag>}
      </Space>
      <Typography.Paragraph strong className="my-practice-item-title">
        {question.translations?.[locale]?.title ?? question.title}
      </Typography.Paragraph>
    </>
  );

  const questionActions = (question: PracticeQuestionResponse, bank: { id: string; name: string }) => (
    <div className="my-practice-item-actions">
      <div className="my-practice-action-buttons">
        <Button type="primary" onClick={() => practiceAgain(question, bank.id)}>{t('practice.practiceAgain')}</Button>
        <Button icon={question.isFavorite ? <StarFilled /> : <StarOutlined />} loading={changingQuestion === question.id} disabled={changingQuestion !== null} onClick={() => changeQuestion(question, bank.id)}>{t(question.isFavorite ? 'practice.unfavorite' : 'practice.favorite')}</Button>
        {tab === 'wrong' && <Button type="text" disabled={changingQuestion !== null} onClick={() => changeQuestion(question, bank.id, true)}>{t('practice.removeWrong')}</Button>}
      </div>
      {tab !== 'records' && <Button type="link" icon={<ArrowRightOutlined />} onClick={() => navigate(`/practice/${encodeURIComponent(bank.id)}?collection=${tab}`)}>{t('practice.reviewBank')}</Button>}
    </div>
  );

  const displayAnswer = (value: string, type: string) => {
    if (type === QuestionType.true_false && (value === 'true' || value === 'false')) return t(`examTaking.${value === 'true' ? 'true_' : 'false_'}`);
    return value;
  };

  return (
    <div aria-busy={loading}>
      <div className="my-practice-toolbar">
        <div className="my-practice-list-description">
          <Typography.Paragraph type="secondary">{t(`practice.${tab === 'wrong' ? 'wrongDescription' : tab === 'favorites' ? 'favoritesDescription' : 'recordsDescription'}`)}</Typography.Paragraph>
          <Typography.Text className="my-practice-result-count" aria-live="polite">{!loading && !failed ? t('common.pageTotal', { count: total }) : '\u00a0'}</Typography.Text>
        </div>
        <Select allowClear showSearch optionFilterProp="label" aria-label={t('practice.allBanks')} placeholder={t('practice.allBanks')} value={bankId} onChange={onBankChange} options={banks.map((bank) => ({ value: bank.id, label: bank.name }))} style={{ width: isMobile ? '100%' : 280 }} />
      </div>
      {failed ? (
        <Alert type="error" showIcon title={t('practice.personalLoadFailed')} action={<Button onClick={() => setRetry((value) => value + 1)}>{t('practice.retry')}</Button>} />
      ) : loading ? <div className="my-practice-list">{[0, 1, 2].map((key) => <Card key={key} className="my-practice-item" loading />)}</div> : total === 0 ? (
        <div className="my-practice-empty">
          <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description={bankId ? t('practice.filteredEmpty') : t(`practice.${tab === 'wrong' ? 'emptyWrong' : tab === 'favorites' ? 'emptyFavorites' : 'emptyRecords'}`)}>
            <Space wrap>
              {bankId && <Button onClick={() => onBankChange(undefined)}>{t('practice.clearBankFilter')}</Button>}
              <Button type="primary" onClick={() => navigate(bankId ? `/practice/${encodeURIComponent(bankId)}` : '/practice')}>{t(bankId ? 'practice.start' : 'practice.browseBanks')}</Button>
            </Space>
          </Empty>
        </div>
      ) : (
        <>
          <div className="my-practice-list">{tab === 'records' ? records.map((record) => (
            <Card key={record.id} className="my-practice-item">
              {questionHeader(record.question, record.bank)}
              <Space wrap className="my-practice-item-meta">
                <Tag color={record.correct === null ? 'default' : record.correct ? 'success' : 'error'}>{t(record.correct === null ? 'practice.notGraded' : record.correct ? 'practice.correct' : 'practice.incorrect')}</Tag>
                <Typography.Text type="secondary"><ClockCircleOutlined /> {formatDateTime(record.createdAt)}</Typography.Text>
              </Space>
              <Collapse className="my-practice-record-details" items={[{
                key: 'answer', label: t('practice.recordDetails'), children: (
                  <div className="my-practice-record-content">
                    <div className="my-practice-record-options">{Object.entries(record.question.options ?? {}).map(([key, text]) => <Typography.Paragraph key={key}><strong>{key}.</strong> {record.question.translations?.[locale]?.options?.[key] ?? text}</Typography.Paragraph>)}</div>
                    <div className="my-practice-answer-grid">
                      <div><Typography.Text type="secondary">{t('practice.yourAnswer')}</Typography.Text><Typography.Paragraph strong>{displayAnswer(record.userAnswer, record.question.type)}</Typography.Paragraph></div>
                      <div><Typography.Text type="secondary">{t('practice.referenceAnswer')}</Typography.Text><Typography.Paragraph strong>{displayAnswer(record.answer, record.question.type)}</Typography.Paragraph></div>
                    </div>
                    {record.analysis && <div className="my-practice-record-analysis"><Typography.Text type="secondary">{t('common.analysis')}</Typography.Text><Typography.Paragraph>{record.analysis}</Typography.Paragraph></div>}
                  </div>
                ),
              }]} />
              {questionActions(record.question, record.bank)}
            </Card>
          )) : questions.map((item) => (
            <Card key={item.question.id} className="my-practice-item">
              {questionHeader(item.question, item.bank)}
              <Space wrap className="my-practice-item-meta">
                <Typography.Text type="secondary">{t('practice.attemptCount', { count: item.attemptCount })}</Typography.Text>
                {item.wrongCount > 0 && <Typography.Text type="secondary">{t('practice.wrongCount', { count: item.wrongCount })}</Typography.Text>}
                <Typography.Text type="secondary"><ClockCircleOutlined /> {item.lastAttemptAt ? `${t('practice.lastPracticed')}: ${formatDateTime(item.lastAttemptAt)}` : t('practice.neverPracticed')}</Typography.Text>
              </Space>
              {questionActions(item.question, item.bank)}
            </Card>
          ))}</div>
          <Pagination {...antPagination} total={total} showSizeChanger size={isMobile ? 'small' : undefined} className="my-practice-pagination" />
        </>
      )}
    </div>
  );
}
