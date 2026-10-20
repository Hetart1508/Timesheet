import { useEffect, useState } from 'react';
import { Monitor, Search, ShieldCheck } from 'lucide-react';
import AppShell from '../../components/layout/AppShell.jsx';
import Alert from '../../components/common/Alert.jsx';
import RequestState from '../../components/common/RequestState.jsx';
import TablePagination from '../../components/common/TablePagination.jsx';
import useDebouncedValue from '../../hooks/useDebouncedValue.js';
import { adminApi } from '../../api/admin.js';
import { errorMessage } from '../../api/client.js';
import { formatBusinessDateTime } from '../../utils/business-time.js';

const initialFilters = { search: '', role: '', status: '', page: 1, pageSize: 10 };

export default function TemporaryPage() {
  const [filters, setFilters] = useState(initialFilters);
  const [applied, setApplied] = useState(initialFilters);
  const [result, setResult] = useState(null);
  const [error, setError] = useState('');
  const debouncedSearch = useDebouncedValue(filters.search, 500);

  const load = () => {
    setResult(null); setError('');
    return adminApi.listSessions(Object.fromEntries(Object.entries(applied).filter(([, value]) => value !== '')))
      .then(setResult).catch((err) => setError(errorMessage(err)));
  };
  useEffect(() => { load(); }, [applied]);
  useEffect(() => {
    setApplied((current) => current.search === debouncedSearch ? current : { ...current, search: debouncedSearch, page: 1 });
  }, [debouncedSearch]);

  return <AppShell>
    <section className="workspace-heading"><p className="eyebrow">Admin security</p><h1>Temporary</h1><p>Login sessions by user and device, using the IP address observed by the server when each session started.</p></section>
    <section className="content-card section-block admin-table-card">
      <div className="admin-table-toolbar">
        <div><h2>User device sessions</h2><p>{result ? `${result.pagination.total.toLocaleString()} sessions` : 'Review login address and session activity'}</p></div>
        <div className="admin-search-form" role="search"><label className="admin-search-field"><Search size={17} /><input type="search" aria-label="Search user sessions" placeholder="Search user, IP, or browser" value={filters.search} onChange={(event) => setFilters({ ...filters, search: event.target.value })} /></label></div>
      </div>
      <div className="filter-bar session-filter-bar">
        <label><span>Role</span><select aria-label="Filter sessions by role" value={filters.role} onChange={(event) => { const role = event.target.value; setFilters({ ...filters, role }); setApplied((current) => ({ ...current, role, page: 1 })); }}><option value="">All users</option><option value="ADMIN">Admins</option><option value="AGENT">Agents</option></select></label>
        <label><span>Session status</span><select aria-label="Filter sessions by status" value={filters.status} onChange={(event) => { const status = event.target.value; setFilters({ ...filters, status }); setApplied((current) => ({ ...current, status, page: 1 })); }}><option value="">All sessions</option><option value="ACTIVE">Active</option><option value="REVOKED">Revoked</option><option value="EXPIRED">Expired</option></select></label>
      </div>
      {!result ? <RequestState error={error} label="Loading user sessions…" onRetry={load} /> : <>
        {result.sessions.length ? <div className="table-wrap"><table className="data-table admin-data-table"><thead><tr><th>User</th><th>Role</th><th>IP address</th><th>Device / browser</th><th>Login</th><th>Last active</th><th>Status</th></tr></thead><tbody>{result.sessions.map((session) => <tr key={session.id}>
          <td data-label="User"><strong>{session.fullName}</strong><small>{session.email}</small></td>
          <td data-label="Role">{session.role}</td>
          <td data-label="IP address">{session.ipAddress ? <><strong>{session.ipVersion}</strong><small>{session.ipAddress}</small></> : 'Not recorded'}</td>
          <td data-label="Device / browser"><span className="session-device"><Monitor size={16} />{session.userAgent || 'Not recorded'}</span></td>
          <td data-label="Login">{formatBusinessDateTime(session.loginAt)}</td>
          <td data-label="Last active">{session.lastUsedAt ? formatBusinessDateTime(session.lastUsedAt) : 'Not refreshed'}</td>
          <td data-label="Status"><span className={`account-status ${session.status.toLowerCase()}`}>{session.status}</span></td>
        </tr>)}</tbody></table></div> : <div className="empty-state"><ShieldCheck /><h3>No sessions found</h3><p>Change the search or filters and try again.</p></div>}
        <TablePagination page={result.pagination.page} pageSize={result.pagination.pageSize} total={result.pagination.total} label="User sessions" onPageChange={(page) => setApplied((current) => ({ ...current, page }))} />
      </>}
    </section>
  </AppShell>;
}