import { useEffect, useState } from 'react';
import { Card, Col, Row, Statistic, Typography, Spin, Button, Tag } from 'antd';
import {
  UserOutlined,
  ScheduleOutlined,
  AppstoreOutlined,
  PlayCircleOutlined,
  ClockCircleOutlined,
  CheckCircleOutlined,
  GlobalOutlined,
  HomeOutlined,
} from '@ant-design/icons';
import { useNavigate } from 'react-router';
import { useTranslation } from 'react-i18next';
import { getAllPages } from '@/utils/pagination';
import { useAuthStore } from '@/stores/authStore';
import { getRoleLabel } from '@/utils/constants';
import { Role } from '@/types/enums';
import { getExams } from '@/api/exams';
import { getQuestionBanks } from '@/api/question-banks';
import { getUsers } from '@/api/users';
import type { ExamResponse } from '@/types/exam';

const { Title } = Typography;

type Group = 'ongoing' | 'upcoming' | 'past';

function groupOf(exam: ExamResponse, now: number): Group {
  const start = new Date(exam.startTime).getTime();
  const end = new Date(exam.endTime).getTime();
  if (now >= end) return 'past';
  if (now < start) return 'upcoming';
  return 'ongoing';
}

export default function DashboardPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const user = useAuthStore((s) => s.user);
  const hasRole = useAuthStore((s) => s.hasRole);
  const [loading, setLoading] = useState(true);
  const [exams, setExams] = useState<ExamResponse[]>([]);
  const [bankCount, setBankCount] = useState(0);
  const [publicBankCount, setPublicBankCount] = useState(0);
  const [userCount, setUserCount] = useState(0);

  const isStudent = hasRole(Role.student);
  const isAdmin = hasRole(Role.super_admin, Role.question_admin);

  useEffect(() => {
    const load = async () => {
      try {
        const tasks: Promise<unknown>[] = [
          getAllPages(getExams).then(setExams),
        ];
        if (!isStudent) {
          tasks.push(
            getAllPages(getQuestionBanks).then((banks) => {
              setBankCount(banks.length);
              setPublicBankCount(banks.filter((b) => b.isPublic).length);
            }),
          );
          if (isAdmin) {
            tasks.push(getUsers().then((r) => setUserCount(r.data.length)));
          }
        }
        await Promise.all(tasks);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [isStudent, isAdmin]);

  const [now] = useState(() => Date.now());
  const ongoing = exams.filter((e) => groupOf(e, now) === 'ongoing').length;
  const upcoming = exams.filter((e) => groupOf(e, now) === 'upcoming').length;
  const past = exams.filter((e) => groupOf(e, now) === 'past').length;

  let stats: { title: string; value: number; prefix: React.ReactNode }[];
  if (isStudent) {
    stats = [
      { title: t('dashboard.ongoing'), value: ongoing, prefix: <PlayCircleOutlined /> },
      { title: t('dashboard.upcoming'), value: upcoming, prefix: <ClockCircleOutlined /> },
      { title: t('dashboard.past'), value: past, prefix: <CheckCircleOutlined /> },
      { title: t('dashboard.totalExams'), value: exams.length, prefix: <ScheduleOutlined /> },
    ];
  } else {
    stats = [
      { title: t('dashboard.banks'), value: bankCount, prefix: <AppstoreOutlined /> },
      { title: t('dashboard.publicBanks'), value: publicBankCount, prefix: <GlobalOutlined /> },
      { title: t('dashboard.exams'), value: exams.length, prefix: <ScheduleOutlined /> },
    ];
    if (isAdmin) {
      stats.push({ title: t('dashboard.users'), value: userCount, prefix: <UserOutlined /> });
    }
  }

  return (
    <Spin spinning={loading}>
      <div className="dashboard-welcome">
        <div className="page-heading" style={{ marginBottom: 12 }}>
          <div>
            <span className="eyebrow">{t('menu.workspace')}</span>
            <Title level={2}>{t('dashboard.welcome', { name: user?.username })}</Title>
          </div>
          <Button icon={<HomeOutlined />} onClick={() => navigate('/')}>{t('dashboard.goHome')}</Button>
        </div>
        <Typography.Paragraph type="secondary">{t('dashboard.subtitle')}</Typography.Paragraph>
        {user && <Tag>{getRoleLabel(user.role as Role)}</Tag>}
      </div>
      <Row className="dashboard-stats" gutter={[16, 16]}>
        {stats.map((s) => (
          <Col xs={12} md={6} key={s.title}>
            <Card>
              <Statistic title={s.title} value={s.value} prefix={s.prefix} />
            </Card>
          </Col>
        ))}
      </Row>
      <section className="quick-links">
        <Title level={4}>{t('dashboard.quickLinks')}</Title>
        <Row gutter={[16, 16]}>
          {[
            { title: t('menu.practice'), description: t('dashboard.practiceDescription'), path: '/practice', icon: <AppstoreOutlined /> },
            { title: t('menu.exams'), description: t('dashboard.examsDescription'), path: '/exams', icon: <ScheduleOutlined /> },
            ...(!isStudent ? [{ title: t('menu.questionBanks'), description: t('dashboard.banksDescription'), path: '/question-banks', icon: <GlobalOutlined /> }] : []),
          ].map((link) => (
            <Col xs={24} md={isStudent ? 12 : 8} key={link.path}>
              <Card className="quick-link" title={link.title}>
                <Typography.Text type="secondary">{link.description}</Typography.Text>
                <div><Button icon={link.icon} onClick={() => navigate(link.path)}>{link.title}</Button></div>
              </Card>
            </Col>
          ))}
        </Row>
      </section>
    </Spin>
  );
}
