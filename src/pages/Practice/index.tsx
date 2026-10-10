import { useState, useMemo, useCallback, useRef, useEffect } from 'react';
import { useParams, useNavigate, useSearchParams } from 'react-router';
import {
  Button, Card, Radio, Checkbox, Input, Space, Typography,
  Result, Segmented, Tag, Alert, Pagination, Empty, Spin,
} from 'antd';
import type { SegmentedProps } from 'antd';
import {
  ArrowLeftOutlined, CheckCircleOutlined, CloseCircleOutlined, SearchOutlined, StarFilled, StarOutlined,
} from '@ant-design/icons';
import { useTranslation } from 'react-i18next';
import PublicHeader from '@/components/Layout/PublicHeader';
import QuestionImages from '@/components/QuestionImages';
import { useBreakpoint } from '@/hooks/useBreakpoint';
import { usePagination } from '@/hooks/usePagination';
import { useLocaleStore } from '@/stores/localeStore';
import { useAuthStore } from '@/stores/authStore';
import { QuestionType } from '@/types/enums';
import { getQuestionTypeLabel } from '@/utils/constants';
import {
  getPracticeQuestionPage,
  getPracticeQuestion,
  checkPracticeAnswer,
  favoritePracticeQuestion,
  unfavoritePracticeQuestion,
} from '@/api/practice';
import type { PracticeCollection, PracticeQuestionResponse, PracticePageQuestion, PracticeQuestionPageResponse, CheckAnswerResponse } from '@/api/practice';
import type { QuestionImageResponse } from '@/types/question';
import { shuffleOptions, remapAnswer, remapAnalysis } from './options';
import type { PracticeOption } from './options';

type PracticeQuestion = PracticePageQuestion & { shuffledOptions: PracticeOption[] };

/** Get localized title and options for a question based on display locale */
function getLocalizedContent(
  q: PracticeQuestionResponse,
  displayLocale: string,
): { title: string; options: Record<string, string> } {
  if (displayLocale === q.locale || !q.translations) {
    return { title: q.title, options: q.options ?? {} };
  }
  const tr = q.translations[displayLocale];
  if (!tr) {
    return { title: q.title, options: q.options ?? {} };
  }
  return {
    title: tr.title ?? q.title,
    options: tr.options ?? q.options ?? {},
  };
}

/** Get available locales for a question (primary + translated) */
function getAvailableLocales(q: PracticeQuestionResponse): string[] {
  const locales = [q.locale];
  if (q.translations) {
    for (const key of Object.keys(q.translations)) {
      if (!locales.includes(key)) locales.push(key);
    }
  }
  return locales;
}

export default function PracticePage() {
  const { bankId } = useParams<{ bankId: string }>();
  const [searchParams] = useSearchParams();
  const user = useAuthStore((s) => s.user);
  const initialized = useAuthStore((s) => s.initialized);
  return <div className="practice-shell"><PublicHeader /><main className="practice-content">{initialized ? <PracticeContent key={`${bankId}:${user?.sub ?? 'guest'}:${searchParams}`} /> : <Card loading />}</main></div>;
}

