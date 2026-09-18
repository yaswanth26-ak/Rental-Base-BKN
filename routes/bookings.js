import express from 'express';
import {
  createBooking,
  listMyBookings,
  listOwnerBookings,
  getBookingById,
  cancelBooking,
  updateBookingStatus,
} from '../controllers/bookingController.js';
import {
  requireAuth,
  requireCustomer,
  requireOwner,
} from '../middleware/auth.js';

const router = express.Router();

/**
 * @swagger
 * /api/bookings:
 *   post:
 *     tags: [Bookings]
 *     summary: Create booking (customer)
 *     security:
 *       - BearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [property_id, check_in, check_out]
 *             properties:
 *               property_id: { type: integer, example: 1 }
 *               check_in:
 *                 type: string
 *                 format: date
 *                 description: Date only (YYYY-MM-DD). Backend applies fixed 10:00 AM Asia/Kolkata check-in.
 *                 example: "2026-09-19"
 *               check_out:
 *                 type: string
 *                 format: date
 *                 description: Date only (YYYY-MM-DD). Backend applies fixed 9:00 AM Asia/Kolkata check-out.
 *                 example: "2026-09-21"
 *     responses:
 *       201:
 *         description: Created. Response times are TIMESTAMPTZ (e.g. check_in 10:00, check_out 09:00 +05:30).
 *       409:
 *         description: Overlapping dates
 */
router.post('/', requireAuth, requireCustomer, createBooking);

/**
 * @swagger
 * /api/bookings/my:
 *   get:
 *     tags: [Bookings]
 *     summary: List my bookings (customer)
 *     security:
 *       - BearerAuth: []
 *     responses:
 *       200:
 *         description: Customer bookings
 */
router.get('/my', requireAuth, requireCustomer, listMyBookings);

/**
 * @swagger
 * /api/bookings/owner:
 *   get:
 *     tags: [Bookings]
 *     summary: List bookings for owner properties
 *     security:
 *       - BearerAuth: []
 *     responses:
 *       200:
 *         description: Owner bookings
 */
router.get('/owner', requireAuth, requireOwner, listOwnerBookings);

/**
 * @swagger
 * /api/bookings/{id}:
 *   get:
 *     tags: [Bookings]
 *     summary: Get booking details
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: integer }
 *     responses:
 *       200:
 *         description: Booking
 */
router.get('/:id', requireAuth, getBookingById);

/**
 * @swagger
 * /api/bookings/{id}/cancel:
 *   patch:
 *     tags: [Bookings]
 *     summary: Cancel booking (customer)
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: integer }
 *     responses:
 *       200:
 *         description: Cancelled
 */
router.patch('/:id/cancel', requireAuth, requireCustomer, cancelBooking);

/**
 * @swagger
 * /api/bookings/{id}/status:
 *   patch:
 *     tags: [Bookings]
 *     summary: Update booking status (owner)
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: integer }
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [status]
 *             properties:
 *               status:
 *                 type: string
 *                 enum: [pending, confirmed, cancelled, completed]
 *     responses:
 *       200:
 *         description: Status updated
 */
router.patch('/:id/status', requireAuth, requireOwner, updateBookingStatus);

export default router;
