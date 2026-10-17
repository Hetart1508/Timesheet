import { useEffect, useState } from 'react';
import { ArrowRight, CalendarDays, Clock3, FilePlus2, MapPin } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import AppShell from '../../components/layout/AppShell.jsx';
import Alert from '../../components/common/Alert.jsx';
import StatusBadge from '../../components/common/StatusBadge.jsx';
import { agentApi, formatDuration, formatWorkDate } from '../../api/timesheets.js';
import { errorMessage } from '../../api/client.js';
import { useAuth } from '../../context/AuthContext.jsx';

export default function AgentDashboardPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [dashboard, setDashboard] = useState(null);
  const [error, setError] = useState('');
  const [starting, setStarting] = useState(false);

  useEffect(() => {
    let active = true;
    agentApi.dashboard().then((value) => active && setDashboard(value)).catch((requestError) => active && setError(errorMessage(requestError)));
    return () => { active = false; };
  }, []);

  const openToday = async () => {
    if (dashboard?.today) { navigate(`/timesheets/${dashboard.today.id}`); return; }
    setStarting(true); setError('');
    try { const timesheet = await agentApi.startTimesheet(); navigate(`/timesheets/${timesheet.id}`); }
    catch (requestError) { setError(errorMessage(requestError)); setStarting(false); }
  };

  return <AppShell>
    <section className="dashboard-hero">
      <div><p className="eyebrow">Agent workspace</p><h1>Good day, {user.fullName.split(' ')[0]}</h1><p>Record company visits and submit an accurate daily declaration.</p></div>
      <button className="primary-button" onClick={openToday} disabled={starting}>{starting ? 'Opening…' : dashboard?.today ? 'Open today’s timesheet' : 'Start today’s timesheet'}</button>
    </section>
    <Alert>{error}</Alert>
    {!dashboard && !error ? <div className="panel-loading"><span className="spinner" /> Loading your workspace…</div> : dashboard ? <>
      <section className="metric-grid" aria-label="Today’s summary">
        <article className="metric-card"><CalendarDays size={20} /><span>Business date</span><strong>{formatWorkDate(dashboard.businessDate)}</strong></article>
        <article className="metric-card"><MapPin size={20} /><span>Visits today</span><strong>{dashboard.today?.visitCount || 0}</strong></article>
        <article className="metric-card"><Clock3 size={20} /><span>Recorded time</span><strong>{formatDuration(dashboard.today?.duration)}</strong></article>
      </section>
      <section className="content-card section-block">
        <div className="section-heading"><div><p className="eyebrow">Recent activity</p><h2>Your timesheets</h2></div><Link to="/timesheets">View all <ArrowRight size={16} /></Link></div>
        {dashboard.recent.length ? <div className="record-list">{dashboard.recent.map((sheet) => <Link className="record-row" to={`/timesheets/${sheet.id}`} key={sheet.id}><div><strong>{formatWorkDate(sheet.workDate)}</strong><span>{sheet.visitCount} {sheet.visitCount === 1 ? 'visit' : 'visits'} · {formatDuration(sheet.duration)}</span></div><StatusBadge status={sheet.status} /></Link>)}</div> : <div className="empty-state"><FilePlus2 size={28} /><h3>No timesheets yet</h3><p>Start today’s timesheet to record your first company visit.</p></div>}
      </section>
    </> : null}
  </AppShell>;
}
