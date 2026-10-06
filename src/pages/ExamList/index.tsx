import { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router';
import { Layout, Card, Button, Tag, Empty, Spin, Typography, Space, List } from 'antd';
import {
  ArrowLeftOutlined, PlayCircleOutlined, ClockCircleOutlined, CheckCircleOutlined,
} from '@ant-design/icons';
import { useTranslation } from 'react-i18next';
import { getAllPages } from '@/utils/pagination';
import { formatDateTime } from '@/utils/format';
import { getExams } from '@/api/exams';
import type { ExamResponse } from '@/types/exam';
import { useAuthStore } from '@/stores/authStore';
import { useBreakpoint } from '@/hooks/useBreakpoint';
import { Role } from '@/types/enums';
import PublicHeader from '@/components/Layout/PublicHeader';

const { Content } = Layout;
const { Title } = Typography;

type Group = 'ongoing' | 'upcoming' | 'past';

function groupOf(exam: ExamResponse, now: number): Group {
  const start = new Date(exam.startTime).getTime();
  const end = new Date(exam.endTime).getTime();
  if (now >= end) return 'past';
  if (now < start) return 'upcoming';
  return 'ongoing';
}

export default function ExamListPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { isMobile } = useBreakpoint();
  const hasRole = useAuthStore((s) => s.hasRole);
  const [exams, setExams] = useState<ExamResponse[]>([]);
  const [loading, setLoading] = useState(true);

  const isStudent = hasRole(Role.student);

  useEffect(() => {
    const fetch = async () => {
      try {
        const exams = await getAllPages(getExams);
        setExams(exams);
      } finally {
        setLoading(false);
      }
    };
    fetch();
  }, []);

  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const timer = window.setInterval(() => setNow(Date.now()), 30000);
    return () => window.clearInterval(timer);
  }, []);
  const groups = useMemo(() => {
    const g: Record<Group, ExamResponse[]> = { ongoing: [], upcoming: [], past: [] };
    for (const e of exams) g[groupOf(e, now)].push(e);
    g.upcoming.sort((a, b) => new Date(a.startTime).getTime() - new Date(b.startTime).getTime());
    g.past.sort((a, b) => new Date(b.endTime).getTime() - new Date(a.endTime).getTime());
    return g;
  }, [exams, now]);

  const renderExam = (exam: ExamResponse, group: Group) => (
    <List.Item style={{ padding: 0, marginBottom: 12 }}>
      <Card
        size="small"
        style={group === 'ongoing' ? { borderColor: 'var(--accent)', borderWidth: 1.5 } : undefined}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
          <strong style={{ fontSize: 16, textDecoration: group === 'past' ? 'line-through' : undefined, opacity: group === 'past' ? 0.65 : 1 }}>
            {exam.name}
          </strong>
          {group === 'ongoing' && <Tag color="success" icon={<PlayCircleOutlined />}>{t('examList.ongoing')}</Tag>}
          {group === 'upcoming' && <Tag color="processing" icon={<ClockCircleOutlined />}>{t('examList.notStarted')}</Tag>}
          {group === 'past' && <Tag icon={<CheckCircleOutlined />}>{t('examList.ended')}</Tag>}
        </div>
        <div style={{ marginTop: 6, color: 'var(--muted)', fontSize: 13 }}>
          {exam.paper?.name ?? '-'}
        </div>
        <div style={{ marginTop: 4, color: 'var(--muted)', fontSize: 13 }}>
          {group === 'upcoming' && `${t('examList.startsAt')}: ${formatDateTime(exam.startTime)}`}
          {group === 'ongoing' && `${t('examList.timeRange')}: ${formatDateTime(exam.startTime)} ~ ${formatDateTime(exam.endTime)}`}
          {group === 'past' && `${t('examList.timeRange')}: ${formatDateTime(exam.startTime)} ~ ${formatDateTime(exam.endTime)}`}
        </div>
        <Space style={{ marginTop: 12 }} wrap>
          {isStudent && group !== 'past' && (
            <Button
              size="small"
              type={group === 'ongoing' ? 'primary' : 'default'}
              disabled={group === 'upcoming'}
              onClick={() => navigate(`/exams/${exam.id}/take`)}
            >
              {t('examList.takeExam')}
            </Button>
          )}
          {!isStudent && (
            <Button size="small" onClick={() => navigate(`/exams/${exam.id}/records`)}>
              {t('examList.records')}
            </Button>
          )}
        </Space>
      </Card>
    </List.Item>
  );

  const renderSection = (group: Group) => {
    const items = groups[group];
    if (items.length === 0) return null;
    const titles: Record<Group, string> = {
      ongoing: t('examList.ongoing'),
      upcoming: t('examList.upcoming'),
      past: t('examList.past'),
    };
    const icons: Record<Group, React.ReactNode> = {
      ongoing: <PlayCircleOutlined style={{ color: 'var(--accent)' }} />,
      upcoming: <ClockCircleOutlined style={{ color: 'var(--accent)' }} />,
      past: <CheckCircleOutlined style={{ color: 'var(--muted)' }} />,
    };
    return (
      <div style={{ marginBottom: 28 }}>
        <Title level={5} style={{ marginBottom: 12 }}>
          <Space>{icons[group]}{titles[group]} ({items.length})</Space>
        </Title>
        {isMobile ? (
          <List dataSource={items} renderItem={(exam) => renderExam(exam, group)} split={false} />
        ) : (
          <List
            grid={{ gutter: 16, column: 2 }}
            dataSource={items}
            renderItem={(exam) => renderExam(exam, group)}
          />
        )}
      </div>
    );
  };

  return (
    <Layout style={{ minHeight: '100vh' }}>
      <PublicHeader />

      <Content className="page-container">
        <div style={{ marginBottom: 24, display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
          <Button type="text" aria-label={t('practice.backToHome')} icon={<ArrowLeftOutlined />} onClick={() => navigate('/')} />
          <Title level={3} style={{ margin: 0 }}>{t('examList.title')}</Title>
        </div>

        {loading ? (
          <Spin size="large" style={{ display: 'block', margin: '64px auto' }} />
        ) : exams.length === 0 ? (
          <Empty description={t('examList.empty')} />
        ) : (
          <>
            {renderSection('ongoing')}
            {renderSection('upcoming')}
            {renderSection('past')}
          </>
        )}
      </Content>
    </Layout>
  );
}
