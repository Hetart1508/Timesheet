import { ArrowLeft } from 'lucide-react';
import { Link, useParams } from 'react-router-dom';
import AppShell from '../../components/layout/AppShell.jsx';
import TimesheetReviewContent from './TimesheetReviewContent.jsx';

export default function AdminReviewPage() {
  const { id } = useParams();
  return <AppShell>
    <Link className="back-link" to="/admin/timesheets"><ArrowLeft size={16} /> All timesheets</Link>
    <TimesheetReviewContent id={id} />
  </AppShell>;
}
