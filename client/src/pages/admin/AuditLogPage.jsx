import { useEffect, useState } from 'react';
import { ArrowDown, ArrowDownUp, ArrowUp, Search, ShieldCheck, SlidersHorizontal } from 'lucide-react';
import AppShell from '../../components/layout/AppShell.jsx';
import RequestState from '../../components/common/RequestState.jsx';
import TablePagination from '../../components/common/TablePagination.jsx';
import useDebouncedValue from '../../hooks/useDebouncedValue.js';
import { adminApi } from '../../api/admin.js';
import { errorMessage } from '../../api/client.js';
import { formatBusinessDateTime } from '../../utils/business-time.js';

const json = (value) => value ? JSON.stringify(value, null, 2) : '—';
const initialFilters = { search: '', action: '', entityType: '', sortBy: 'createdAt', sortOrder: 'desc', page: 1, pageSize: 10 };

function SortHeader({ field, label, applied, onSort }) {
  const active = applied.sortBy === field;
  const Icon = active ? applied.sortOrder === 'asc' ? ArrowUp : ArrowDown : ArrowDownUp;
  return <th aria-sort={active ? (applied.sortOrder === 'asc' ? 'ascending' : 'descending') : 'none'}><button type="button" className="table-sort" onClick={() => onSort(field)}>{label}<Icon size={14} /></button></th>;
}

export default function AuditLogPage() {
  const [filters, setFilters] = useState(initialFilters);
  const [applied, setApplied] = useState(initialFilters);
  const [result, setResult] = useState(null);
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [error, setError] = useState('');
  const debouncedSearch = useDebouncedValue(filters.search, 500);
  const load = () => { setResult(null); setError(''); return adminApi.listAudits(Object.fromEntries(Object.entries(applied).filter(([, value]) => value !== ''))).then(setResult).catch((err) => setError(errorMessage(err))); };
  useEffect(() => { load(); }, [applied]);
  useEffect(() => { setApplied((current) => current.search === debouncedSearch ? current : { ...current, search: debouncedSearch, page: 1 }); }, [debouncedSearch]);
  const activeFilterCount = [applied.action, applied.entityType].filter(Boolean).length;
  const applyFilters = (event) => {
    event.preventDefault();
    setApplied((current) => ({ ...current, action: filters.action, entityType: filters.entityType, page: 1 }));
  };
  const clearFilters = () => {
    setFilters((current) => ({ ...current, action: '', entityType: '' }));
    setApplied((current) => ({ ...current, action: '', entityType: '', page: 1 }));
  };
  const changeSort = (sortBy) => {
    const sortOrder = applied.sortBy === sortBy ? (applied.sortOrder === 'desc' ? 'asc' : 'desc') : 'asc';
    setApplied((current) => ({ ...current, sortBy, sortOrder, page: 1 }));
  };

  return <AppShell>
    <section className="workspace-heading"><p className="eyebrow">Compliance history</p><h1>Audit log</h1><p>Inspect append-only records of timesheet, visit, company, and account changes.</p></section>
    <section className="content-card section-block admin-table-card">
      <div className="admin-table-toolbar">
        <div><h2>Audit records</h2><p>{result ? `${result.pagination.total.toLocaleString()} records` : 'Search and inspect recorded changes'}</p></div>
        <div className="admin-search-form" role="search">
          <label className="admin-search-field"><Search size={17} /><input type="search" aria-label="Search audit records" placeholder="Search actor, action, entity or ID" value={filters.search} onChange={(event) => setFilters({ ...filters, search: event.target.value })} /></label>
          <button className={`filter-toggle${filtersOpen ? ' active' : ''}`} type="button" aria-expanded={filtersOpen} onClick={() => setFiltersOpen(!filtersOpen)}><SlidersHorizontal size={16} /> Filters{activeFilterCount ? <span>{activeFilterCount}</span> : null}</button>
        </div>
      </div>
      {filtersOpen ? <form className="admin-filter-panel audit-filter-panel" onSubmit={applyFilters}>
        <label><span>Action contains</span><input value={filters.action} onChange={(event) => setFilters({ ...filters, action: event.target.value })} placeholder="e.g. TIMESHEET" /></label>
        <label><span>Entity type</span><select value={filters.entityType} onChange={(event) => setFilters({ ...filters, entityType: event.target.value })}><option value="">All entities</option><option value="TIMESHEET">Timesheet</option><option value="VISIT">Visit</option><option value="COMPANY">Company</option><option value="USER">User</option></select></label>
        <div className="admin-filter-actions"><button className="secondary-button" type="submit">Apply filters</button>{activeFilterCount ? <button className="text-action" type="button" onClick={clearFilters}>Clear filters</button> : null}</div>
      </form> : null}
      {!result ? <RequestState error={error} label="Loading audit history…" onRetry={load} /> : <>
        {result.audits.length ? <div className="table-wrap"><table className="data-table admin-data-table audit-data-table"><thead><tr>
          <SortHeader field="createdAt" label="Last active" applied={applied} onSort={changeSort} />
          <SortHeader field="actorName" label="Actor" applied={applied} onSort={changeSort} />
          <SortHeader field="action" label="Action" applied={applied} onSort={changeSort} />
          <SortHeader field="entityType" label="Entity" applied={applied} onSort={changeSort} />
          <th>Details</th>
        </tr></thead><tbody>{result.audits.map((entry) => <tr key={entry.id}>
          <td data-label="Last active"><time>{formatBusinessDateTime(entry.createdAt)}</time></td><td data-label="Actor"><strong>{entry.actorName}</strong></td>
          <td data-label="Action"><strong>{entry.action}</strong></td><td data-label="Entity">{entry.entityType}<small>#{entry.entityId}</small></td>
          <td data-label="Details"><details className="audit-row-details"><summary>View changes</summary><div className="audit-detail"><div><strong>Before</strong><pre>{json(entry.before)}</pre></div><div><strong>After</strong><pre>{json(entry.after)}</pre></div>{entry.ipAddress ? <small>Client IP: {entry.ipAddress}</small> : null}</div></details></td>
        </tr>)}</tbody></table></div> : <div className="empty-state"><ShieldCheck /><h3>No audit records match</h3><p>Adjust your search or filters and try again.</p></div>}
        <TablePagination page={result.pagination.page} pageSize={result.pagination.pageSize} total={result.pagination.total} label="Audit records" onPageChange={(page) => setApplied((current) => ({ ...current, page }))} />
      </>}
    </section>
  </AppShell>;
}
