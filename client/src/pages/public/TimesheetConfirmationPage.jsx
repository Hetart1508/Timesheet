import { useEffect, useState } from 'react';
import { CheckCircle2, XCircle } from 'lucide-react';
import { useSearchParams } from 'react-router-dom';
import AuthShell from '../../components/auth/AuthShell.jsx';
import Alert from '../../components/common/Alert.jsx';
import RequestState from '../../components/common/RequestState.jsx';
import { api, errorMessage } from '../../api/client.js';
import { formatDuration, formatWorkDate } from '../../api/timesheets.js';

export default function TimesheetConfirmationPage() {
  const [params] = useSearchParams(); const token = params.get('token') || ''; const initialResponse = params.get('response');
  const [details, setDetails] = useState(null); const [error, setError] = useState(''); const [busy, setBusy] = useState(''); const [done, setDone] = useState(null);
  const load = () => { setError(''); return api.get('/timesheet-confirmation', { params: { token } }).then((response) => setDetails(response.data.data)).catch((err) => setError(errorMessage(err))); };
  useEffect(() => { if (token) load(); else setError('This confirmation link is incomplete.'); }, [token]);
  const respond = async (response) => { setBusy(response); setError(''); try { const result = await api.post('/timesheet-confirmation', { token, response }); setDone(result.data.data); } catch (err) { setError(errorMessage(err)); } finally { setBusy(''); } };
  return <AuthShell compact brandTo="/login" eyebrow="Timesheet confirmation" title={done ? 'Thank you — response recorded' : 'Review your timesheet'} description={done ? 'The Admin workspace has been updated with your response.' : 'No account or sign-in is required.'}><Alert>{error}</Alert>{!details && !error ? <RequestState label="Loading timesheet…" /> : null}{details && !done ? <div className="confirmation-summary"><h2>{details.agentName}</h2><p><strong>{formatWorkDate(details.workDate)}</strong> · {details.visitCount} visits · {formatDuration({ minutes: details.durationMinutes })}</p><blockquote>{details.dailySummary}</blockquote><div className="review-history">{details.visits.map((visit, index) => <article key={`${visit.companyName}-${index}`}><div><strong>{visit.companyName}</strong><small>{visit.category} · MDR {visit.mdr} · {formatDuration({ minutes: visit.durationMinutes })}</small><p>{visit.purpose ? `${visit.purpose} — ` : ''}{visit.visitNotes}</p><small>Contact: {visit.contactPerson}</small></div></article>)}</div>{details.response ? <Alert type="info">This request was already answered: {details.response === 'YES' ? 'Yes' : 'No'}.</Alert> : details.expired ? <Alert>This link has expired. Contact the Admin for a new confirmation email.</Alert> : <><p>Is this timesheet correct?</p><div className="portal-options"><button className={`portal-option${initialResponse === 'YES' ? ' selected' : ''}`} disabled={busy} onClick={() => respond('YES')}><CheckCircle2 /><span><strong>Yes, it is correct</strong><small>Approve this timesheet</small></span></button><button className={`portal-option${initialResponse === 'NO' ? ' selected' : ''}`} disabled={busy} onClick={() => respond('NO')}><XCircle /><span><strong>No, it needs correction</strong><small>Return it to the Admin</small></span></button></div></>}</div> : null}{done ? <Alert type="success">The timesheet is now {done.status === 'APPROVED' ? 'approved' : 'marked for correction'}.</Alert> : null}</AuthShell>;
}
