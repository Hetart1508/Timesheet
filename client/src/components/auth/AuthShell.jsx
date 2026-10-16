import { Clock3, ShieldCheck } from 'lucide-react';
import { Link } from 'react-router-dom';

export default function AuthShell({ eyebrow, title, description, children, footer }) {
  return <main className="auth-page">
    <section className="auth-aside" aria-label="Product introduction">
      <Link to="/" className="brand"><span className="brand-mark"><Clock3 size={22} /></span><span>Timesheet</span></Link>
      <div className="auth-aside-copy"><span className="secure-label"><ShieldCheck size={16} /> Secure field operations</span><h2>Every visit. Every hour. Accounted for.</h2><p>Simple daily reporting for Agents and trustworthy review workflows for administrators.</p></div>
      <p className="aside-foot">Times are recorded manually. Location tracking is never used.</p>
    </section>
    <section className="auth-main"><div className="auth-card"><p className="eyebrow">{eyebrow}</p><h1>{title}</h1>{description && <p className="auth-description">{description}</p>}{children}{footer && <div className="auth-footer">{footer}</div>}</div></section>
  </main>;
}
