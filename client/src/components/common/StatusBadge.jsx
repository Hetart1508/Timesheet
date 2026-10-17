import { statusLabels } from '../../api/timesheets.js';

export default function StatusBadge({ status }) {
  return <span className={`status-badge status-${status?.toLowerCase()}`}>{statusLabels[status] || status}</span>;
}
