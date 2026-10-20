import { useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import AuthShell from '../../components/auth/AuthShell.jsx';
import FormField from '../../components/forms/FormField.jsx';
import Alert from '../../components/common/Alert.jsx';
import { api, errorMessage } from '../../api/client.js';

export default function AcceptInvitationPage() {
  const [params] = useSearchParams();
  const [form, setForm] = useState({ password: '', confirmPassword: '' });
  const [error, setError] = useState('');
  const [complete, setComplete] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const token = params.get('token');

  const submit = async (event) => {
    event.preventDefault(); setError('');
    if (!token) { setError('This invitation link is missing its token.'); return; }
    if (form.password !== form.confirmPassword) { setError('Passwords do not match.'); return; }
    setSubmitting(true);
    try {
      await api.post('/auth/accept-invitation', { token, ...form });
      setComplete(true);
    } catch (requestError) { setError(errorMessage(requestError)); }
    finally { setSubmitting(false); }
  };

  return <AuthShell eyebrow="Agent account setup" title={complete ? 'Your account is ready' : 'Set your password'} description={complete ? 'Your email is verified. Sign in with the email address where you received this link.' : 'Choose a password to finish setting up your Agent account. This one-time link expires after 7 days.'} footer={<Link to="/login/agent">Agent sign in</Link>}>
    {complete ? <div className="success-state"><Alert type="success">Account setup complete. You can now sign in.</Alert><Link className="primary-button button-link" to="/login/agent">Continue to sign in</Link></div> : <form className="auth-form" onSubmit={submit}>
      <Alert>{error}</Alert>
      <FormField label="Password" name="password" type="password" autoComplete="new-password" minLength="12" maxLength="128" required value={form.password} onChange={(event) => setForm({ ...form, password: event.target.value })} />
      <FormField label="Confirm password" name="confirmPassword" type="password" autoComplete="new-password" required value={form.confirmPassword} onChange={(event) => setForm({ ...form, confirmPassword: event.target.value })} />
      <button className="primary-button" disabled={submitting || !token}>{submitting ? 'Setting up account…' : 'Finish account setup'}</button>
    </form>}
  </AuthShell>;
}