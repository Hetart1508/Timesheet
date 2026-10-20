import { BriefcaseBusiness, ShieldCheck } from 'lucide-react';
import { Link } from 'react-router-dom';
import AuthShell from '../../components/auth/AuthShell.jsx';

export default function PortalLoginPage() {
  return <AuthShell compact brandTo="/login" eyebrow="Welcome" title="Choose your workspace" description="Use one reliable sign-in page on desktop or mobile. You can switch workspaces later if your account has access.">
    <div className="portal-options" aria-label="Sign-in options">
      <Link className="portal-option" to="/login/agent"><span className="portal-option-icon"><BriefcaseBusiness aria-hidden="true" /></span><span><strong>Agent sign in</strong><small>Record visits and submit timesheets</small></span></Link>
      <Link className="portal-option" to="/login/admin"><span className="portal-option-icon admin"><ShieldCheck aria-hidden="true" /></span><span><strong>Admin sign in</strong><small>Requires email two-step verification</small></span></Link>
    </div>
    <p className="portal-help">Admins who need Agent tools should sign in securely as Admin, then choose <strong>Switch to Agent workspace</strong> from the menu.</p>
  </AuthShell>;
}
