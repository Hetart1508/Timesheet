import { useState } from 'react';
import { Link, Navigate, useNavigate } from 'react-router-dom';
import { ShieldCheck } from 'lucide-react';
import AuthShell from '../../components/auth/AuthShell.jsx';
import FormField from '../../components/forms/FormField.jsx';
import Alert from '../../components/common/Alert.jsx';
import { errorMessage } from '../../api/client.js';
import { useAuth } from '../../context/AuthContext.jsx';

export default function AdminLoginPage() {
  const { user, requestAdminLogin, verifyAdminLogin } = useAuth();
  const navigate = useNavigate();
  const [credentials, setCredentials] = useState({ email: '', password: '' });
  const [challenge, setChallenge] = useState(null);
  const [otp, setOtp] = useState('');
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [submitting, setSubmitting] = useState(false);

  if (user) return <Navigate to="/dashboard" replace />;

  const requestCode = async (event) => {
    event?.preventDefault();
    setError(''); setMessage(''); setSubmitting(true);
    try {
      const result = await requestAdminLogin(credentials);
      setChallenge(result);
      setOtp('');
      setMessage(`A six-digit code was sent to ${credentials.email}. It expires in ${result.expiresInMinutes} minutes.`);
    } catch (requestError) { setError(errorMessage(requestError)); }
    finally { setSubmitting(false); }
  };

  const verifyCode = async (event) => {
    event.preventDefault(); setError(''); setSubmitting(true);
    try {
      await verifyAdminLogin({ challengeId: challenge.challengeId, email: credentials.email, otp });
      navigate('/dashboard', { replace: true });
    } catch (requestError) { setError(errorMessage(requestError)); }
    finally { setSubmitting(false); }
  };

  const startOver = () => { setChallenge(null); setOtp(''); setError(''); setMessage(''); };

  return <AuthShell eyebrow="Protected Admin portal" title={challenge ? 'Enter your security code' : 'Admin sign in'} description={challenge ? 'Check the Admin email inbox, then enter the one-time code.' : 'Admin access always requires an email, password, and a fresh email security code.'} footer={<><span>First-time setup? <Link to="/admin/register">Create the Admin account</Link></span><span className="auth-footer-separator">Are you an Agent? <Link to="/login">Use Agent sign in</Link></span></>}>
    <div className="security-notice"><ShieldCheck size={20} aria-hidden="true" /><span>Two-step verification is required for every Admin sign-in.</span></div>
    {!challenge ? <form className="auth-form" onSubmit={requestCode}>
      <Alert>{error}</Alert>
      <FormField label="Admin email" name="admin-email" type="email" autoComplete="username" required value={credentials.email} onChange={(event) => setCredentials({ ...credentials, email: event.target.value })} />
      <FormField label="Password" name="admin-password" type="password" autoComplete="current-password" required value={credentials.password} onChange={(event) => setCredentials({ ...credentials, password: event.target.value })} />
      <div className="form-meta"><Link to="/forgot-password">Forgot password?</Link></div>
      <button className="primary-button" disabled={submitting}>{submitting ? 'Sending code…' : 'Continue and send code'}</button>
    </form> : <form className="auth-form" onSubmit={verifyCode}>
      <Alert>{error}</Alert><Alert type="success">{message}</Alert>
      <FormField label="Admin email" name="admin-email-confirmation" type="email" value={credentials.email} readOnly />
      <FormField label="Six-digit security code" name="admin-otp" inputMode="numeric" autoComplete="one-time-code" pattern="[0-9]{6}" maxLength="6" required value={otp} onChange={(event) => setOtp(event.target.value.replace(/\D/g, '').slice(0, 6))} hint="The code can be used once." />
      <button className="primary-button" disabled={submitting || otp.length !== 6}>{submitting ? 'Verifying…' : 'Verify and sign in'}</button>
      <div className="admin-login-actions"><button type="button" className="text-button" onClick={requestCode} disabled={submitting}>Send a new code</button><button type="button" className="text-button" onClick={startOver} disabled={submitting}>Use another account</button></div>
    </form>}
  </AuthShell>;
}
