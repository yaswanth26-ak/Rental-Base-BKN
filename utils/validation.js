import { AppError } from './errors.js';

export const ALLOWED_ROLES = ['user', 'admin'];

export const ALLOWED_IMAGE_TYPES = [
  'main',
  'living_room',
  'bedroom',
  'kitchen',
  'bathroom',
  'parking',
  'other',
];

export const ALLOWED_BOOKING_STATUSES = [
  'pending',
  'confirmed',
  'cancelled',
  'completed',
];

export function requireFields(body, fields) {
  for (const field of fields) {
    const value = body?.[field];
    if (value === undefined || value === null || String(value).trim() === '') {
      throw new AppError(`${field} is required`, 400);
    }
  }
}

export function isValidDateString(value) {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    return false;
  }
  const date = new Date(`${value}T00:00:00Z`);
  return !Number.isNaN(date.getTime()) && date.toISOString().startsWith(value);
}

export function parsePositiveInt(value, fieldName) {
  const n = Number(value);
  if (!Number.isInteger(n) || n <= 0) {
    throw new AppError(`${fieldName} must be a positive integer`, 400);
  }
  return n;
}

/**
 * Calendar nights between YYYY-MM-DD dates.
 * Kept for compatibility; booking create uses calculateNightsFromDates.
 */
export function calculateNights(checkIn, checkOut) {
  const start = new Date(`${checkIn}T00:00:00Z`);
  const end = new Date(`${checkOut}T00:00:00Z`);
  const nights = Math.round((end - start) / (1000 * 60 * 60 * 24));
  if (nights <= 0) {
    throw new AppError('check_out must be after check_in', 400);
  }
  return nights;
}

export function sanitizeUser(user) {
  if (!user) return null;
  const { password_hash, ...safe } = user;
  return safe;
}
