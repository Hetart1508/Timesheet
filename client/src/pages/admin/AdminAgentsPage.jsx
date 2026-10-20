import { useEffect, useState } from 'react';
import { Search, Users } from 'lucide-react';
import AppShell from '../../components/layout/AppShell.jsx';
import Alert from '../../components/common/Alert.jsx';
import RequestState from '../../components/common/RequestState.jsx';
import { adminApi } from '../../api/admin.js';
import { errorMessage } from '../../api/client.js';
import { formatDuration } from '../../api/timesheets.js';
import useDebouncedValue from '../../hooks/useDebouncedValue.js';

export default function AdminAgentsPage() {
  const [search, setSearch] = useState(''); const [applied, setApplied] = useState(''); const [result, setResult] = useState(null); const [error, setError] = useState(''); const [loadError, setLoadError] = useState(''); const [success, setSuccess] = useState('');
  const debouncedSearch = useDebouncedValue(search, 500);
  const load = () => { setResult(null); setLoadError(''); return adminApi.listAgents({ search: applied, pageSize: 100 }).then(setResult).catch((err) => setLoadError(errorMessage(err))); };
  useEffect(() => { load(); }, [applied]);
  useEffect(() => { setApplied(debouncedSearch); }, [debouncedSearch]);
  const toggle = async (agent) => { const status = agent.status === 'ACTIVE' ? 'INACTIVE' : 'ACTIVE'; if (!window.confirm(`${status === 'INACTIVE' ? 'Deactivate' : 'Activate'} ${agent.fullName}?`)) return; try { await adminApi.setAgentStatus(agent.id, status); setSuccess(`Agent ${status.toLowerCase()}.`); load(); } catch (err) { setError(errorMessage(err)); } };
  return <AppShell><section className="workspace-heading"><p className="eyebrow">User administration</p><h1>Agent directory</h1><p>Monitor field activity and control access. Deactivation immediately revokes the Agent’s active sessions.</p></section><section className="content-card section-block"><label className="admin-search-field admin-agent-search"><Search size={17} /><input type="search" aria-label="Search agents" value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search name, username, or email" /></label><Alert>{error}</Alert><Alert type="success">{success}</Alert>{!result ? <RequestState error={loadError} label="Loading agents…" onRetry={load} /> : result.agents.length ? <div className="table-wrap"><table className="data-table"><thead><tr><th>Agent</th><th>Email</th><th>Status</th><th>Timesheets</th><th>Visits</th><th>Recorded</th><th /></tr></thead><tbody>{result.agents.map((agent) => <tr key={agent.id}><td data-label="Agent"><strong>{agent.fullName}</strong><small>@{agent.username}{agent.accountRole === 'ADMIN' ? ' · Admin + Agent' : ''}</small></td><td data-label="Email">{agent.email}<small>{agent.emailVerified ? 'Verified' : 'Verification pending'}</small></td><td data-label="Status"><span className={`account-status ${agent.status.toLowerCase()}`}>{agent.status}</span></td><td data-label="Timesheets">{agent.totalTimesheets}</td><td data-label="Visits">{agent.totalVisits}</td><td data-label="Recorded">{formatDuration(agent.totalDuration)}</td><td data-label="Actions">{agent.canManageStatus !== false ? <button className={agent.status === 'ACTIVE' ? 'table-danger' : 'table-action'} onClick={() => toggle(agent)}>{agent.status === 'ACTIVE' ? 'Deactivate' : 'Activate'}</button> : <small>Protected Admin</small>}</td></tr>)}</tbody></table></div> : <div className="empty-state"><Users /><h3>No agents found</h3></div>}</section></AppShell>;
}
