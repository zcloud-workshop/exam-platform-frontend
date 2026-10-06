import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router';
import { Alert, Button, Card, Col, Collapse, Empty, Pagination, Row, Select, Space, Statistic, Tabs, Tag, Typography } from 'antd';
import { ArrowLeftOutlined, BookOutlined, HistoryOutlined, StarFilled, StarOutlined } from '@ant-design/icons';
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
  const [searchParams, setSearchParams] = useSearchParams();
  const selectedTab = searchParams.get('tab');
  const tab: PracticeTab = selectedTab === 'favorites' || selectedTab === 'records' ? selectedTab : 'wrong';
  const [summary, setSummary] = useState<PracticeSummaryResponse | null>(null);
  const [banks, setBanks] = useState<PublicBankResponse[]>([]);
  const [loading, setLoading] = useState(true);
  const [failed, setFailed] = useState(false);
  const [revision, setRevision] = useState(0);

  useEffect(() => {
    let ignore = false;
    setLoading(true);
    setFailed(false);
    Promise.all([getMyPracticeSummary(), getPublicBanks()]).then(([summaryResult, banksResult]) => {
      if (ignore) return;
      setSummary(summaryResult.data);
      setBanks(banksResult.data);
    }).catch(() => {
      if (!ignore) setFailed(true);
    }).finally(() => {
      if (!ignore) setLoading(false);
    });
    return () => { ignore = true; };
  }, [revision]);

  return (
    <div className="practice-shell">
      <PublicHeader />
      <main className="page-container">
        <Space wrap style={{ marginBottom: 12 }}>
          <Button type="text" icon={<ArrowLeftOutlined />} aria-label={t('menu.practice')} onClick={() => navigate('/practice')} />
          <Typography.Title level={3} style={{ margin: 0 }}>{t('practice.myPracticeTitle')}</Typography.Title>
        </Space>
        <Typography.Paragraph type="secondary">{t('practice.myPracticeDescription')}</Typography.Paragraph>
        {failed && <Alert type="error" showIcon title={t('practice.personalLoadFailed')} action={<Button onClick={() => setRevision((value) => value + 1)}>{t('practice.retry')}</Button>} style={{ marginBottom: 16 }} />}
        <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
          <Col xs={12} md={6}><Card loading={loading}><Statistic title={t('practice.wrongQuestions')} value={summary?.wrongCount ?? '-'} /></Card></Col>
          <Col xs={12} md={6}><Card loading={loading}><Statistic title={t('practice.favorites')} value={summary?.favoriteCount ?? '-'} /></Card></Col>
          <Col xs={12} md={6}><Card loading={loading}><Statistic title={t('practice.attempts')} value={summary?.attemptCount ?? '-'} /></Card></Col>
          <Col xs={12} md={6}><Card loading={loading}><Statistic title={t('practice.accuracy')} value={summary?.gradedCount ? summary.correctCount / summary.gradedCount * 100 : '-'} precision={1} suffix={summary?.gradedCount ? '%' : undefined} /><Typography.Text type="secondary" style={{ fontSize: 12 }}>{t('practice.accuracyNote')}</Typography.Text></Card></Col>
        </Row>
        <Typography.Paragraph type="secondary">{t('practice.publicOnly')}</Typography.Paragraph>
        <Tabs activeKey={tab} onChange={(key) => setSearchParams({ tab: key })} items={[
          { key: 'wrong', label: t('practice.wrongQuestions'), icon: <BookOutlined /> },
          { key: 'favorites', label: t('practice.favorites'), icon: <StarOutlined /> },
          { key: 'records', label: t('practice.records'), icon: <HistoryOutlined /> },
        ]} />
        <MyPracticeList key={tab} tab={tab} banks={banks} revision={revision} onChanged={() => setRevision((value) => value + 1)} />
      </main>
    </div>
  );
}

