import { useState } from 'react';
import { Link } from 'react-router-dom';
import AuthShell from '../../components/auth/AuthShell.jsx';
import FormField from '../../components/forms/FormField.jsx';
import Alert from '../../components/common/Alert.jsx';
import { api, errorMessage, fieldErrors as readFieldErrors } from '../../api/client.js';

const emptyForm = { fullName: '', username: '', email: '', password: '', confirmPassword: '' };

export default function AdminRegisterPage() {
  const [form, setForm] = useState(emptyForm);
  const [otp, setOtp] = useState('');
  const [step, setStep] = useState('details');
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [fieldErrors, setFieldErrors] = useState({});
  const [submitting, setSubmitting] = useState(false);

  const update = (event) => {
    setForm({ ...form, [event.target.name]: event.target.value });
    setFieldErrors((current) => ({ ...current, [event.target.name]: undefined }));
  };

  const register = async (event) => {
    event.preventDefault(); setError(''); setFieldErrors({}); setSubmitting(true);
    if (form.password !== form.confirmPassword) {
      setFieldErrors({ confirmPassword: 'Passwords do not match.' });
      setError('Passwords do not match.'); setSubmitting(false); return;
    }
    try {
      const { data } = await api.post('/auth/register-admin', form);
      setMessage(data.message); setStep('verify');
    } catch (requestError) {
      setFieldErrors(readFieldErrors(requestError)); setError(errorMessage(requestError));
    } finally { setSubmitting(false); }
  };

  const verify = async (event) => {
    event.preventDefault(); setError(''); setSubmitting(true);
    try {
      await api.post('/auth/verify-email', { email: form.email, otp });
      setStep('complete'); setMessage('Admin email verified. You can now use secure Admin sign in.');
    } catch (requestError) { setError(errorMessage(requestError)); }
    finally { setSubmitting(false); }
  };

  const resend = async () => {
    setError(''); setSubmitting(true);
    try { await api.post('/auth/resend-verification', { email: form.email }); setMessage('A new verification code was sent.'); }
    catch (requestError) { setError(errorMessage(requestError)); }
    finally { setSubmitting(false); }
  };

  return <AuthShell eyebrow="One-time Admin setup" title={step === 'details' ? 'Create the Admin account' : step === 'verify' ? 'Verify the Admin email' : 'Admin account ready'} description={step === 'details' ? 'Only one Admin account can be created for this system.' : step === 'verify' ? `Enter the six-digit code sent to ${form.email}.` : 'Every Admin login will require a new email security code.'} footer={<>Already set up? <Link to="/admin/login">Admin sign in</Link> · <Link to="/login">Agent sign in</Link></>}>
    <Alert>{error}</Alert>
    {step === 'details' ? <form className="auth-form" onSubmit={register}>
      <div className="two-fields"><FormField label="Full name" name="fullName" autoComplete="name" required minLength="2" maxLength="120" error={fieldErrors.fullName} value={form.fullName} onChange={update} /><FormField label="Username" name="username" autoComplete="username" required minLength="3" maxLength="60" error={fieldErrors.username} value={form.username} onChange={update} /></div>
      <FormField label="Admin email" name="email" type="email" autoComplete="email" required maxLength="254" error={fieldErrors.email} value={form.email} onChange={update} />
      <FormField label="Password" name="password" type="password" autoComplete="new-password" required minLength="12" maxLength="128" hint="Use at least 12 characters." error={fieldErrors.password} value={form.password} onChange={update} />
      <FormField label="Confirm password" name="confirmPassword" type="password" autoComplete="new-password" required error={fieldErrors.confirmPassword} value={form.confirmPassword} onChange={update} />
      <button className="primary-button" disabled={submitting}>{submitting ? 'Creating…' : 'Create Admin account'}</button>
    </form> : null}
    {step === 'verify' ? <form className="auth-form" onSubmit={verify}>
      <Alert type="success">{message}</Alert>
      <FormField label="Six-digit verification code" name="admin-registration-otp" inputMode="numeric" autoComplete="one-time-code" pattern="[0-9]{6}" maxLength="6" required value={otp} onChange={(event) => setOtp(event.target.value.replace(/\D/g, '').slice(0, 6))} />
      <button className="primary-button" disabled={submitting || otp.length !== 6}>{submitting ? 'Verifying…' : 'Verify Admin email'}</button>
      <button className="text-button" type="button" disabled={submitting} onClick={resend}>Send a new code</button>
    </form> : null}
    {step === 'complete' ? <div className="success-state"><Alert type="success">{message}</Alert><Link className="primary-button button-link" to="/admin/login">Continue to Admin sign in</Link></div> : null}
  </AuthShell>;
}