function PracticeContent() {
  const { t } = useTranslation();
  const { bankId } = useParams<{ bankId: string }>();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const user = useAuthStore((s) => s.user);
  const { isMobile } = useBreakpoint();
  const { pagination, antPagination, reset } = usePagination(50);

  const [questions, setQuestions] = useState<Record<number, PracticeQuestion>>({});
  const [total, setTotal] = useState(0);
  const [questionTotal, setQuestionTotal] = useState(0);
  const [seed, setSeed] = useState('');
  const [currentIndex, setCurrentIndex] = useState(0);
  const [searchKeyword, setSearchKeyword] = useState('');
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [checkResults, setCheckResults] = useState<Record<string, CheckAnswerResponse>>({});
  const [loading, setLoading] = useState(false);
  const [checkingQuestions, setCheckingQuestions] = useState<Record<string, boolean>>({});
  const [mode, setMode] = useState<'random' | 'sequential'>('sequential');
  const requestedCollection = searchParams.get('collection');
  const initialQuestionId = searchParams.get('questionId') || undefined;
  const [collection, setCollection] = useState<'all' | PracticeCollection>(() => user && (requestedCollection === 'wrong' || requestedCollection === 'favorites') ? requestedCollection : 'all');
  const [collectionChanged, setCollectionChanged] = useState(false);
  const [favoriting, setFavoriting] = useState(false);
  const [started, setStarted] = useState(false);
  const [navigating, setNavigating] = useState(false);
  const [navigationLoading, setNavigationLoading] = useState(false);
  const [navigationError, setNavigationError] = useState(false);
  const [retry, setRetry] = useState(0);
  const [searchPage, setSearchPage] = useState<{ keyword: string; page: number; result: PracticeQuestionPageResponse } | null>(null);
  const locale = useLocaleStore((s) => s.locale);
  const [preferredLocale, setPreferredLocale] = useState<string | null>(null);
  const [refreshedImages, setRefreshedImages] = useState<Record<string, QuestionImageResponse[]>>({});
  const imageRequests = useRef(new Map<string, Promise<void>>());
  const pageRequests = useRef(new Map<string, Promise<PracticeQuestionPageResponse>>());
  const questionStates = useRef<Record<string, Partial<Pick<PracticeQuestionResponse, 'isFavorite' | 'isWrong'>>>>({});
  const navigationRequest = useRef(0);
  const initialLoadAttempted = useRef(false);
  const loginRequired = !user && total < questionTotal;
  const loginToContinue = () => navigate('/login', { state: { practiceBankId: bankId } });

  const currentQ = questions[currentIndex];
  const currentImages = useMemo(() => (
    refreshedImages[currentQ?.id ?? ''] ?? currentQ?.images ?? []
  ), [currentQ, refreshedImages]);
  const refreshImages = useCallback(() => {
    if (!bankId || !currentQ) return Promise.resolve();
    const questionId = currentQ.id;
    const pending = imageRequests.current.get(questionId);
    if (pending) return pending;
    const request = getPracticeQuestion(bankId, questionId).then((res) => {
      setRefreshedImages((previous) => ({ ...previous, [questionId]: res.data.images ?? [] }));
    }).finally(() => {
      imageRequests.current.delete(questionId);
    });
    imageRequests.current.set(questionId, request);
    return request;
  }, [bankId, currentQ]);
  const userAnswer = currentQ ? answers[currentQ.id] ?? '' : '';
  const checkResult = currentQ ? checkResults[currentQ.id] : undefined;
  const submitted = Boolean(checkResult);
  const checking = currentQ ? checkingQuestions[currentQ.id] ?? false : false;
  const autoSubmit = currentQ?.type === QuestionType.single || currentQ?.type === QuestionType.true_false;
  const keyword = searchKeyword.trim().toLowerCase();
  const searching = Boolean(keyword);
  const searchResult = searchPage?.keyword === keyword && searchPage.page === pagination.page ? searchPage.result : null;
  const navigationTotal = searching ? searchResult?.total ?? 0 : total;
  const questionOffset = (pagination.page - 1) * pagination.pageSize;
  const navigationQuestions = searching
    ? searchResult?.data.map((question) => ({ question, index: question.index })) ?? []
    : Array.from({ length: Math.max(0, Math.min(pagination.pageSize, total - questionOffset)) }, (_, offset) => {
      const index = questionOffset + offset;
      return { question: questions[index], index };
    });

  const rememberQuestions = useCallback((items: PracticePageQuestion[]) => {
    setQuestions((previous) => {
      const next = { ...previous };
      for (const question of items) {
        next[question.index] = {
          ...question,
          ...questionStates.current[question.id],
          shuffledOptions: (previous[question.index]?.id === question.id ? previous[question.index].shuffledOptions : undefined) ?? (
            question.type === QuestionType.single || question.type === QuestionType.multiple
              ? shuffleOptions(question.options ?? {})
              : []
          ),
        };
      }
      return next;
    });
  }, []);

  const fetchPage = useCallback((page: number, search = '') => {
    const key = `${search}:${page}`;
    const pending = pageRequests.current.get(key);
    if (pending) return pending;
    const request = getPracticeQuestionPage(bankId!, { mode, seed, page, pageSize: 50, keyword: search || undefined, collection: collection === 'all' ? undefined : collection })
      .then((res) => res.data)
      .catch((error: unknown) => {
        pageRequests.current.delete(key);
        throw error;
      });
    pageRequests.current.set(key, request);
    return request;
  }, [bankId, mode, seed, collection]);

  useEffect(() => {
    if (!started || !bankId || collectionChanged) return;
    let ignore = false;
    setNavigationLoading(true);
    setNavigationError(false);
    const timer = window.setTimeout(async () => {
      try {
        const result = await fetchPage(pagination.page, keyword);
        if (ignore) return;
        rememberQuestions(result.data);
        setSearchPage({ keyword, page: pagination.page, result });
      } catch {
        if (!ignore) setNavigationError(true);
      } finally {
        if (!ignore) setNavigationLoading(false);
      }
    }, keyword ? 300 : 0);
    return () => {
      ignore = true;
      window.clearTimeout(timer);
    };
  }, [started, bankId, fetchPage, pagination.page, keyword, rememberQuestions, retry, collectionChanged]);

  // Available locales for current question
  const availableLocales = useMemo(() => {
    if (!currentQ) return [];
    return getAvailableLocales(currentQ);
  }, [currentQ]);

  const requestedLocale = preferredLocale ?? locale;
  const displayLocale = availableLocales.includes(requestedLocale) ? requestedLocale : currentQ?.locale ?? locale;

  // Localized content for current question
  const localizedContent = useMemo(() => {
    if (!currentQ) return { title: '', options: {} as Record<string, string> };
    return getLocalizedContent(currentQ, displayLocale);
  }, [currentQ, displayLocale]);

  const displayedResult = useMemo(() => {
    if (!currentQ || !checkResult) return checkResult;
    if (currentQ.type !== QuestionType.single && currentQ.type !== QuestionType.multiple) return checkResult;
    const labels = Object.fromEntries(currentQ.shuffledOptions.map(({ key, label }) => [key, label]));
    return {
      ...checkResult,
      answer: remapAnswer(checkResult.answer, labels),
      analysis: checkResult.analysis ? remapAnalysis(checkResult.analysis, labels) : checkResult.analysis,
    };
  }, [currentQ, checkResult]);

  const loadQuestions = useCallback(async (questionId?: string) => {
    if (!bankId) return;
    setLoading(true);
    try {
      const res = await getPracticeQuestionPage(bankId, { mode, page: 1, pageSize: 50, collection: collection === 'all' ? undefined : collection, questionId });
      pageRequests.current.clear();
      pageRequests.current.set(`:${res.data.page}`, Promise.resolve(res.data));
      navigationRequest.current++;
      questionStates.current = {};
      setQuestions({});
      rememberQuestions(res.data.data);
      setTotal(res.data.practiceTotal);
      setQuestionTotal(res.data.questionTotal);
      setSeed(res.data.seed);
      setCurrentIndex(res.data.initialIndex);
      setRefreshedImages({});
      setSearchKeyword('');
      antPagination.onChange(res.data.page, pagination.pageSize);
      setAnswers({});
      setCheckResults({});
      setCheckingQuestions({});
      setCollectionChanged(false);
      setSearchPage(null);
      setNavigationError(false);
      setNavigating(false);
      setStarted(true);
    } catch {
      // The request interceptor displays the error; keep the start button available.
    } finally {
      setLoading(false);
    }
  }, [bankId, mode, collection, antPagination, pagination.pageSize, rememberQuestions]);

  useEffect(() => {
    if (!initialQuestionId || initialLoadAttempted.current) return;
    initialLoadAttempted.current = true;
    loadQuestions(initialQuestionId);
  }, [initialQuestionId, loadQuestions]);

  const updateQuestion = (questionId: string, changes: Partial<Pick<PracticeQuestionResponse, 'isFavorite' | 'isWrong'>>) => {
    questionStates.current[questionId] = { ...questionStates.current[questionId], ...changes };
    setQuestions((previous) => Object.fromEntries(Object.entries(previous).map(([index, question]) => [index, question.id === questionId ? { ...question, ...changes } : question])));
  };

  const toggleFavorite = async () => {
    if (!user) { loginToContinue(); return; }
    if (!bankId || !currentQ || favoriting) return;
    setFavoriting(true);
    try {
      const result = currentQ.isFavorite
        ? await unfavoritePracticeQuestion(bankId, currentQ.id)
        : await favoritePracticeQuestion(bankId, currentQ.id);
      updateQuestion(currentQ.id, result.data);
      if (collection === 'favorites') setCollectionChanged(true);
    } catch {
      // The request interceptor displays the error; retain the current favorite state.
    } finally {
      setFavoriting(false);
    }
  };

  const goTo = async (index: number) => {
    if (collectionChanged) return;
    const requestId = ++navigationRequest.current;
    setNavigating(true);
    try {
      if (!questions[index]) {
        const result = await fetchPage(Math.floor(index / pagination.pageSize) + 1);
        if (index >= result.practiceTotal && result.practiceTotal < result.questionTotal) {
          loginToContinue();
          return;
        }
        rememberQuestions(result.data);
      }
      if (requestId !== navigationRequest.current) return;
      setCurrentIndex(index);
      const matchingIndex = searching ? searchResult?.matchingIndexes?.indexOf(index) ?? -1 : index;
      if (matchingIndex >= 0) {
        antPagination.onChange(Math.floor(matchingIndex / pagination.pageSize) + 1, pagination.pageSize);
      }
    } catch {
      // Keep the current question on a failed request so navigation can be retried.
    } finally {
      if (requestId === navigationRequest.current) setNavigating(false);
    }
  };

  const setAnswer = (answer: string) => {
    setAnswers((prev) => ({ ...prev, [currentQ.id]: answer }));
  };

  const handleSubmit = async (answer: string) => {
    if (!bankId || !currentQ || !answer || checking || submitted) return;
    setAnswer(answer);
    setCheckingQuestions((prev) => ({ ...prev, [currentQ.id]: true }));
    try {
      const res = await checkPracticeAnswer(bankId, currentQ.id, answer);
      setCheckResults((prev) => ({ ...prev, [currentQ.id]: res.data }));
      if (user && res.data.graded) {
        updateQuestion(currentQ.id, { isWrong: !res.data.correct });
        if (collection === 'wrong' && res.data.correct) setCollectionChanged(true);
      }
    } catch {
      // The interceptor shows the error; reset auto-submitted choices so they can be retried.
      if (autoSubmit) {
        setAnswers((prev) => ({ ...prev, [currentQ.id]: '' }));
      }
    } finally {
      setCheckingQuestions((prev) => ({ ...prev, [currentQ.id]: false }));
    }
  };

  if (loading) return <Card loading />;

  // Mode selection screen
  if (!started) {
    return (
      <div style={{ maxWidth: 600, margin: '64px auto', padding: '0 16px' }}>
        <Card>
          <Typography.Title level={4} style={{ textAlign: 'center' }}>
            {t('practice.selectMode')}
          </Typography.Title>
          <div style={{ textAlign: 'center', margin: '24px 0' }}>
            <Segmented
              options={[
                { label: t('practice.sequential'), value: 'sequential' },
                { label: t('practice.random'), value: 'random', disabled: !user },
              ]}
              value={mode}
              onChange={(v) => setMode(v as 'random' | 'sequential')}
            />
          </div>
          {user && <div style={{ textAlign: 'center', marginBottom: 24 }}>
            <Typography.Paragraph>{t('practice.scope')}</Typography.Paragraph>
            <Segmented options={[
              { label: t('practice.allQuestions'), value: 'all' },
              { label: t('practice.bankWrongQuestions'), value: 'wrong' },
              { label: t('practice.bankFavorites'), value: 'favorites' },
            ]} value={collection} onChange={(value) => setCollection(value as 'all' | PracticeCollection)} />
          </div>}
          {!user && (
            <Alert
              type="info"
              showIcon
              title={t('practice.guestNote')}
              description={t('practice.loginToSave')}
              action={<Button size="small" onClick={loginToContinue}>{t('auth.login')}</Button>}
              style={{ marginBottom: 16 }}
            />
          )}
          <Button type="primary" block size="large" onClick={() => loadQuestions(initialQuestionId)} loading={loading}>
            {t('practice.startPractice')}
          </Button>
          <div style={{ textAlign: 'center', marginTop: 16 }}>
            <Button type="link" icon={<ArrowLeftOutlined />} onClick={() => navigate('/')}>
              {t('practice.backToHome')}
            </Button>
          </div>
        </Card>
      </div>
    );
  }

  if (total === 0) {
    return (
      <Result
        title={t(collection === 'all' ? 'practice.noQuestions' : 'practice.emptyCollection')}
        extra={<Space wrap><Button onClick={() => setStarted(false)}>{t('practice.changeMode')}</Button>{user && <Button type="primary" onClick={() => navigate('/practice/mine')}>{t('menu.myPractice')}</Button>}<Button onClick={() => navigate('/')}>{t('practice.backToHome')}</Button></Space>}
      />
    );
  }

  const localeOptions: SegmentedProps['options'] = availableLocales.map((loc) => ({
    label: t(`languages.${loc}`, { defaultValue: loc.toUpperCase() }),
    value: loc,
  }));

  return (
    <div style={{ maxWidth: 1200, margin: '0 auto', padding: '0 16px' }}>
      {/* Header bar */}
      <Card size="small" style={{ marginBottom: 16 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 8 }}>
          <Space wrap>
            <Button icon={<ArrowLeftOutlined />} onClick={() => navigate('/')}>
              {t('practice.backToHome')}
            </Button>
            <Typography.Text strong>
              {t('practice.progress', { current: currentIndex + 1, total })}
            </Typography.Text>
          </Space>
          <Space wrap>
            {user && <Button onClick={() => navigate('/practice/mine')}>{t('menu.myPractice')}</Button>}
            <Button onClick={() => setStarted(false)} disabled={checking || favoriting}>{t('practice.changeMode')}</Button>
            {collection !== 'all' && <Tag>{t(collection === 'wrong' ? 'practice.bankWrongQuestions' : 'practice.bankFavorites')}</Tag>}
            <Tag>{mode === 'random' ? t('practice.random') : t('practice.sequential')}</Tag>
          </Space>
        </div>
      </Card>

      {loginRequired && (
        <Alert
          type="info"
          showIcon
          title={t('practice.guestNote')}
          description={t('practice.loginToSave')}
          action={<Button size="small" onClick={loginToContinue}>{t('auth.login')}</Button>}
          style={{ marginBottom: 16 }}
        />
      )}

      {collectionChanged && <Alert type="info" showIcon title={t('practice.collectionUpdated')} action={<Button type="primary" onClick={() => loadQuestions()}>{t('practice.continueReview')}</Button>} style={{ marginBottom: 16 }} />}

      <div style={{ display: 'flex', flexDirection: isMobile ? 'column-reverse' : 'row', alignItems: 'flex-start', gap: 16 }}>
        <Card className="practice-question" style={{ flex: 1, minWidth: 0, width: '100%' }}>
            {/* Title row with language switch */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 8, marginBottom: 16 }}>
              <Typography.Text strong style={{ fontSize: 16, flex: 1, flexBasis: isMobile ? '100%' : undefined, minWidth: 0 }}>
                {currentIndex + 1}. {localizedContent.title}
              </Typography.Text>
              <Space>
                <Tag>{getQuestionTypeLabel(currentQ.type as QuestionType)}</Tag>
                <Button icon={currentQ.isFavorite ? <StarFilled /> : <StarOutlined />} onClick={toggleFavorite} loading={favoriting} disabled={collectionChanged || checking}>{t(currentQ.isFavorite ? 'practice.unfavorite' : 'practice.favorite')}</Button>
              </Space>
            </div>

            {/* Language switcher */}
            {availableLocales.length > 1 && (
              <div style={{ marginBottom: 16 }}>
                <Segmented
                  aria-label={t('practice.contentLanguage')}
                  options={localeOptions}
                  value={displayLocale}
                  onChange={(v) => setPreferredLocale(v as string)}
                  size="small"
                />
              </div>
            )}

            <QuestionImages images={currentImages.filter((image) => image.optionKey === null)} onRefresh={refreshImages} />

            {/* Single choice */}
            {currentQ.type === QuestionType.single && (
              <Radio.Group
                value={userAnswer}
                onChange={(e) => handleSubmit(e.target.value)}
                disabled={submitted || checking}
              >
                <Space direction="vertical" style={{ width: '100%' }}>
                  {currentQ.shuffledOptions.map(({ key, label }) => (
                    <Radio key={key} value={key} style={{ whiteSpace: 'normal' }}>
                      {label}. {localizedContent.options[key] ?? currentQ.options[key]}
                      <QuestionImages images={currentImages.filter((image) => image.optionKey === key)} onRefresh={refreshImages} />
                    </Radio>
                  ))}
                </Space>
              </Radio.Group>
            )}

            {/* Multiple choice */}
            {currentQ.type === QuestionType.multiple && (
              <Checkbox.Group
                value={userAnswer ? userAnswer.split(',').filter(Boolean) : []}
                onChange={(vals) => setAnswer((vals as string[]).sort().join(','))}
                disabled={submitted || checking}
              >
                <Space direction="vertical" style={{ width: '100%' }}>
                  {currentQ.shuffledOptions.map(({ key, label }) => (
                    <Checkbox key={key} value={key} style={{ whiteSpace: 'normal' }}>
                      {label}. {localizedContent.options[key] ?? currentQ.options[key]}
                      <QuestionImages images={currentImages.filter((image) => image.optionKey === key)} onRefresh={refreshImages} />
                    </Checkbox>
                  ))}
                </Space>
              </Checkbox.Group>
            )}

            {/* True/False */}
            {currentQ.type === QuestionType.true_false && (
              <Radio.Group
                value={userAnswer}
                onChange={(e) => handleSubmit(e.target.value)}
                disabled={submitted || checking}
              >
                <Space>
                  <Radio value="true">{t('examTaking.true_')}</Radio>
                  <Radio value="false">{t('examTaking.false_')}</Radio>
                </Space>
              </Radio.Group>
            )}

            {/* Fill / Short / Program */}
            {(currentQ.type === QuestionType.fill || currentQ.type === QuestionType.short || currentQ.type === QuestionType.program) && (
              <Input.TextArea
                rows={4}
                value={userAnswer}
                onChange={(e) => setAnswer(e.target.value)}
                disabled={submitted || checking}
                placeholder={t('examTaking.typeAnswer')}
              />
            )}

            {/* Answer result */}
            {submitted && displayedResult && (
              <Alert
                style={{ marginTop: 16 }}
                type={!displayedResult.graded ? 'info' : displayedResult.correct ? 'success' : 'error'}
                showIcon
                icon={!displayedResult.graded ? undefined : displayedResult.correct ? <CheckCircleOutlined /> : <CloseCircleOutlined />}
                title={!displayedResult.graded ? t('practice.selfReview') : displayedResult.correct ? t('practice.correct') : t('practice.incorrect')}
                description={
                  <>
                    <div>
                      <strong>{t(displayedResult.graded ? 'common.answer' : 'practice.referenceAnswer')}:</strong> {displayedResult.answer}
                    </div>
                    {displayedResult.analysis && (
                      <div style={{ marginTop: 8 }}>
                        <strong>{t('common.analysis')}:</strong> {displayedResult.analysis}
                      </div>
                    )}
                    {user && <div style={{ marginTop: 8 }}>{t('practice.savedRecord')}</div>}
                  </>
                }
              />
            )}

            {/* Action buttons */}
            <div style={{ marginTop: 16, display: 'flex', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap' }}>
              <Button disabled={currentIndex === 0 || navigating || collectionChanged || checking || favoriting} onClick={() => goTo(currentIndex - 1)}>
                {t('examTaking.previous')}
              </Button>
              <Space>
                {!autoSubmit && !submitted && (
                  <Button
                    type="primary"
                    onClick={() => handleSubmit(userAnswer)}
                    loading={checking}
                    disabled={!userAnswer}
                  >
                    {t('practice.submitAnswer')}
                  </Button>
                )}
                <Button
                  type="primary"
                  disabled={(currentIndex === total - 1 && !loginRequired) || navigating || collectionChanged || checking || favoriting}
                  loading={navigating}
                  onClick={() => currentIndex === total - 1 && loginRequired ? loginToContinue() : goTo(currentIndex + 1)}
                >
                  {t(currentIndex === total - 1 && loginRequired ? 'practice.loginToContinue' : 'examTaking.next')}
                </Button>
                {submitted && currentIndex === total - 1 && !loginRequired && (
                  <Button type="primary" onClick={() => navigate(user ? '/practice/mine?tab=records' : '/')}>
                    {t('practice.finish')}
                  </Button>
                )}
              </Space>
            </div>
        </Card>

        <Card
          size="small"
          title={t('examTaking.navigation')}
          style={{ width: isMobile ? '100%' : 240, flexShrink: 0, position: isMobile ? 'static' : 'sticky', top: 16 }}
        >
          <Input
            aria-label={t('practice.searchPlaceholder')}
            placeholder={t('practice.searchPlaceholder')}
            prefix={<SearchOutlined />}
            allowClear
            value={searchKeyword}
            disabled={collectionChanged || checking || favoriting}
            onChange={(e) => {
              const keyword = e.target.value;
              setSearchKeyword(keyword);
              if (keyword.trim()) {
                reset();
              } else {
                antPagination.onChange(Math.floor(currentIndex / pagination.pageSize) + 1, pagination.pageSize);
              }
            }}
            style={{ marginBottom: 12 }}
          />
          {searching && searchResult && !navigationLoading && (
            <Typography.Text type="secondary" style={{ display: 'block', marginBottom: 12 }}>
              {t('practice.searchResultCount', { count: navigationTotal })}
            </Typography.Text>
          )}
          {navigationError && (
            <Alert type="error" title={t('practice.loadFailed')} action={<Button size="small" onClick={() => setRetry((value) => value + 1)}>{t('practice.retry')}</Button>} style={{ marginBottom: 12 }} />
          )}
          <Spin spinning={navigationLoading}>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, minHeight: 40, maxHeight: isMobile ? 200 : 'calc(100vh - 340px)', overflowY: 'auto' }}>
              {navigationQuestions.map(({ question, index: questionIndex }) => {
                const title = question ? getLocalizedContent(question, requestedLocale).title : '';
                return (
                  <Button
                    key={questionIndex}
                    size="small"
                    type={questionIndex === currentIndex ? 'primary' : 'default'}
                    aria-current={questionIndex === currentIndex ? 'step' : undefined}
                    aria-label={t('practice.progress', { current: questionIndex + 1, total })}
                    title={searching ? title : undefined}
                    onClick={() => goTo(questionIndex)}
                    disabled={navigationLoading || navigating || navigationError || collectionChanged || checking || favoriting}
                    style={{ minWidth: 36, width: searching ? '100%' : undefined, height: searching ? 'auto' : undefined, textAlign: searching ? 'left' : undefined, whiteSpace: 'normal' }}
                  >
                    {searching ? (
                      <span style={{ display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                        {questionIndex + 1}. {title}
                      </span>
                    ) : questionIndex + 1}
                  </Button>
                );
              })}
              {searching && searchResult && navigationTotal === 0 && !navigationLoading && !navigationError && (
                <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description={t('practice.noSearchResults')} style={{ width: '100%' }} />
              )}
            </div>
          </Spin>
          {navigationTotal > 0 && (
            <Pagination
              {...antPagination}
              total={navigationTotal}
              showTotal={undefined}
              showSizeChanger={false}
              disabled={collectionChanged || checking || favoriting}
              simple
              size="small"
              style={{ marginTop: 16 }}
            />
          )}
        </Card>
      </div>
    </div>
  );
}
