import { useEffect, useState } from 'react';
import { CalendarDays, ChevronLeft, ChevronRight, Clock3 } from 'lucide-react';
import AppShell from '../../components/layout/AppShell.jsx';
import RequestState from '../../components/common/RequestState.jsx';
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
    return { date, day: index + 1, weekday: new Date(`${date}T00:00:00.000Z`).getUTCDay() };
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
  const [month, setMonth] = useState(currentMonth);
  const [calendar, setCalendar] = useState(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const [reloadVersion, setReloadVersion] = useState(0);
  const days = monthDays(month);
  const monthLabel = new Intl.DateTimeFormat('en-IN', { month: 'long', year: 'numeric', timeZone: 'UTC' })
    .format(new Date(`${month}-01T00:00:00.000Z`));

  useEffect(() => {
    let active = true;
    setLoading(true);
    setError('');
    adminApi.workCalendar(month)
      .then((result) => { if (active) setCalendar(result); })
      .catch((requestError) => { if (active) setError(requestError.message || 'Could not load the work calendar.'); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [month, reloadVersion]);

  const totalHours = calendar?.agents.reduce((total, agent) => total + Object.values(agent.approvedHoursByDate).reduce((sum, hours) => sum + hours, 0), 0) || 0;
  const approvedAgentDays = calendar?.agents.reduce((total, agent) => total + Object.values(agent.approvedHoursByDate).filter((hours) => hours > 0).length, 0) || 0;

  return <AppShell>
    <section className="workspace-heading"><p className="eyebrow">Team activity</p><h1>Work calendar</h1><p>Approved visit hours by Agent and workday. Empty weekdays have no approved hours recorded.</p></section>
    <section className="content-card section-block work-calendar-card">
      <div className="work-calendar-toolbar">
        <div className="work-calendar-month"><CalendarDays size={19} /><h2>{monthLabel}</h2></div>
        <div className="work-calendar-month-controls">
          <button className="icon-button" type="button" aria-label="Previous month" title="Previous month" onClick={() => setMonth(monthOffset(month, -1))}><ChevronLeft /></button>
          <input aria-label="Calendar month" type="month" max={currentMonth} value={month} onChange={(event) => event.target.value && setMonth(event.target.value)} />
          <button className="icon-button" type="button" aria-label="Next month" title="Next month" disabled={month >= currentMonth} onClick={() => setMonth(monthOffset(month, 1))}><ChevronRight /></button>
        </div>
      </div>
      <div className="work-calendar-summary"><span><strong>{calendar?.agents.length || 0}</strong> Agents</span><span><strong>{approvedAgentDays}</strong> approved Agent-days</span><span><Clock3 size={16} /><strong>{totalHours.toFixed(1)}</strong> approved hours</span></div>
      <div className="work-calendar-legend" aria-label="Approved hours legend"><span>Less</span><i className="intensity-empty" /><i className="intensity-low" /><i className="intensity-medium" /><i className="intensity-high" /><i className="intensity-highest" /><span>More hours</span></div>
      {loading ? <RequestState label="Loading approved hours…" /> : error ? <RequestState error={error} label="Could not load the work calendar." onRetry={() => setReloadVersion((value) => value + 1)} /> : calendar?.agents.length ? <div className="work-calendar-scroll">
        <table className="work-calendar-grid" aria-label={`Approved Agent hours for ${monthLabel}`}>
          <thead><tr><th className="work-calendar-agent-head" scope="col">Agent</th>{days.map(({ date, day, weekday }) => <th className={weekday === 0 || weekday === 6 ? 'weekend' : ''} scope="col" key={date}><span>{day}</span><small>{new Intl.DateTimeFormat('en-IN', { weekday: 'short', timeZone: 'UTC' }).format(new Date(`${date}T00:00:00.000Z`))}</small></th>)}</tr></thead>
          <tbody>{calendar.agents.map((agent) => <tr key={agent.id}>
            <th className="work-calendar-agent" scope="row"><span>{agent.fullName}</span><small>{agent.status === 'ACTIVE' ? 'Active' : 'Inactive'}</small></th>
            {days.map(({ date, weekday }) => {
              const hours = agent.approvedHoursByDate[date] || 0;
              const weekend = weekday === 0 || weekday === 6;
              return <td key={date} className={weekend ? 'weekend' : ''}>
                <span className={`work-calendar-cell intensity-${intensity(hours)}`} title={`${agent.fullName} · ${formatBusinessDate(date)} · ${hours ? `${hours.toFixed(1)} approved hours` : 'No approved hours'}`} aria-label={`${agent.fullName}, ${formatBusinessDate(date)}, ${hours ? `${hours.toFixed(1)} approved hours` : 'no approved hours'}`} />
              </td>;
            })}
          </tr>)}</tbody>
        </table>
      </div> : <div className="empty-state"><CalendarDays size={28} /><h3>No Agents found</h3></div>}
    </section>
  </AppShell>;
}