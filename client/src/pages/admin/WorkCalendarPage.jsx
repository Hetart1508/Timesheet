import { useEffect, useState } from 'react';
import { CalendarDays, ChevronLeft, ChevronRight, Clock3, Search, X } from 'lucide-react';
import AppShell from '../../components/layout/AppShell.jsx';
import RequestState from '../../components/common/RequestState.jsx';
import useDebouncedValue from '../../hooks/useDebouncedValue.js';
import { adminApi } from '../../api/admin.js';
import { currentBusinessDate, formatBusinessDate } from '../../utils/business-time.js';

function monthOffset(month, offset) {
  const [year, monthNumber] = month.split('-').map(Number);
  const date = new Date(Date.UTC(year, monthNumber - 1 + offset, 1));
  return `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, '0')}`;
}

function monthDays(month) {
  const [year, monthNumber] = month.split('-').map(Number);
  const count = new Date(Date.UTC(year, monthNumber, 0)).getUTCDate();
  return Array.from({ length: count }, (_, index) => {
    const date = `${month}-${String(index + 1).padStart(2, '0')}`;
    return { date, day: index + 1 };
  });
}

function intensity(hours) {
  if (!hours) return 'empty';
  if (hours < 2) return 'low';
  if (hours < 4) return 'medium';
  if (hours < 6) return 'high';
  return 'highest';
}

