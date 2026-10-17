import { useEffect, useState } from 'react';
import { ChevronLeft, ChevronRight, Eye, FileText, Search } from 'lucide-react';
import { Link, useSearchParams } from 'react-router-dom';
import AppShell from '../../components/layout/AppShell.jsx';
import Alert from '../../components/common/Alert.jsx';
import RequestState from '../../components/common/RequestState.jsx';
import StatusBadge from '../../components/common/StatusBadge.jsx';
import { adminApi } from '../../api/admin.js';
import { errorMessage } from '../../api/client.js';
import { formatDuration, formatWorkDate, statusLabels } from '../../api/timesheets.js';

const initialFilters = { status: '', startDate: '', endDate: '', agentId: '', search: '', sortBy: 'workDate', sortOrder: 'desc', page: 1, pageSize: 25 };

export default function AdminTimesheetsPage() {
  const [searchParams] = useSearchParams();
  const [filters, setFilters] = useState({ ...initialFilters, status: searchParams.get('status') || '' });
  const [applied, setApplied] = useState({ ...initialFilters, status: searchParams.get('status') || '' });
  const [result, setResult] = useState(null);
  const [agents, setAgents] = useState([]);
  const [loadError, setLoadError] = useState('');
  const [agentError, setAgentError] = useState('');
  const loadAgents = () => { setAgentError(''); return adminApi.listAgents({ pageSize: 100 }).then((value) => setAgents(value.agents)).catch((err) => setAgentError(errorMessage(err))); };
  const load = () => { setResult(null); setLoadError(''); return adminApi.listTimesheets(Object.fromEntries(Object.entries(applied).filter(([, value]) => value !== ''))).then(setResult).catch((err) => setLoadError(errorMessage(err))); };
  useEffect(() => { loadAgents(); }, []);
  useEffect(() => { load(); }, [applied]);
  const pageCount = result ? Math.max(1, Math.ceil(result.pagination.total / result.pagination.pageSize)) : 1;

  return <AppShell>
    <section className="workspace-heading"><p className="eyebrow">Administrative review</p><h1>All timesheets</h1><p>Filter submissions across every Agent and inspect their declarations and visit records.</p></section>
    <section className="content-card section-block">
      <form className="filter-bar admin-filter timesheet-admin-filter" onSubmit={(event) => { event.preventDefault(); setApplied({ ...filters, page: 1, pageSize: applied.pageSize }); }}>
        <label><span>Search agent or reviewer</span><input type="search" value={filters.search} onChange={(e) => setFilters({ ...filters, search: e.target.value })} placeholder="Name or email" /></label>
        <label><span>Agent</span><select value={filters.agentId} onChange={(e) => setFilters({ ...filters, agentId: e.target.value })}><option value="">All agents</option>{agents.map((agent) => <option value={agent.id} key={agent.id}>{agent.fullName}</option>)}</select></label>
        <label><span>Status</span><select value={filters.status} onChange={(e) => setFilters({ ...filters, status: e.target.value })}><option value="">All statuses</option>{Object.entries(statusLabels).map(([value, label]) => <option value={value} key={value}>{label}</option>)}</select></label>
        <label><span>From</span><input type="date" value={filters.startDate} onChange={(e) => setFilters({ ...filters, startDate: e.target.value })} /></label>
        <label><span>To</span><input type="date" value={filters.endDate} onChange={(e) => setFilters({ ...filters, endDate: e.target.value })} /></label>
        <label><span>Sort by</span><select value={filters.sortBy} onChange={(e) => setFilters({ ...filters, sortBy: e.target.value })}><option value="workDate">Work date</option><option value="agentName">Agent name</option><option value="visitCount">Visits</option><option value="duration">Duration</option><option value="status">Status</option></select></label>
        <label><span>Direction</span><select value={filters.sortOrder} onChange={(e) => setFilters({ ...filters, sortOrder: e.target.value })}><option value="desc">Descending</option><option value="asc">Ascending</option></select></label>
        <button className="secondary-button" type="submit"><Search size={16} /> Filter</button>
      </form>
      <Alert>{agentError ? <>Could not load Agent filters. <button className="text-action" type="button" onClick={loadAgents}>Retry</button></> : null}</Alert>
      {!result ? <RequestState error={loadError} label="Loading timesheets…" onRetry={load} /> : result.timesheets.length ? <>
        <div className="table-wrap"><table className="data-table"><thead><tr><th>Agent</th><th>Work date</th><th>Visits</th><th>Duration</th><th>Status</th><th>Reviewer</th><th /></tr></thead><tbody>{result.timesheets.map((sheet) => <tr key={sheet.id}><td><strong>{sheet.agentName}</strong><small>{sheet.agentEmail}</small></td><td>{formatWorkDate(sheet.workDate)}</td><td>{sheet.visitCount}</td><td>{formatDuration(sheet.duration)}</td><td><StatusBadge status={sheet.status} /></td><td>{sheet.reviewerName || '—'}</td><td><Link className="table-action" to={`/admin/timesheets/${sheet.id}`}><Eye size={15} /> Inspect</Link></td></tr>)}</tbody></table></div>
        <div className="pagination"><span>Page {result.pagination.page} of {pageCount} · {result.pagination.total} records</span><div className="pagination-controls"><label>Rows <select aria-label="Timesheets per page" value={applied.pageSize} onChange={(event) => setApplied({ ...applied, page: 1, pageSize: Number(event.target.value) })}><option value={25}>25</option><option value={50}>50</option><option value={100}>100</option></select></label><button className="icon-button" aria-label="Previous page" disabled={applied.page <= 1} onClick={() => setApplied({ ...applied, page: applied.page - 1 })}><ChevronLeft /></button><button className="icon-button" aria-label="Next page" disabled={applied.page >= pageCount} onClick={() => setApplied({ ...applied, page: applied.page + 1 })}><ChevronRight /></button></div></div>
      </> : <div className="empty-state"><FileText /><h3>No timesheets match</h3><p>Adjust the filters and try again.</p></div>}
    </section>
  </AppShell>;
}
