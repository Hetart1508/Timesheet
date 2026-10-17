import { useEffect, useState } from 'react';
import { ArrowDown, ArrowDownUp, ArrowUp, Eye, FileText, Search, SlidersHorizontal } from 'lucide-react';
import { Link, useSearchParams } from 'react-router-dom';
import AppShell from '../../components/layout/AppShell.jsx';
import Alert from '../../components/common/Alert.jsx';
import RequestState from '../../components/common/RequestState.jsx';
import StatusBadge from '../../components/common/StatusBadge.jsx';
import TablePagination from '../../components/common/TablePagination.jsx';
import useDebouncedValue from '../../hooks/useDebouncedValue.js';
import { adminApi } from '../../api/admin.js';
import { errorMessage } from '../../api/client.js';
import { formatDuration, formatWorkDate, statusLabels } from '../../api/timesheets.js';

const initialFilters = { status: '', startDate: '', endDate: '', agentId: '', search: '', sortBy: 'workDate', sortOrder: 'desc', page: 1, pageSize: 25 };

function SortHeader({ field, label, applied, onSort }) {
  const active = applied.sortBy === field;
  const Icon = active ? applied.sortOrder === 'asc' ? ArrowUp : ArrowDown : ArrowDownUp;
  return <th aria-sort={active ? (applied.sortOrder === 'asc' ? 'ascending' : 'descending') : 'none'}><button type="button" className="table-sort" onClick={() => onSort(field)}>{label}<Icon size={14} /></button></th>;
}

