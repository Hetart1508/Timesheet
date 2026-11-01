import { useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import AuthShell from '../../components/auth/AuthShell.jsx';
import FormField from '../../components/forms/FormField.jsx';
import Alert from '../../components/common/Alert.jsx';
import { api, errorMessage, fieldErrors as readFieldErrors } from '../../api/client.js';

export default function VerifyEmailPage() {
  const [params] = useSearchParams();
  const [form, setForm] = useState({ email: params.get('email') || '', otp: '' });
  const [fieldErrors, setFieldErrors] = useState({});
  const [state, setState] = useState({ verified: false, error: '', submitting: false });

  const update = (event) => {
    const value = event.target.name === 'otp' ? event.target.value.replace(/\D/g, '').slice(0, 6) : event.target.value;
    setForm({ ...form, [event.target.name]: value });
    setFieldErrors((current) => ({ ...current, [event.target.name]: undefined }));
  };

  const submit = async (event) => {
    event.preventDefault();
    setState({ verified: false, error: '', submitting: true });
    setFieldErrors({});
    try {
      await api.post('/auth/verify-email', form);
      setState({ verified: true, error: '', submitting: false });
    } catch (error) {
      setFieldErrors(readFieldErrors(error));
      setState({ verified: false, error: errorMessage(error), submitting: false });
    }
  };

  return <AuthShell eyebrow="Email verification" title={state.verified ? 'Your email is verified' : 'Enter your verification code'} description={state.verified ? 'Your Admin account is ready to use.' : 'Enter the six-digit code sent to your email. The code expires in 10 minutes.'} footer={state.verified ? <Link to="/login">Continue to sign in</Link> : <Link to="/resend-verification">Send a new code</Link>}>
    {state.verified ? <Alert type="success">Email verified successfully.</Alert> : <form className="auth-form" onSubmit={submit}>
      <Alert>{state.error}</Alert>
      <FormField label="Email address" name="email" type="email" autoComplete="email" required maxLength="254" error={fieldErrors.email} value={form.email} onChange={update} />
      <FormField label="Six-digit code" name="otp" type="text" inputMode="numeric" autoComplete="one-time-code" autoFocus required minLength="6" maxLength="6" pattern="[0-9]{6}" error={fieldErrors.otp} value={form.otp} onChange={update} />
      <button className="primary-button" disabled={state.submitting || form.otp.length !== 6}>{state.submitting ? 'Verifying…' : 'Verify email'}</button>
    </form>}
  </AuthShell>;
}
