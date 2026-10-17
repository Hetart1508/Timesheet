import { Navigate, Route, Routes } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext.jsx';
import ProtectedRoute from './routes/ProtectedRoute.jsx';
import LoginPage from './pages/auth/LoginPage.jsx';
import RegisterPage from './pages/auth/RegisterPage.jsx';
import VerifyEmailPage from './pages/auth/VerifyEmailPage.jsx';
import ResendVerificationPage from './pages/auth/ResendVerificationPage.jsx';
import ForgotPasswordPage from './pages/auth/ForgotPasswordPage.jsx';
import ResetPasswordPage from './pages/auth/ResetPasswordPage.jsx';
import DashboardPage from './pages/shared/DashboardPage.jsx';
import ProfilePage from './pages/shared/ProfilePage.jsx';
import NotFoundPage from './pages/shared/NotFoundPage.jsx';
import TimesheetHistoryPage from './pages/agent/TimesheetHistoryPage.jsx';
import TimesheetPage from './pages/agent/TimesheetPage.jsx';
import AgentCompaniesPage from './pages/agent/AgentCompaniesPage.jsx';
import AdminTimesheetsPage from './pages/admin/AdminTimesheetsPage.jsx';
import AdminReviewPage from './pages/admin/AdminReviewPage.jsx';
import AdminAgentsPage from './pages/admin/AdminAgentsPage.jsx';
import AdminCompaniesPage from './pages/admin/AdminCompaniesPage.jsx';
import AuditLogPage from './pages/admin/AuditLogPage.jsx';
import AnalyticsPage from './pages/admin/AnalyticsPage.jsx';
import ExportCenterPage from './pages/admin/ExportCenterPage.jsx';

export default function App() {
  return (
    <AuthProvider>
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route path="/register" element={<RegisterPage />} />
        <Route path="/verify-email" element={<VerifyEmailPage />} />
        <Route path="/resend-verification" element={<ResendVerificationPage />} />
        <Route path="/forgot-password" element={<ForgotPasswordPage />} />
        <Route path="/reset-password" element={<ResetPasswordPage />} />
        <Route element={<ProtectedRoute />}>
          <Route path="/dashboard" element={<DashboardPage />} />
          <Route path="/profile" element={<ProfilePage />} />
          <Route element={<ProtectedRoute role="AGENT" />}>
            <Route path="/timesheets" element={<TimesheetHistoryPage />} />
            <Route path="/timesheets/:id" element={<TimesheetPage />} />
            <Route path="/companies" element={<AgentCompaniesPage />} />
          </Route>
          <Route element={<ProtectedRoute role="ADMIN" />}>
            <Route path="/admin/timesheets" element={<AdminTimesheetsPage />} />
            <Route path="/admin/timesheets/:id" element={<AdminReviewPage />} />
            <Route path="/admin/agents" element={<AdminAgentsPage />} />
            <Route path="/admin/companies" element={<AdminCompaniesPage />} />
            <Route path="/admin/audits" element={<AuditLogPage />} />
            <Route path="/admin/analytics" element={<AnalyticsPage />} />
            <Route path="/admin/exports" element={<ExportCenterPage />} />
          </Route>
        </Route>
        <Route path="/" element={<Navigate to="/dashboard" replace />} />
        <Route path="*" element={<NotFoundPage />} />
      </Routes>
    </AuthProvider>
  );
}