export default function AdminTimesheetsPage({ defaultStatus = '' }) {
  const [searchParams] = useSearchParams();
  const reviewQueue = defaultStatus === 'SUBMITTED';
  const initialStatus = searchParams.get('status') || defaultStatus;
  const [filters, setFilters] = useState({ ...initialFilters, status: initialStatus });
  const [applied, setApplied] = useState({ ...initialFilters, status: initialStatus });
  const [result, setResult] = useState(null);
  const [agents, setAgents] = useState([]);
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [loadError, setLoadError] = useState('');
  const [agentError, setAgentError] = useState('');
  const debouncedSearch = useDebouncedValue(filters.search, 500);
  const loadAgents = () => { setAgentError(''); return adminApi.listAgents({ pageSize: 100 }).then((value) => setAgents(value.agents)).catch((err) => setAgentError(errorMessage(err))); };
  const load = () => { setResult(null); setLoadError(''); return adminApi.listTimesheets(Object.fromEntries(Object.entries(applied).filter(([, value]) => value !== ''))).then(setResult).catch((err) => setLoadError(errorMessage(err))); };
  useEffect(() => { loadAgents(); }, []);
  useEffect(() => { load(); }, [applied]);
  useEffect(() => { setApplied((current) => current.search === debouncedSearch ? current : { ...current, search: debouncedSearch, page: 1 }); }, [debouncedSearch]);
  const activeFilterCount = [applied.agentId, applied.status, applied.startDate, applied.endDate].filter(Boolean).length;
  const applyFilters = (event) => {
    event.preventDefault();
    setApplied((current) => ({ ...current, agentId: filters.agentId, status: filters.status, startDate: filters.startDate, endDate: filters.endDate, page: 1 }));
  };
  const clearFilters = () => {
    const cleared = { agentId: '', status: '', startDate: '', endDate: '' };
    setFilters((current) => ({ ...current, ...cleared }));
    setApplied((current) => ({ ...current, ...cleared, page: 1 }));
  };
  const changeSort = (sortBy) => {
    const sortOrder = applied.sortBy === sortBy ? (applied.sortOrder === 'desc' ? 'asc' : 'desc') : 'asc';
    setApplied((current) => ({ ...current, sortBy, sortOrder, page: 1 }));
  };

  return <AppShell>
    <section className="workspace-heading"><p className="eyebrow">Administrative review</p><h1>{reviewQueue ? 'Timesheets for review' : 'All timesheets'}</h1><p>{reviewQueue ? 'Review submitted timesheets and inspect each Agent’s declarations and visit records.' : 'Filter submissions across every Agent and inspect their declarations and visit records.'}</p></section>
    <section className="content-card section-block admin-table-card">
      <div className="admin-table-toolbar">
        <div><h2>Timesheets</h2><p>{result ? `${result.pagination.total.toLocaleString()} records` : 'Search and review agent submissions'}</p></div>
        <div className="admin-search-form" role="search">
          <label className="admin-search-field"><Search size={17} /><input type="search" aria-label="Search agent or reviewer" placeholder="Search agent or reviewer" value={filters.search} onChange={(event) => setFilters({ ...filters, search: event.target.value })} /></label>
          <button className={`filter-toggle${filtersOpen ? ' active' : ''}`} type="button" aria-expanded={filtersOpen} onClick={() => setFiltersOpen(!filtersOpen)}><SlidersHorizontal size={16} /> Filters{activeFilterCount ? <span>{activeFilterCount}</span> : null}</button>
        </div>
      </div>
      {filtersOpen ? <form className="admin-filter-panel" onSubmit={applyFilters}>
        <label><span>Agent</span><select value={filters.agentId} onChange={(e) => setFilters({ ...filters, agentId: e.target.value })}><option value="">All agents</option>{agents.map((agent) => <option value={agent.id} key={agent.id}>{agent.fullName}</option>)}</select></label>
        <label><span>Status</span><select value={filters.status} onChange={(e) => setFilters({ ...filters, status: e.target.value })}><option value="">All statuses</option>{Object.entries(statusLabels).map(([value, label]) => <option value={value} key={value}>{label}</option>)}</select></label>
        <label><span>From</span><input type="date" value={filters.startDate} onChange={(e) => setFilters({ ...filters, startDate: e.target.value })} /></label>
        <label><span>To</span><input type="date" value={filters.endDate} onChange={(e) => setFilters({ ...filters, endDate: e.target.value })} /></label>
        <div className="admin-filter-actions"><button className="secondary-button" type="submit">Apply filters</button>{activeFilterCount ? <button className="text-action" type="button" onClick={clearFilters}>Clear filters</button> : null}</div>
      </form>
      : null}
      <Alert>{agentError ? <>Could not load Agent filters. <button className="text-action" type="button" onClick={loadAgents}>Retry</button></> : null}</Alert>
      {!result ? <RequestState error={loadError} label="Loading timesheets…" onRetry={load} /> : <>
        {result.timesheets.length ? <div className="table-wrap"><table className="data-table admin-data-table"><thead><tr>
          <SortHeader field="agentName" label="Agent" applied={applied} onSort={changeSort} />
          <SortHeader field="workDate" label="Work date" applied={applied} onSort={changeSort} />
          <SortHeader field="visitCount" label="Visits" applied={applied} onSort={changeSort} />
          <SortHeader field="duration" label="Duration" applied={applied} onSort={changeSort} />
          <SortHeader field="status" label="Status" applied={applied} onSort={changeSort} />
          <th>Reviewer</th><th>Actions</th>
        </tr></thead><tbody>{result.timesheets.map((sheet) => <tr key={sheet.id}>
          <td><strong>{sheet.agentName}</strong><small>{sheet.agentEmail}</small></td><td>{formatWorkDate(sheet.workDate)}</td>
          <td>{sheet.visitCount}</td><td>{formatDuration(sheet.duration)}</td><td><StatusBadge status={sheet.status} /></td>
          <td>{sheet.reviewerName || '—'}</td><td><Link className="table-action" to={`/admin/timesheets/${sheet.id}`}><Eye size={15} /> Inspect</Link></td>
        </tr>)}</tbody></table></div> : <div className="empty-state"><FileText /><h3>No timesheets match</h3><p>Adjust your search or filters and try again.</p></div>}
        <TablePagination page={result.pagination.page} pageSize={result.pagination.pageSize} total={result.pagination.total} label="Timesheets" onPageChange={(page) => setApplied((current) => ({ ...current, page }))} onPageSizeChange={(pageSize) => setApplied((current) => ({ ...current, pageSize, page: 1 }))} />
      </>}
    </section>
  </AppShell>;
}
