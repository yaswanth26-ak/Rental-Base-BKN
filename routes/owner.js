import express from 'express';
import { dashboard } from '../controllers/ownerController.js';
import { requireAuth, requireOwner } from '../middleware/auth.js';

const router = express.Router();

/**
 * @swagger
 * /api/owner/dashboard:
 *   get:
 *     tags: [Owner]
 *     summary: Simple owner dashboard stats
 *     security:
 *       - BearerAuth: []
 *     responses:
 *       200:
 *         description: Dashboard counts
 */
router.get('/dashboard', requireAuth, requireOwner, dashboard);

export default router;
