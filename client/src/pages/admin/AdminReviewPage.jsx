import { useEffect, useState } from 'react';
import { ArrowLeft, CheckCircle2, Clock3, History, Send, XCircle } from 'lucide-react';
import { Link, useLocation, useParams } from 'react-router-dom';
import AppShell from '../../components/layout/AppShell.jsx';
import Alert from '../../components/common/Alert.jsx';
import RequestState from '../../components/common/RequestState.jsx';
import StatusBadge from '../../components/common/StatusBadge.jsx';
import { adminApi } from '../../api/admin.js';
import { errorMessage } from '../../api/client.js';
import { formatDuration, formatWorkDate } from '../../api/timesheets.js';
import { formatBusinessDateTime } from '../../utils/business-time.js';

export default function AdminReviewPage() {
  const location = useLocation();
  const { id } = useParams(); const [sheet, setSheet] = useState(null); const [error, setError] = useState(''); const [loadError, setLoadError] = useState(''); const [success, setSuccess] = useState('');
  const [decision, setDecision] = useState(''); const [comment, setComment] = useState(''); const [busy, setBusy] = useState(false);
  const load = () => { setSheet(null); setLoadError(''); return adminApi.getTimesheet(id).then(setSheet).catch((err) => setLoadError(errorMessage(err))); };
  useEffect(() => {
    if (location.state?.clearFiltersOnReturn) window.sessionStorage.setItem('timesheet.clearFiltersOnReturn', 'true');
  }, [location.state]);
  useEffect(() => { load(); }, [id]);
  const review = async (event) => { event.preventDefault(); const label = decision === 'APPROVED' ? 'Approve' : decision === 'REJECTED' ? 'Reject' : 'Request changes for'; if (!window.confirm(`${label} ${sheet.agent.fullName}'s timesheet?`)) return; setBusy(true); setError(''); try { const updated = await adminApi.reviewTimesheet(id, decision, comment); setSheet(updated); setDecision(''); setComment(''); setSuccess('Review decision recorded.'); } catch (err) { setError(errorMessage(err)); } finally { setBusy(false); } };
  if (!sheet) return <AppShell><RequestState error={loadError} label="Loading review…" onRetry={load} /></AppShell>;
  const total = sheet.visits.reduce((sum, visit) => sum + visit.duration.minutes, 0);
  return <AppShell><Link className="back-link" to="/admin/timesheets"><ArrowLeft size={16} /> All timesheets</Link><section className="detail-heading"><div><p className="eyebrow">Timesheet review</p><h1>{sheet.agent.fullName}</h1><p>{formatWorkDate(sheet.workDate)} · @{sheet.agent.username} · {sheet.agent.email}</p></div><StatusBadge status={sheet.status} /></section><Alert>{error}</Alert><Alert type="success">{success}</Alert>
    <section className="metric-grid"><article className="metric-card"><Clock3 /><span>Total recorded</span><strong>{formatDuration({ minutes: total })}</strong></article><article className="metric-card"><CheckCircle2 /><span>Company visits</span><strong>{sheet.visits.length}</strong></article><article className="metric-card"><Send /><span>Submitted</span><strong>{sheet.submittedAt ? formatBusinessDateTime(sheet.submittedAt) : 'Not submitted'}</strong></article></section>
    <section className="content-card section-block"><div className="section-heading"><div><p className="eyebrow">Visit log</p><h2>Recorded field activity</h2></div></div><div className="table-wrap"><table className="data-table"><thead><tr><th>Company</th><th>Category</th><th>Contact</th><th>Purpose and notes</th><th>Time (IST)</th><th>Duration</th></tr></thead><tbody>{sheet.visits.map((visit) => <tr key={visit.id}><td><strong>{visit.companyName}</strong></td><td><span className={`visit-category visit-category-${(visit.category || 'Silver').toLowerCase()}`}>{visit.category || 'Silver'}</span></td><td>{visit.contactPerson}</td><td><strong>{visit.purpose}</strong><small>{visit.visitNotes}</small></td><td>{visit.checkInTime}–{visit.checkOutTime}</td><td>{formatDuration(visit.duration)}</td></tr>)}</tbody></table></div><div className="declaration"><strong>Agent declaration</strong><p>“{sheet.dailySummary || 'No declaration provided.'}”</p></div></section>
    {sheet.status === 'SUBMITTED' ? <section className="content-card form-card section-block"><p className="eyebrow">Decision</p><h2>Complete this review</h2><form className="business-form" onSubmit={review}><div className="decision-options"><label><input type="radio" name="decision" required value="APPROVED" checked={decision === 'APPROVED'} onChange={(e) => setDecision(e.target.value)} /><CheckCircle2 /> Approve</label><label><input type="radio" name="decision" value="CHANGES_REQUESTED" checked={decision === 'CHANGES_REQUESTED'} onChange={(e) => setDecision(e.target.value)} /><History /> Request changes</label><label><input type="radio" name="decision" value="REJECTED" checked={decision === 'REJECTED'} onChange={(e) => setDecision(e.target.value)} /><XCircle /> Reject</label></div><label className="field"><span>Review comments {decision && decision !== 'APPROVED' ? '(required)' : '(optional)'}</span><textarea rows="4" minLength={decision === 'APPROVED' ? 0 : 5} required={decision !== '' && decision !== 'APPROVED'} value={comment} onChange={(e) => setComment(e.target.value)} placeholder="Explain the decision or exact corrections needed." /></label><div className="form-actions"><button className="primary-button" disabled={busy || !decision}>{busy ? 'Recording…' : 'Confirm decision'}</button></div></form></section> : null}
    {sheet.reviews.length ? <section className="content-card section-block"><div className="section-heading"><div><p className="eyebrow">History</p><h2>Previous decisions</h2></div></div><div className="review-history">{sheet.reviews.map((reviewItem) => <article key={reviewItem.id}><StatusBadge status={reviewItem.decision} /><div><strong>{reviewItem.reviewerName}</strong><small>{formatBusinessDateTime(reviewItem.createdAt)}</small><p>{reviewItem.comment || 'No comment provided.'}</p></div></article>)}</div></section> : null}
  </AppShell>;
}
