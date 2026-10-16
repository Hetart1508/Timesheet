import { env } from '../config/env.js';
import { AppError } from './app-error.js';

export function currentBusinessDate(now = new Date()) {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: env.BUSINESS_TIMEZONE,
    year: 'numeric', month: '2-digit', day: '2-digit',
  }).formatToParts(now);
  const value = Object.fromEntries(parts.map((part) => [part.type, part.value]));
  return `${value.year}-${value.month}-${value.day}`;
}

export function validateBusinessDate(value) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) throw new AppError(422, 'INVALID_DATE', 'Use a valid date in YYYY-MM-DD format');
  const date = new Date(`${value}T00:00:00Z`);
  if (Number.isNaN(date.getTime()) || date.toISOString().slice(0, 10) !== value) throw new AppError(422, 'INVALID_DATE', 'Use a valid calendar date');
  return value;
}

export function istLocalToUtc(workDate, time) {
  validateBusinessDate(workDate);
  if (!/^([01]\d|2[0-3]):[0-5]\d$/.test(time)) throw new AppError(422, 'INVALID_TIME', 'Use a valid time in HH:mm format');
  // The product business timezone is fixed to Asia/Kolkata, which has no DST.
  const value = new Date(`${workDate}T${time}:00+05:30`);
  if (Number.isNaN(value.getTime())) throw new AppError(422, 'INVALID_TIME', 'Use a valid time');
  return value;
}

export function utcToIstTime(value) {
  return new Intl.DateTimeFormat('en-GB', {
    timeZone: 'Asia/Kolkata', hour: '2-digit', minute: '2-digit', hour12: false,
  }).format(new Date(value));
}
