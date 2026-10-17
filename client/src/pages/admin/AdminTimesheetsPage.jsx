import { useEffect, useState } from 'react';
import { Eye, FileText, Search } from 'lucide-react';
import { Link, useSearchParams } from 'react-router-dom';
import AppShell from '../../components/layout/AppShell.jsx';
import Alert from '../../components/common/Alert.jsx';
import RequestState from '../../components/common/RequestState.jsx';
import StatusBadge from '../../components/common/StatusBadge.jsx';
import { adminApi } from '../../api/admin.js';
import { errorMessage } from '../../api/client.js';
import { formatDuration, formatWorkDate, statusLabels } from '../../api/timesheets.js';

export default function AdminTimesheetsPage() {
  const [searchParams] = useSearchParams();
  const [filters, setFilters] = useState({ status: searchParams.get('status') || '', startDate: '', endDate: '', agentId: '' });
  const [applied, setApplied] = useState(filters); const [result, setResult] = useState(null); const [agents, setAgents] = useState([]); const [loadError, setLoadError] = useState(''); const [agentError, setAgentError] = useState('');
  const loadAgents = () => { setAgentError(''); return adminApi.listAgents({ pageSize: 100 }).then((value) => setAgents(value.agents)).catch((err) => setAgentError(errorMessage(err))); };
  const load = () => { setResult(null); setLoadError(''); return adminApi.listTimesheets(Object.fromEntries(Object.entries(applied).filter(([, value]) => value))).then(setResult).catch((err) => setLoadError(errorMessage(err))); };
  useEffect(() => { loadAgents(); }, []);
  useEffect(() => { load(); }, [applied]);
  return <AppShell>
    <section className="workspace-heading"><p className="eyebrow">Administrative review</p><h1>All timesheets</h1><p>Filter submissions across every Agent and inspect their declarations and visit records.</p></section>
    <section className="content-card section-block">
      <form className="filter-bar admin-filter" onSubmit={(event) => { event.preventDefault(); setApplied(filters); }}>
        <label><span>Agent</span><select value={filters.agentId} onChange={(e) => setFilters({ ...filters, agentId: e.target.value })}><option value="">All agents</option>{agents.map((agent) => <option value={agent.id} key={agent.id}>{agent.fullName}</option>)}</select></label>
        <label><span>Status</span><select value={filters.status} onChange={(e) => setFilters({ ...filters, status: e.target.value })}><option value="">All statuses</option>{Object.entries(statusLabels).map(([value, label]) => <option value={value} key={value}>{label}</option>)}</select></label>
        <label><span>From</span><input type="date" value={filters.startDate} onChange={(e) => setFilters({ ...filters, startDate: e.target.value })} /></label>
        <label><span>To</span><input type="date" value={filters.endDate} onChange={(e) => setFilters({ ...filters, endDate: e.target.value })} /></label>
        <button className="secondary-button"><Search size={16} /> Filter</button>
      </form>
      <Alert>{agentError ? <>Could not load Agent filters. <button className="text-action" type="button" onClick={loadAgents}>Retry</button></> : null}</Alert>
      {!result ? <RequestState error={loadError} label="Loading timesheets…" onRetry={load} /> : result.timesheets.length ? <div className="table-wrap"><table className="data-table"><thead><tr><th>Agent</th><th>Work date</th><th>Visits</th><th>Duration</th><th>Status</th><th>Reviewer</th><th /></tr></thead><tbody>{result.timesheets.map((sheet) => <tr key={sheet.id}><td><strong>{sheet.agentName}</strong><small>{sheet.agentEmail}</small></td><td>{formatWorkDate(sheet.workDate)}</td><td>{sheet.visitCount}</td><td>{formatDuration(sheet.duration)}</td><td><StatusBadge status={sheet.status} /></td><td>{sheet.reviewerName || '—'}</td><td><Link className="table-action" to={`/admin/timesheets/${sheet.id}`}><Eye size={15} /> Inspect</Link></td></tr>)}</tbody></table></div> : <div className="empty-state"><FileText /><h3>No timesheets match</h3><p>Adjust the filters and try again.</p></div>}
    </section>
  </AppShell>;
}
