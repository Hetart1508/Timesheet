import { useEffect, useState } from 'react';
import { Search, ShieldCheck } from 'lucide-react';
import AppShell from '../../components/layout/AppShell.jsx';
import Alert from '../../components/common/Alert.jsx';
import { adminApi } from '../../api/admin.js';
import { errorMessage } from '../../api/client.js';

const json = (value) => value ? JSON.stringify(value, null, 2) : '—';
export default function AuditLogPage() {
  const [filters, setFilters] = useState({ action: '', entityType: '' }); const [applied, setApplied] = useState(filters); const [result, setResult] = useState(null); const [error, setError] = useState('');
  useEffect(() => { adminApi.listAudits({ ...applied, pageSize: 50 }).then(setResult).catch((err) => setError(errorMessage(err))); }, [applied]);
  return <AppShell><section className="workspace-heading"><p className="eyebrow">Compliance history</p><h1>Audit log</h1><p>Inspect append-only records of timesheet, visit, company, and account changes.</p></section><section className="content-card section-block"><form className="filter-bar audit-filter" onSubmit={(event) => { event.preventDefault(); setApplied(filters); }}><label><span>Action contains</span><input value={filters.action} onChange={(e) => setFilters({ ...filters, action: e.target.value })} placeholder="e.g. TIMESHEET" /></label><label><span>Entity type</span><select value={filters.entityType} onChange={(e) => setFilters({ ...filters, entityType: e.target.value })}><option value="">All entities</option><option value="TIMESHEET">Timesheet</option><option value="VISIT">Visit</option><option value="COMPANY">Company</option><option value="USER">User</option></select></label><button className="secondary-button"><Search size={16} /> Filter</button></form><Alert>{error}</Alert>{!result ? <div className="panel-loading"><span className="spinner" /> Loading audit history…</div> : result.audits.length ? <div className="audit-list">{result.audits.map((entry) => <details key={entry.id}><summary><span><strong>{entry.action}</strong><small>{entry.entityType} #{entry.entityId} · {entry.actorName}</small></span><time>{new Date(entry.createdAt).toLocaleString()}</time></summary><div className="audit-detail"><div><strong>Before</strong><pre>{json(entry.before)}</pre></div><div><strong>After</strong><pre>{json(entry.after)}</pre></div></div></details>)}</div> : <div className="empty-state"><ShieldCheck /><h3>No audit records match</h3></div>}</section></AppShell>;
}
