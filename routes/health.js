import express from 'express';
import { getHealth } from '../controllers/healthController.js';

const router = express.Router();

/**
 * @swagger
 * /api/health:
 *   get:
 *     tags: [Health]
 *     summary: Health check
 *     responses:
 *       200:
 *         description: API and database are healthy
 *       503:
 *         description: API up but database unavailable
 */
router.get('/', getHealth);

export default router;
