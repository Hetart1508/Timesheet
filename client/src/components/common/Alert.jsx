export default function Alert({ type = 'error', children }) {
  return children ? <div className={`alert alert-${type}`} role={type === 'error' ? 'alert' : 'status'}>{children}</div> : null;
}
