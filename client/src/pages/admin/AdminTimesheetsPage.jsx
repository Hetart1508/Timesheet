import { useEffect, useRef, useState } from 'react';
import { ArrowDown, ArrowDownUp, ArrowUp, Eye, FileText, Search, SlidersHorizontal } from 'lucide-react';
import { useLocation, useNavigate, useSearchParams } from 'react-router-dom';
import AppShell from '../../components/layout/AppShell.jsx';
import Alert from '../../components/common/Alert.jsx';
import RequestState from '../../components/common/RequestState.jsx';
import StatusBadge from '../../components/common/StatusBadge.jsx';
import TablePagination from '../../components/common/TablePagination.jsx';
import FormattedDateField from '../../components/forms/FormattedDateField.jsx';
import useDebouncedValue from '../../hooks/useDebouncedValue.js';
import { adminApi } from '../../api/admin.js';
import { errorMessage } from '../../api/client.js';
import { formatDuration, formatWorkDate, statusLabels } from '../../api/timesheets.js';
import { currentBusinessDate } from '../../utils/business-time.js';
import TimesheetReviewModal from './TimesheetReviewModal.jsx';

const initialFilters = { status: '', startDate: '', endDate: '', agentId: '', search: '', sortBy: 'workDate', sortOrder: 'desc', page: 1, pageSize: 10 };
const clearFiltersOnReturnKey = 'timesheet.clearFiltersOnReturn';

function SortHeader({ field, label, applied, onSort }) {
  const active = applied.sortBy === field;
  const Icon = active ? applied.sortOrder === 'asc' ? ArrowUp : ArrowDown : ArrowDownUp;
  return <th aria-sort={active ? (applied.sortOrder === 'asc' ? 'ascending' : 'descending') : 'none'}><button type="button" className="table-sort" onClick={() => onSort(field)}>{label}<Icon size={14} /></button></th>;
}

