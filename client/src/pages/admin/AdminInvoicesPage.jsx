import { useEffect, useState } from 'react';
import { Download, FileText } from 'lucide-react';
import AppShell from '../../components/layout/AppShell.jsx';
import Alert from '../../components/common/Alert.jsx';
import RequestState from '../../components/common/RequestState.jsx';
import { adminApi } from '../../api/admin.js';
import { errorMessage } from '../../api/client.js';
import { currentBusinessDate } from '../../utils/business-time.js';

const rates = [
  { category: 'Gold', amount: 'INR 1,000' },
  { category: 'Silver', amount: 'INR 800' },
  { category: 'Bronze', amount: 'INR 600' },
];

async function downloadErrorMessage(error) {
  const body = error.response?.data;
  if (typeof Blob !== 'undefined' && body instanceof Blob) {
    try { return JSON.parse(await body.text()).message || errorMessage(error); }
    catch { return errorMessage(error); }
  }
  return errorMessage(error);
}

export default function AdminInvoicesPage() {
  const [agents, setAgents] = useState([]);
  const [agentsLoading, setAgentsLoading] = useState(true);
  const [agentError, setAgentError] = useState('');
  const [agentId, setAgentId] = useState('');
  const [month, setMonth] = useState(() => currentBusinessDate().slice(0, 7));
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const loadAgents = async () => {
    setAgentsLoading(true); setAgentError('');
    try {
      const result = await adminApi.listAgents({ pageSize: 100 });
      setAgents(result.agents);
    } catch (requestError) { setAgentError(errorMessage(requestError)); }
    finally { setAgentsLoading(false); }
  };
  useEffect(() => { loadAgents(); }, []);

  const generate = async (event) => {
    event.preventDefault();
    if (!agentId || !month) return;
    setBusy(true); setError(''); setSuccess('');
    try {
      const response = await adminApi.downloadInvoice(agentId, month);
      const url = URL.createObjectURL(response.data);
      const anchor = document.createElement('a');
      anchor.href = url;
      anchor.download = `agent_invoice_${agentId}_${month}.pdf`;
      document.body.appendChild(anchor); anchor.click(); anchor.remove(); URL.revokeObjectURL(url);
      setSuccess(`Invoice PDF generated for ${agents.find((agent) => String(agent.id) === agentId)?.fullName || 'the selected Agent'} (${month}).`);
    } catch (requestError) { setError(await downloadErrorMessage(requestError)); }
    finally { setBusy(false); }
  };

  return <AppShell>
    <section className="workspace-heading"><p className="eyebrow">Admin billing</p><h1>Agent invoices</h1><p>Generate a monthly visit invoice for one Agent.</p></section>
    <section className="content-card form-card section-block">
      <Alert>{error}</Alert>
      <Alert type="success">{success}</Alert>
      {agentError ? <Alert>Could not load Agents. <button className="text-action" type="button" onClick={loadAgents}>Retry</button></Alert> : null}
      {!agentError && agentsLoading ? <RequestState label="Loading Agents…" /> : <form className="business-form" onSubmit={generate}>
        <div className="two-fields">
          <label className="field"><span>Agent</span><select required value={agentId} onChange={(event) => setAgentId(event.target.value)} disabled={agentsLoading}><option value="">Select an Agent</option>{agents.map((agent) => <option value={agent.id} key={agent.id}>{agent.fullName} · {agent.email}</option>)}</select></label>
          <label className="field"><span>Invoice month</span><input aria-label="Invoice month" type="month" required value={month} onChange={(event) => setMonth(event.target.value)} /></label>
        </div>
        <div className="invoice-rate-table"><div className="section-heading"><div><p className="eyebrow">Visit rates</p><h2>Monthly calculation</h2></div></div><table className="data-table"><thead><tr><th>Visit category</th><th>Rate per approved visit</th></tr></thead><tbody>{rates.map((rate) => <tr key={rate.category}><td><strong>{rate.category}</strong></td><td>{rate.amount}</td></tr>)}</tbody></table><p className="form-help">Only approved, non-deleted visits for the selected month are included. No additional tax is added.</p></div>
        <div className="form-actions"><button className="primary-button" disabled={busy || !agentId || agentsLoading}><Download size={17} /> {busy ? 'Generating PDF…' : 'Generate invoice PDF'}</button></div>
      </form>}
    </section>
  </AppShell>;
}