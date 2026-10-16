import { BadgeCheck, Building2, CalendarDays, ShieldCheck } from 'lucide-react';
import AppShell from '../../components/layout/AppShell.jsx';
import { useAuth } from '../../context/AuthContext.jsx';

export default function DashboardPage() {
  const { user } = useAuth(); const admin = user.role === 'ADMIN';
  const items = admin ? [
    { icon: ShieldCheck, title: 'Admin access verified', text: 'Agent and company management arrive in Phase 4.' },
    { icon: CalendarDays, title: 'Review workflow protected', text: 'All review endpoints will require your server-verified Admin role.' },
  ] : [
    { icon: BadgeCheck, title: 'Account verified', text: 'Your secure Agent session is active.' },
    { icon: Building2, title: 'Timesheet workflow next', text: 'Daily timesheets and company visits arrive in Phase 3.' },
  ];
  return <AppShell><section className="workspace-heading"><p className="eyebrow">{admin ? 'Admin workspace' : 'Agent workspace'}</p><h1>Welcome, {user.fullName}</h1><p>Your authenticated workspace is ready. No business metrics are shown until they come from real database records.</p></section><section className="status-grid">{items.map(({ icon: Icon, title, text }) => <article className="status-card" key={title}><span className="card-icon"><Icon size={20} /></span><h2>{title}</h2><p>{text}</p></article>)}</section></AppShell>;
}