export default function WorkCalendarPage() {
  const today = currentBusinessDate();
  const currentMonth = today.slice(0, 7);
  const [filters, setFilters] = useState({ month: currentMonth, agentId: '' });
  const [appliedFilters, setAppliedFilters] = useState({ month: currentMonth, agentId: '' });
  const [agentSearch, setAgentSearch] = useState('');
  const [agentSuggestions, setAgentSuggestions] = useState([]);
  const [suggestionsOpen, setSuggestionsOpen] = useState(false);
  const [activeSuggestion, setActiveSuggestion] = useState(-1);
  const [suggestionsLoading, setSuggestionsLoading] = useState(false);
  const [suggestionError, setSuggestionError] = useState('');
  const debouncedAgentSearch = useDebouncedValue(agentSearch, 500);
  const [calendar, setCalendar] = useState(null);
  const [cellTooltip, setCellTooltip] = useState(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const [reloadVersion, setReloadVersion] = useState(0);
  const days = monthDays(appliedFilters.month);
  const monthLabel = new Intl.DateTimeFormat('en-IN', { month: 'long', year: 'numeric', timeZone: 'UTC' })
    .format(new Date(`${appliedFilters.month}-01T00:00:00.000Z`));

  useEffect(() => {
    let active = true;
    setLoading(true);
    setError('');
    adminApi.workCalendar(appliedFilters.month, appliedFilters.agentId || undefined)
      .then((result) => { if (active) setCalendar(result); })
      .catch((requestError) => { if (active) setError(requestError.message || 'Could not load the work calendar.'); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [appliedFilters, reloadVersion]);

  useEffect(() => {
    let active = true;
    const query = debouncedAgentSearch.trim();
    setSuggestionError('');
    if (!query || filters.agentId) {
      setAgentSuggestions([]);
      setSuggestionsLoading(false);
      return () => { active = false; };
    }
    setSuggestionsLoading(true);
    adminApi.listAgents({ search: query, pageSize: 8 })
      .then((result) => { if (active) setAgentSuggestions(result.agents); })
      .catch(() => { if (active) { setAgentSuggestions([]); setSuggestionError('Could not load Agent suggestions.'); } })
      .finally(() => { if (active) setSuggestionsLoading(false); });
    return () => { active = false; };
  }, [debouncedAgentSearch, filters.agentId]);

  const totalHours = calendar?.agents.reduce((total, agent) => total + Object.values(agent.approvedHoursByDate).reduce((sum, hours) => sum + hours, 0), 0) || 0;
  const approvedAgentDays = calendar?.agents.reduce((total, agent) => total + Object.values(agent.approvedHoursByDate).filter((hours) => hours > 0).length, 0) || 0;
  const selectAgent = (agent) => {
    setAgentSearch(agent.fullName);
    setFilters((current) => ({ ...current, agentId: String(agent.id) }));
    setSuggestionsOpen(false);
    setActiveSuggestion(-1);
  };
  const applyFilters = (event) => {
    event.preventDefault();
    if (agentSearch.trim() && !filters.agentId) {
      setSuggestionsOpen(true);
      return;
    }
    setSuggestionsOpen(false);
    setAppliedFilters({ ...filters });
  };
  const handleAgentKeyDown = (event) => {
    if (event.key === 'Escape') { setSuggestionsOpen(false); return; }
    if (event.key === 'ArrowDown' && agentSuggestions.length) {
      event.preventDefault();
      setSuggestionsOpen(true);
      setActiveSuggestion((index) => (index + 1) % agentSuggestions.length);
    }
    if (event.key === 'ArrowUp' && agentSuggestions.length) {
      event.preventDefault();
      setActiveSuggestion((index) => index <= 0 ? agentSuggestions.length - 1 : index - 1);
    }
    if (event.key === 'Enter' && suggestionsOpen && agentSuggestions.length) {
      event.preventDefault();
      selectAgent(agentSuggestions[activeSuggestion >= 0 ? activeSuggestion : 0]);
    }
  };
  const showCellTooltip = (agent, date, event) => {
    if (!appliedFilters.agentId) return;
    const rect = event.currentTarget.getBoundingClientRect();
    setCellTooltip({ agentId: agent.id, date, hours: agent.approvedHoursByDate[date] || 0, left: rect.left + rect.width / 2, top: rect.top });
  };

  return <AppShell>
    <section className="workspace-heading"><p className="eyebrow">Team activity</p><h1>Work calendar</h1><p>Approved visit hours by Agent and workday. Empty weekdays have no approved hours recorded.</p></section>
    <section className="content-card section-block work-calendar-card">
      <form className="work-calendar-filters" onSubmit={applyFilters}>
        <div className="work-calendar-filter-agent">
          <label className="field"><span>Agent</span><div className="work-calendar-agent-search"><Search size={17} /><input role="combobox" aria-label="Search Agents" aria-autocomplete="list" aria-expanded={suggestionsOpen && Boolean(agentSearch.trim())} aria-controls="work-calendar-agent-options" autoComplete="off" placeholder="All Agents" value={agentSearch} onFocus={() => agentSearch.trim() && setSuggestionsOpen(true)} onChange={(event) => { setAgentSearch(event.target.value); setAgentSuggestions([]); setFilters((current) => ({ ...current, agentId: '' })); setSuggestionsOpen(true); setActiveSuggestion(-1); }} onKeyDown={handleAgentKeyDown} />{agentSearch ? <button className="icon-button" type="button" aria-label="Clear Agent filter" onClick={() => { setAgentSearch(''); setFilters((current) => ({ ...current, agentId: '' })); setAgentSuggestions([]); setSuggestionsOpen(false); }}><X size={16} /></button> : null}</div></label>
          {suggestionsOpen && agentSearch.trim() ? <div className="work-calendar-agent-options" id="work-calendar-agent-options" role="listbox" aria-label="Agent suggestions">{agentSuggestions.map((agent, index) => <button type="button" role="option" aria-selected={index === activeSuggestion} key={agent.id} onMouseDown={(event) => event.preventDefault()} onClick={() => selectAgent(agent)}><span>{agent.fullName}</span><small>{agent.email}</small></button>)}{suggestionError ? <p>{suggestionError}</p> : null}{!suggestionError && suggestionsLoading ? <p>Searching…</p> : null}{!suggestionError && !suggestionsLoading && !agentSuggestions.length ? <p>No Agents found.</p> : null}</div> : null}
        </div>
        <div className="work-calendar-filter-month"><span>Month</span><div className="work-calendar-month-controls"><button className="icon-button" type="button" aria-label="Previous month" title="Previous month" onClick={() => setFilters((current) => ({ ...current, month: monthOffset(current.month, -1) }))}><ChevronLeft /></button><input aria-label="Calendar month" type="month" max={currentMonth} value={filters.month} onChange={(event) => event.target.value && setFilters((current) => ({ ...current, month: event.target.value }))} /><button className="icon-button" type="button" aria-label="Next month" title="Next month" disabled={filters.month >= currentMonth} onClick={() => setFilters((current) => ({ ...current, month: monthOffset(current.month, 1) }))}><ChevronRight /></button></div></div>
        <button className="secondary-button work-calendar-apply" type="submit">Apply filters</button>
      </form>
      <div className="work-calendar-applied-month"><div className="work-calendar-month"><CalendarDays size={19} /><h2>{monthLabel}</h2></div>{appliedFilters.agentId ? <span>Filtered by {calendar?.agents[0]?.fullName || agentSearch}</span> : null}</div>
      <div className="work-calendar-summary"><span><strong>{calendar?.agents.length || 0}</strong> Agents</span><span><strong>{approvedAgentDays}</strong> approved Agent-days</span><span><Clock3 size={16} /><strong>{totalHours.toFixed(1)}</strong> approved hours</span></div>
      <div className="work-calendar-legend" aria-label="Approved hours legend"><span>Less</span><i className="intensity-empty" /><i className="intensity-low" /><i className="intensity-medium" /><i className="intensity-high" /><i className="intensity-highest" /><span>More hours</span></div>
      {loading ? <RequestState label="Loading approved hours…" /> : error ? <RequestState error={error} label="Could not load the work calendar." onRetry={() => setReloadVersion((value) => value + 1)} /> : calendar?.agents.length ? <div className="work-calendar-scroll">
        <table className="work-calendar-grid" aria-label={`Approved Agent hours for ${monthLabel}`}>
          <thead><tr><th className="work-calendar-agent-head" scope="col">Agent</th>{days.map(({ date, day }) => <th scope="col" key={date}><span>{day}</span><small>{new Intl.DateTimeFormat('en-IN', { weekday: 'short', timeZone: 'UTC' }).format(new Date(`${date}T00:00:00.000Z`))}</small></th>)}</tr></thead>
          <tbody>{calendar.agents.map((agent) => <tr key={agent.id}>
            <th className="work-calendar-agent" scope="row"><span>{agent.fullName}</span><small>{agent.status === 'ACTIVE' ? 'Active' : 'Inactive'}</small></th>
            {days.map(({ date }) => {
              const hours = agent.approvedHoursByDate[date] || 0;
              return <td key={date} data-label={formatBusinessDate(date)} data-value={hours ? `${hours.toFixed(1)} hours` : 'No approved hours'}>
                <span className={`work-calendar-cell intensity-${intensity(hours)}`} tabIndex={appliedFilters.agentId ? 0 : -1} aria-label={`${agent.fullName}, ${formatBusinessDate(date)}, ${hours ? `${hours.toFixed(1)} approved hours` : 'no approved hours'}`} onMouseEnter={(event) => showCellTooltip(agent, date, event)} onMouseLeave={() => setCellTooltip(null)} onFocus={(event) => showCellTooltip(agent, date, event)} onBlur={() => setCellTooltip(null)} />
              </td>;
            })}
          </tr>)}</tbody>
        </table>
      </div> : <div className="empty-state"><CalendarDays size={28} /><h3>No Agents found</h3></div>}
      {cellTooltip && appliedFilters.agentId ? <div className="work-calendar-tooltip" role="tooltip" style={{ '--tooltip-left': `${cellTooltip.left}px`, top: `${cellTooltip.top}px` }}><strong>{cellTooltip.hours.toFixed(1)} hours</strong><span>Approved visit time</span><small>{formatBusinessDate(cellTooltip.date)}</small></div> : null}
    </section>
  </AppShell>;
}
