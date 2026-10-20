import { useCallback, useEffect, useState } from 'react';
import { ChevronLeft, ChevronRight, Search } from 'lucide-react';
import { Link } from 'react-router-dom';
import AppShell from '../../components/layout/AppShell.jsx';
import RequestState from '../../components/common/RequestState.jsx';
import StatusBadge from '../../components/common/StatusBadge.jsx';
import { agentApi, formatDuration, formatWorkDate, statusLabels } from '../../api/timesheets.js';
import { errorMessage } from '../../api/client.js';
import { currentBusinessDate } from '../../utils/business-time.js';

const initialFilters = { startDate: '', endDate: '', status: '', page: 1, pageSize: 10 };

export default function TimesheetHistoryPage() {
  const today = currentBusinessDate();
  const [filters, setFilters] = useState(initialFilters);
  const [applied, setApplied] = useState(initialFilters);
  const [result, setResult] = useState(null);
  const [error, setError] = useState('');
  const load = useCallback(async () => {
    setError('');
    setResult(null);
    try { setResult(await agentApi.listTimesheets(Object.fromEntries(Object.entries(applied).filter(([, value]) => value !== '')))); }
    catch (requestError) { setError(errorMessage(requestError)); }
  }, [applied]);
  useEffect(() => { load(); }, [load]);
  const submitFilters = (event) => { event.preventDefault(); setApplied({ ...filters, page: 1 }); };
  const pageCount = result ? Math.max(1, Math.ceil(result.pagination.total / result.pagination.pageSize)) : 1;

  return <AppShell>
    <section className="workspace-heading"><p className="eyebrow">Timesheet history</p><h1>Your work records</h1><p>Find a daily timesheet, review its visits, or continue a correction requested by an administrator.</p></section>
    <section className="content-card section-block">
      <details className="filter-disclosure"><summary><Search size={17} /> Filter timesheets</summary><form className="filter-bar" onSubmit={submitFilters}>
        <label><span>From</span><input type="date" max={today} value={filters.startDate} onChange={(e) => setFilters({ ...filters, startDate: e.target.value })} /></label>
        <label><span>To</span><input type="date" max={today} value={filters.endDate} onChange={(e) => setFilters({ ...filters, endDate: e.target.value })} /></label>
        <label><span>Status</span><select value={filters.status} onChange={(e) => setFilters({ ...filters, status: e.target.value })}><option value="">All statuses</option>{Object.entries(statusLabels).map(([value, label]) => <option value={value} key={value}>{label}</option>)}</select></label>
        <button className="secondary-button" type="submit"><Search size={17} /> Apply filters</button>
      </form></details>
      {!result ? <RequestState error={error} label="Loading timesheets…" onRetry={load} /> : result.timesheets.length ? <>
        <div className="record-list history-list">{result.timesheets.map((sheet) => <Link className="record-row" to={`/timesheets/${sheet.id}`} key={sheet.id}><div><strong>{formatWorkDate(sheet.workDate)}</strong><span>{sheet.visitCount} {sheet.visitCount === 1 ? 'visit' : 'visits'} · {formatDuration(sheet.duration)}</span>{sheet.reviewComment ? <small>{sheet.reviewComment}</small> : null}</div><StatusBadge status={sheet.status} /></Link>)}</div>
        <div className="pagination"><span>Page {result.pagination.page} of {pageCount} · {result.pagination.total} records</span><div><button className="icon-button" aria-label="Previous page" disabled={applied.page <= 1} onClick={() => setApplied({ ...applied, page: applied.page - 1 })}><ChevronLeft /></button><button className="icon-button" aria-label="Next page" disabled={applied.page >= pageCount} onClick={() => setApplied({ ...applied, page: applied.page + 1 })}><ChevronRight /></button></div></div>
      </> : result ? <div className="empty-state"><Search size={28} /><h3>No matching timesheets</h3><p>Adjust the dates or status and try again.</p></div> : null}
    </section>
  </AppShell>;
}
