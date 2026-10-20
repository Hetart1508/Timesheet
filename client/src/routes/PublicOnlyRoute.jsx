import { Navigate, Outlet } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';

export default function PublicOnlyRoute() {
  const { user, loading } = useAuth();

  if (loading) {
    return <div className="full-state" role="status"><span className="spinner" />Checking your session…</div>;
  }

  if (user) return <Navigate to="/dashboard" replace />;
  return <Outlet />;
}
