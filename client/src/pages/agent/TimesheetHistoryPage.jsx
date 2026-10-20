import { useCallback, useEffect, useRef, useState } from 'react';
import { ArrowDown, ArrowDownUp, ArrowUp, Eye, FileText, Search, SlidersHorizontal } from 'lucide-react';
import AppShell from '../../components/layout/AppShell.jsx';
import RequestState from '../../components/common/RequestState.jsx';
import StatusBadge from '../../components/common/StatusBadge.jsx';
import TablePagination from '../../components/common/TablePagination.jsx';
import FormattedDateField from '../../components/forms/FormattedDateField.jsx';
import useDebouncedValue from '../../hooks/useDebouncedValue.js';
import { agentApi, formatDuration, formatWorkDate, statusLabels } from '../../api/timesheets.js';
import { errorMessage } from '../../api/client.js';
import { currentBusinessDate } from '../../utils/business-time.js';
import AgentTimesheetPreviewModal from './AgentTimesheetPreviewModal.jsx';

const initialFilters = { startDate: '', endDate: '', status: '', search: '', sortBy: 'workDate', sortOrder: 'desc', page: 1, pageSize: 10 };

function SortHeader({ field, label, applied, onSort }) {
  const active = applied.sortBy === field;
  const Icon = active ? applied.sortOrder === 'asc' ? ArrowUp : ArrowDown : ArrowDownUp;
  return <th aria-sort={active ? (applied.sortOrder === 'asc' ? 'ascending' : 'descending') : 'none'}><button type="button" className="table-sort" onClick={() => onSort(field)}>{label}<Icon size={14} /></button></th>;
}

export default function TimesheetHistoryPage() {
  const today = currentBusinessDate();
  const [filters, setFilters] = useState(initialFilters);
  const [applied, setApplied] = useState(initialFilters);
  const [result, setResult] = useState(null);
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [previewId, setPreviewId] = useState(null);
  const [error, setError] = useState('');
  const requestIdRef = useRef(0);
  const debouncedSearch = useDebouncedValue(filters.search, 500);
  const load = useCallback(async () => {
    const requestId = ++requestIdRef.current;
    setError('');
    setResult(null);
    try {
      const value = await agentApi.listTimesheets(Object.fromEntries(Object.entries(applied).filter(([, item]) => item !== '')));
      if (requestId === requestIdRef.current) setResult(value);
    } catch (requestError) {
      if (requestId === requestIdRef.current) setError(errorMessage(requestError));
    }
  }, [applied]);
  useEffect(() => { load(); }, [load]);
  useEffect(() => {
    setApplied((current) => current.search === debouncedSearch ? current : { ...current, search: debouncedSearch, page: 1 });
  }, [debouncedSearch]);

  const activeFilterCount = [applied.status, applied.startDate, applied.endDate].filter(Boolean).length;
  const updateFilter = (field, value) => {
    const changes = { [field]: value };
    if (field === 'startDate' && value && filters.endDate && value > filters.endDate) changes.endDate = '';
    if (field === 'endDate' && value && filters.startDate && value < filters.startDate) changes.startDate = '';
    setFilters((current) => ({ ...current, ...changes }));
    setApplied((current) => ({ ...current, ...changes, page: 1 }));
  };
  const clearFilters = () => {
    const cleared = { status: '', startDate: '', endDate: '' };
    setFilters((current) => ({ ...current, ...cleared }));
    setApplied((current) => ({ ...current, ...cleared, page: 1 }));
  };
  const changeSort = (sortBy) => {
    const sortOrder = applied.sortBy === sortBy ? (applied.sortOrder === 'desc' ? 'asc' : 'desc') : 'asc';
    setApplied((current) => ({ ...current, sortBy, sortOrder, page: 1 }));
  };

  return <AppShell>
    <section className="workspace-heading"><p className="eyebrow">Timesheet history</p><h1>Your work records</h1><p>Find a daily timesheet, review its visits, or continue a correction requested by an administrator.</p></section>
    <section className="content-card section-block admin-table-card">
      <div className="admin-table-toolbar">
        <div><h2>Timesheets</h2><p>{result ? `${result.pagination.total.toLocaleString()} records` : 'Search and review your work records'}</p></div>
        <div className="admin-search-form" role="search">
          <label className="admin-search-field"><Search size={17} /><input type="search" aria-label="Search timesheets" placeholder="Search timesheets" value={filters.search} onChange={(event) => setFilters({ ...filters, search: event.target.value })} /></label>
          <button className={`filter-toggle${filtersOpen ? ' active' : ''}`} type="button" aria-expanded={filtersOpen} onClick={() => setFiltersOpen(!filtersOpen)}><SlidersHorizontal size={16} /> Filters{activeFilterCount ? <span>{activeFilterCount}</span> : null}</button>
        </div>
      </div>
      {filtersOpen ? <div className="admin-filter-panel agent-timesheet-filter-panel">
        <label><span>Status</span><select value={filters.status} onChange={(event) => updateFilter('status', event.target.value)}><option value="">All statuses</option>{Object.entries(statusLabels).map(([value, label]) => <option value={value} key={value}>{label}</option>)}</select></label>
        <FormattedDateField label="From" max={today} value={filters.startDate} onChange={(event) => updateFilter('startDate', event.target.value)} />
        <FormattedDateField label="To" max={today} value={filters.endDate} onChange={(event) => updateFilter('endDate', event.target.value)} />
        {activeFilterCount ? <div className="admin-filter-actions"><button className="text-action" type="button" onClick={clearFilters}>Clear filters</button></div> : null}
      </div> : null}
      {!result ? <RequestState error={error} label="Loading timesheets…" onRetry={load} /> : <>
        {result.timesheets.length ? <div className="table-wrap"><table className="data-table admin-data-table agent-timesheet-list-table"><thead><tr>
          <SortHeader field="workDate" label="Work date" applied={applied} onSort={changeSort} />
          <SortHeader field="visitCount" label="Visits" applied={applied} onSort={changeSort} />
          <SortHeader field="duration" label="Duration" applied={applied} onSort={changeSort} />
          <SortHeader field="status" label="Status" applied={applied} onSort={changeSort} />
          <th>Actions</th>
        </tr></thead><tbody>{result.timesheets.map((sheet) => <tr key={sheet.id}>
          <td data-label="Work date"><strong>{formatWorkDate(sheet.workDate)}</strong>{sheet.reviewComment ? <small>{sheet.reviewComment}</small> : null}</td>
          <td data-label="Visits">{sheet.visitCount}</td><td data-label="Duration">{formatDuration(sheet.duration)}</td><td data-label="Status"><StatusBadge status={sheet.status} /></td>
          <td data-label="Actions"><button className="table-action" type="button" onClick={() => setPreviewId(sheet.id)}><Eye size={15} /> View</button></td>
        </tr>)}</tbody></table></div> : <div className="empty-state"><FileText /><h3>No timesheets match</h3><p>Adjust your search or filters and try again.</p></div>}
        <TablePagination page={result.pagination.page} pageSize={result.pagination.pageSize} total={result.pagination.total} label="Timesheets" onPageChange={(page) => setApplied((current) => ({ ...current, page }))} />
      </>}
    </section>
    {previewId ? <AgentTimesheetPreviewModal id={previewId} onClose={() => setPreviewId(null)} /> : null}
  </AppShell>;
}
