import { asyncHandler } from '../utils/errors.js';
import * as bookingService from '../services/bookingService.js';

export const createBooking = asyncHandler(async (req, res) => {
  const booking = await bookingService.createBooking(req.user.id, req.body);
  return res.status(201).json({
    success: true,
    message: 'Booking created successfully',
    data: booking,
  });
});

export const listMyBookings = asyncHandler(async (req, res) => {
  const bookings = await bookingService.listMyBookings(req.user.id);
  return res.status(200).json({
    success: true,
    message: 'Bookings fetched successfully',
    data: bookings,
  });
});

export const listOwnerBookings = asyncHandler(async (req, res) => {
  const bookings = await bookingService.listOwnerBookings(req.user.id);
  return res.status(200).json({
    success: true,
    message: 'Owner bookings fetched successfully',
    data: bookings,
  });
});

export const listPropertyBookings = asyncHandler(async (req, res) => {
  const bookings = await bookingService.listPropertyBookings(
    req.params.propertyId,
    req.user.id
  );
  return res.status(200).json({
    success: true,
    message: 'Property bookings fetched successfully',
    data: bookings,
  });
});

export const getBookingById = asyncHandler(async (req, res) => {
  const booking = await bookingService.getBookingDetails(
    req.params.id,
    req.user
  );
  return res.status(200).json({
    success: true,
    message: 'Booking fetched successfully',
    data: booking,
  });
});

export const cancelBooking = asyncHandler(async (req, res) => {
  const booking = await bookingService.cancelBooking(
    req.params.id,
    req.user.id
  );
  return res.status(200).json({
    success: true,
    message: 'Booking cancelled successfully',
    data: booking,
  });
});

export const updateBookingStatus = asyncHandler(async (req, res) => {
  const booking = await bookingService.updateBookingStatus(
    req.params.id,
    req.user.id,
    req.body
  );
  return res.status(200).json({
    success: true,
    message: 'Booking status updated successfully',
    data: booking,
  });
});

export const checkAvailability = asyncHandler(async (req, res) => {
  const data = await bookingService.checkPropertyAvailability(
    req.params.propertyId,
    req.query
  );
  return res.status(200).json({
    success: true,
    message: data.available
      ? 'House is available for the selected dates'
      : 'House is not available for the selected dates',
    data,
  });
});
