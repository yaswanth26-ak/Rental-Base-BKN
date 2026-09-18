import express from 'express';
import { listAmenities } from '../controllers/amenityController.js';

const router = express.Router();

/**
 * @swagger
 * /api/amenities:
 *   get:
 *     tags: [Amenities]
 *     summary: List all available amenities
 *     responses:
 *       200:
 *         description: Amenities catalog
 */
router.get('/', listAmenities);

export default router;
