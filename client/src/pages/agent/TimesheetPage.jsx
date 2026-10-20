import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ArrowLeft, Building2, Check, Edit3, Plus, Send, Trash2, X } from 'lucide-react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import AppShell from '../../components/layout/AppShell.jsx';
import Alert from '../../components/common/Alert.jsx';
import RequestState from '../../components/common/RequestState.jsx';
import StatusBadge from '../../components/common/StatusBadge.jsx';
import VoiceTextarea from '../../components/forms/VoiceTextarea.jsx';
import { agentApi, formatDuration, formatWorkDate } from '../../api/timesheets.js';
import { errorMessage, fieldErrors } from '../../api/client.js';

const emptyVisit = { companyId: '', category: '', contactPerson: '', purpose: '', visitNotes: '', checkInTime: '', checkOutTime: '' };
const emptyCompany = { companyName: '', address: '', contactPerson: '', contactPhone: '', notes: '' };

export default function TimesheetPage() {
  const { id } = useParams(); const navigate = useNavigate();
  const [sheet, setSheet] = useState(null); const [companies, setCompanies] = useState([]);
  const [companySuggestions, setCompanySuggestions] = useState([]);
  const [summary, setSummary] = useState(''); const [visit, setVisit] = useState(emptyVisit);
  const [editingVisitId, setEditingVisitId] = useState(null); const [showVisitForm, setShowVisitForm] = useState(false);
  const [showCompanyForm, setShowCompanyForm] = useState(false); const [company, setCompany] = useState(emptyCompany);
  const [companySearch, setCompanySearch] = useState(''); const [companySearchActive, setCompanySearchActive] = useState(false); const [companiesLoading, setCompaniesLoading] = useState(true); const [companiesError, setCompaniesError] = useState(''); const [companyMatchCount, setCompanyMatchCount] = useState(null);
  const [error, setError] = useState(''); const [success, setSuccess] = useState('');
  const [errors, setErrors] = useState({}); const [busy, setBusy] = useState('');
  const companySearchRequest = useRef(0);

  const load = useCallback(async () => {
    setError('');
    try { const value = await agentApi.getTimesheet(id); setSheet(value); setSummary(value.dailySummary); }
    catch (requestError) { setError(errorMessage(requestError)); }
  }, [id]);
  const loadCompanies = useCallback(async (search = '', selectedCompany = null) => {
    const requestId = ++companySearchRequest.current;
    setCompaniesLoading(true); setCompaniesError(''); setCompanyMatchCount(null);
    try {
      const matches = await agentApi.listCompanies(search);
      if (requestId !== companySearchRequest.current) return;
      setCompanySuggestions(matches);
      const selectedMatches = selectedCompany && !matches.some((item) => String(item.id) === String(selectedCompany.id))
        ? [...matches, selectedCompany]
        : matches;
      setCompanies(selectedMatches);
      setCompanyMatchCount(matches.length);
    } catch (requestError) {
      if (requestId === companySearchRequest.current) setCompaniesError(errorMessage(requestError));
    } finally {
      if (requestId === companySearchRequest.current) setCompaniesLoading(false);
    }
  }, []);
  useEffect(() => { load(); loadCompanies(); }, [load, loadCompanies]);
  const selectedCompany = useMemo(() => companies.find((item) => String(item.id) === String(visit.companyId)), [companies, visit.companyId]);
  const selectedCompanyRef = useRef(selectedCompany);
  selectedCompanyRef.current = selectedCompany;

  useEffect(() => {
    if (!showVisitForm || !companySearchActive) return undefined;
    const timeoutId = window.setTimeout(() => loadCompanies(companySearch.trim(), selectedCompanyRef.current), 500);
    return () => window.clearTimeout(timeoutId);
  }, [companySearch, companySearchActive, loadCompanies, showVisitForm]);

  const searchCompaniesNow = () => {
    setCompanySearchActive(false);
    loadCompanies(companySearch.trim(), selectedCompany);
  };
  const selectCompany = (item) => {
    setVisit({ ...visit, companyId: String(item.id), contactPerson: visit.contactPerson || item.contactPerson || '' });
    setCompanySearch(item.companyName);
    setCompanySearchActive(false);
    setCompanySuggestions([]);
  };
  const handleCompanySearchKeyDown = (event) => {
    if (event.target.getAttribute('aria-label') !== 'Search companies' || event.key !== 'Enter') return;
    event.preventDefault();
    event.stopPropagation();
    if (companySuggestions.length) selectCompany(companySuggestions[0]);
    else if (companySearch.trim()) searchCompaniesNow();
  };
  const updateCompanySearch = (value) => {
    setCompanySearch(value);
    setCompanySearchActive(true);
    setCompaniesLoading(true);
    setCompaniesError('');
    setCompanyMatchCount(null);
    setCompanySuggestions([]);
    setCompanies(selectedCompany ? [selectedCompany] : []);
  };

  const applyResult = (value, message) => { setSheet(value); setSummary(value.dailySummary); setSuccess(message); setError(''); setErrors({}); };
  const saveSummary = async () => {
    setBusy('summary'); setError(''); setSuccess('');
    try { applyResult(await agentApi.saveSummary(id, summary), 'Daily declaration saved.'); }
    catch (requestError) { setError(errorMessage(requestError)); } finally { setBusy(''); }
  };
  const editVisit = (item) => { setVisit({ companyId: String(item.companyId), category: item.category || 'Silver', contactPerson: item.contactPerson, purpose: item.purpose, visitNotes: item.visitNotes, checkInTime: item.checkInTime, checkOutTime: item.checkOutTime }); setEditingVisitId(item.id); setShowVisitForm(true); setSuccess(''); window.scrollTo?.({ top: 0, behavior: 'smooth' }); };
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
    try { const created = await agentApi.createCompany(company); companySearchRequest.current += 1; setCompanySearch(created.companyName); setCompanySearchActive(false); setCompanies([created]); setCompanySuggestions([created]); setCompaniesLoading(false); setCompaniesError(''); setCompanyMatchCount(1); setVisit({ ...visit, companyId: String(created.id), contactPerson: created.contactPerson || visit.contactPerson }); setCompany(emptyCompany); setShowCompanyForm(false); setSuccess('Company created and selected.'); }
    catch (requestError) { setErrors(fieldErrors(requestError)); setError(errorMessage(requestError)); } finally { setBusy(''); }
  };
  const submit = async () => {
    if (!window.confirm('Submit this timesheet for review? You can still edit it later, but editing will return it to Draft.')) return;
    setBusy('submit'); setError(''); setSuccess('');
    try { await agentApi.saveSummary(id, summary); applyResult(await agentApi.submitTimesheet(id), 'Timesheet submitted for review.'); }
    catch (requestError) { setError(errorMessage(requestError)); } finally { setBusy(''); }
  };
  const deleteDraft = async () => {
    if (!window.confirm('Delete this draft and all its visits? This cannot be undone.')) return;
    setBusy('delete'); setError(''); setSuccess('');
    try { await agentApi.deleteTimesheet(id); navigate('/timesheets', { replace: true }); }
    catch (requestError) { setError(errorMessage(requestError)); setBusy(''); }
  };

  if (!sheet) return <AppShell><RequestState error={error} label="Loading timesheet…" onRetry={load} /><button className="secondary-button" onClick={() => navigate('/timesheets')}>Back to history</button></AppShell>;

  const summaryReady = summary.trim().length >= 20;
  const submitted = sheet.status !== 'DRAFT';
  return <AppShell>
    <Link className="back-link" to="/timesheets"><ArrowLeft size={16} /> All timesheets</Link>
    <section className="detail-heading"><div><p className="eyebrow">Daily timesheet</p><h1>{formatWorkDate(sheet.workDate)}</h1><p>{sheet.visits.length} {sheet.visits.length === 1 ? 'company visit' : 'company visits'} · {formatDuration({ minutes: sheet.visits.reduce((sum, item) => sum + item.duration.minutes, 0) })}</p></div><StatusBadge status={sheet.status} /></section>
    <ol className="timesheet-progress" aria-label="Timesheet completion"><li className={sheet.visits.length ? 'done' : 'current'}><b>{sheet.visits.length ? '✓' : '1'}</b><span>Add visits</span></li><li className={summaryReady ? 'done' : sheet.visits.length ? 'current' : ''}><b>{summaryReady ? '✓' : '2'}</b><span>Write summary</span></li><li className={submitted ? 'done' : summaryReady ? 'current' : ''}><b>{submitted ? '✓' : '3'}</b><span>Submit</span></li></ol>
    {sheet.reviewComment ? <Alert type="error"><strong>Reviewer feedback:</strong> {sheet.reviewComment}</Alert> : null}
    <Alert>{error}</Alert><Alert type="success">{success}</Alert>

    {showVisitForm ? <section className="content-card form-card section-block">
      <div className="section-heading"><div><p className="eyebrow">{editingVisitId ? 'Edit visit' : 'New visit'}</p><h2>Visit details</h2></div><button className="icon-button" aria-label="Close visit form" onClick={resetVisit}><X /></button></div>
      <form className="business-form" onSubmit={saveVisit} onKeyDownCapture={handleCompanySearchKeyDown}>
        <div className="company-picker"><label className="field"><span>Company</span><div className="search-control"><input aria-label="Search companies" type="search" maxLength="100" placeholder="Search companies" value={companySearch} onChange={(e) => updateCompanySearch(e.target.value)} onKeyDown={(event) => { if (event.key === 'Enter') { event.preventDefault(); searchCompaniesNow(); } }} /><button type="button" className="secondary-button" disabled={companiesLoading} onClick={searchCompaniesNow}>{companiesLoading ? 'Searching…' : 'Search'}</button></div>{companySearch.trim() && companySuggestions.length ? <div className="company-suggestions" role="group" aria-label="Company suggestions">{companySuggestions.slice(0, 5).map((item) => <button type="button" className="company-suggestion" aria-pressed={String(visit.companyId) === String(item.id)} key={item.id} onClick={() => { setVisit({ ...visit, companyId: String(item.id), contactPerson: visit.contactPerson || item.contactPerson || '' }); setCompanySearch(item.companyName); setCompanySearchActive(false); setCompanySuggestions([]); }}><strong>{item.companyName}</strong><small>{item.address}</small></button>)}</div> : null}<select aria-label="Company" required disabled={companiesLoading || companies.length === 0} value={visit.companyId} onChange={(e) => { const value = e.target.value; const selected = companies.find((item) => String(item.id) === value); setVisit({ ...visit, companyId: value, contactPerson: visit.contactPerson || selected?.contactPerson || '' }); }}><option value="">Select a company</option>{companies.map((item) => <option value={item.id} key={item.id}>{item.companyName}{item.reviewStatus === 'PENDING' ? ' (pending review)' : ''}</option>)}</select>{companiesLoading ? <small role="status">Searching available companies…</small> : companiesError ? <small className="field-error" role="alert">{companiesError}</small> : companyMatchCount === 0 ? <small role="status">{companySearch ? `No companies match “${companySearch}”.` : 'No active companies found.'} Add a new company if it is missing.</small> : companyMatchCount !== null ? <small role="status">{companyMatchCount} {companyMatchCount === 1 ? 'company' : 'companies'} found.</small> : null}{errors.companyId ? <small className="field-error">{errors.companyId}</small> : null}</label><button type="button" className="text-action" onClick={() => setShowCompanyForm(!showCompanyForm)}><Plus size={16} /> Add a new company</button></div>
        {selectedCompany ? <p className="selection-note"><Building2 size={16} /> {selectedCompany.address}</p> : null}
        <div className="two-fields"><label className="field"><span>Check-in time (IST)</span><input type="time" required value={visit.checkInTime} onChange={(e) => setVisit({ ...visit, checkInTime: e.target.value })} />{errors.checkInTime ? <small className="field-error">{errors.checkInTime}</small> : null}</label><label className="field"><span>Check-out time (IST)</span><input type="time" required value={visit.checkOutTime} onChange={(e) => setVisit({ ...visit, checkOutTime: e.target.value })} />{errors.checkOutTime ? <small className="field-error">{errors.checkOutTime}</small> : null}</label></div>
        <label className="field"><span>Category</span><select required value={visit.category} onChange={(e) => setVisit({ ...visit, category: e.target.value })}><option value="">Select a category</option><option value="Gold">Gold</option><option value="Silver">Silver</option><option value="Bronze">Bronze</option></select>{errors.category ? <small className="field-error">{errors.category}</small> : null}</label>
        <label className="field"><span>Contact person</span><input required minLength="2" maxLength="120" value={visit.contactPerson} onChange={(e) => setVisit({ ...visit, contactPerson: e.target.value })} /></label>
        <label className="field"><span>Purpose</span><VoiceTextarea required minLength="2" maxLength={500} rows="2" value={visit.purpose} onChange={(e) => setVisit({ ...visit, purpose: e.target.value })} /></label>
        <label className="field"><span>Visit notes</span><VoiceTextarea required minLength="2" maxLength={5000} rows="4" value={visit.visitNotes} onChange={(e) => setVisit({ ...visit, visitNotes: e.target.value })} /></label>
        <div className="form-actions"><button className="secondary-button" type="button" onClick={resetVisit}>Cancel</button><button className="primary-button" disabled={busy === 'visit'}>{busy === 'visit' ? 'Saving…' : editingVisitId ? 'Update visit' : 'Add visit'}</button></div>
      </form>
    </section> : null}

    {showCompanyForm ? <section className="content-card form-card section-block nested-form"><div className="section-heading"><div><p className="eyebrow">Company directory</p><h2>Add a company</h2></div><button className="icon-button" aria-label="Close company form" onClick={() => setShowCompanyForm(false)}><X /></button></div><form className="business-form" onSubmit={createCompany}><label className="field"><span>Company name</span><input required minLength="2" value={company.companyName} onChange={(e) => setCompany({ ...company, companyName: e.target.value })} /></label><label className="field"><span>Address</span><VoiceTextarea required minLength="3" rows="2" value={company.address} onChange={(e) => setCompany({ ...company, address: e.target.value })} /></label><div className="two-fields"><label className="field"><span>Default contact (optional)</span><input value={company.contactPerson} onChange={(e) => setCompany({ ...company, contactPerson: e.target.value })} /></label><label className="field"><span>Phone (optional)</span><input value={company.contactPhone} onChange={(e) => setCompany({ ...company, contactPhone: e.target.value })} /></label></div><label className="field"><span>Notes (optional)</span><VoiceTextarea rows="2" value={company.notes} onChange={(e) => setCompany({ ...company, notes: e.target.value })} /></label><p className="form-help">Companies added by Agents are marked pending for Admin review, but can be used immediately.</p><div className="form-actions"><button className="secondary-button" type="button" onClick={() => setShowCompanyForm(false)}>Cancel</button><button className="primary-button" disabled={busy === 'company'}>{busy === 'company' ? 'Creating…' : 'Create company'}</button></div></form></section> : null}

    <section className="content-card section-block">
      <div className="section-heading"><div><p className="eyebrow">Step 1</p><h2>Company visits</h2></div>{!showVisitForm ? <button className="secondary-button" onClick={() => setShowVisitForm(true)}><Plus size={17} /> Add a visit</button> : null}</div>
      {sheet.visits.length ? <div className="visit-list">{sheet.visits.map((item) => <article className="visit-card" key={item.id}><div className="visit-time"><strong>{item.checkInTime}</strong><span>to</span><strong>{item.checkOutTime}</strong><small>{formatDuration(item.duration)}</small></div><div className="visit-body"><h3>{item.companyName}</h3><small className={`visit-category visit-category-${(item.category || 'Silver').toLowerCase()}`}>{item.category || 'Silver'}</small><p><strong>{item.purpose}</strong></p><p>{item.visitNotes}</p><small>Contact: {item.contactPerson}</small></div><div className="row-actions"><button className="icon-button" aria-label={`Edit visit to ${item.companyName}`} onClick={() => editVisit(item)}><Edit3 /></button><button className="icon-button danger-button" aria-label={`Remove visit to ${item.companyName}`} disabled={busy === `delete-${item.id}`} onClick={() => removeVisit(item.id)}><Trash2 /></button></div></article>)}</div> : <div className="empty-state"><Building2 size={28} /><h3>No visits recorded</h3><p>Add each company visit with its actual check-in and check-out time.</p></div>}
    </section>

    <section className="content-card form-card section-block"><p className="eyebrow">Steps 2 and 3</p><h2>Summary and submission</h2><p className="form-help">In simple words, describe what you completed today. Use at least 20 characters.</p><label className="field"><span>What work did you complete?</span><VoiceTextarea className="timesheet-summary-textarea" rows="5" maxLength={4000} value={summary} onChange={(e) => setSummary(e.target.value)} placeholder="Example: Visited two customers, demonstrated the product, and scheduled a follow-up call." /></label><div className="character-help" aria-live="polite">{summary.length} characters {summaryReady ? '· Ready to submit' : `· ${Math.max(0, 20 - summary.trim().length)} more needed`}</div><div className="form-actions split-actions">{sheet.status === 'DRAFT' ? <button className="secondary-button delete-draft-button" onClick={deleteDraft} disabled={busy === 'delete'}><Trash2 size={17} /> {busy === 'delete' ? 'Deleting…' : 'Delete draft'}</button> : null}<button className="secondary-button" onClick={saveSummary} disabled={busy === 'summary'}><Check size={17} /> {busy === 'summary' ? 'Saving…' : 'Save for later'}</button><button className="primary-button agent-submit" onClick={submit} disabled={busy === 'submit' || submitted || !sheet.visits.length || !summaryReady}><Send size={17} /> {busy === 'submit' ? 'Submitting…' : sheet.status === 'DRAFT' ? 'Submit timesheet' : sheet.status === 'SUBMITTED' ? 'Submitted for review' : 'Edit to resubmit'}</button></div></section>
    {!showVisitForm ? <button className="mobile-quick-action" onClick={() => setShowVisitForm(true)}><Plus /> Add visit</button> : null}
  </AppShell>;
}
