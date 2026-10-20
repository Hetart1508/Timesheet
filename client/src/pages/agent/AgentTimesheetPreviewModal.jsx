import { useCallback, useEffect, useRef, useState } from 'react';
import { CheckCircle2, Clock3, History, Send, X } from 'lucide-react';
import Alert from '../../components/common/Alert.jsx';
import RequestState from '../../components/common/RequestState.jsx';
import StatusBadge from '../../components/common/StatusBadge.jsx';
import { agentApi, formatDuration, formatWorkDate } from '../../api/timesheets.js';
import { errorMessage } from '../../api/client.js';
import { formatBusinessDateTime } from '../../utils/business-time.js';

export default function AgentTimesheetPreviewModal({ id, onClose }) {
  const [sheet, setSheet] = useState(null);
  const [loadError, setLoadError] = useState('');
  const closeButtonRef = useRef(null);
  const openerRef = useRef(document.activeElement);
  const load = useCallback(() => {
    setSheet(null);
    setLoadError('');
    return agentApi.getTimesheet(id).then(setSheet).catch((error) => setLoadError(errorMessage(error)));
  }, [id]);

  useEffect(() => { load(); }, [load]);
  useEffect(() => {
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    closeButtonRef.current?.focus();
    const closeOnEscape = (event) => { if (event.key === 'Escape') onClose(); };
    window.addEventListener('keydown', closeOnEscape);
    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener('keydown', closeOnEscape);
      openerRef.current?.focus();
    };
  }, [onClose]);

  const totalMinutes = sheet?.visits.reduce((sum, visit) => sum + visit.duration.minutes, 0) || 0;

  return <div className="modal-backdrop timesheet-preview-backdrop" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose(); }}>
    <section className="modal-card timesheet-preview-modal" role="dialog" aria-modal="true" aria-labelledby="agent-timesheet-preview-title">
      <header className="timesheet-preview-header"><div><p className="eyebrow">Timesheet history</p><h2 id="agent-timesheet-preview-title">Timesheet details</h2></div><button ref={closeButtonRef} type="button" className="icon-button" aria-label="Close timesheet preview" onClick={onClose}><X /></button></header>
      <div className="timesheet-preview-body">
        {!sheet ? <RequestState error={loadError} label="Loading timesheet…" onRetry={load} /> : <div className="timesheet-review-content timesheet-review-content-compact">
          <section className="detail-heading"><div><p className="eyebrow">Daily timesheet</p><h1>{formatWorkDate(sheet.workDate)}</h1><p>{sheet.visits.length} {sheet.visits.length === 1 ? 'company visit' : 'company visits'} · {formatDuration({ minutes: totalMinutes })}</p></div><StatusBadge status={sheet.status} /></section>
          {sheet.reviewComment ? <Alert type="info"><strong>Reviewer feedback:</strong> {sheet.reviewComment}</Alert> : null}
          <section className="metric-grid"><article className="metric-card"><Clock3 /><span>Total recorded</span><strong>{formatDuration({ minutes: totalMinutes })}</strong></article><article className="metric-card"><CheckCircle2 /><span>Company visits</span><strong>{sheet.visits.length}</strong></article><article className="metric-card"><Send /><span>Submitted</span><strong>{sheet.submittedAt ? formatBusinessDateTime(sheet.submittedAt) : 'Not submitted'}</strong></article></section>
          <section className="content-card section-block"><div className="section-heading"><div><p className="eyebrow">Visit log</p><h2>Recorded field activity</h2></div></div>
            {sheet.visits.length ? <div className="table-wrap"><table className="data-table"><thead><tr><th>Company</th><th>Category</th><th>Contact</th><th>Purpose and notes</th><th>Time (IST)</th><th>Duration</th></tr></thead><tbody>{sheet.visits.map((visit) => <tr key={visit.id}><td data-label="Company"><strong>{visit.companyName}</strong></td><td data-label="Category"><span className={`visit-category visit-category-${(visit.category || 'Silver').toLowerCase()}`}>{visit.category || 'Silver'}</span></td><td data-label="Contact">{visit.contactPerson}</td><td data-label="Purpose and notes"><strong>{visit.purpose}</strong><small>{visit.visitNotes}</small></td><td data-label="Time (IST)">{visit.checkInTime}–{visit.checkOutTime}</td><td data-label="Duration">{formatDuration(visit.duration)}</td></tr>)}</tbody></table></div> : <div className="empty-state"><h3>No visits recorded</h3></div>}
            <div className="declaration"><strong>Daily declaration</strong><p>“{sheet.dailySummary || 'No declaration provided.'}”</p></div>
          </section>
          {sheet.reviews.length ? <section className="content-card section-block"><div className="section-heading"><div><p className="eyebrow">History</p><h2>Review history</h2></div></div><div className="review-history">{sheet.reviews.map((review) => <article key={review.id}><StatusBadge status={review.decision} /><div><strong>{review.reviewerName}</strong><small>{formatBusinessDateTime(review.createdAt)}</small><p>{review.comment || 'No comment provided.'}</p></div></article>)}</div></section> : null}
          {!sheet.reviews.length && sheet.status !== 'DRAFT' ? <p className="preview-history-note"><History size={15} /> No review decision has been recorded yet.</p> : null}
        </div>}
      </div>
    </section>
  </div>;
}
