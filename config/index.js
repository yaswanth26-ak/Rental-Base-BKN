import dotenv from 'dotenv';

dotenv.config();

const nodeEnv = process.env.NODE_ENV || 'development';
const isProduction = nodeEnv === 'production';

/**
 * Application configuration.
 * Pattern mirrors the reference project's config/index.js
 */
const config = {
  nodeEnv,
  isProduction,
  port: Number(process.env.PORT) || 5000,
  timezone: process.env.TZ || 'Asia/Kolkata',
  /**
   * Comma-separated allowed origins, e.g.
   * http://localhost:5173,https://your-frontend.onrender.com
   * In non-production, unset or "*" reflects the request origin (local DX).
   * In production, must be explicit origin(s) — never "*".
   */
  corsOrigin: process.env.CORS_ORIGIN || (isProduction ? '' : '*'),
  /**
   * Swagger UI + OpenAPI JSON.
   * Production: off unless ENABLE_SWAGGER=true
   * Non-production: on unless ENABLE_SWAGGER=false
   */
  enableSwagger: isProduction
    ? process.env.ENABLE_SWAGGER === 'true'
    : process.env.ENABLE_SWAGGER !== 'false',

  db: {
    host: process.env.DB_HOST,
    port: Number(process.env.DB_PORT) || 5432,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
    connectionLimit: Number(process.env.DB_CONNECTION_LIMIT) || 10,
    /**
     * Render PostgreSQL requires SSL.
     * Enable with DB_SSL=true, or automatically in production unless DB_SSL=false.
     */
    ssl:
      process.env.DB_SSL === 'true' ||
      (isProduction && process.env.DB_SSL !== 'false'),
  },

  jwt: {
    secretKey: process.env.JWT_SECRET_KEY || process.env.JWT_SECRET,
    expiresIn:
      process.env.JWT_EXPIRES_IN ||
      (process.env.JWT_EXPIRATION
        ? Number(process.env.JWT_EXPIRATION)
        : '7d'),
  },
};

export default config;