function MyPracticeList({ tab, banks, revision, onChanged }: {
  tab: PracticeTab; banks: PublicBankResponse[]; revision: number; onChanged: () => void;
}) {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const locale = useLocaleStore((state) => state.locale);
  const { isMobile } = useBreakpoint();
  const { pagination, antPagination, reset } = usePagination();
  const [bankId, setBankId] = useState<string>();
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
      <Space wrap style={{ marginBottom: 8 }}>
        <Tag>{bank.name}</Tag>
        <Tag>{getQuestionTypeLabel(question.type as QuestionType)}</Tag>
        {question.isWrong && <Tag color="error">{t('practice.wrongQuestions')}</Tag>}
      </Space>
      <Typography.Paragraph strong style={{ fontSize: 16, whiteSpace: 'pre-wrap' }}>
        {question.translations?.[locale]?.title ?? question.title}
      </Typography.Paragraph>
    </>
  );

  const questionActions = (question: PracticeQuestionResponse, bank: { id: string; name: string }) => (
    <Space wrap>
      <Button type="primary" onClick={() => practiceAgain(question, bank.id)}>{t('practice.practiceAgain')}</Button>
      <Button icon={question.isFavorite ? <StarFilled /> : <StarOutlined />} loading={changingQuestion === question.id} disabled={changingQuestion !== null} onClick={() => changeQuestion(question, bank.id)}>{t(question.isFavorite ? 'practice.unfavorite' : 'practice.favorite')}</Button>
      {tab === 'wrong' && <Button disabled={changingQuestion !== null} onClick={() => changeQuestion(question, bank.id, true)}>{t('practice.removeWrong')}</Button>}
      {tab !== 'records' && <Button type="link" onClick={() => navigate(`/practice/${encodeURIComponent(bank.id)}?collection=${tab}`)}>{t('practice.reviewBank')}</Button>}
    </Space>
  );

  const displayAnswer = (value: string, type: string) => {
    if (type === QuestionType.true_false && (value === 'true' || value === 'false')) return t(`examTaking.${value === 'true' ? 'true_' : 'false_'}`);
    return value;
  };

  return (
    <>
      <Select allowClear showSearch optionFilterProp="label" aria-label={t('practice.allBanks')} placeholder={t('practice.allBanks')} value={bankId} onChange={(value) => { setBankId(value); reset(); }} options={banks.map((bank) => ({ value: bank.id, label: bank.name }))} style={{ width: isMobile ? '100%' : 280, marginBottom: 16 }} />
      {failed ? (
        <Alert type="error" showIcon title={t('practice.personalLoadFailed')} action={<Button onClick={() => setRetry((value) => value + 1)}>{t('practice.retry')}</Button>} />
      ) : loading ? <Card loading /> : total === 0 ? (
        <Empty description={t(`practice.${tab === 'wrong' ? 'emptyWrong' : tab === 'favorites' ? 'emptyFavorites' : 'emptyRecords'}`)}>
          <Button type="primary" onClick={() => navigate('/practice')}>{t('practice.startPractice')}</Button>
        </Empty>
      ) : (
        <>
          {tab === 'records' ? records.map((record) => (
            <Card key={record.id} size="small" style={{ marginBottom: 16 }}>
              {questionHeader(record.question, record.bank)}
              <Space wrap style={{ marginBottom: 12 }}>
                <Tag color={record.correct === null ? 'default' : record.correct ? 'success' : 'error'}>{t(record.correct === null ? 'practice.notGraded' : record.correct ? 'practice.correct' : 'practice.incorrect')}</Tag>
                <Typography.Text type="secondary">{formatDateTime(record.createdAt)}</Typography.Text>
              </Space>
              <Collapse style={{ marginBottom: 12 }} items={[{
                key: 'answer', label: t('practice.recordDetails'), children: (
                  <div style={{ whiteSpace: 'pre-wrap', overflowWrap: 'anywhere' }}>
                    {Object.entries(record.question.options ?? {}).map(([key, text]) => <Typography.Paragraph key={key}>{key}. {record.question.translations?.[locale]?.options?.[key] ?? text}</Typography.Paragraph>)}
                    <Typography.Paragraph><strong>{t('practice.yourAnswer')}:</strong> {displayAnswer(record.userAnswer, record.question.type)}</Typography.Paragraph>
                    <Typography.Paragraph><strong>{t('practice.referenceAnswer')}:</strong> {displayAnswer(record.answer, record.question.type)}</Typography.Paragraph>
                    {record.analysis && <Typography.Paragraph><strong>{t('common.analysis')}:</strong> {record.analysis}</Typography.Paragraph>}
                  </div>
                ),
              }]} />
              {questionActions(record.question, record.bank)}
            </Card>
          )) : questions.map((item) => (
            <Card key={item.question.id} size="small" style={{ marginBottom: 16 }}>
              {questionHeader(item.question, item.bank)}
              <Space wrap style={{ marginBottom: 12 }}>
                <Typography.Text type="secondary">{t('practice.attemptCount', { count: item.attemptCount })}</Typography.Text>
                {item.wrongCount > 0 && <Typography.Text type="secondary">{t('practice.wrongCount', { count: item.wrongCount })}</Typography.Text>}
                <Typography.Text type="secondary">{item.lastAttemptAt ? `${t('practice.lastPracticed')}: ${formatDateTime(item.lastAttemptAt)}` : t('practice.neverPracticed')}</Typography.Text>
              </Space>
              <div>{questionActions(item.question, item.bank)}</div>
            </Card>
          ))}
          <Pagination {...antPagination} total={total} showSizeChanger size={isMobile ? 'small' : undefined} style={{ marginTop: 24, textAlign: 'right' }} />
        </>
      )}
    </>
  );
}
