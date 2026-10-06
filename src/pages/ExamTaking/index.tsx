import { useEffect, useState, useRef, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router';
import { Button, Card, Radio, Checkbox, Input, Space, Typography, Progress, message, Result } from 'antd';
import { useTranslation } from 'react-i18next';
import type { QuestionResponse } from '@/types/question';
import type { ExamResponse } from '@/types/exam';
import { getExam } from '@/api/exams';
import { getDraft, saveDraft, submitExam } from '@/api/records';
import { QuestionType } from '@/types/enums';
import { getQuestionTypeLabel } from '@/utils/constants';
import { useBreakpoint } from '@/hooks/useBreakpoint';

const { Title, Text } = Typography;

export default function ExamTakingPage() {
  const { t } = useTranslation();
  const { id: examId } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { isMobile } = useBreakpoint();
  const [exam, setExam] = useState<ExamResponse | null>(null);
  const [questions, setQuestions] = useState<QuestionResponse[]>([]);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [currentIndex, setCurrentIndex] = useState(0);
  const [timeLeft, setTimeLeft] = useState(0);
  const hasTimeLeft = timeLeft > 0;
  const [submitted, setSubmitted] = useState(false);
  const [submittedScore, setSubmittedScore] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const autoSaveDraft = useCallback(async () => {
    if (!examId || submitted) return;
    try { await saveDraft(examId, { answers }); } catch { /* ignore */ }
  }, [examId, answers, submitted]);

  useEffect(() => {
    if (!examId) return;
    const load = async () => {
      try {
        const examRes = await getExam(examId);
        setExam(examRes.data);
        const qs = examRes.data.paper?.questions?.map((pq) => pq.question) ?? [];
        setQuestions(qs);

        const draftRes = await getDraft(examId);
        if (draftRes.data.answers) {
          setAnswers(draftRes.data.answers);
        }

        const end = new Date(examRes.data.endTime).getTime();
        const remaining = Math.max(0, Math.floor((end - Date.now()) / 1000));
        setTimeLeft(remaining);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [examId]);

  const handleAutoSubmit = useCallback(async () => {
    if (!examId || submitted) return;
    try {
      const res = await submitExam(examId, { answers });
      setSubmittedScore(res.data.score);
      setSubmitted(true);
      message.success(t('examTaking.autoSubmitted'));
    } catch { /* handled by interceptor */ }
  }, [examId, answers, submitted, t]);

  useEffect(() => {
    if (!hasTimeLeft || submitted) return;
    timerRef.current = setInterval(() => {
      setTimeLeft((t) => {
        if (t <= 1) {
          if (timerRef.current) clearInterval(timerRef.current);
          return 0;
        }
        return t - 1;
      });
    }, 1000);
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, [hasTimeLeft, submitted]);

  useEffect(() => {
    if (timeLeft === 0 && !submitted && examId) {
      handleAutoSubmit();
    }
  }, [timeLeft, handleAutoSubmit, submitted, examId]);

  useEffect(() => {
    const interval = setInterval(() => { autoSaveDraft(); }, 30000);
    return () => clearInterval(interval);
  }, [autoSaveDraft]);

  const handleSubmit = async () => {
    if (!examId) return;
    try {
      const res = await submitExam(examId, { answers });
      setSubmittedScore(res.data.score);
      setSubmitted(true);
      message.success(t('examTaking.submitted'));
    } catch { /* handled by interceptor */ }
  };

  const setAnswer = (questionId: string, value: string) => {
    setAnswers((prev) => ({ ...prev, [questionId]: value }));
  };

  if (loading) return <Card loading />;

  if (submitted) {
    const totalScore = exam?.paper?.totalScore ?? 0;
    const showScore = exam?.showScore !== false && submittedScore !== null;
    return (
      <Result
        status="success"
        title={t('examTaking.submitted')}
        subTitle={showScore
          ? t('examTaking.yourScore', { score: submittedScore ?? 0, total: totalScore })
          : t('examTaking.submittedDesc')}
        extra={<Button type="primary" onClick={() => navigate('/exams')}>{t('examTaking.backToExams')}</Button>}
      />
    );
  }

  const q = questions[currentIndex];
  const formatTime = (s: number) => {
    const h = Math.floor(s / 3600);
    const m = Math.floor((s % 3600) / 60);
    const sec = s % 60;
    return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}:${sec.toString().padStart(2, '0')}`;
  };

  const answeredCount = Object.keys(answers).filter((k) => answers[k]).length;

  return (
    <div style={{ maxWidth: 900, margin: '0 auto', padding: isMobile ? '0 4px' : 0 }}>
      <Card>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 16, flexWrap: 'wrap', gap: 8 }}>
          <Title level={4} style={{ margin: 0 }}>{exam?.name}</Title>
          <Text strong style={{ fontSize: 18, color: timeLeft < 300 ? 'red' : undefined }}>
            {formatTime(timeLeft)}
          </Text>
        </div>
        <Progress percent={Math.round((answeredCount / questions.length) * 100)} size="small" />
      </Card>

      <div style={{ display: 'flex', flexDirection: isMobile ? 'column' : 'row', gap: 16, marginTop: 16 }}>
        <div style={{ width: isMobile ? '100%' : 200, flexShrink: 0 }}>
          <Card size="small" title={t('examTaking.navigation')}>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
              {questions.map((_, i) => (
                <Button
                  key={i}
                  size="small"
                  type={i === currentIndex ? 'primary' : answers[questions[i].id] ? 'default' : 'text'}
                  onClick={() => setCurrentIndex(i)}
                  style={{ width: 36 }}
                >
                  {i + 1}
                </Button>
              ))}
            </div>
          </Card>
        </div>

        <div style={{ flex: 1, minWidth: 0 }}>
          {q && (
            <Card title={t('examTaking.questionLabel', { index: currentIndex + 1, title: q.title, type: getQuestionTypeLabel(q.type), score: q.score })}>
              {q.type === QuestionType.single && (
                <Radio.Group value={answers[q.id]} onChange={(e) => setAnswer(q.id, e.target.value)}>
                  <Space direction="vertical">
                    {Object.entries(q.options ?? {}).map(([key, val]) => (
                      <Radio key={key} value={key}>{key}. {val}</Radio>
                    ))}
                  </Space>
                </Radio.Group>
              )}

              {q.type === QuestionType.multiple && (
                <Checkbox.Group
                  value={(answers[q.id] || '').split(',').filter(Boolean)}
                  onChange={(vals) => setAnswer(q.id, (vals as string[]).sort().join(','))}
                >
                  <Space direction="vertical">
                    {Object.entries(q.options ?? {}).map(([key, val]) => (
                      <Checkbox key={key} value={key}>{key}. {val}</Checkbox>
                    ))}
                  </Space>
                </Checkbox.Group>
              )}

              {q.type === QuestionType.true_false && (
                <Radio.Group value={answers[q.id]} onChange={(e) => setAnswer(q.id, e.target.value)}>
                  <Space>
                    <Radio value="true">{t('examTaking.true_')}</Radio>
                    <Radio value="false">{t('examTaking.false_')}</Radio>
                  </Space>
                </Radio.Group>
              )}

              {(q.type === QuestionType.fill || q.type === QuestionType.short || q.type === QuestionType.program) && (
                <Input.TextArea
                  rows={4}
                  value={answers[q.id] || ''}
                  onChange={(e) => setAnswer(q.id, e.target.value)}
                  placeholder={t('examTaking.typeAnswer')}
                />
              )}

              <div style={{ marginTop: 16, display: 'flex', justifyContent: 'space-between', flexWrap: 'wrap', gap: 8 }}>
                <Button disabled={currentIndex === 0} onClick={() => setCurrentIndex((i) => i - 1)}>
                  {t('examTaking.previous')}
                </Button>
                <Space>
                  <Button onClick={autoSaveDraft}>{t('examTaking.saveDraft')}</Button>
                  {currentIndex === questions.length - 1 ? (
                    <Button type="primary" onClick={handleSubmit}>
                      {t('examTaking.submitExam')}
                    </Button>
                  ) : (
                    <Button type="primary" onClick={() => setCurrentIndex((i) => i + 1)}>
                      {t('examTaking.next')}
                    </Button>
                  )}
                </Space>
              </div>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
