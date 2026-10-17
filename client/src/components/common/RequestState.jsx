export default function RequestState({ error, label, onRetry }) {
  if (error) {
    return (
      <div className="request-error" role="alert">
        <p>{error}</p>
        <button className="secondary-button" type="button" onClick={onRetry}>Try again</button>
      </div>
    );
  }

  return <div className="panel-loading" role="status" aria-live="polite"><span className="spinner" aria-hidden="true" /> {label}</div>;
}