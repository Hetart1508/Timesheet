import { useEffect, useMemo, useState } from 'react';
import { BarChart3, Building2, CalendarDays, Users } from 'lucide-react';
import AppShell from '../../components/layout/AppShell.jsx';
import RequestState from '../../components/common/RequestState.jsx';
import FormattedDateField from '../../components/forms/FormattedDateField.jsx';
import { adminApi } from '../../api/admin.js';
import { errorMessage } from '../../api/client.js';
import { formatDuration, formatWorkDate } from '../../api/timesheets.js';
import { currentBusinessDate } from '../../utils/business-time.js';

const tabs = [['daily', 'Daily trends', CalendarDays], ['monthly', 'Monthly overview', BarChart3], ['agents', 'Agent performance', Users], ['companies', 'Company coverage', Building2]];
const BarPanel = ({ rows, label, value }) => {
  const max = Math.max(1, ...rows.map(value));
  return <div className="chart-panel" role="img" aria-label="Recorded hours bar chart">{rows.map((row) => <div className="chart-row" key={label(row)}><span>{label(row)}</span><div><i style={{ width: `${Math.max(2, (value(row) / max) * 100)}%` }} /></div><strong>{value(row).toFixed(1)} hr</strong></div>)}</div>;
};

export default function AnalyticsPage() {
  const today = currentBusinessDate();
  const [tab, setTab] = useState('daily'); const [filters, setFilters] = useState({ startDate: '', endDate: '' }); const [applied, setApplied] = useState(filters);
  const [analytics, setAnalytics] = useState(null); const [error, setError] = useState('');
  const load = () => { setAnalytics(null); setError(''); return adminApi.analytics(Object.fromEntries(Object.entries(applied).filter(([, value]) => value))).then(setAnalytics).catch((err) => setError(errorMessage(err))); };
  useEffect(() => { load(); }, [applied]);
  const chartRows = useMemo(() => tab === 'daily' ? (analytics?.daily || []).slice(0, 10).reverse() : (analytics?.monthly || []).slice(0, 8).reverse(), [analytics, tab]);
  return <AppShell><section className="dashboard-hero"><div><p className="eyebrow">Analytics and reports</p><h1>Field performance</h1><p>Database-aggregated working time, visit coverage, and review outcomes.</p></div><form className="date-scope" onSubmit={(event) => { event.preventDefault(); setApplied(filters); }}><FormattedDateField className="analytics-date-field" label="From" ariaLabel="Analytics from date" max={today} value={filters.startDate} onChange={(e) => setFilters({ ...filters, startDate: e.target.value })} /><FormattedDateField className="analytics-date-field" label="To" ariaLabel="Analytics to date" max={today} value={filters.endDate} onChange={(e) => setFilters({ ...filters, endDate: e.target.value })} /><button className="secondary-button">Apply</button></form></section><div className="tab-bar" role="tablist">{tabs.map(([value, text, Icon]) => <button role="tab" aria-selected={tab === value} className={tab === value ? 'active' : ''} onClick={() => setTab(value)} key={value}><Icon /> {text}</button>)}</div>
    {!analytics ? <RequestState error={error} label="Calculating analytics…" onRetry={load} /> : <>
      {(tab === 'daily' || tab === 'monthly') ? <><section className="content-card section-block"><div className="section-heading"><div><p className="eyebrow">Recorded time</p><h2>{tab === 'daily' ? 'Recent daily hours' : 'Monthly hours'}</h2></div></div><BarPanel rows={chartRows} label={(row) => tab === 'daily' ? formatWorkDate(row.workDate) : row.month} value={(row) => row.duration.hours} /></section><section className="content-card section-block"><div className="table-wrap"><table className="data-table"><thead><tr><th>{tab === 'daily' ? 'Date' : 'Month'}</th>{tab === 'daily' ? <><th>Active Agents</th><th>Timesheets</th></> : <th>Timesheets</th>}<th>Visits</th><th>Recorded</th><th>Approved</th><th>{tab === 'daily' ? 'Pending' : 'Corrections'}</th></tr></thead><tbody>{analytics[tab].map((row) => <tr key={row.workDate || row.month}><td data-label={tab === 'daily' ? 'Date' : 'Month'}><strong>{row.workDate ? formatWorkDate(row.workDate) : row.month}</strong></td>{tab === 'daily' ? <><td data-label="Active Agents">{row.activeAgents}</td><td data-label="Timesheets">{row.timesheets}</td></> : <td data-label="Timesheets">{row.timesheets}</td>}<td data-label="Visits">{row.visits}</td><td data-label="Recorded">{formatDuration(row.duration)}</td><td data-label="Approved">{row.approved}</td><td data-label={tab === 'daily' ? 'Pending' : 'Corrections'}>{row.pending ?? row.corrections}</td></tr>)}</tbody></table></div></section></> : null}
      {tab === 'agents' ? <section className="content-card section-block"><div className="table-wrap"><table className="data-table"><thead><tr><th>Agent</th><th>Timesheets</th><th>Approved</th><th>Visits</th><th>Companies</th><th>Recorded</th></tr></thead><tbody>{analytics.agents.map((row) => <tr key={row.id}><td data-label="Agent"><strong>{row.name}</strong><small>{row.email}</small></td><td data-label="Timesheets">{row.timesheets}</td><td data-label="Approved">{row.approved}</td><td data-label="Visits">{row.visits}</td><td data-label="Companies">{row.companies}</td><td data-label="Recorded">{formatDuration(row.duration)}</td></tr>)}</tbody></table></div></section> : null}
      {tab === 'companies' ? <section className="content-card section-block"><div className="table-wrap"><table className="data-table"><thead><tr><th>Company</th><th>Contact</th><th>Visits</th><th>Agents</th><th>Recorded</th><th>Last visited</th></tr></thead><tbody>{analytics.companies.map((row) => <tr key={row.id}><td data-label="Company"><strong>{row.name}</strong></td><td data-label="Contact">{row.contactPerson || '—'}</td><td data-label="Visits">{row.visits}</td><td data-label="Agents">{row.agents}</td><td data-label="Recorded">{formatDuration(row.duration)}</td><td data-label="Last visited">{row.lastVisited ? formatWorkDate(row.lastVisited) : 'Never'}</td></tr>)}</tbody></table></div></section> : null}
    </>}
  </AppShell>;
}
