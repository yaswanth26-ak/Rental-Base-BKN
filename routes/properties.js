import express from 'express';
import {
  createProperty,
  listPublicProperties,
  listMyProperties,
  getPropertyById,
  updateProperty,
  deleteProperty,
  updatePropertyStatus,
} from '../controllers/propertyController.js';
import {
  addImage,
  listImages,
  updateImage,
  deleteImage,
} from '../controllers/propertyImageController.js';
import {
  getPropertyAmenities,
  replacePropertyAmenities,
} from '../controllers/amenityController.js';
import {
  listPropertyBookings,
  checkAvailability,
} from '../controllers/bookingController.js';
import {
  requireAuth,
  requireOwner,
  optionalAuth,
} from '../middleware/auth.js';

const router = express.Router();

/**
 * @swagger
 * /api/properties:
 *   get:
 *     tags: [Properties]
 *     summary: List active properties (public, filterable)
 *     parameters:
 *       - in: query
 *         name: city
 *         schema: { type: string }
 *       - in: query
 *         name: min_price
 *         schema: { type: number }
 *       - in: query
 *         name: max_price
 *         schema: { type: number }
 *       - in: query
 *         name: guests
 *         schema: { type: integer }
 *       - in: query
 *         name: bedrooms
 *         schema: { type: integer }
 *     responses:
 *       200:
 *         description: Active properties
 *   post:
 *     tags: [Properties]
 *     summary: Create property (owner)
 *     security:
 *       - BearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [name, address, price_per_day]
 *             properties:
 *               name: { type: string, example: Green Villa }
 *               description: { type: string }
 *               address: { type: string }
 *               city: { type: string }
 *               state: { type: string }
 *               price_per_day: { type: number, example: 2500 }
 *               max_guests: { type: integer, example: 6 }
 *               bedrooms: { type: integer, example: 2 }
 *               bathrooms: { type: integer, example: 2 }
 *     responses:
 *       201:
 *         description: Created
 */
router.get('/', listPublicProperties);
router.post('/', requireAuth, requireOwner, createProperty);

/**
 * @swagger
 * /api/properties/my:
 *   get:
 *     tags: [Properties]
 *     summary: List my properties (owner)
 *     security:
 *       - BearerAuth: []
 *     responses:
 *       200:
 *         description: Owner properties
 */
router.get('/my', requireAuth, requireOwner, listMyProperties);

/**
 * @swagger
 * /api/properties/{id}:
 *   get:
 *     tags: [Properties]
 *     summary: Property details with images and amenities
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: integer }
 *     security:
 *       - BearerAuth: []
 *     responses:
 *       200:
 *         description: Property details
 *   put:
 *     tags: [Properties]
 *     summary: Update property (owner)
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: integer }
 *     responses:
 *       200:
 *         description: Updated
 *   delete:
 *     tags: [Properties]
 *     summary: Deactivate property (soft delete)
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: integer }
 *     responses:
 *       200:
 *         description: Deactivated
 */
router.get('/:id', optionalAuth, getPropertyById);
router.put('/:id', requireAuth, requireOwner, updateProperty);
router.delete('/:id', requireAuth, requireOwner, deleteProperty);

/**
 * @swagger
 * /api/properties/{id}/status:
 *   patch:
 *     tags: [Properties]
 *     summary: Set property active status
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
 *             required: [is_active]
 *             properties:
 *               is_active: { type: boolean }
 *     responses:
 *       200:
 *         description: Status updated
 */
router.patch('/:id/status', requireAuth, requireOwner, updatePropertyStatus);

