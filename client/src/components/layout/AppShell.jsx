import { Clock3, LogOut, UserRound } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext.jsx';

export default function AppShell({ children }) {
  const { user, logout } = useAuth(); const navigate = useNavigate();
  const signOut = async () => { await logout(); navigate('/login', { replace: true }); };
  return <div className="app-shell"><header className="topbar"><Link className="brand" to="/dashboard"><span className="brand-mark"><Clock3 size={21} /></span><span>Timesheet</span></Link><nav aria-label="Account navigation"><Link to="/profile"><UserRound size={17} /> Profile</Link><button className="text-button" onClick={signOut}><LogOut size={17} /> Sign out</button></nav></header><main className="workspace"><div className="workspace-user"><span>{user.role}</span><strong>{user.fullName}</strong></div>{children}</main></div>;
}
