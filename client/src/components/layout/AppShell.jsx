import { useEffect, useRef, useState } from 'react';
import { BarChart3, Building2, CalendarDays, Clock3, Download, FileCheck2, History, LayoutDashboard, LogOut, Menu, ShieldCheck, UserRound, Users, X } from 'lucide-react';
import { Link, NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext.jsx';

const agentLinks = [
  ['/dashboard', 'Dashboard', LayoutDashboard], ['/timesheets', 'Timesheet history', History],
  ['/companies', 'Company directory', Building2], ['/profile', 'Profile & security', UserRound],
];
const adminLinks = [
  ['/dashboard', 'Admin overview', LayoutDashboard], ['/admin/timesheets?status=SUBMITTED', 'Review queue', FileCheck2],
  ['/admin/timesheets', 'All timesheets', CalendarDays], ['/admin/agents', 'Agent directory', Users],
  ['/admin/companies', 'Company directory', Building2], ['/admin/analytics', 'Analytics & reports', BarChart3],
  ['/admin/exports', 'Export center', Download], ['/admin/audits', 'Audit logs', ShieldCheck], ['/profile', 'Profile & security', UserRound],
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
  return <div className="app-shell"><a className="skip-link" href="#main-content">Skip to content</a><header className="topbar"><Link className="brand" to="/dashboard"><span className="brand-mark"><Clock3 size={21} /></span><span>Timesheet</span></Link><div className="topbar-account"><span><small>{user.role}</small>{user.fullName}</span><Link aria-label="Profile" to="/profile"><UserRound /></Link><button className="text-button" onClick={signOut}><LogOut /> <span>Sign out</span></button><button ref={menuButtonRef} className="mobile-menu" aria-label="Open navigation" aria-expanded={open} aria-controls="app-navigation" onClick={() => setOpen(true)}><Menu /></button></div></header>{open ? <button className="sidebar-backdrop" aria-label="Dismiss navigation" onClick={closeNavigation} /> : null}<div className="shell-body"><aside id="app-navigation" className={`sidebar ${open ? 'open' : ''}`}><div className="sidebar-mobile-head"><strong>Navigation</strong><button ref={closeButtonRef} className="icon-button" aria-label="Close navigation" onClick={closeNavigation}><X /></button></div><p>{user.role === 'ADMIN' ? 'Administration portal' : 'Agent field work'}</p><nav aria-label="Primary navigation">{links.map(([to, label, Icon]) => <NavLink key={`${to}-${label}`} to={to} end={to === '/dashboard'} onClick={closeNavigation} className={({ isActive }) => isActive ? 'active' : ''}><Icon /> {label}</NavLink>)}</nav><div className="access-card"><i className={user.role === 'ADMIN' ? 'admin' : ''} /><strong>{user.role === 'ADMIN' ? 'Admin access' : 'Verified Agent'}</strong><span>{user.role === 'ADMIN' ? 'Reviews, directory controls, analytics, and exports unlocked.' : 'Daily visit logging and submissions are active.'}</span></div></aside><main id="main-content" className="workspace" tabIndex="-1">{children}</main></div></div>;
}
