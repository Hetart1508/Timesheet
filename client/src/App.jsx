import { lazy, Suspense } from 'react';
import { Navigate, Route, Routes } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext.jsx';
import ProtectedRoute from './routes/ProtectedRoute.jsx';
import PublicOnlyRoute from './routes/PublicOnlyRoute.jsx';
import LoginPage from './pages/auth/LoginPage.jsx';
import AdminLoginPage from './pages/auth/AdminLoginPage.jsx';
import AdminRegisterPage from './pages/auth/AdminRegisterPage.jsx';
import RegisterPage from './pages/auth/RegisterPage.jsx';
import VerifyEmailPage from './pages/auth/VerifyEmailPage.jsx';
import ResendVerificationPage from './pages/auth/ResendVerificationPage.jsx';
import ForgotPasswordPage from './pages/auth/ForgotPasswordPage.jsx';
import ResetPasswordPage from './pages/auth/ResetPasswordPage.jsx';
import AcceptInvitationPage from './pages/auth/AcceptInvitationPage.jsx';
import NotFoundPage from './pages/shared/NotFoundPage.jsx';

const DashboardPage = lazy(() => import('./pages/shared/DashboardPage.jsx'));
const ProfilePage = lazy(() => import('./pages/shared/ProfilePage.jsx'));
const CompanyDirectoryPage = lazy(() => import('./pages/shared/CompanyDirectoryPage.jsx'));
const TimesheetHistoryPage = lazy(() => import('./pages/agent/TimesheetHistoryPage.jsx'));
const TimesheetPage = lazy(() => import('./pages/agent/TimesheetPage.jsx'));
const AgentCompaniesPage = lazy(() => import('./pages/agent/AgentCompaniesPage.jsx'));
const AdminTimesheetsPage = lazy(() => import('./pages/admin/AdminTimesheetsPage.jsx'));
const AdminReviewPage = lazy(() => import('./pages/admin/AdminReviewPage.jsx'));
const AdminAgentsPage = lazy(() => import('./pages/admin/AdminAgentsPage.jsx'));
const AdminCompaniesPage = lazy(() => import('./pages/admin/AdminCompaniesPage.jsx'));
const AuditLogPage = lazy(() => import('./pages/admin/AuditLogPage.jsx'));
const AnalyticsPage = lazy(() => import('./pages/admin/AnalyticsPage.jsx'));
const ExportCenterPage = lazy(() => import('./pages/admin/ExportCenterPage.jsx'));
const AdminInvoicesPage = lazy(() => import('./pages/admin/AdminInvoicesPage.jsx'));
const WorkCalendarPage = lazy(() => import('./pages/admin/WorkCalendarPage.jsx'));
const AdminImportPage = lazy(() => import('./pages/admin/AdminImportPage.jsx'));
const TemporaryPage = lazy(() => import('./pages/admin/TemporaryPage.jsx'));

export default function App() {
  return (
    <AuthProvider>
      <Routes>
        <Route path="/accept-invitation" element={<AcceptInvitationPage />} />
        <Route element={<PublicOnlyRoute />}>
          <Route path="/login/agent" element={<LoginPage />} />
          <Route path="/login/admin" element={<AdminLoginPage />} />
          <Route path="/login" element={<Navigate to="/login/agent" replace />} />
          <Route path="/admin/login" element={<Navigate to="/login/admin" replace />} />
          <Route path="/admin/register" element={<AdminRegisterPage />} />
          <Route path="/register" element={<RegisterPage />} />
          <Route path="/verify-email" element={<VerifyEmailPage />} />
          <Route path="/resend-verification" element={<ResendVerificationPage />} />
          <Route path="/forgot-password" element={<ForgotPasswordPage />} />
          <Route path="/reset-password" element={<ResetPasswordPage />} />
        </Route>
        <Route element={<Suspense fallback={<div className="full-state"><span className="spinner" /> Loading workspace…</div>}><ProtectedRoute /></Suspense>}>
          <Route path="/dashboard" element={<DashboardPage />} />
          <Route path="/profile" element={<ProfilePage />} />
          <Route path="/companies" element={<CompanyDirectoryPage />} />
          <Route element={<ProtectedRoute role="AGENT" />}>
            <Route path="/timesheets" element={<TimesheetHistoryPage />} />
            <Route path="/timesheets/:id" element={<TimesheetPage />} />
            <Route path="/companies" element={<AgentCompaniesPage />} />
          </Route>
          <Route element={<ProtectedRoute role="ADMIN" />}>
            <Route path="/admin/reviews" element={<AdminTimesheetsPage defaultStatus="SUBMITTED" />} />
            <Route path="/admin/timesheets" element={<AdminTimesheetsPage />} />
            <Route path="/admin/timesheets/:id" element={<AdminReviewPage />} />
            <Route path="/admin/work-calendar" element={<WorkCalendarPage />} />
            <Route path="/admin/agents" element={<AdminAgentsPage />} />
            <Route path="/admin/companies" element={<AdminCompaniesPage />} />
            <Route path="/admin/audits" element={<AuditLogPage />} />
            <Route path="/admin/analytics" element={<AnalyticsPage />} />
            <Route path="/admin/exports" element={<ExportCenterPage />} />
            <Route path="/admin/invoices" element={<AdminInvoicesPage />} />
            <Route path="/admin/imports" element={<AdminImportPage />} />
            <Route path="/admin/temporary" element={<TemporaryPage />} />
          </Route>
        </Route>
        <Route path="/" element={<Navigate to="/dashboard" replace />} />
        <Route path="*" element={<NotFoundPage />} />
      </Routes>
    </AuthProvider>
  );
}
