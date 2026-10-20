import { CalendarDays } from 'lucide-react';

const displayDate = (value) => value ? value.split('-').reverse().join('/') : 'DD/MM/YYYY';

export default function FormattedDateField({ label, ariaLabel = label, value, max, onChange, className = '' }) {
  return <label className={`field formatted-date-field ${className}`.trim()}>
    <span>{label}</span>
    <span className="formatted-date-picker">
      <span className={value ? undefined : 'date-placeholder'} aria-hidden="true">{displayDate(value)}</span>
      <CalendarDays size={18} aria-hidden="true" />
      <input aria-label={ariaLabel} type="date" lang="en-GB" max={max} value={value} onChange={onChange} />
    </span>
  </label>;
}
