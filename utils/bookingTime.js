import { AppError } from './errors.js';

/** Fixed rental house timings (India). */
export const BOOKING_TIMEZONE = 'Asia/Kolkata';
export const BOOKING_CHECK_IN_HOUR = 10;
export const BOOKING_CHECK_OUT_HOUR = 9;
export const BOOKING_FIXED_MINUTE = 0;

/**
 * Accept only calendar dates YYYY-MM-DD.
 * Reject any customer-supplied time component.
 */
export function parseBookingDateOnly(value, fieldName) {
  if (value === undefined || value === null) {
    throw new AppError(`${fieldName} is required`, 400);
  }

  const raw = String(value).trim();

  if (raw.includes('T') || raw.includes(' ') || raw.includes(':')) {
    throw new AppError(
      `${fieldName} must be a date only (YYYY-MM-DD). Check-in is fixed at 10:00 AM and check-out at 9:00 AM by the system.`,
      400
    );
  }

  if (!/^\d{4}-\d{2}-\d{2}$/.test(raw)) {
    throw new AppError(
      `${fieldName} must be a valid date (YYYY-MM-DD)`,
      400
    );
  }

  const probe = new Date(`${raw}T00:00:00Z`);
  if (Number.isNaN(probe.getTime()) || !probe.toISOString().startsWith(raw)) {
    throw new AppError(
      `${fieldName} must be a valid date (YYYY-MM-DD)`,
      400
    );
  }

  return raw;
}

/**
 * Selected check-in date → fixed 10:00 AM Asia/Kolkata.
 * Example: "2026-09-19" → "2026-09-19T10:00:00+05:30"
 */
export function toFixedCheckInTimestamp(dateOnly) {
  return `${dateOnly}T10:00:00+05:30`;
}

/**
 * Selected check-out date → fixed 9:00 AM Asia/Kolkata.
 * Example: "2026-09-21" → "2026-09-21T09:00:00+05:30"
 */
export function toFixedCheckOutTimestamp(dateOnly) {
  return `${dateOnly}T09:00:00+05:30`;
}

/**
 * @deprecated Use toFixedCheckInTimestamp / toFixedCheckOutTimestamp.
 * Kept as check-in alias for any remaining callers.
 */
export function toFixedBookingTimestamp(dateOnly) {
  return toFixedCheckInTimestamp(dateOnly);
}

/**
 * Format a DB timestamptz value as ISO with Asia/Kolkata offset (+05:30).
 * India has no DST, so offset is always +05:30.
 */
export function formatBookingTimestamp(value) {
  if (value == null) return value;

  if (typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value)) {
    // Ambiguous date-only: leave as date (callers should use explicit helpers)
    return value;
  }

  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) {
    return value;
  }

  const parts = new Intl.DateTimeFormat('en-GB', {
    timeZone: BOOKING_TIMEZONE,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
  }).formatToParts(date);

  const get = (type) => parts.find((p) => p.type === type)?.value;
  const year = get('year');
  const month = get('month');
  const day = get('day');
  const hour = get('hour');
  const minute = get('minute');
  const second = get('second');

  return `${year}-${month}-${day}T${hour}:${minute}:${second}+05:30`;
}

/**
 * Calendar nights between two YYYY-MM-DD dates (UTC midnight math).
 * Independent of the fixed 10:00 AM / 9:00 AM wall-clock times.
 */
export function calculateNightsFromDates(checkInDate, checkOutDate) {
  const start = new Date(`${checkInDate}T00:00:00Z`);
  const end = new Date(`${checkOutDate}T00:00:00Z`);
  const nights = Math.round((end - start) / (1000 * 60 * 60 * 24));
  if (nights <= 0) {
    throw new AppError('check_out must be after check_in', 400);
  }
  return nights;
}

/** Add calendar days to a YYYY-MM-DD string (UTC date math). */
export function addDaysToDateOnly(dateOnly, days) {
  const date = new Date(`${dateOnly}T00:00:00Z`);
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().slice(0, 10);
}

/**
 * Compare two ISO timestamptz-ish values as Dates.
 * Overlap: existingIn < requestedOut AND existingOut > requestedIn
 * Allows 9:00 AM checkout followed by 10:00 AM check-in the same calendar day.
 */
export function intervalsOverlap(existingIn, existingOut, requestedIn, requestedOut) {
  const aStart = new Date(existingIn).getTime();
  const aEnd = new Date(existingOut).getTime();
  const bStart = new Date(requestedIn).getTime();
  const bEnd = new Date(requestedOut).getTime();
  return aStart < bEnd && aEnd > bStart;
}
