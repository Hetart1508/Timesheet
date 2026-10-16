import { useState } from 'react';
import { Link, Navigate, useLocation, useNavigate } from 'react-router-dom';
import AuthShell from '../../components/auth/AuthShell.jsx';
import FormField from '../../components/forms/FormField.jsx';
import Alert from '../../components/common/Alert.jsx';
import { errorMessage } from '../../api/client.js';
import { useAuth } from '../../context/AuthContext.jsx';

export default function LoginPage() {
  const { user, login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [form, setForm] = useState({ identifier: '', password: '' });
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  if (user) return <Navigate to="/dashboard" replace />;
  const submit = async (event) => {
    event.preventDefault(); setError(''); setSubmitting(true);
    try { await login(form); navigate(location.state?.from?.pathname || '/dashboard', { replace: true }); }
    catch (requestError) { setError(errorMessage(requestError)); }
    finally { setSubmitting(false); }
  };
  return <AuthShell eyebrow="Welcome back" title="Sign in to your workspace" description="Use your username or verified email address." footer={<>New Agent? <Link to="/register">Create an account</Link></>}>
    <form className="auth-form" onSubmit={submit}><Alert>{error}</Alert>
      <FormField label="Username or email" name="identifier" autoComplete="username" required value={form.identifier} onChange={(e) => setForm({ ...form, identifier: e.target.value })} />
      <FormField label="Password" name="password" type="password" autoComplete="current-password" required value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} />
      <div className="form-meta"><Link to="/forgot-password">Forgot password?</Link><Link to="/verify-email">Verify email</Link><Link to="/resend-verification">Resend code</Link></div>
      <button className="primary-button" disabled={submitting}>{submitting ? 'Signing in…' : 'Sign in'}</button>
    </form>
  </AuthShell>;
}