export default function AdminTimesheetsPage({ defaultStatus = '' }) {
  const today = currentBusinessDate();
  const [searchParams] = useSearchParams();
  const location = useLocation();
  const navigate = useNavigate();
  const [clearFiltersOnReturn] = useState(() => window.sessionStorage.getItem(clearFiltersOnReturnKey) === 'true');
  const reviewQueue = defaultStatus === 'SUBMITTED';
  const initialStatus = clearFiltersOnReturn ? '' : searchParams.get('status') || defaultStatus;
  const [filters, setFilters] = useState({ ...initialFilters, status: initialStatus });
  const [applied, setApplied] = useState({ ...initialFilters, status: initialStatus });
  const [result, setResult] = useState(null);
  const [agents, setAgents] = useState([]);
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [loadError, setLoadError] = useState('');
  const [agentError, setAgentError] = useState('');
  const [previewId, setPreviewId] = useState(null);
  const requestIdRef = useRef(0);
  const debouncedSearch = useDebouncedValue(filters.search, 500);
  const loadAgents = () => { setAgentError(''); return adminApi.listAgents({ pageSize: 100 }).then((value) => setAgents(value.agents)).catch((err) => setAgentError(errorMessage(err))); };
  const load = () => {
    const requestId = ++requestIdRef.current;
    setResult(null);
    setLoadError('');
    return adminApi.listTimesheets(Object.fromEntries(Object.entries(applied).filter(([, value]) => value !== '')))
      .then((value) => { if (requestId === requestIdRef.current) setResult(value); })
      .catch((err) => { if (requestId === requestIdRef.current) setLoadError(errorMessage(err)); });
  };
  useEffect(() => {
    if (!clearFiltersOnReturn) return;
    window.sessionStorage.removeItem(clearFiltersOnReturnKey);
    if (searchParams.has('status')) navigate(location.pathname, { replace: true });
  }, [clearFiltersOnReturn, location.pathname, navigate, searchParams]);
  useEffect(() => { loadAgents(); }, []);
  useEffect(() => { load(); }, [applied]);
  useEffect(() => { setApplied((current) => current.search === debouncedSearch ? current : { ...current, search: debouncedSearch, page: 1 }); }, [debouncedSearch]);
  const activeFilterCount = [applied.agentId, applied.status, applied.startDate, applied.endDate].filter(Boolean).length;
  const updateFilter = (field, value) => {
    const changes = { [field]: value };
    if (field === 'startDate' && value && filters.endDate && value > filters.endDate) changes.endDate = '';
    if (field === 'endDate' && value && filters.startDate && value < filters.startDate) changes.startDate = '';
    setFilters((current) => ({ ...current, ...changes }));
    setApplied((current) => ({ ...current, ...changes, page: 1 }));
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
    <section className="workspace-heading"><p className="eyebrow">Administrative review</p><h1>{reviewQueue && !clearFiltersOnReturn ? 'Timesheets for review' : 'All timesheets'}</h1><p>{reviewQueue && !clearFiltersOnReturn ? 'Review submitted timesheets and inspect each Agent’s declarations and visit records.' : 'Filter submissions across every Agent and inspect their declarations and visit records.'}</p></section>
    <section className="content-card section-block admin-table-card">
      <div className="admin-table-toolbar">
        <div><h2>Timesheets</h2><p>{result ? `${result.pagination.total.toLocaleString()} records` : 'Search and review agent submissions'}</p></div>
        <div className="admin-search-form" role="search">
          <label className="admin-search-field"><Search size={17} /><input type="search" aria-label="Search agent or reviewer" placeholder="Search agent or reviewer" value={filters.search} onChange={(event) => setFilters({ ...filters, search: event.target.value })} /></label>
          <button className={`filter-toggle${filtersOpen ? ' active' : ''}`} type="button" aria-expanded={filtersOpen} onClick={() => setFiltersOpen(!filtersOpen)}><SlidersHorizontal size={16} /> Filters{activeFilterCount ? <span>{activeFilterCount}</span> : null}</button>
        </div>
      </div>
      {filtersOpen ? <div className="admin-filter-panel">
        <label><span>Agent</span><select value={filters.agentId} onChange={(e) => updateFilter('agentId', e.target.value)}><option value="">All agents</option>{agents.map((agent) => <option value={agent.id} key={agent.id}>{agent.fullName}</option>)}</select></label>
        <label><span>Status</span><select value={filters.status} onChange={(e) => updateFilter('status', e.target.value)}><option value="">All statuses</option>{Object.entries(statusLabels).map(([value, label]) => <option value={value} key={value}>{label}</option>)}</select></label>
        <FormattedDateField label="From" max={today} value={filters.startDate} onChange={(e) => updateFilter('startDate', e.target.value)} />
        <FormattedDateField label="To" max={today} value={filters.endDate} onChange={(e) => updateFilter('endDate', e.target.value)} />
        {activeFilterCount ? <div className="admin-filter-actions"><button className="text-action" type="button" onClick={clearFilters}>Clear filters</button></div> : null}
      </div>
      : null}
      <Alert>{agentError ? <>Could not load Agent filters. <button className="text-action" type="button" onClick={loadAgents}>Retry</button></> : null}</Alert>
      {!result ? <RequestState error={loadError} label="Loading timesheets…" onRetry={load} /> : <>
        {result.timesheets.length ? <div className="table-wrap"><table className="data-table admin-data-table timesheet-list-table"><thead><tr>
          <SortHeader field="agentName" label="Agent" applied={applied} onSort={changeSort} />
          <SortHeader field="workDate" label="Work date" applied={applied} onSort={changeSort} />
          <SortHeader field="visitCount" label="Visits" applied={applied} onSort={changeSort} />
          <SortHeader field="duration" label="Duration" applied={applied} onSort={changeSort} />
          <SortHeader field="status" label="Status" applied={applied} onSort={changeSort} />
          <th>Reviewer</th><th>Actions</th>
        </tr></thead><tbody>{result.timesheets.map((sheet) => <tr key={sheet.id}>
          <td data-label="Agent"><strong>{sheet.agentName}</strong><small>{sheet.agentEmail}</small></td><td data-label="Work date">{formatWorkDate(sheet.workDate)}</td>
          <td data-label="Visits">{sheet.visitCount}</td><td data-label="Duration">{formatDuration(sheet.duration)}</td><td data-label="Status"><StatusBadge status={sheet.status} /></td>
          <td data-label="Reviewer">{sheet.reviewerName || '—'}</td><td data-label="Actions"><button className="table-action" type="button" onClick={() => setPreviewId(sheet.id)}><Eye size={15} /> Inspect</button></td>
        </tr>)}</tbody></table></div> : <div className="empty-state"><FileText /><h3>No timesheets match</h3><p>Adjust your search or filters and try again.</p></div>}
        <TablePagination page={result.pagination.page} pageSize={result.pagination.pageSize} total={result.pagination.total} label="Timesheets" onPageChange={(page) => setApplied((current) => ({ ...current, page }))} />
      </>}
    </section>
    {previewId ? <TimesheetReviewModal id={previewId} onClose={() => setPreviewId(null)} onReviewed={load} /> : null}
  </AppShell>;
}
