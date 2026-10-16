import { Link } from 'react-router-dom';
export default function NotFoundPage() { return <main className="full-state"><p className="eyebrow">404</p><h1>Page not found</h1><p>The page you requested does not exist.</p><Link className="primary-button button-link" to="/">Return home</Link></main>; }
