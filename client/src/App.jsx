import { Activity, CheckCircle2, Clock3, Database, ShieldCheck } from 'lucide-react';

const foundations = [
  { icon: Database, title: 'MySQL schema', text: 'Versioned migrations, constraints, indexes and audit-ready tables.' },
  { icon: Activity, title: 'Express API', text: 'Versioned health endpoints, request IDs and centralized errors.' },
  { icon: ShieldCheck, title: 'Security baseline', text: 'Helmet, strict CORS, payload limits and validated configuration.' },
];

export default function App() {
  return (
    <main className="page-shell">
      <section className="intro" aria-labelledby="page-title">
        <div className="brand-mark" aria-hidden="true"><Clock3 size={24} /></div>
        <p className="eyebrow">Timesheet Management</p>
        <h1 id="page-title">The foundation is ready.</h1>
        <p className="lede">
          A secure workspace for field visits, daily declarations, approvals and reporting—built in testable phases.
        </p>
        <div className="phase-pill"><CheckCircle2 size={16} /> Phase 1 · Foundation</div>
      </section>

      <section className="foundation-grid" aria-label="Foundation capabilities">
        {foundations.map(({ icon: Icon, title, text }) => (
          <article className="foundation-card" key={title}>
            <span className="card-icon"><Icon size={20} /></span>
            <h2>{title}</h2>
            <p>{text}</p>
          </article>
        ))}
      </section>

      <p className="checkpoint">Next checkpoint: secure authentication and role-based access.</p>
    </main>
  );
}
