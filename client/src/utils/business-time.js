export const BUSINESS_TIME_ZONE = 'Asia/Kolkata';

const dateFormatter = new Intl.DateTimeFormat('en-IN', {
  day: '2-digit', month: '2-digit', year: 'numeric', timeZone: BUSINESS_TIME_ZONE,
});
const dateTimeFormatter = new Intl.DateTimeFormat('en-IN', {
  day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit',
  hour12: true, timeZone: BUSINESS_TIME_ZONE,
});

const partsByType = (formatter, date) => Object.fromEntries(
  formatter.formatToParts(date).map(({ type, value }) => [type, value]),
);
const numericDate = (parts) => `${parts.day}-${parts.month}-${parts.year}`;

export function formatBusinessDateTime(value) {
  if (!value) return '';
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  const parts = partsByType(dateTimeFormatter, date);
  return `${numericDate(parts)}, ${parts.hour}:${parts.minute} ${parts.dayPeriod.toLowerCase()} IST`;
}

export function formatBusinessDate(value) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value || '')) return value || '';
  return numericDate(partsByType(dateFormatter, new Date(`${value}T00:00:00.000Z`)));
}

export function currentBusinessDate(now = new Date()) {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: BUSINESS_TIME_ZONE, year: 'numeric', month: '2-digit', day: '2-digit',
  }).formatToParts(now);
  const values = Object.fromEntries(parts.map((part) => [part.type, part.value]));
  return `${values.year}-${values.month}-${values.day}`;
}