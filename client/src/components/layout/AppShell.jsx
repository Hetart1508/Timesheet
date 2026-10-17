import { useEffect, useRef, useState } from 'react';
import { BarChart3, Building2, CalendarDays, Clock3, Download, FileCheck2, History, LayoutDashboard, LogOut, Menu, ShieldCheck, UserRound, Users, X } from 'lucide-react';
import { Link, NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext.jsx';

const agentLinks = [
  ['/dashboard', 'Home', LayoutDashboard], ['/timesheets', 'Timesheets', History],
  ['/companies', 'Companies', Building2], ['/profile', 'Account & security', UserRound],
];
const adminLinks = [
  ['/dashboard', 'Home', LayoutDashboard], ['/admin/timesheets?status=SUBMITTED', 'Reviews', FileCheck2],
  ['/admin/timesheets', 'Timesheets', CalendarDays], ['/admin/agents', 'Agents', Users],
  ['/admin/companies', 'Companies', Building2], ['/admin/analytics', 'Reports', BarChart3],
  ['/admin/exports', 'Exports', Download], ['/admin/audits', 'Audit log', ShieldCheck], ['/profile', 'Account & security', UserRound],
];

export default function AppShell({ children }) {
  const { user, logout } = useAuth(); const navigate = useNavigate(); const [open, setOpen] = useState(false);
  const menuButtonRef = useRef(null); const closeButtonRef = useRef(null);
  const links = user.role === 'ADMIN' ? adminLinks : agentLinks;
  const signOut = async () => { await logout(); navigate('/login', { replace: true }); };
  const closeNavigation = () => { setOpen(false); menuButtonRef.current?.focus(); };
  useEffect(() => {
    if (!open) return undefined;
    const closeOnEscape = (event) => { if (event.key === 'Escape') closeNavigation(); };
    window.addEventListener('keydown', closeOnEscape);
    closeButtonRef.current?.focus();
    return () => window.removeEventListener('keydown', closeOnEscape);
  }, [open]);
  return <div className="app-shell"><a className="skip-link" href="#main-content">Skip to content</a><header className="topbar"><Link className="brand" to="/dashboard"><span className="brand-mark"><Clock3 size={21} /></span><span>Timesheet</span></Link><div className="topbar-account"><span><small>{user.role === 'ADMIN' ? 'Administrator' : 'Agent'}</small>{user.fullName}</span><Link aria-label="Account settings" to="/profile"><UserRound /></Link><button className="text-button" onClick={signOut}><LogOut /> <span>Sign out</span></button><button ref={menuButtonRef} className="mobile-menu" aria-label="Open navigation" aria-expanded={open} aria-controls="app-navigation" onClick={() => setOpen(true)}><Menu /></button></div></header>{open ? <button className="sidebar-backdrop" aria-label="Dismiss navigation" onClick={closeNavigation} /> : null}<div className="shell-body"><aside id="app-navigation" className={`sidebar ${open ? 'open' : ''}`}><div className="sidebar-mobile-head"><strong>Menu</strong><button ref={closeButtonRef} className="icon-button" aria-label="Close navigation" onClick={closeNavigation}><X /></button></div><p>{user.role === 'ADMIN' ? 'Admin workspace' : 'My workspace'}</p><nav aria-label="Primary navigation">{links.map(([to, label, Icon]) => <NavLink key={`${to}-${label}`} to={to} end={to === '/dashboard'} onClick={closeNavigation} className={({ isActive }) => isActive ? 'active' : ''}><Icon /> {label}</NavLink>)}</nav><div className="access-card"><i className={user.role === 'ADMIN' ? 'admin' : ''} /><strong>{user.role === 'ADMIN' ? 'Admin access' : 'Agent access'}</strong><span>{user.role === 'ADMIN' ? 'Review and reporting tools' : 'Visit logging is ready'}</span></div></aside><main id="main-content" className="workspace" tabIndex="-1">{children}</main></div></div>;
}
