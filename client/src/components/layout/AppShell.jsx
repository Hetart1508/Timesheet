import { useEffect, useRef, useState } from 'react';
import { BarChart3, Building2, CalendarDays, CalendarRange, Clock3, Download, FileCheck2, FileInput, FileText, LayoutDashboard, LogOut, Menu, ShieldCheck, UserRound, Users, X } from 'lucide-react';
import { LazyMotion, domAnimation, m as motion, useReducedMotion } from 'motion/react';
import { Link, NavLink, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext.jsx';

const adminLinks = [
  ['/dashboard', 'Home', LayoutDashboard], ['/admin/reviews', 'Reviews', FileCheck2],
  ['/admin/timesheets', 'Timesheets', CalendarDays], ['/admin/work-calendar', 'Work calendar', CalendarRange], ['/admin/agents', 'Agents', Users],
  ['/admin/companies', 'Companies', Building2], ['/admin/analytics', 'Reports', BarChart3],
  ['/admin/exports', 'Exports', Download], ['/admin/invoices', 'Invoices', FileText],
  ['/admin/imports', 'Excel import', FileInput],
  ['/admin/audits', 'Audit log', ShieldCheck], ['/admin/temporary', 'Temporary', ShieldCheck], ['/profile', 'Account & security', UserRound],
];

export default function AppShell({ children }) {
  const { user, logout } = useAuth(); const navigate = useNavigate(); const location = useLocation(); const reduceMotion = useReducedMotion(); const [open, setOpen] = useState(false);
  const menuButtonRef = useRef(null); const closeButtonRef = useRef(null);
  const links = adminLinks;
  const signOut = async () => { await logout(); navigate('/login', { replace: true }); };
  const closeNavigation = () => { setOpen(false); menuButtonRef.current?.focus(); };
  useEffect(() => {
    if (!open) return undefined;
    const closeOnEscape = (event) => { if (event.key === 'Escape') closeNavigation(); };
    window.addEventListener('keydown', closeOnEscape);
    closeButtonRef.current?.focus();
    return () => window.removeEventListener('keydown', closeOnEscape);
  }, [open]);
  return <LazyMotion features={domAnimation}><div className="app-shell"><a className="skip-link" href="#main-content">Skip to content</a><header className="topbar"><Link className="brand" to="/dashboard"><span className="brand-mark"><Clock3 size={21} /></span><span>Timesheet</span></Link><div className="topbar-account"><span><small>Administrator</small>{user.fullName}</span><Link aria-label="Account settings" to="/profile"><UserRound /></Link><button className="text-button" onClick={signOut}><LogOut /> <span>Sign out</span></button><button ref={menuButtonRef} className="mobile-menu" aria-label="Open navigation" aria-expanded={open} aria-controls="app-navigation" onClick={() => setOpen(true)}><Menu /></button></div></header>{open ? <button className="sidebar-backdrop" aria-label="Dismiss navigation" onClick={closeNavigation} /> : null}<div className="shell-body"><aside id="app-navigation" className={`sidebar ${open ? 'open' : ''}`}><div className="sidebar-mobile-head"><strong>Menu</strong><button ref={closeButtonRef} className="icon-button" aria-label="Close navigation" onClick={closeNavigation}><X /></button></div><p>Admin workspace</p><nav aria-label="Primary navigation">{links.map(([to, label, Icon]) => <NavLink key={`${to}-${label}`} to={to} end={to === '/dashboard'} onClick={closeNavigation} className={({ isActive }) => isActive ? 'active' : ''}><Icon /> {label}</NavLink>)}</nav><div className="access-card"><i className="admin" /><strong>Admin access</strong><span>Agent, timesheet, review, and reporting tools</span></div></aside><motion.main id="main-content" key={location.pathname} className="workspace" tabIndex="-1" initial={reduceMotion ? false : { opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={reduceMotion ? { duration: 0 } : { duration: 0.18, ease: 'easeOut' }}>{children}</motion.main></div></div></LazyMotion>;
}
