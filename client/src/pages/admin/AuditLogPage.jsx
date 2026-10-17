import { useEffect, useState } from 'react';
import { ChevronLeft, ChevronRight, Search, ShieldCheck } from 'lucide-react';
import AppShell from '../../components/layout/AppShell.jsx';
import RequestState from '../../components/common/RequestState.jsx';
import { adminApi } from '../../api/admin.js';
import { errorMessage } from '../../api/client.js';

const json = (value) => value ? JSON.stringify(value, null, 2) : '—';
const initialFilters = { search: '', action: '', entityType: '', sortBy: 'createdAt', sortOrder: 'desc', page: 1, pageSize: 25 };

export default function AuditLogPage() {
  const [filters, setFilters] = useState(initialFilters);
  const [applied, setApplied] = useState(initialFilters);
  const [result, setResult] = useState(null);
  const [error, setError] = useState('');
  const load = () => { setResult(null); setError(''); return adminApi.listAudits(Object.fromEntries(Object.entries(applied).filter(([, value]) => value !== ''))).then(setResult).catch((err) => setError(errorMessage(err))); };
  useEffect(() => { load(); }, [applied]);
  const pageCount = result ? Math.max(1, Math.ceil(result.pagination.total / result.pagination.pageSize)) : 1;

  return <AppShell><section className="workspace-heading"><p className="eyebrow">Compliance history</p><h1>Audit log</h1><p>Inspect append-only records of timesheet, visit, company, and account changes.</p></section><section className="content-card section-block"><form className="filter-bar audit-filter audit-admin-filter" onSubmit={(event) => { event.preventDefault(); setApplied({ ...filters, page: 1, pageSize: applied.pageSize }); }}>
    <label><span>Search records</span><input type="search" value={filters.search} onChange={(e) => setFilters({ ...filters, search: e.target.value })} placeholder="Actor, action, entity or ID" /></label>
    <label><span>Action contains</span><input value={filters.action} onChange={(e) => setFilters({ ...filters, action: e.target.value })} placeholder="e.g. TIMESHEET" /></label>
    <label><span>Entity type</span><select value={filters.entityType} onChange={(e) => setFilters({ ...filters, entityType: e.target.value })}><option value="">All entities</option><option value="TIMESHEET">Timesheet</option><option value="VISIT">Visit</option><option value="COMPANY">Company</option><option value="USER">User</option></select></label>
    <label><span>Sort by</span><select value={filters.sortBy} onChange={(e) => setFilters({ ...filters, sortBy: e.target.value })}><option value="createdAt">Date</option><option value="action">Action</option><option value="entityType">Entity</option><option value="actorName">Actor</option></select></label>
    <label><span>Direction</span><select value={filters.sortOrder} onChange={(e) => setFilters({ ...filters, sortOrder: e.target.value })}><option value="desc">Descending</option><option value="asc">Ascending</option></select></label>
    <button className="secondary-button" type="submit"><Search size={16} /> Filter</button>
  </form>{!result ? <RequestState error={error} label="Loading audit history…" onRetry={load} /> : result.audits.length ? <>
    <div className="audit-list">{result.audits.map((entry) => <details key={entry.id}><summary><span><strong>{entry.action}</strong><small>{entry.entityType} #{entry.entityId} · {entry.actorName}</small></span><time>{new Date(entry.createdAt).toLocaleString()}</time></summary><div className="audit-detail"><div><strong>Before</strong><pre>{json(entry.before)}</pre></div><div><strong>After</strong><pre>{json(entry.after)}</pre></div></div></details>)}</div>
    <div className="pagination"><span>Page {result.pagination.page} of {pageCount} · {result.pagination.total} records</span><div className="pagination-controls"><label>Rows <select aria-label="Audit records per page" value={applied.pageSize} onChange={(event) => setApplied({ ...applied, page: 1, pageSize: Number(event.target.value) })}><option value={25}>25</option><option value={50}>50</option><option value={100}>100</option></select></label><button className="icon-button" aria-label="Previous page" disabled={applied.page <= 1} onClick={() => setApplied({ ...applied, page: applied.page - 1 })}><ChevronLeft /></button><button className="icon-button" aria-label="Next page" disabled={applied.page >= pageCount} onClick={() => setApplied({ ...applied, page: applied.page + 1 })}><ChevronRight /></button></div></div>
  </> : <div className="empty-state"><ShieldCheck /><h3>No audit records match</h3></div>}</section></AppShell>;
}
