import BookingDB from '../models/bookingDB.js';
import PropertyDB from '../models/propertyDB.js';
import { AppError } from '../utils/errors.js';
import {
  ALLOWED_BOOKING_STATUSES,
  parsePositiveInt,
  requireFields,
} from '../utils/validation.js';
import {
  calculateNightsFromDates,
  parseBookingDateOnly,
  toFixedCheckInTimestamp,
  toFixedCheckOutTimestamp,
  addDaysToDateOnly,
  intervalsOverlap,
} from '../utils/bookingTime.js';

const SUGGESTION_LIMIT = 5;
const SUGGESTION_SEARCH_DAYS = 120;

function buildSuggestedRanges({
  intervals,
  nights,
  startFromDate,
  pricePerDay,
  excludeCheckIn,
  excludeCheckOut,
}) {
  const suggestions = [];
  let cursor = startFromDate;
  const searchEnd = addDaysToDateOnly(startFromDate, SUGGESTION_SEARCH_DAYS);

  while (suggestions.length < SUGGESTION_LIMIT && cursor < searchEnd) {
    const candidateOut = addDaysToDateOnly(cursor, nights);

    if (
      excludeCheckIn &&
      excludeCheckOut &&
      cursor === excludeCheckIn &&
      candidateOut === excludeCheckOut
    ) {
      cursor = addDaysToDateOnly(cursor, 1);
      continue;
    }

    const checkInTs = toFixedCheckInTimestamp(cursor);
    const checkOutTs = toFixedCheckOutTimestamp(candidateOut);

    const overlaps = intervals.some((interval) =>
      intervalsOverlap(
        interval.check_in,
        interval.check_out,
        checkInTs,
        checkOutTs
      )
    );

    if (!overlaps) {
      suggestions.push({
        checkIn: cursor,
        checkOut: candidateOut,
        totalNights: nights,
        totalAmount: Number((Number(pricePerDay) * nights).toFixed(2)),
      });
      cursor = candidateOut;
    } else {
      cursor = addDaysToDateOnly(cursor, 1);
    }
  }

  return suggestions;
}
export async function createBooking(customerId, body) {
  requireFields(body, ['property_id', 'check_in', 'check_out']);

  const propertyId = parsePositiveInt(body.property_id, 'property_id');

  // Customers send date-only values; backend applies fixed 10:00 AM / 9:00 AM Asia/Kolkata.
  const checkInDate = parseBookingDateOnly(body.check_in, 'check_in');
  const checkOutDate = parseBookingDateOnly(body.check_out, 'check_out');

  if (!(checkOutDate > checkInDate)) {
    throw new AppError('check_out must be after check_in', 400);
  }

  const totalNights = calculateNightsFromDates(checkInDate, checkOutDate);
  const checkIn = toFixedCheckInTimestamp(checkInDate);
  const checkOut = toFixedCheckOutTimestamp(checkOutDate);

  const property = await PropertyDB.findById(propertyId);
  if (!property) {
    throw new AppError('Property not found', 404);
  }
  if (!property.is_active) {
    throw new AppError('Property is not available for booking', 400);
  }

  const totalAmount = Number(
    (property.price_per_day * totalNights).toFixed(2)
  );

  const result = await BookingDB.createWithOverlapCheck({
    propertyId,
    customerId,
    checkIn,
    checkOut,
    totalNights,
    totalAmount,
  });

  if (result.error === 'NOT_FOUND') {
    throw new AppError('Property not found', 404);
  }
  if (result.error === 'INACTIVE') {
    throw new AppError('Property is not available for booking', 400);
  }
  if (result.error === 'OVERLAP') {
    throw new AppError(
      'Property is already booked for the selected dates',
      409
    );
  }

  return result.booking;
}

/**
 * Convenience availability check for a property date range.
 * Does not create a booking. Final overlap is still enforced on POST /bookings.
 */
