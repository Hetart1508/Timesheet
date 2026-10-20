import { useEffect, useState } from 'react';
import { Building2, CheckCircle2, Pencil, Plus, Search, Trash2, X } from 'lucide-react';
import AppShell from '../../components/layout/AppShell.jsx';
import Alert from '../../components/common/Alert.jsx';
import RequestState from '../../components/common/RequestState.jsx';
import VoiceTextarea from '../../components/forms/VoiceTextarea.jsx';
import { adminApi } from '../../api/admin.js';
import { errorMessage } from '../../api/client.js';
import useDebouncedValue from '../../hooks/useDebouncedValue.js';

export default function AdminCompaniesPage() {
  const emptyCompany = { companyName: '', address: '', contactPerson: '', contactPhone: '', notes: '' };
  const [filters, setFilters] = useState({ search: '', reviewStatus: '', status: '' }); const [applied, setApplied] = useState(filters); const [result, setResult] = useState(null); const [error, setError] = useState(''); const [loadError, setLoadError] = useState(''); const [success, setSuccess] = useState('');
  const [formOpen, setFormOpen] = useState(false); const [editing, setEditing] = useState(null); const [form, setForm] = useState(emptyCompany); const [busy, setBusy] = useState(false);
  const debouncedSearch = useDebouncedValue(filters.search, 500);
  const load = () => { setResult(null); setLoadError(''); const params = Object.fromEntries(Object.entries({ ...applied, pageSize: 100 }).filter(([, value]) => value !== '')); return adminApi.listCompanies(params).then(setResult).catch((err) => setLoadError(errorMessage(err))); };
  useEffect(() => { load(); }, [applied]);
  useEffect(() => { setApplied((current) => current.search === debouncedSearch ? current : { ...current, search: debouncedSearch, page: 1 }); }, [debouncedSearch]);
  const beginCreate = () => { setEditing(null); setForm(emptyCompany); setFormOpen(true); setError(''); setSuccess(''); };
  const beginEdit = (company) => { setEditing(company.id); setForm({ companyName: company.companyName, address: company.address, contactPerson: company.contactPerson, contactPhone: company.contactPhone, notes: company.notes }); setFormOpen(true); setError(''); setSuccess(''); window.scrollTo?.({ top: 0, behavior: 'smooth' }); };
  const submit = async (event) => {
    event.preventDefault(); setBusy(true); setError(''); setSuccess('');
    try {
      if (editing) await adminApi.updateCompanyDetails(editing, form);
      else await adminApi.createCompany(form);
      setSuccess(editing ? 'Company details updated.' : 'Company created and approved.');
      setFormOpen(false); setEditing(null); setForm(emptyCompany);
      await load();
    } catch (requestError) { setError(errorMessage(requestError)); }
    finally { setBusy(false); }
  };
  const updateStatus = async (company, changes) => {
    const action = changes.reviewStatus ? 'Approve' : changes.status === 'INACTIVE' ? 'Deactivate' : 'Reactivate';
    if (!window.confirm(`${action} ${company.companyName}?`)) return;
    setError(''); setSuccess('');
    try { await adminApi.updateCompany(company.id, changes); setSuccess('Company directory updated.'); await load(); }
    catch (requestError) { setError(errorMessage(requestError)); }
  };
  const remove = async (company) => {
    if (!window.confirm(`Delete ${company.companyName}? Its visit history will be retained.`)) return;
    setError(''); setSuccess('');
    try { await adminApi.deleteCompany(company.id); setSuccess('Company removed from the active directory.'); await load(); }
    catch (requestError) { setError(errorMessage(requestError)); }
  };

  return <AppShell>
    <section className="workspace-heading"><p className="eyebrow">Directory administration</p><h1>Companies</h1><p>Create and maintain the shared directory, review Agent submissions, and control availability.</p></section>
    <Alert>{error}</Alert><Alert type="success">{success}</Alert>
    {formOpen ? <section className="content-card form-card section-block"><div className="section-heading"><div><p className="eyebrow">{editing ? 'Company details' : 'Directory entry'}</p><h2>{editing ? 'Edit company' : 'Add a company'}</h2></div><button className="icon-button" aria-label="Close company form" onClick={() => setFormOpen(false)}><X /></button></div><form className="business-form" onSubmit={submit}><label className="field"><span>Company name</span><input required minLength="2" maxLength="180" value={form.companyName} onChange={(event) => setForm({ ...form, companyName: event.target.value })} /></label><label className="field"><span>Address</span><VoiceTextarea required minLength="3" maxLength={500} rows="2" value={form.address} onChange={(event) => setForm({ ...form, address: event.target.value })} /></label><div className="two-fields"><label className="field"><span>Contact person</span><input maxLength="120" value={form.contactPerson} onChange={(event) => setForm({ ...form, contactPerson: event.target.value })} /></label><label className="field"><span>Contact phone</span><input maxLength="30" value={form.contactPhone} onChange={(event) => setForm({ ...form, contactPhone: event.target.value })} /></label></div><label className="field"><span>Notes</span><VoiceTextarea maxLength={2000} rows="3" value={form.notes} onChange={(event) => setForm({ ...form, notes: event.target.value })} /></label><div className="form-actions"><button className="secondary-button" type="button" onClick={() => setFormOpen(false)}>Cancel</button><button className="primary-button" disabled={busy}>{busy ? 'Saving…' : editing ? 'Save changes' : 'Create company'}</button></div></form></section> : <div className="section-block"><button className="primary-button" onClick={beginCreate}><Plus size={16} /> Add company</button></div>}
    <section className="content-card section-block">
      <div className="filter-bar admin-company-filter"><label className="admin-search-field"><Search size={17} /><input type="search" aria-label="Search companies" value={filters.search} onChange={(event) => setFilters({ ...filters, search: event.target.value })} placeholder="Search company name" /></label><label><span>Review status</span><select value={filters.reviewStatus} onChange={(event) => { const reviewStatus = event.target.value; setFilters({ ...filters, reviewStatus }); setApplied((current) => ({ ...current, reviewStatus, page: 1 })); }}><option value="">All review states</option><option value="PENDING">Pending review</option><option value="APPROVED">Approved</option></select></label><label><span>Availability</span><select value={filters.status} onChange={(event) => { const status = event.target.value; setFilters({ ...filters, status }); setApplied((current) => ({ ...current, status, page: 1 })); }}><option value="">All</option><option value="ACTIVE">Active</option><option value="INACTIVE">Inactive</option></select></label></div>
      {!result ? <RequestState error={loadError} label="Loading companies…" onRetry={load} /> : result.companies.length ? <div className="company-admin-grid">{result.companies.map((company) => <article className="company-admin-card" key={company.id}><div><span className={`account-status ${company.reviewStatus.toLowerCase()}`}>{company.reviewStatus}</span><span className={`account-status ${company.status.toLowerCase()}`}>{company.status}</span></div><Building2 /><h3>{company.companyName}</h3><p>{company.address}</p><small>Created by {company.creatorName} · {company.visitCount} visits</small><div className="row-actions">{company.reviewStatus === 'PENDING' && company.status === 'ACTIVE' ? <button className="table-action" onClick={() => updateStatus(company, { reviewStatus: 'APPROVED' })}><CheckCircle2 size={15} /> Approve</button> : null}<button className="table-action" onClick={() => beginEdit(company)}><Pencil size={15} /> Edit</button>{company.status === 'ACTIVE' ? <button className="table-danger" onClick={() => remove(company)}><Trash2 size={15} /> Delete</button> : <button className="table-action" onClick={() => updateStatus(company, { status: 'ACTIVE' })}>Reactivate</button>}</div></article>)}</div> : <div className="empty-state"><Building2 /><h3>No companies found</h3></div>}
    </section>
  </AppShell>;
}
