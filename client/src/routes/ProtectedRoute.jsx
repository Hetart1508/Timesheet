import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';

export default function ProtectedRoute({ role }) {
  const { user, loading } = useAuth();
  const location = useLocation();
  if (loading) return <div className="full-state" role="status"><span className="spinner" />Checking your session…</div>;
  if (!user) return <Navigate to={location.pathname.startsWith('/admin') ? '/login/admin' : '/login/agent'} state={{ from: location }} replace />;
  if (role && user.role !== role) return <Navigate to="/dashboard" replace />;
  return <Outlet />;
}
