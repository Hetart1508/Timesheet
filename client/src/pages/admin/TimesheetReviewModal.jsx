import { useEffect, useRef } from 'react';
import { X } from 'lucide-react';
import TimesheetReviewContent from './TimesheetReviewContent.jsx';

export default function TimesheetReviewModal({ id, onClose, onReviewed }) {
  const closeButtonRef = useRef(null);
  const openerRef = useRef(document.activeElement);

  useEffect(() => {
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    closeButtonRef.current?.focus();
    const closeOnEscape = (event) => { if (event.key === 'Escape') onClose(); };
    window.addEventListener('keydown', closeOnEscape);
    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener('keydown', closeOnEscape);
      openerRef.current?.focus();
    };
  }, [onClose]);

  return <div className="modal-backdrop timesheet-preview-backdrop" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose(); }}>
    <section className="modal-card timesheet-preview-modal" role="dialog" aria-modal="true" aria-labelledby="timesheet-preview-title">
      <header className="timesheet-preview-header"><div><p className="eyebrow">Administrative review</p><h2 id="timesheet-preview-title">Timesheet preview</h2></div><button ref={closeButtonRef} type="button" className="icon-button" aria-label="Close timesheet preview" onClick={onClose}><X /></button></header>
      <div className="timesheet-preview-body"><TimesheetReviewContent id={id} onReviewed={onReviewed} /></div>
    </section>
  </div>;
}
