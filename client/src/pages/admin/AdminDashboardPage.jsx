import { useEffect, useState } from 'react';
import { Building2, Clock3, FileCheck2, MapPin, Users } from 'lucide-react';
import { Link } from 'react-router-dom';
import AppShell from '../../components/layout/AppShell.jsx';
import Alert from '../../components/common/Alert.jsx';
import { adminApi } from '../../api/admin.js';
import { errorMessage } from '../../api/client.js';
import { formatDuration, formatWorkDate } from '../../api/timesheets.js';

export default function AdminDashboardPage() {
  const [dashboard, setDashboard] = useState(null); const [error, setError] = useState('');
  useEffect(() => { adminApi.dashboard().then(setDashboard).catch((err) => setError(errorMessage(err))); }, []);
  return <AppShell><section className="dashboard-hero"><div><p className="eyebrow">Admin operations center</p><h1>Field operations overview</h1><p>Monitor activity, verify submissions, and keep company records trustworthy.</p></div><Link className="primary-button" to="/admin/timesheets?status=SUBMITTED"><FileCheck2 size={17} /> Review queue {dashboard ? `(${dashboard.metrics.pendingReviews})` : ''}</Link></section><Alert>{error}</Alert>
    {!dashboard && !error ? <div className="panel-loading"><span className="spinner" /> Loading operations…</div> : dashboard ? <><section className="metric-grid admin-metrics"><article className="metric-card"><Users /><span>Active agents</span><strong>{dashboard.metrics.activeAgents}</strong><small>{dashboard.metrics.activeToday} active today</small></article><article className="metric-card"><MapPin /><span>Company visits</span><strong>{dashboard.metrics.totalVisits}</strong></article><article className="metric-card"><Clock3 /><span>Recorded time</span><strong>{formatDuration(dashboard.metrics.totalDuration)}</strong></article><article className="metric-card"><FileCheck2 /><span>Pending reviews</span><strong>{dashboard.metrics.pendingReviews}</strong></article></section><section className="content-card section-block"><div className="section-heading"><div><p className="eyebrow">Review queue</p><h2>Submissions awaiting review</h2></div><Link to="/admin/timesheets">View all</Link></div>{dashboard.pending.length ? <div className="record-list">{dashboard.pending.map((sheet) => <Link className="record-row" to={`/admin/timesheets/${sheet.id}`} key={sheet.id}><div><strong>{sheet.agentName}</strong><span>{formatWorkDate(sheet.workDate)} · {sheet.visitCount} visits · {formatDuration(sheet.duration)}</span></div><span className="review-link">Review</span></Link>)}</div> : <div className="empty-state"><FileCheck2 /><h3>Review queue is clear</h3><p>All submitted timesheets have been reviewed.</p></div>}</section></> : null}
  </AppShell>;
}