export async function checkPropertyAvailability(propertyId, query) {
  const id = parsePositiveInt(propertyId, 'property id');

  const checkInRaw = query.checkIn ?? query.check_in;
  const checkOutRaw = query.checkOut ?? query.check_out;

  const checkInDate = parseBookingDateOnly(checkInRaw, 'checkIn');
  const checkOutDate = parseBookingDateOnly(checkOutRaw, 'checkOut');

  if (!(checkOutDate > checkInDate)) {
    throw new AppError('checkOut must be after checkIn', 400);
  }

  const property = await PropertyDB.findById(id);
  if (!property) {
    throw new AppError('Property not found', 404);
  }
  if (!property.is_active) {
    throw new AppError('Property is not available for booking', 400);
  }

  const totalNights = calculateNightsFromDates(checkInDate, checkOutDate);
  const checkIn = toFixedCheckInTimestamp(checkInDate);
  const checkOut = toFixedCheckOutTimestamp(checkOutDate);

  const overlapping = await BookingDB.hasOverlappingBooking(
    id,
    checkIn,
    checkOut
  );

  if (overlapping) {
    const intervals = await BookingDB.listBlockingIntervals(id);
    const suggestedDates = buildSuggestedRanges({
      intervals,
      nights: totalNights,
      startFromDate: checkInDate,
      pricePerDay: property.price_per_day,
      excludeCheckIn: checkInDate,
      excludeCheckOut: checkOutDate,
    });

    return {
      available: false,
      suggestedDates,
    };
  }

  const totalAmount = Number(
    (property.price_per_day * totalNights).toFixed(2)
  );

  return {
    available: true,
    checkIn,
    checkOut,
    totalNights,
    totalAmount,
  };
}

export async function listMyBookings(customerId) {
  return BookingDB.findByCustomer(customerId);
}

export async function listOwnerBookings(ownerId) {
  return BookingDB.findByOwner(ownerId);
}

export async function listPropertyBookings(propertyId, ownerId) {
  const id = parsePositiveInt(propertyId, 'property id');
  const property = await PropertyDB.findById(id);
  if (!property) {
    throw new AppError('Property not found', 404);
  }
  if (property.owner_id !== ownerId) {
    throw new AppError('You do not own this property', 403);
  }
  return BookingDB.findByProperty(id);
}

export async function getBookingDetails(bookingId, requester) {
  const id = parsePositiveInt(bookingId, 'booking id');
  const booking = await BookingDB.findById(id);
  if (!booking) {
    throw new AppError('Booking not found', 404);
  }

  const meta = await BookingDB.getPropertyOwnerId(id);
  const isCustomer =
    requester.role === 'user' && requester.id === booking.customer_id;
  const isOwner =
    requester.role === 'admin' &&
    meta &&
    Number(meta.owner_id) === requester.id;

  if (!isCustomer && !isOwner) {
    throw new AppError('You are not allowed to view this booking', 403);
  }

  return booking;
}

export async function cancelBooking(bookingId, customerId) {
  const id = parsePositiveInt(bookingId, 'booking id');
  const booking = await BookingDB.findById(id);
  if (!booking) {
    throw new AppError('Booking not found', 404);
  }
  if (booking.customer_id !== customerId) {
    throw new AppError('You are not allowed to cancel this booking', 403);
  }
  if (booking.status === 'cancelled') {
    throw new AppError('Booking is already cancelled', 400);
  }
  if (booking.status === 'completed') {
    throw new AppError('Completed bookings cannot be cancelled', 400);
  }

  return BookingDB.updateStatus(id, 'cancelled');
}

export async function updateBookingStatus(bookingId, ownerId, body) {
  const id = parsePositiveInt(bookingId, 'booking id');
  requireFields(body, ['status']);

  const status = String(body.status).trim().toLowerCase();
  if (!ALLOWED_BOOKING_STATUSES.includes(status)) {
    throw new AppError(
      `status must be one of: ${ALLOWED_BOOKING_STATUSES.join(', ')}`,
      400
    );
  }

  const meta = await BookingDB.getPropertyOwnerId(id);
  if (!meta) {
    throw new AppError('Booking not found', 404);
  }
  if (Number(meta.owner_id) !== ownerId) {
    throw new AppError('You are not allowed to update this booking', 403);
  }

  return BookingDB.updateStatus(id, status);
}

export async function getOwnerDashboard(ownerId) {
  const [propertyCounts, bookingCounts] = await Promise.all([
    PropertyDB.countByOwner(ownerId),
    BookingDB.countByOwner(ownerId),
  ]);

  return {
    total_properties: Number(propertyCounts.total_properties) || 0,
    active_properties: Number(propertyCounts.active_properties) || 0,
    total_bookings: Number(bookingCounts.total_bookings) || 0,
    confirmed_bookings: Number(bookingCounts.confirmed_bookings) || 0,
    pending_bookings: Number(bookingCounts.pending_bookings) || 0,
    cancelled_bookings: Number(bookingCounts.cancelled_bookings) || 0,
  };
}
