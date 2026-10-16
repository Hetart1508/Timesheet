import { useState } from 'react';
import { Link } from 'react-router-dom';
import AuthShell from '../../components/auth/AuthShell.jsx';
import FormField from '../../components/forms/FormField.jsx';
import Alert from '../../components/common/Alert.jsx';
import { api, errorMessage } from '../../api/client.js';

export default function RequestEmailPage({ mode }) {
  const reset = mode === 'reset';
  const [email, setEmail] = useState(''); const [message, setMessage] = useState(''); const [error, setError] = useState(''); const [submitting, setSubmitting] = useState(false);
  const submit = async (event) => {
    event.preventDefault(); setError(''); setSubmitting(true);
    try { const { data } = await api.post(reset ? '/auth/forgot-password' : '/auth/resend-verification', { email }); setMessage(data.message); }
    catch (requestError) { setError(errorMessage(requestError)); }
    finally { setSubmitting(false); }
  };
  return <AuthShell eyebrow={reset ? 'Account recovery' : 'Email verification'} title={reset ? 'Reset your password' : 'Resend verification code'} description="For privacy, the result is the same whether or not the address is registered." footer={<Link to="/login">Back to sign in</Link>}>
    <form className="auth-form" onSubmit={submit}><Alert>{error}</Alert><Alert type="success">{message}</Alert><FormField label="Email address" name="email" type="email" autoComplete="email" required value={email} onChange={(e) => setEmail(e.target.value)} /><button className="primary-button" disabled={submitting}>{submitting ? 'Submitting…' : reset ? 'Send reset link' : 'Send verification code'}</button>{!reset && message ? <Link className="primary-button button-link" to={`/verify-email?email=${encodeURIComponent(email)}`}>Enter verification code</Link> : null}</form>
  </AuthShell>;
}