/**
 * @swagger
 * /api/properties/{propertyId}/availability:
 *   get:
 *     tags: [Bookings]
 *     summary: Check if the fixed house is available for selected dates
 *     description: |
 *       Convenience check only. Applies fixed check-in 10:00 AM and check-out 9:00 AM Asia/Kolkata.
 *       Only pending/confirmed bookings block availability.
 *       POST /api/bookings still performs the final overlap check.
 *     parameters:
 *       - in: path
 *         name: propertyId
 *         required: true
 *         schema: { type: integer }
 *       - in: query
 *         name: checkIn
 *         required: true
 *         schema: { type: string, format: date }
 *         example: "2026-09-22"
 *       - in: query
 *         name: checkOut
 *         required: true
 *         schema: { type: string, format: date }
 *         example: "2026-09-24"
 *     responses:
 *       200:
 *         description: Availability result
 *         content:
 *           application/json:
 *             examples:
 *               available:
 *                 value:
 *                   success: true
 *                   message: House is available for the selected dates
 *                   data:
 *                     available: true
 *                     checkIn: "2026-09-22T10:00:00+05:30"
 *                     checkOut: "2026-09-24T09:00:00+05:30"
 *                     totalNights: 2
 *                     totalAmount: 6000
 *               unavailable:
 *                 value:
 *                   success: true
 *                   message: House is not available for the selected dates
 *                   data:
 *                     available: false
 *                     suggestedDates:
 *                       - checkIn: "2026-09-22"
 *                         checkOut: "2026-09-24"
 *                         totalNights: 2
 *                         totalAmount: 6000
 *                       - checkIn: "2026-09-27"
 *                         checkOut: "2026-09-29"
 *                         totalNights: 2
 *                         totalAmount: 6000
 *       400:
 *         description: Invalid dates
 *       404:
 *         description: Property not found
 */
router.get('/:propertyId/availability', checkAvailability);

/**
 * @swagger
 * /api/properties/{propertyId}/images:
 *   get:
 *     tags: [Property Images]
 *     summary: List property images
 *     parameters:
 *       - in: path
 *         name: propertyId
 *         required: true
 *         schema: { type: integer }
 *     responses:
 *       200:
 *         description: Images
 *   post:
 *     tags: [Property Images]
 *     summary: Add image URL (owner)
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: propertyId
 *         required: true
 *         schema: { type: integer }
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [image_url]
 *             properties:
 *               image_url: { type: string }
 *               image_type:
 *                 type: string
 *                 enum: [main, living_room, bedroom, kitchen, bathroom, parking, other]
 *               display_order: { type: integer }
 *     responses:
 *       201:
 *         description: Created
 */
router.get('/:propertyId/images', listImages);
router.post('/:propertyId/images', requireAuth, requireOwner, addImage);

/**
 * @swagger
 * /api/properties/{propertyId}/images/{imageId}:
 *   put:
 *     tags: [Property Images]
 *     summary: Update image (owner)
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: propertyId
 *         required: true
 *         schema: { type: integer }
 *       - in: path
 *         name: imageId
 *         required: true
 *         schema: { type: integer }
 *     responses:
 *       200:
 *         description: Updated
 *   delete:
 *     tags: [Property Images]
 *     summary: Delete image (owner)
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: propertyId
 *         required: true
 *         schema: { type: integer }
 *       - in: path
 *         name: imageId
 *         required: true
 *         schema: { type: integer }
 *     responses:
 *       200:
 *         description: Deleted
 */
router.put(
  '/:propertyId/images/:imageId',
  requireAuth,
  requireOwner,
  updateImage
);
router.delete(
  '/:propertyId/images/:imageId',
  requireAuth,
  requireOwner,
  deleteImage
);

/**
 * @swagger
 * /api/properties/{propertyId}/amenities:
 *   get:
 *     tags: [Amenities]
 *     summary: Get amenities for a property
 *     parameters:
 *       - in: path
 *         name: propertyId
 *         required: true
 *         schema: { type: integer }
 *     responses:
 *       200:
 *         description: Amenities
 *   put:
 *     tags: [Amenities]
 *     summary: Replace property amenities (owner)
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: propertyId
 *         required: true
 *         schema: { type: integer }
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [amenity_ids]
 *             properties:
 *               amenity_ids:
 *                 type: array
 *                 items: { type: integer }
 *                 example: [1, 2, 5]
 *     responses:
 *       200:
 *         description: Replaced
 */
router.get('/:propertyId/amenities', getPropertyAmenities);
router.put(
  '/:propertyId/amenities',
  requireAuth,
  requireOwner,
  replacePropertyAmenities
);

/**
 * @swagger
 * /api/properties/{propertyId}/bookings:
 *   get:
 *     tags: [Bookings]
 *     summary: List bookings for a property (owner)
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: propertyId
 *         required: true
 *         schema: { type: integer }
 *     responses:
 *       200:
 *         description: Bookings
 */
router.get(
  '/:propertyId/bookings',
  requireAuth,
  requireOwner,
  listPropertyBookings
);

export default router;
