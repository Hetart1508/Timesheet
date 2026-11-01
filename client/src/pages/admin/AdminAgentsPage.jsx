import { useEffect, useState } from 'react';
import { Edit3, Plus, Search, Trash2, Users } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import AppShell from '../../components/layout/AppShell.jsx';
import Alert from '../../components/common/Alert.jsx';
import RequestState from '../../components/common/RequestState.jsx';
import { adminApi } from '../../api/admin.js';
import { errorMessage, fieldErrors } from '../../api/client.js';
import { formatDuration } from '../../api/timesheets.js';
import useDebouncedValue from '../../hooks/useDebouncedValue.js';

const emptyAgent = { fullName: '', email: '', status: 'ACTIVE' };

export default function AdminAgentsPage() {
  const navigate = useNavigate();
  const [search, setSearch] = useState(''); const [applied, setApplied] = useState(''); const [result, setResult] = useState(null);
  const [error, setError] = useState(''); const [loadError, setLoadError] = useState(''); const [success, setSuccess] = useState('');
  const [form, setForm] = useState(null); const [formErrors, setFormErrors] = useState({}); const [busy, setBusy] = useState(false);
  const debouncedSearch = useDebouncedValue(search, 500);
  const load = () => { setResult(null); setLoadError(''); return adminApi.listAgents({ search: applied, pageSize: 100 }).then(setResult).catch((err) => setLoadError(errorMessage(err))); };
  useEffect(() => { load(); }, [applied]);
  useEffect(() => { setApplied(debouncedSearch); }, [debouncedSearch]);
  const save = async (event) => {
    event.preventDefault(); setBusy(true); setError(''); setFormErrors({});
    try {
      if (form.id) await adminApi.updateAgent(form.id, { fullName: form.fullName, email: form.email, status: form.status });
      else await adminApi.createAgent(form);
      setSuccess(form.id ? 'Agent updated.' : 'Agent created.'); setForm(null); await load();
    } catch (err) { setError(errorMessage(err)); setFormErrors(fieldErrors(err)); } finally { setBusy(false); }
  };
  const remove = async (agent) => {
    if (!window.confirm(`Delete ${agent.fullName}? Existing timesheets and reports will be preserved.`)) return;
    setError('');
    try { await adminApi.deleteAgent(agent.id); setSuccess('Agent deleted.'); await load(); } catch (err) { setError(errorMessage(err)); }
  };
  const agents = result?.agents.filter((agent) => agent.accountRole !== 'ADMIN') || [];
  return <AppShell>
    <section className="workspace-heading"><p className="eyebrow">User administration</p><h1>Agents</h1><p>Create and maintain agent records, then fill their timesheets from this Admin workspace.</p></section>
    <section className="content-card section-block">
      <div className="section-heading"><div><h2>Agent directory</h2><p>Agents do not need an account or a separate sign-in.</p></div><button className="primary-button" type="button" onClick={() => setForm({ ...emptyAgent })}><Plus size={17} /> Add agent</button></div>
      {form ? <form className="business-form nested-form" onSubmit={save}><h3>{form.id ? 'Edit agent' : 'New agent'}</h3><div className="two-fields"><label className="field"><span>Full name</span><input required minLength="2" maxLength="120" value={form.fullName} onChange={(e) => setForm({ ...form, fullName: e.target.value })} />{formErrors.fullName ? <small className="field-error">{formErrors.fullName}</small> : null}</label><label className="field"><span>Email</span><input required type="email" maxLength="254" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />{formErrors.email ? <small className="field-error">{formErrors.email}</small> : null}</label></div><label className="field"><span>Status</span><select value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })}><option value="ACTIVE">Active</option><option value="INACTIVE">Inactive</option></select></label><div className="form-actions"><button className="secondary-button" type="button" onClick={() => setForm(null)}>Cancel</button><button className="primary-button" disabled={busy}>{busy ? 'Saving…' : 'Save agent'}</button></div></form> : null}
      <label className="admin-search-field admin-agent-search"><Search size={17} /><input type="search" aria-label="Search agents" value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search name or email" /></label><Alert>{error}</Alert><Alert type="success">{success}</Alert>
      {!result ? <RequestState error={loadError} label="Loading agents…" onRetry={load} /> : agents.length ? <div className="table-wrap"><table className="data-table"><thead><tr><th>Agent</th><th>Email</th><th>Status</th><th>Timesheets</th><th>Recorded</th><th>Actions</th></tr></thead><tbody>{agents.map((agent) => <tr key={agent.id}><td data-label="Agent"><strong>{agent.fullName}</strong></td><td data-label="Email">{agent.email}</td><td data-label="Status"><span className={`account-status ${agent.status.toLowerCase()}`}>{agent.status}</span></td><td data-label="Timesheets">{agent.totalTimesheets}</td><td data-label="Recorded">{formatDuration(agent.totalDuration)}</td><td data-label="Actions"><div className="row-actions"><button className="table-action" onClick={() => navigate(`/admin/agents/${agent.id}/timesheets/new`)}><Plus size={15} /> Fill timesheet</button><button className="icon-button" aria-label={`Edit ${agent.fullName}`} onClick={() => setForm({ id: agent.id, fullName: agent.fullName, email: agent.email, status: agent.status })}><Edit3 /></button><button className="icon-button danger-button" aria-label={`Delete ${agent.fullName}`} onClick={() => remove(agent)}><Trash2 /></button></div></td></tr>)}</tbody></table></div> : <div className="empty-state"><Users /><h3>No agents found</h3><p>Add the first agent to begin entering timesheets.</p></div>}
    </section>
  </AppShell>;
}
