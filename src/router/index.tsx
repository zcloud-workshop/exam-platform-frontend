import { HashRouter, Routes, Route, useNavigate } from 'react-router';
import { AuthGuard } from '@/components/AuthGuard';
import { RoleGuard } from '@/components/RoleGuard';
import AppLayout from '@/components/Layout/AppLayout';
import { Role } from '@/types/enums';
import { Button, Result } from 'antd';
import { useTranslation } from 'react-i18next';
import PublicHeader from '@/components/Layout/PublicHeader';

import HomePage from '@/pages/Home';
import PracticeListPage from '@/pages/PracticeList';
import PracticePage from '@/pages/Practice';
import MyPracticePage from '@/pages/MyPractice';
import ExamListPage from '@/pages/ExamList';
import LoginPage from '@/pages/Login';
import DashboardPage from '@/pages/Dashboard';
import UsersPage from '@/pages/Users';
import QuestionBanksPage from '@/pages/QuestionBanks';
import ExamTakingPage from '@/pages/ExamTaking';
import RecordsPage from '@/pages/Records';
import FilesPage from '@/pages/Files';
import LogsPage from '@/pages/Logs';

function ErrorPage({ status }: { status: '403' | '404' }) {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const key = status === '403' ? 'forbidden' : 'notFound';
  return (
    <>
      <PublicHeader />
      <Result status={status} title={`${status} · ${t(`errors.${key}`)}`}
        subTitle={t(`errors.${key}Description`)}
        extra={<Button type="primary" onClick={() => navigate('/')}>{t('practice.backToHome')}</Button>} />
    </>
  );
}

export default function AppRouter() {
  return (
    <HashRouter>
      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route path="/practice" element={<PracticeListPage />} />
        <Route path="/practice/mine" element={<AuthGuard><MyPracticePage /></AuthGuard>} />
        <Route path="/practice/:bankId" element={<PracticePage />} />
        <Route path="/login" element={<LoginPage />} />
        <Route path="/register" element={<LoginPage />} />
        <Route
          path="/exams"
          element={
            <AuthGuard>
              <ExamListPage />
            </AuthGuard>
          }
        />
        <Route
          element={
            <AuthGuard>
              <AppLayout />
            </AuthGuard>
          }
        >
          <Route path="/dashboard" element={<DashboardPage />} />
          <Route
            path="/admin/users"
            element={
              <RoleGuard roles={[Role.super_admin]}>
                <UsersPage />
              </RoleGuard>
            }
          />
          <Route
            path="/admin/logs"
            element={
              <RoleGuard roles={[Role.super_admin]}>
                <LogsPage />
              </RoleGuard>
            }
          />
          <Route path="/question-banks" element={<QuestionBanksPage />} />
          <Route
            path="/exams/:id/take"
            element={
              <RoleGuard roles={[Role.student]}>
                <ExamTakingPage />
              </RoleGuard>
            }
          />
          <Route
            path="/exams/:id/records"
            element={
              <RoleGuard roles={[Role.super_admin, Role.question_admin, Role.teacher]}>
                <RecordsPage />
              </RoleGuard>
            }
          />
          <Route path="/files" element={<FilesPage />} />
        </Route>
        <Route path="/403" element={<ErrorPage status="403" />} />
        <Route path="*" element={<ErrorPage status="404" />} />
      </Routes>
    </HashRouter>
  );
}
