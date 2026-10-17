import { useAuth } from '../../context/AuthContext.jsx';
import AgentDashboardPage from '../agent/AgentDashboardPage.jsx';
import AdminDashboardPage from '../admin/AdminDashboardPage.jsx';

export default function DashboardPage() {
  const { user } = useAuth(); const admin = user.role === 'ADMIN';
  if (!admin) return <AgentDashboardPage />;
  return <AdminDashboardPage />;
}
