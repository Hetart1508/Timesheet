import { useEffect, useRef, useState } from 'react';
import { AlertTriangle, CheckCircle2, Download, FileSpreadsheet, Upload, X } from 'lucide-react';
import AppShell from '../../components/layout/AppShell.jsx';
import Alert from '../../components/common/Alert.jsx';
import RequestState from '../../components/common/RequestState.jsx';
import { adminApi } from '../../api/admin.js';
import { errorMessage } from '../../api/client.js';
import { formatBusinessDateTime } from '../../utils/business-time.js';
import AgentImportPanel from './AgentImportPanel.jsx';

const saveBlob = (response, fileName) => {
  const url = URL.createObjectURL(response.data);
  const link = document.createElement('a'); link.href = url; link.download = fileName; link.click();
  URL.revokeObjectURL(url);
};

export default function AdminImportPage() {
  const inputRef = useRef(null);
  const [file, setFile] = useState(null);
  const [preview, setPreview] = useState(null);
  const [history, setHistory] = useState(null);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [busy, setBusy] = useState('');
  const [mode, setMode] = useState('timesheets');
  const loadHistory = () => adminApi.importHistory().then(setHistory).catch((err) => setError(errorMessage(err)));
  useEffect(() => { loadHistory(); }, []);

  const chooseFile = (event) => {
    const selected = event.target.files?.[0] || null;
    setError(''); setSuccess(''); setPreview(null);
    if (selected && !selected.name.toLowerCase().endsWith('.xlsx')) { setFile(null); setError('Choose an Excel .xlsx file.'); return; }
    if (selected && selected.size > 5 * 1024 * 1024) { setFile(null); setError('The Excel file must be 5 MB or smaller.'); return; }
    setFile(selected);
  };
  const clearFile = () => { setFile(null); setPreview(null); setError(''); if (inputRef.current) inputRef.current.value = ''; };
  const downloadTemplate = async () => { setBusy('template'); setError(''); try { saveBlob(await adminApi.downloadImportTemplate(), 'timesheet-import-template.xlsx'); } catch (err) { setError(errorMessage(err)); } finally { setBusy(''); } };
  const previewFile = async () => { if (!file) return; setBusy('preview'); setError(''); setSuccess(''); try { setPreview(await adminApi.previewImport(file)); } catch (err) { setPreview(null); setError(errorMessage(err)); } finally { setBusy(''); } };
  const importFile = async () => {
    if (!file || preview?.summary.errorRows) return;
    if (!window.confirm(`Import ${preview.summary.totalRows} visit rows into the live database?`)) return;
    setBusy('import'); setError('');
    try {
      const result = await adminApi.commitImport(file);
      setSuccess(`Import #${result.importId} completed: ${result.timesheetCount} timesheets and ${result.visitCount} visits added.`);
      clearFile(); await loadHistory();
    } catch (err) { setError(errorMessage(err)); } finally { setBusy(''); }
  };

  return <AppShell>
    <section className="workspace-heading"><p className="eyebrow">Database tools</p><h1>Excel data import</h1><p>Import historical work or invite Agents to set up their accounts.</p></section>
    <div className="tab-bar" role="tablist" aria-label="Excel import type"><button type="button" role="tab" aria-selected={mode === 'timesheets'} className={mode === 'timesheets' ? 'active' : ''} onClick={() => setMode('timesheets')}>Timesheet visits</button><button type="button" role="tab" aria-selected={mode === 'agents'} className={mode === 'agents' ? 'active' : ''} onClick={() => setMode('agents')}>Invite Agents</button></div>
    {mode === 'agents' ? <AgentImportPanel /> : <>
    <Alert>{error}</Alert><Alert type="success">{success}</Alert>
    <section className="content-card section-block import-guide"><div className="section-heading"><div><p className="eyebrow">Step 1</p><h2>Prepare the workbook</h2></div><button className="secondary-button" type="button" disabled={Boolean(busy)} onClick={downloadTemplate}><Download size={17} /> {busy === 'template' ? 'Preparing…' : 'Download template'}</button></div>
      <p>Use one row per visit. Agent accounts must already exist. Missing companies are created when their address is supplied.</p>
      <div className="import-columns"><span>Agent Email</span><span>Work Date</span><span>Status</span><span>Company</span><span>Visit times</span><span>Purpose and notes</span></div>
    </section>
    <section className="content-card section-block"><div className="section-heading"><div><p className="eyebrow">Step 2</p><h2>Upload and preview</h2></div></div>
      <label className="excel-drop-zone"><FileSpreadsheet size={30} /><strong>{file ? file.name : 'Choose an Excel workbook'}</strong><span>{file ? `${(file.size / 1024).toFixed(1)} KB` : '.xlsx only · maximum 5 MB · maximum 2,000 rows'}</span><input ref={inputRef} type="file" accept=".xlsx,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" onChange={chooseFile} /></label>
      <div className="import-actions">{file ? <button className="text-action" type="button" disabled={Boolean(busy)} onClick={clearFile}><X size={17} /> Remove file</button> : null}<button className="primary-button" type="button" disabled={!file || Boolean(busy)} onClick={previewFile}><Upload size={17} /> {busy === 'preview' ? 'Checking…' : 'Preview and validate'}</button></div>
    </section>
    {preview ? <section className="content-card section-block"><div className="section-heading"><div><p className="eyebrow">Step 3</p><h2>Review validation</h2></div></div>
      <div className="metric-grid import-metrics"><article className="metric-card"><FileSpreadsheet /><span>Rows</span><strong>{preview.summary.totalRows}</strong></article><article className="metric-card"><CheckCircle2 /><span>Valid</span><strong>{preview.summary.validRows}</strong></article><article className="metric-card"><AlertTriangle /><span>Errors</span><strong>{preview.summary.errorRows}</strong></article><article className="metric-card"><FileSpreadsheet /><span>Timesheets</span><strong>{preview.summary.timesheets}</strong></article></div>
      <div className="table-wrap"><table className="data-table import-preview-table"><thead><tr><th>Row</th><th>Agent</th><th>Date</th><th>Company</th><th>Status</th><th>Validation</th></tr></thead><tbody>{preview.rows.map((row) => <tr key={row.rowNumber}><td data-label="Row">{row.rowNumber}</td><td data-label="Agent">{row.agentEmail}</td><td data-label="Date">{row.workDate ? row.workDate.split('-').reverse().join('/') : '—'}</td><td data-label="Company">{row.companyName || '—'}</td><td data-label="Status">{row.status}</td><td data-label="Validation">{row.errors.length ? <ul className="import-errors">{row.errors.map((message) => <li key={message}>{message}</li>)}</ul> : <span className="import-valid"><CheckCircle2 size={16} /> Ready</span>}</td></tr>)}</tbody></table></div>
      <div className="import-commit"><p>{preview.summary.errorRows ? 'Correct every invalid row and preview the file again.' : `${preview.summary.companiesToCreate} new companies will be created. The import will run as one database transaction.`}</p><button className="primary-button" type="button" disabled={Boolean(busy) || preview.summary.errorRows > 0} onClick={importFile}>{busy === 'import' ? 'Importing…' : 'Import into database'}</button></div>
    </section> : null}
    <section className="content-card section-block"><div className="section-heading"><div><p className="eyebrow">Audit trail</p><h2>Recent imports</h2></div></div>{!history ? <RequestState label="Loading import history…" onRetry={loadHistory} /> : history.length ? <div className="table-wrap"><table className="data-table"><thead><tr><th>File</th><th>Imported by</th><th>Imported</th><th>Timesheets</th><th>Visits</th><th>Companies</th></tr></thead><tbody>{history.map((item) => <tr key={item.id}><td data-label="File"><strong>{item.fileName}</strong><small>Import #{item.id}</small></td><td data-label="Imported by">{item.importedBy}</td><td data-label="Imported">{formatBusinessDateTime(item.createdAt)}</td><td data-label="Timesheets">{item.timesheetCount}</td><td data-label="Visits">{item.visitCount}</td><td data-label="Companies">{item.companyCount}</td></tr>)}</tbody></table></div> : <div className="empty-state"><FileSpreadsheet /><h3>No imports yet</h3><p>Completed Excel imports will appear here.</p></div>}</section>
    </>}
  </AppShell>;
}
