import { useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import AuthShell from '../../components/auth/AuthShell.jsx';
import FormField from '../../components/forms/FormField.jsx';
import Alert from '../../components/common/Alert.jsx';
import { api, errorMessage } from '../../api/client.js';

export default function ResetPasswordPage() {
  const [params] = useSearchParams(); const [form, setForm] = useState({ password: '', confirmPassword: '' });
  const adminPortal = params.get('portal') === 'admin';
  const [message, setMessage] = useState(''); const [error, setError] = useState(''); const [submitting, setSubmitting] = useState(false);
  const submit = async (event) => {
    event.preventDefault(); setError(''); const token = params.get('token');
    if (!token) { setError('The password-reset token is missing.'); return; }
    if (form.password !== form.confirmPassword) { setError('Passwords do not match.'); return; }
    setSubmitting(true);
    try { const { data } = await api.post('/auth/reset-password', { token, ...form }); setMessage(data.message); }
    catch (requestError) { setError(errorMessage(requestError)); }
    finally { setSubmitting(false); }
  };
  return <AuthShell brandTo={adminPortal ? '/login/admin' : '/'} eyebrow="Account recovery" title="Choose a new password" description="Resetting your password signs out every existing session." footer={<Link to={adminPortal ? '/login/admin' : '/login/agent'}>Back to sign in</Link>}>
    <form className="auth-form" onSubmit={submit}><Alert>{error}</Alert><Alert type="success">{message}</Alert>{!message && <><FormField label="New password" name="password" type="password" autoComplete="new-password" minLength="12" maxLength="128" required value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} /><FormField label="Confirm new password" name="confirmPassword" type="password" autoComplete="new-password" required value={form.confirmPassword} onChange={(e) => setForm({ ...form, confirmPassword: e.target.value })} /><button className="primary-button" disabled={submitting}>{submitting ? 'Resetting…' : 'Reset password'}</button></>}</form>
  </AuthShell>;
}
