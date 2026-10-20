import { useEffect, useRef, useState } from 'react';
import { AlertTriangle, CheckCircle2, Download, FileSpreadsheet, Mail, RefreshCw, Upload, X } from 'lucide-react';
import Alert from '../../components/common/Alert.jsx';
import RequestState from '../../components/common/RequestState.jsx';
import { adminApi } from '../../api/admin.js';
import { errorMessage } from '../../api/client.js';
import { formatBusinessDateTime } from '../../utils/business-time.js';

const saveBlob = (response, fileName) => {
  const url = URL.createObjectURL(response.data);
  const link = document.createElement('a'); link.href = url; link.download = fileName; link.click();
  URL.revokeObjectURL(url);
};

export default function AgentImportPanel() {
  const inputRef = useRef(null);
  const [file, setFile] = useState(null);
  const [preview, setPreview] = useState(null);
  const [invitations, setInvitations] = useState(null);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [busy, setBusy] = useState('');

  const loadInvitations = () => adminApi.agentInvitations().then(setInvitations).catch((err) => setError(errorMessage(err)));
  useEffect(() => { loadInvitations(); }, []);

  const chooseFile = (event) => {
    const selected = event.target.files?.[0] || null;
    setError(''); setSuccess(''); setPreview(null);
    if (selected && !selected.name.toLowerCase().endsWith('.xlsx')) { setFile(null); setError('Choose an Excel .xlsx file.'); return; }
    if (selected && selected.size > 5 * 1024 * 1024) { setFile(null); setError('The Excel file must be 5 MB or smaller.'); return; }
    setFile(selected);
  };
  const clearFile = () => { setFile(null); setPreview(null); if (inputRef.current) inputRef.current.value = ''; };
  const downloadTemplate = async () => {
    setBusy('template'); setError('');
    try { saveBlob(await adminApi.downloadAgentImportTemplate(), 'agent-invitation-template.xlsx'); }
    catch (err) { setError(errorMessage(err)); }
    finally { setBusy(''); }
  };
  const previewFile = async () => {
    if (!file) return;
    setBusy('preview'); setError(''); setSuccess('');
    try { setPreview(await adminApi.previewAgentImport(file)); }
    catch (err) { setPreview(null); setError(errorMessage(err)); }
    finally { setBusy(''); }
  };
  const importFile = async () => {
    if (!file || preview?.summary.errorRows) return;
    if (!window.confirm(`Create ${preview.summary.totalRows} Agent invitations and email each person a setup link?`)) return;
    setBusy('import'); setError('');
    try {
      const result = await adminApi.commitAgentImport(file);
      setSuccess(`Import #${result.importId} created ${result.totalRows} invitations. ${result.sentCount} emails sent; ${result.failedCount} failed.`);
      clearFile(); await loadInvitations();
    } catch (err) { setError(errorMessage(err)); }
    finally { setBusy(''); }
  };
  const resend = async (invitation) => {
    setBusy(`resend-${invitation.id}`); setError(''); setSuccess('');
    try {
      const result = await adminApi.resendAgentInvitation(invitation.id);
      setSuccess(result.status === 'SENT' ? `Invitation sent to ${invitation.email}.` : `The invitation email to ${invitation.email} could not be sent.`);
      await loadInvitations();
    } catch (err) { setError(errorMessage(err)); }
    finally { setBusy(''); }
  };

  return <>
    <Alert>{error}</Alert><Alert type="success">{success}</Alert>
    <section className="content-card section-block">
      <div className="section-heading"><div><p className="eyebrow">Agent onboarding</p><h2>Invite Agents from Excel</h2></div><button className="secondary-button" type="button" disabled={Boolean(busy)} onClick={downloadTemplate}><Download size={17} /> {busy === 'template' ? 'Preparing…' : 'Download template'}</button></div>
      <p>Use one row per Agent with <strong>Full Name</strong> and <strong>Email</strong>. Each person receives a one-time setup link, valid for 7 days, to choose a password. Usernames are generated automatically.</p>
      <label className="excel-drop-zone"><FileSpreadsheet size={30} /><strong>{file ? file.name : 'Choose an Excel workbook'}</strong><span>{file ? `${(file.size / 1024).toFixed(1)} KB` : '.xlsx only · maximum 5 MB · maximum 2,000 Agents'}</span><input ref={inputRef} type="file" accept=".xlsx,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" onChange={chooseFile} /></label>
      <div className="import-actions">{file ? <button className="text-action" type="button" disabled={Boolean(busy)} onClick={clearFile}><X size={17} /> Remove file</button> : null}<button className="primary-button" type="button" disabled={!file || Boolean(busy)} onClick={previewFile}><Upload size={17} /> {busy === 'preview' ? 'Checking…' : 'Preview and validate'}</button></div>
    </section>
    {preview ? <section className="content-card section-block">
      <div className="section-heading"><div><p className="eyebrow">Review before sending</p><h2>Agent import preview</h2></div></div>
      <div className="metric-grid import-metrics"><article className="metric-card"><FileSpreadsheet /><span>Rows</span><strong>{preview.summary.totalRows}</strong></article><article className="metric-card"><CheckCircle2 /><span>Valid</span><strong>{preview.summary.validRows}</strong></article><article className="metric-card"><AlertTriangle /><span>Errors</span><strong>{preview.summary.errorRows}</strong></article></div>
      <div className="table-wrap"><table className="data-table import-preview-table"><thead><tr><th>Row</th><th>Full Name</th><th>Email</th><th>Validation</th></tr></thead><tbody>{preview.rows.map((row) => <tr key={row.rowNumber}><td data-label="Row">{row.rowNumber}</td><td data-label="Full Name">{row.fullName || '—'}</td><td data-label="Email">{row.email || '—'}</td><td data-label="Validation">{row.errors.length ? <ul className="import-errors">{row.errors.map((message) => <li key={message}>{message}</li>)}</ul> : <span className="import-valid"><CheckCircle2 size={16} /> Ready</span>}</td></tr>)}</tbody></table></div>
      <div className="import-commit"><p>{preview.summary.errorRows ? 'Correct invalid rows and preview the workbook again.' : 'Each valid row will be saved as a pending invitation before email is sent.'}</p><button className="primary-button" type="button" disabled={Boolean(busy) || preview.summary.errorRows > 0} onClick={importFile}><Mail size={17} /> {busy === 'import' ? 'Importing…' : 'Import and send setup links'}</button></div>
    </section> : null}
    <section className="content-card section-block">
      <div className="section-heading"><div><p className="eyebrow">Delivery status</p><h2>Pending invitations</h2></div><button className="icon-button" type="button" aria-label="Refresh invitations" onClick={loadInvitations}><RefreshCw size={17} /></button></div>
      {!invitations ? <RequestState error={error} label="Loading invitations…" onRetry={loadInvitations} /> : invitations.length ? <div className="table-wrap"><table className="data-table"><thead><tr><th>Agent</th><th>Email</th><th>Status</th><th>Expires</th><th /></tr></thead><tbody>{invitations.map((invitation) => <tr key={invitation.id}><td data-label="Agent">{invitation.fullName}</td><td data-label="Email">{invitation.email}</td><td data-label="Status"><span className={`account-status ${invitation.status.toLowerCase()}`}>{invitation.status}</span></td><td data-label="Expires">{formatBusinessDateTime(invitation.expiresAt)}</td><td data-label="Action"><button className="table-action" type="button" disabled={Boolean(busy)} onClick={() => resend(invitation)}>{busy === `resend-${invitation.id}` ? 'Sending…' : 'Resend link'}</button></td></tr>)}</tbody></table></div> : <div className="empty-state"><Mail /><h3>No pending invitations</h3></div>}
    </section>
  </>;
}