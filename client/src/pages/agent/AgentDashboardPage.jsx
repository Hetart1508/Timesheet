import { useEffect, useState } from 'react';
import { ArrowRight, CalendarDays, Clock3, FilePlus2, MapPin } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import AppShell from '../../components/layout/AppShell.jsx';
import Alert from '../../components/common/Alert.jsx';
import RequestState from '../../components/common/RequestState.jsx';
import StatusBadge from '../../components/common/StatusBadge.jsx';
import { agentApi, formatDuration, formatWorkDate } from '../../api/timesheets.js';
import { errorMessage } from '../../api/client.js';
import { useAuth } from '../../context/AuthContext.jsx';

export default function AgentDashboardPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [dashboard, setDashboard] = useState(null);
  const [dashboardError, setDashboardError] = useState('');
  const [dashboardRequest, setDashboardRequest] = useState(0);
  const [selectedDate, setSelectedDate] = useState('');
  const [error, setError] = useState('');
  const [starting, setStarting] = useState(false);

  useEffect(() => {
    let active = true;
    setDashboard(null);
    setDashboardError('');
    agentApi.dashboard().then((value) => {
      if (active) {
        setDashboard(value);
        setSelectedDate(value.businessDate);
      }
    }).catch((requestError) => active && setDashboardError(errorMessage(requestError)));
    return () => { active = false; };
  }, [dashboardRequest]);

  const openSelectedDay = async () => {
    const workDate = selectedDate || dashboard?.businessDate;
    if (!workDate) return;
    if (workDate === dashboard?.businessDate && dashboard.today) { navigate(`/timesheets/${dashboard.today.id}`); return; }
    setStarting(true); setError('');
    try { const timesheet = await agentApi.startTimesheet(workDate); navigate(`/timesheets/${timesheet.id}`); }
    catch (requestError) { setError(errorMessage(requestError)); setStarting(false); }
  };

  return <AppShell>
    <section className="dashboard-hero">
      <div><p className="eyebrow">Your workday</p><h1>Hello, {user.fullName.split(' ')[0]}</h1><p>Choose a date, record your visits, and submit your timesheet.</p></div>
      <div className="dashboard-actions">
        <label className="field"><span>Timesheet date</span><input aria-label="Timesheet date" type="date" value={selectedDate || dashboard?.businessDate || ''} max={dashboard?.businessDate} onChange={(event) => setSelectedDate(event.target.value)} disabled={!dashboard || starting} /></label>
        <button className="primary-button agent-main-action" onClick={openSelectedDay} disabled={starting || !dashboard || !selectedDate}>{starting ? 'Opening…' : selectedDate === dashboard?.businessDate && dashboard?.today ? 'Continue today’s timesheet' : selectedDate === dashboard?.businessDate ? 'Start today’s timesheet' : 'Open selected day'}</button>
      </div>
    </section>
    <Alert>{error}</Alert>
    {!dashboard ? <RequestState error={dashboardError} label="Loading your workspace…" onRetry={() => setDashboardRequest((value) => value + 1)} /> : <>
      <section className="workflow-strip" aria-label="How to complete a timesheet"><strong>3 quick steps</strong><span><b>1</b> Add visits</span><i aria-hidden="true">→</i><span><b>2</b> Add summary</span><i aria-hidden="true">→</i><span><b>3</b> Submit</span></section>
      <section className="metric-grid" aria-label="Today’s summary">
        <article className="metric-card"><CalendarDays size={20} /><span>Business date</span><strong>{formatWorkDate(dashboard.businessDate)}</strong></article>
        <article className="metric-card"><MapPin size={20} /><span>Visits today</span><strong>{dashboard.today?.visitCount || 0}</strong></article>
        <article className="metric-card"><Clock3 size={20} /><span>Recorded time</span><strong>{formatDuration(dashboard.today?.duration)}</strong></article>
      </section>
      <section className="content-card section-block">
        <div className="section-heading"><div><p className="eyebrow">Recent activity</p><h2>Your timesheets</h2></div><Link to="/timesheets">View all <ArrowRight size={16} /></Link></div>
        {dashboard.recent.length ? <div className="record-list">{dashboard.recent.map((sheet) => <Link className="record-row" to={`/timesheets/${sheet.id}`} key={sheet.id}><div><strong>{formatWorkDate(sheet.workDate)}</strong><span>{sheet.visitCount} {sheet.visitCount === 1 ? 'visit' : 'visits'} · {formatDuration(sheet.duration)}</span></div><StatusBadge status={sheet.status} /></Link>)}</div> : <div className="empty-state"><FilePlus2 size={28} /><h3>No timesheets yet</h3><p>Start today’s timesheet to record your first company visit.</p></div>}
      </section>
    </>}
  </AppShell>;
}
