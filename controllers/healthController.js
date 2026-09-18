import { testConnection } from '../config/db.js';

/**
 * GET /api/health
 */
export async function getHealth(req, res) {
  try {
    const db = await testConnection();
    return res.status(200).json({
      success: true,
      application: 'rental-booking-backend',
      status: 'up',
      message: 'Rental Booking API is running',
      database: {
        ok: db.ok,
        name: db.database,
        currentTime: db.currentTime,
      },
    });
  } catch (error) {
    console.error('Health check failed:', error?.message || 'database unavailable');
    return res.status(503).json({
      success: false,
      application: 'rental-booking-backend',
      status: 'degraded',
      message: 'API is running but database connectivity failed.',
      database: {
        ok: false,
      },
    });
  }
}
