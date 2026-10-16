import { useState } from 'react';
import { Link } from 'react-router-dom';
import AuthShell from '../../components/auth/AuthShell.jsx';
import FormField from '../../components/forms/FormField.jsx';
import Alert from '../../components/common/Alert.jsx';
import { api, errorMessage, fieldErrors as readFieldErrors } from '../../api/client.js';

export default function RegisterPage() {
  const [form, setForm] = useState({ fullName: '', username: '', email: '', password: '', confirmPassword: '' });
  const [message, setMessage] = useState(''); const [error, setError] = useState(''); const [submitting, setSubmitting] = useState(false);
  const [fieldErrors, setFieldErrors] = useState({});
  const update = (event) => {
    setForm({ ...form, [event.target.name]: event.target.value });
    setFieldErrors((current) => ({ ...current, [event.target.name]: undefined }));
  };
  const submit = async (event) => {
    event.preventDefault(); setError(''); setFieldErrors({}); setSubmitting(true);
    if (form.password !== form.confirmPassword) { setFieldErrors({ confirmPassword: 'Passwords do not match.' }); setError('confirmPassword: Passwords do not match.'); setSubmitting(false); return; }
    try { const { data } = await api.post('/auth/register', form); setMessage(data.message); }
    catch (requestError) { setFieldErrors(readFieldErrors(requestError)); setError(errorMessage(requestError)); }
    finally { setSubmitting(false); }
  };
  return <AuthShell eyebrow="Agent registration" title="Create your Agent account" description="Your email must be verified before you can sign in." footer={<>Already registered? <Link to="/login">Sign in</Link></>}>
    {message ? <div className="success-state"><Alert type="success">{message}</Alert><Link className="primary-button button-link" to={`/verify-email?email=${encodeURIComponent(form.email)}`}>Enter verification code</Link></div> :
      <form className="auth-form" onSubmit={submit}><Alert>{error}</Alert>
        <div className="two-fields"><FormField label="Full name" name="fullName" autoComplete="name" required minLength="2" maxLength="120" error={fieldErrors.fullName} value={form.fullName} onChange={update} /><FormField label="Username" name="username" autoComplete="username" required minLength="3" maxLength="60" pattern="[A-Za-z0-9._-]+" hint="Letters, numbers, dots, underscores and hyphens only." error={fieldErrors.username} value={form.username} onChange={update} /></div>
        <FormField label="Email address" name="email" type="email" autoComplete="email" required maxLength="254" error={fieldErrors.email} value={form.email} onChange={update} />
        <FormField label="Password" name="password" type="password" autoComplete="new-password" required minLength="12" maxLength="128" hint="Use 12–128 characters; passphrases work well." error={fieldErrors.password} value={form.password} onChange={update} />
        <FormField label="Confirm password" name="confirmPassword" type="password" autoComplete="new-password" required error={fieldErrors.confirmPassword} value={form.confirmPassword} onChange={update} />
        <button className="primary-button" disabled={submitting}>{submitting ? 'Creating account…' : 'Create Agent account'}</button>
      </form>}
  </AuthShell>;
}
