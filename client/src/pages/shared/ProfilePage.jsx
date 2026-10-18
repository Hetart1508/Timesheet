import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import AppShell from '../../components/layout/AppShell.jsx';
import FormField from '../../components/forms/FormField.jsx';
import Alert from '../../components/common/Alert.jsx';
import { api, errorMessage } from '../../api/client.js';
import { useAuth } from '../../context/AuthContext.jsx';

export default function ProfilePage() {
  const { user, clearUser } = useAuth(); const navigate = useNavigate();
  const [form, setForm] = useState({ currentPassword: '', password: '', confirmPassword: '' });
  const [error, setError] = useState(''); const [submitting, setSubmitting] = useState(false);
  const submit = async (event) => {
    event.preventDefault(); setError('');
    if (form.password !== form.confirmPassword) { setError('Passwords do not match.'); return; }
    setSubmitting(true);
    try { await api.post('/auth/change-password', form); const loginPath = user.role === 'ADMIN' ? '/login/admin' : '/login/agent'; clearUser(); navigate(loginPath, { replace: true, state: { message: 'Password changed. Sign in again.' } }); }
    catch (requestError) { setError(errorMessage(requestError)); setSubmitting(false); }
  };
  return <AppShell><section className="workspace-heading"><p className="eyebrow">Profile and security</p><h1>{user.fullName}</h1><p>{user.email} · @{user.username}</p></section><section className="profile-card"><h2>Change password</h2><p>Changing your password revokes every active session, including this one.</p><form className="auth-form" onSubmit={submit}><Alert>{error}</Alert><FormField label="Current password" name="currentPassword" type="password" autoComplete="current-password" required value={form.currentPassword} onChange={(e) => setForm({ ...form, currentPassword: e.target.value })} /><FormField label="New password" name="password" type="password" autoComplete="new-password" minLength="12" maxLength="128" required value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} /><FormField label="Confirm new password" name="confirmPassword" type="password" autoComplete="new-password" required value={form.confirmPassword} onChange={(e) => setForm({ ...form, confirmPassword: e.target.value })} /><button className="primary-button" disabled={submitting}>{submitting ? 'Changing password…' : 'Change password'}</button></form></section></AppShell>;
}
