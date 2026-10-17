import { useCallback, useEffect, useMemo, useState } from 'react';
import { ArrowLeft, Building2, Check, Edit3, Plus, Send, Trash2, X } from 'lucide-react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import AppShell from '../../components/layout/AppShell.jsx';
import Alert from '../../components/common/Alert.jsx';
import RequestState from '../../components/common/RequestState.jsx';
import StatusBadge from '../../components/common/StatusBadge.jsx';
import { agentApi, formatDuration, formatWorkDate } from '../../api/timesheets.js';
import { errorMessage, fieldErrors } from '../../api/client.js';

const emptyVisit = { companyId: '', contactPerson: '', purpose: '', visitNotes: '', checkInTime: '', checkOutTime: '' };
const emptyCompany = { companyName: '', address: '', contactPerson: '', contactPhone: '', notes: '' };

export default function TimesheetPage() {
  const { id } = useParams(); const navigate = useNavigate();
  const [sheet, setSheet] = useState(null); const [companies, setCompanies] = useState([]);
  const [summary, setSummary] = useState(''); const [visit, setVisit] = useState(emptyVisit);
  const [editingVisitId, setEditingVisitId] = useState(null); const [showVisitForm, setShowVisitForm] = useState(false);
  const [showCompanyForm, setShowCompanyForm] = useState(false); const [company, setCompany] = useState(emptyCompany);
  const [companySearch, setCompanySearch] = useState(''); const [error, setError] = useState(''); const [success, setSuccess] = useState('');
  const [errors, setErrors] = useState({}); const [busy, setBusy] = useState('');

  const load = useCallback(async () => {
    setError('');
    try { const value = await agentApi.getTimesheet(id); setSheet(value); setSummary(value.dailySummary); }
    catch (requestError) { setError(errorMessage(requestError)); }
  }, [id]);
  const loadCompanies = useCallback(async (search = '') => {
    try { setCompanies(await agentApi.listCompanies(search)); } catch (requestError) { setError(errorMessage(requestError)); }
  }, []);
  useEffect(() => { load(); loadCompanies(); }, [load, loadCompanies]);
  const selectedCompany = useMemo(() => companies.find((item) => String(item.id) === String(visit.companyId)), [companies, visit.companyId]);

  const applyResult = (value, message) => { setSheet(value); setSummary(value.dailySummary); setSuccess(message); setError(''); setErrors({}); };
  const saveSummary = async () => {
    setBusy('summary'); setError(''); setSuccess('');
    try { applyResult(await agentApi.saveSummary(id, summary), 'Daily declaration saved.'); }
    catch (requestError) { setError(errorMessage(requestError)); } finally { setBusy(''); }
  };
  const editVisit = (item) => { setVisit({ companyId: String(item.companyId), contactPerson: item.contactPerson, purpose: item.purpose, visitNotes: item.visitNotes, checkInTime: item.checkInTime, checkOutTime: item.checkOutTime }); setEditingVisitId(item.id); setShowVisitForm(true); setSuccess(''); window.scrollTo?.({ top: 0, behavior: 'smooth' }); };
  const resetVisit = () => { setVisit(emptyVisit); setEditingVisitId(null); setShowVisitForm(false); setErrors({}); };
  const saveVisit = async (event) => {
    event.preventDefault(); setBusy('visit'); setError(''); setSuccess(''); setErrors({});
    try {
      const payload = { ...visit, companyId: Number(visit.companyId) };
      const value = editingVisitId ? await agentApi.updateVisit(editingVisitId, payload) : await agentApi.addVisit(id, payload);
      applyResult(value, editingVisitId ? 'Visit updated.' : 'Visit added.'); resetVisit();
    } catch (requestError) { setErrors(fieldErrors(requestError)); setError(errorMessage(requestError)); } finally { setBusy(''); }
  };
  const removeVisit = async (visitId) => {
    if (!window.confirm('Remove this visit from the timesheet?')) return;
    setBusy(`delete-${visitId}`); setError('');
    try { applyResult(await agentApi.deleteVisit(visitId), 'Visit removed.'); }
    catch (requestError) { setError(errorMessage(requestError)); } finally { setBusy(''); }
  };
  const createCompany = async (event) => {
    event.preventDefault(); setBusy('company'); setError(''); setErrors({});
    try { const created = await agentApi.createCompany(company); setCompanies((current) => [created, ...current]); setVisit({ ...visit, companyId: String(created.id), contactPerson: created.contactPerson || visit.contactPerson }); setCompany(emptyCompany); setShowCompanyForm(false); setSuccess('Company created and selected.'); }
    catch (requestError) { setErrors(fieldErrors(requestError)); setError(errorMessage(requestError)); } finally { setBusy(''); }
  };
  const submit = async () => {
    if (!window.confirm('Submit this timesheet for review? You can still edit it later, but editing will return it to Draft.')) return;
    setBusy('submit'); setError(''); setSuccess('');
    try { await agentApi.saveSummary(id, summary); applyResult(await agentApi.submitTimesheet(id), 'Timesheet submitted for review.'); }
    catch (requestError) { setError(errorMessage(requestError)); } finally { setBusy(''); }
  };

  if (!sheet) return <AppShell><RequestState error={error} label="Loading timesheet…" onRetry={load} /><button className="secondary-button" onClick={() => navigate('/timesheets')}>Back to history</button></AppShell>;

  return <AppShell>
    <Link className="back-link" to="/timesheets"><ArrowLeft size={16} /> All timesheets</Link>
    <section className="detail-heading"><div><p className="eyebrow">Daily timesheet</p><h1>{formatWorkDate(sheet.workDate)}</h1><p>{sheet.visits.length} {sheet.visits.length === 1 ? 'company visit' : 'company visits'} · {formatDuration({ minutes: sheet.visits.reduce((sum, item) => sum + item.duration.minutes, 0) })}</p></div><StatusBadge status={sheet.status} /></section>
    {sheet.reviewComment ? <Alert type="error"><strong>Reviewer feedback:</strong> {sheet.reviewComment}</Alert> : null}
    <Alert>{error}</Alert><Alert type="success">{success}</Alert>

    {showVisitForm ? <section className="content-card form-card section-block">
      <div className="section-heading"><div><p className="eyebrow">{editingVisitId ? 'Edit visit' : 'New visit'}</p><h2>Visit details</h2></div><button className="icon-button" aria-label="Close visit form" onClick={resetVisit}><X /></button></div>
      <form className="business-form" onSubmit={saveVisit}>
        <div className="company-picker"><label className="field"><span>Company</span><div className="search-control"><input placeholder="Search companies" value={companySearch} onChange={(e) => setCompanySearch(e.target.value)} /><button type="button" className="secondary-button" onClick={() => loadCompanies(companySearch)}>Search</button></div><select required value={visit.companyId} onChange={(e) => { const value = e.target.value; const selected = companies.find((item) => String(item.id) === value); setVisit({ ...visit, companyId: value, contactPerson: visit.contactPerson || selected?.contactPerson || '' }); }}><option value="">Select a company</option>{companies.map((item) => <option value={item.id} key={item.id}>{item.companyName}{item.reviewStatus === 'PENDING' ? ' (pending review)' : ''}</option>)}</select>{errors.companyId ? <small className="field-error">{errors.companyId}</small> : null}</label><button type="button" className="text-action" onClick={() => setShowCompanyForm(!showCompanyForm)}><Plus size={16} /> Add a new company</button></div>
        {selectedCompany ? <p className="selection-note"><Building2 size={16} /> {selectedCompany.address}</p> : null}
        <div className="two-fields"><label className="field"><span>Check-in time</span><input type="time" required value={visit.checkInTime} onChange={(e) => setVisit({ ...visit, checkInTime: e.target.value })} />{errors.checkInTime ? <small className="field-error">{errors.checkInTime}</small> : null}</label><label className="field"><span>Check-out time</span><input type="time" required value={visit.checkOutTime} onChange={(e) => setVisit({ ...visit, checkOutTime: e.target.value })} />{errors.checkOutTime ? <small className="field-error">{errors.checkOutTime}</small> : null}</label></div>
        <label className="field"><span>Contact person</span><input required minLength="2" maxLength="120" value={visit.contactPerson} onChange={(e) => setVisit({ ...visit, contactPerson: e.target.value })} /></label>
        <label className="field"><span>Purpose</span><textarea required minLength="2" maxLength="500" rows="2" value={visit.purpose} onChange={(e) => setVisit({ ...visit, purpose: e.target.value })} /></label>
        <label className="field"><span>Visit notes</span><textarea required minLength="2" maxLength="5000" rows="4" value={visit.visitNotes} onChange={(e) => setVisit({ ...visit, visitNotes: e.target.value })} /></label>
        <div className="form-actions"><button className="secondary-button" type="button" onClick={resetVisit}>Cancel</button><button className="primary-button" disabled={busy === 'visit'}>{busy === 'visit' ? 'Saving…' : editingVisitId ? 'Update visit' : 'Add visit'}</button></div>
      </form>
    </section> : null}

    {showCompanyForm ? <section className="content-card form-card section-block nested-form"><div className="section-heading"><div><p className="eyebrow">Company directory</p><h2>Add a company</h2></div><button className="icon-button" aria-label="Close company form" onClick={() => setShowCompanyForm(false)}><X /></button></div><form className="business-form" onSubmit={createCompany}><label className="field"><span>Company name</span><input required minLength="2" value={company.companyName} onChange={(e) => setCompany({ ...company, companyName: e.target.value })} /></label><label className="field"><span>Address</span><textarea required minLength="3" rows="2" value={company.address} onChange={(e) => setCompany({ ...company, address: e.target.value })} /></label><div className="two-fields"><label className="field"><span>Default contact (optional)</span><input value={company.contactPerson} onChange={(e) => setCompany({ ...company, contactPerson: e.target.value })} /></label><label className="field"><span>Phone (optional)</span><input value={company.contactPhone} onChange={(e) => setCompany({ ...company, contactPhone: e.target.value })} /></label></div><label className="field"><span>Notes (optional)</span><textarea rows="2" value={company.notes} onChange={(e) => setCompany({ ...company, notes: e.target.value })} /></label><p className="form-help">Companies added by Agents are marked pending for Admin review, but can be used immediately.</p><div className="form-actions"><button className="secondary-button" type="button" onClick={() => setShowCompanyForm(false)}>Cancel</button><button className="primary-button" disabled={busy === 'company'}>{busy === 'company' ? 'Creating…' : 'Create company'}</button></div></form></section> : null}

    <section className="content-card section-block">
      <div className="section-heading"><div><p className="eyebrow">Company visits</p><h2>Recorded visits</h2></div>{!showVisitForm ? <button className="secondary-button" onClick={() => setShowVisitForm(true)}><Plus size={17} /> Add visit</button> : null}</div>
      {sheet.visits.length ? <div className="visit-list">{sheet.visits.map((item) => <article className="visit-card" key={item.id}><div className="visit-time"><strong>{item.checkInTime}</strong><span>to</span><strong>{item.checkOutTime}</strong><small>{formatDuration(item.duration)}</small></div><div className="visit-body"><h3>{item.companyName}</h3><p><strong>{item.purpose}</strong></p><p>{item.visitNotes}</p><small>Contact: {item.contactPerson}</small></div><div className="row-actions"><button className="icon-button" aria-label={`Edit visit to ${item.companyName}`} onClick={() => editVisit(item)}><Edit3 /></button><button className="icon-button danger-button" aria-label={`Remove visit to ${item.companyName}`} disabled={busy === `delete-${item.id}`} onClick={() => removeVisit(item.id)}><Trash2 /></button></div></article>)}</div> : <div className="empty-state"><Building2 size={28} /><h3>No visits recorded</h3><p>Add each company visit with its actual check-in and check-out time.</p></div>}
    </section>

    <section className="content-card form-card section-block"><p className="eyebrow">Daily declaration</p><h2>Summarize your day</h2><p className="form-help">At least 20 characters are required before submission.</p><label className="field"><span>Declaration</span><textarea rows="5" maxLength="4000" value={summary} onChange={(e) => setSummary(e.target.value)} placeholder="Describe the work completed, outcomes, and any follow-up needed." /></label><div className="form-actions split-actions"><button className="secondary-button" onClick={saveSummary} disabled={busy === 'summary'}><Check size={17} /> {busy === 'summary' ? 'Saving…' : 'Save declaration'}</button><button className="primary-button" onClick={submit} disabled={busy === 'submit'}><Send size={17} /> {busy === 'submit' ? 'Submitting…' : sheet.status === 'DRAFT' ? 'Submit for review' : 'Resubmit for review'}</button></div></section>
  </AppShell>;
}
