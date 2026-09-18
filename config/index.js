import dotenv from 'dotenv';

dotenv.config();

/**
 * Application configuration.
 * Pattern mirrors the reference project's config/index.js
 */
const config = {
  port: Number(process.env.PORT) || 5000,
  timezone: process.env.TZ || 'Asia/Kolkata',
  corsOrigin: process.env.CORS_ORIGIN || '*',

  db: {
    host: process.env.DB_HOST,
    port: Number(process.env.DB_PORT) || 5432,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME || 'rental_booking_db',
    connectionLimit: Number(process.env.DB_CONNECTION_LIMIT) || 10,
  },

  jwt: {
    secretKey: process.env.JWT_SECRET_KEY || process.env.JWT_SECRET,
    // Prefer JWT_EXPIRES_IN (e.g. "7d"); fall back to legacy ms number if set
    expiresIn:
      process.env.JWT_EXPIRES_IN ||
      (process.env.JWT_EXPIRATION
        ? Number(process.env.JWT_EXPIRATION)
        : '7d'),
  },
};

export default config;
