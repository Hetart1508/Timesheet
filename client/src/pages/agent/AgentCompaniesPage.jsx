import { useCallback, useEffect, useState } from 'react';
import { Building2, Pencil, Plus, Search, Trash2, X } from 'lucide-react';
import AppShell from '../../components/layout/AppShell.jsx';
import Alert from '../../components/common/Alert.jsx';
import RequestState from '../../components/common/RequestState.jsx';
import { agentApi } from '../../api/timesheets.js';
import { errorMessage } from '../../api/client.js';

const emptyCompany = { companyName: '', address: '', contactPerson: '', contactPhone: '', notes: '' };

export default function AgentCompaniesPage() {
  const [search, setSearch] = useState('');
  const [applied, setApplied] = useState('');
  const [result, setResult] = useState(null);
  const [loadError, setLoadError] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(emptyCompany);
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    setResult(null);
    setLoadError('');
    try { setResult(await agentApi.listMyCompanies({ search: applied, pageSize: 50 })); }
    catch (requestError) { setLoadError(errorMessage(requestError)); }
  }, [applied]);
  useEffect(() => { load(); }, [load]);

  const beginCreate = () => { setEditing(null); setForm(emptyCompany); setError(''); setSuccess(''); };
  const beginEdit = (company) => {
    setEditing(company.id);
    setForm({ companyName: company.companyName, address: company.address, contactPerson: company.contactPerson, contactPhone: company.contactPhone, notes: company.notes });
    setError('');
    setSuccess('');
    window.scrollTo?.({ top: 0, behavior: 'smooth' });
  };
  const submit = async (event) => {
    event.preventDefault();
    setBusy(true); setError(''); setSuccess('');
    try {
      if (editing) await agentApi.updateCompany(editing, form);
      else await agentApi.createCompany(form);
      setSuccess(editing ? 'Company details updated.' : 'Company submitted for Admin review.');
      setEditing(null); setForm(emptyCompany);
      await load();
    } catch (requestError) { setError(errorMessage(requestError)); }
    finally { setBusy(false); }
  };
  const remove = async (company) => {
    if (!window.confirm(`Delete ${company.companyName}? Its timesheet history will be retained.`)) return;
    setError(''); setSuccess('');
    try {
      await agentApi.deleteCompany(company.id);
      setSuccess('Company removed from the active directory.');
      await load();
    } catch (requestError) { setError(errorMessage(requestError)); }
  };

  return <AppShell>
    <section className="workspace-heading"><p className="eyebrow">Company directory</p><h1>Your companies</h1><p>Create and maintain your company submissions. Admin-approved entries are shared and become read-only.</p></section>
    <Alert>{error}</Alert>
    <Alert type="success">{success}</Alert>
    <section className="content-card form-card section-block">
      <div className="section-heading"><div><p className="eyebrow">{editing ? 'Edit submission' : 'New submission'}</p><h2>{editing ? 'Update company details' : 'Add a company'}</h2></div>{editing ? <button className="icon-button" aria-label="Cancel company edit" onClick={beginCreate}><X /></button> : null}</div>
      <form className="business-form" onSubmit={submit}>
        <label className="field"><span>Company name</span><input required minLength="2" maxLength="180" value={form.companyName} onChange={(event) => setForm({ ...form, companyName: event.target.value })} /></label>
        <label className="field"><span>Address</span><textarea required minLength="3" maxLength="500" rows="2" value={form.address} onChange={(event) => setForm({ ...form, address: event.target.value })} /></label>
        <div className="two-fields"><label className="field"><span>Contact person</span><input maxLength="120" value={form.contactPerson} onChange={(event) => setForm({ ...form, contactPerson: event.target.value })} /></label><label className="field"><span>Contact phone</span><input maxLength="30" value={form.contactPhone} onChange={(event) => setForm({ ...form, contactPhone: event.target.value })} /></label></div>
        <label className="field"><span>Notes</span><textarea maxLength="2000" rows="3" value={form.notes} onChange={(event) => setForm({ ...form, notes: event.target.value })} /></label>
        {!editing ? <p className="form-help">New submissions are available for your visits immediately and remain pending until an Admin reviews them.</p> : null}
        <div className="form-actions"><button className="primary-button" disabled={busy}>{busy ? 'Saving…' : editing ? <><Pencil size={16} /> Save changes</> : <><Plus size={16} /> Create company</>}</button></div>
      </form>
    </section>
    <section className="content-card section-block">
      <div className="section-heading"><div><p className="eyebrow">Owned records</p><h2>Company submissions</h2></div></div>
      <form className="search-bar" onSubmit={(event) => { event.preventDefault(); setApplied(search); }}><input aria-label="Search your companies" value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search company name" /><button className="secondary-button"><Search size={16} /> Search</button></form>
      {!result ? <RequestState error={loadError} label="Loading your companies…" onRetry={load} /> : result.companies.length ? <div className="company-admin-grid">{result.companies.map((company) => {
        const editable = company.reviewStatus === 'PENDING' && company.status === 'ACTIVE';
        return <article className="company-admin-card" key={company.id}><div><span className={`account-status ${company.reviewStatus.toLowerCase()}`}>{company.reviewStatus}</span><span className={`account-status ${company.status.toLowerCase()}`}>{company.status}</span></div><Building2 /><h3>{company.companyName}</h3><p>{company.address}</p>{company.contactPerson ? <p>Contact: {company.contactPerson}</p> : null}<div className="row-actions">{editable ? <><button className="table-action" onClick={() => beginEdit(company)}><Pencil size={15} /> Edit</button><button className="table-danger" onClick={() => remove(company)}><Trash2 size={15} /> Delete</button></> : <small>{company.status === 'INACTIVE' ? 'Removed from the active directory' : 'Approved entries are managed by an Admin'}</small>}</div></article>;
      })}</div> : <div className="empty-state"><Building2 /><h3>No company submissions</h3><p>Create a company to use it in a timesheet.</p></div>}
    </section>
  </AppShell>;
}