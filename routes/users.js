import express from 'express';
import {
  getMe,
  updateMe,
  changePassword,
} from '../controllers/userController.js';
import { requireAuth } from '../middleware/auth.js';

const router = express.Router();

/**
 * @swagger
 * /api/users/me:
 *   get:
 *     tags: [Users]
 *     summary: Get profile
 *     security:
 *       - BearerAuth: []
 *     responses:
 *       200:
 *         description: Profile
 *   put:
 *     tags: [Users]
 *     summary: Update profile (name, email, phone only)
 *     security:
 *       - BearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [name, phone]
 *             properties:
 *               name: { type: string }
 *               email: { type: string }
 *               phone: { type: string }
 *     responses:
 *       200:
 *         description: Updated
 */
router.get('/me', requireAuth, getMe);
router.put('/me', requireAuth, updateMe);

/**
 * @swagger
 * /api/users/me/password:
 *   put:
 *     tags: [Users]
 *     summary: Change password
 *     security:
 *       - BearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [current_password, new_password]
 *             properties:
 *               current_password: { type: string }
 *               new_password: { type: string }
 *     responses:
 *       200:
 *         description: Password updated
 */
router.put('/me/password', requireAuth, changePassword);

export default router;
