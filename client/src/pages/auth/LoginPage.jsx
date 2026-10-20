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
  const [form, setForm] = useState({ email: '', password: '' });
  const [error, setError] = useState('');
  const [verificationEmail, setVerificationEmail] = useState('');
  const [submitting, setSubmitting] = useState(false);
  if (user) return <Navigate to="/dashboard" replace />;
  const submit = async (event) => {
    event.preventDefault(); setError(''); setVerificationEmail(''); setSubmitting(true);
    try { await login(form); navigate(location.state?.from?.pathname || '/dashboard', { replace: true }); }
    catch (requestError) {
      if (requestError.response?.data?.code === 'EMAIL_NOT_VERIFIED') {
        setVerificationEmail(form.email);
        setError('Your email needs to be verified before you can sign in.');
      } else setError(errorMessage(requestError));
    }
    finally { setSubmitting(false); }
  };
  return <AuthShell compact brandTo="/login" eyebrow="Agent portal" title="Agent sign in" description="Use your verified Agent email and password." footer={<span>New Agent? <Link to="/register">Create an account</Link></span>}>
    <form className="auth-form" onSubmit={submit}><Alert>{error}</Alert>
      <FormField label="Agent email" name="email" type="email" autoComplete="username" required value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
      <FormField label="Password" name="password" type="password" autoComplete="current-password" required value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} />
      <div className="form-meta"><Link to="/forgot-password">Forgot password?</Link></div>
      {verificationEmail ? <Link className="primary-button button-link" to={`/resend-verification?email=${encodeURIComponent(verificationEmail)}`}>Continue to email verification</Link> : null}
      <button className="primary-button" disabled={submitting}>{submitting ? 'Signing in…' : 'Sign in as Agent'}</button>
    </form>
  </AuthShell>;
}
