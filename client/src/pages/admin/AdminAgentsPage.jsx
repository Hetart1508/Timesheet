import { useEffect, useState } from 'react';
import { Search, Users } from 'lucide-react';
import AppShell from '../../components/layout/AppShell.jsx';
import Alert from '../../components/common/Alert.jsx';
import { adminApi } from '../../api/admin.js';
import { errorMessage } from '../../api/client.js';
import { formatDuration } from '../../api/timesheets.js';

export default function AdminAgentsPage() {
  const [search, setSearch] = useState(''); const [applied, setApplied] = useState(''); const [result, setResult] = useState(null); const [error, setError] = useState(''); const [success, setSuccess] = useState('');
  const load = () => adminApi.listAgents({ search: applied, pageSize: 100 }).then(setResult).catch((err) => setError(errorMessage(err)));
  useEffect(load, [applied]);
  const toggle = async (agent) => { const status = agent.status === 'ACTIVE' ? 'INACTIVE' : 'ACTIVE'; if (!window.confirm(`${status === 'INACTIVE' ? 'Deactivate' : 'Activate'} ${agent.fullName}?`)) return; try { await adminApi.setAgentStatus(agent.id, status); setSuccess(`Agent ${status.toLowerCase()}.`); load(); } catch (err) { setError(errorMessage(err)); } };
  return <AppShell><section className="workspace-heading"><p className="eyebrow">User administration</p><h1>Agent directory</h1><p>Monitor field activity and control access. Deactivation immediately revokes the Agent’s active sessions.</p></section><section className="content-card section-block"><form className="search-bar" onSubmit={(event) => { event.preventDefault(); setApplied(search); }}><input aria-label="Search agents" value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search name, username, or email" /><button className="secondary-button"><Search size={16} /> Search</button></form><Alert>{error}</Alert><Alert type="success">{success}</Alert>{!result ? <div className="panel-loading"><span className="spinner" /> Loading agents…</div> : result.agents.length ? <div className="table-wrap"><table className="data-table"><thead><tr><th>Agent</th><th>Email</th><th>Status</th><th>Timesheets</th><th>Visits</th><th>Recorded</th><th /></tr></thead><tbody>{result.agents.map((agent) => <tr key={agent.id}><td><strong>{agent.fullName}</strong><small>@{agent.username}</small></td><td>{agent.email}<small>{agent.emailVerified ? 'Verified' : 'Verification pending'}</small></td><td><span className={`account-status ${agent.status.toLowerCase()}`}>{agent.status}</span></td><td>{agent.totalTimesheets}</td><td>{agent.totalVisits}</td><td>{formatDuration(agent.totalDuration)}</td><td><button className={agent.status === 'ACTIVE' ? 'table-danger' : 'table-action'} onClick={() => toggle(agent)}>{agent.status === 'ACTIVE' ? 'Deactivate' : 'Activate'}</button></td></tr>)}</tbody></table></div> : <div className="empty-state"><Users /><h3>No agents found</h3></div>}</section></AppShell>;
}
