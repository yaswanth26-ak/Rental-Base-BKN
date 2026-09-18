import dotenv from 'dotenv';
dotenv.config();

import express from 'express';
import cors from 'cors';
import config from './config/index.js';
import { testConnection, closePool } from './config/db.js';
import { mountSwagger } from './config/swagger.js';
import healthRoutes from './routes/health.js';
import authRoutes from './routes/auth.js';
import userRoutes from './routes/users.js';
import propertyRoutes from './routes/properties.js';
import amenityRoutes from './routes/amenities.js';
import bookingRoutes from './routes/bookings.js';
import ownerRoutes from './routes/owner.js';
import { notFoundHandler, errorHandler } from './middleware/errorHandler.js';

process.env.TZ = config.timezone;

const app = express();
const PORT = config.port;

/**
 * Build CORS origin option from CORS_ORIGIN.
 * - Non-production + "*" / empty: reflect request Origin (local Vite + credentials).
 * - Production: exact allow-list only (comma-separated); never "*".
 */
function buildCorsOriginOption() {
  const raw = String(config.corsOrigin || '').trim();
  const origins = raw
    .split(',')
    .map((value) => value.trim())
    .filter(Boolean);

  if (!config.isProduction) {
    if (origins.length === 0 || (origins.length === 1 && origins[0] === '*')) {
      return true;
    }
  }

  if (config.isProduction && (origins.length === 0 || origins.includes('*'))) {
    console.warn(
      'CORS_ORIGIN must be set to explicit frontend origin(s) in production (wildcard is not allowed).'
    );
  }

  const allowed = new Set(origins.filter((origin) => origin !== '*'));

  return function corsOrigin(origin, callback) {
    // Non-browser clients (health checks, curl) often omit Origin.
    if (!origin) {
      return callback(null, true);
    }
    if (allowed.has(origin)) {
      return callback(null, true);
    }
    return callback(null, false);
  };
}

const corsOptions = {
  origin: buildCorsOriginOption(),
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
};

app.use(cors(corsOptions));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '20mb' }));

app.use('/api/health', healthRoutes);
app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/properties', propertyRoutes);
app.use('/api/amenities', amenityRoutes);
app.use('/api/bookings', bookingRoutes);
app.use('/api/owner', ownerRoutes);

if (config.enableSwagger) {
  mountSwagger(app);
}

app.get('/', (req, res) => {
  const payload = {
    application: 'rental-booking-backend',
    status: 'up',
    message: 'Rental Booking API is running',
  };
  if (config.enableSwagger) {
    payload.docs = '/swagger-ui/index.html';
  }
  return res.status(200).json(payload);
});

app.use(notFoundHandler);
app.use(errorHandler);

async function connectDatabaseWithRetry(maxAttempts = 5, delayMs = 3000) {
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      const result = await testConnection();
      console.log(
        `Connected to PostgreSQL successfully (database=${result.database}, time=${result.currentTime})`
      );
      return;
    } catch (error) {
      const message = error?.message || String(error);
      if (attempt >= maxAttempts) {
        throw error;
      }
      console.warn(
        `Database connect attempt ${attempt}/${maxAttempts} failed: ${message}. Retrying in ${delayMs / 1000}s...`
      );
      await new Promise((resolve) => setTimeout(resolve, delayMs));
    }
  }
}

async function startServer() {
  try {
    console.log(`Application timezone set to: ${config.timezone}`);
    console.log(`NODE_ENV=${config.nodeEnv}`);
    await connectDatabaseWithRetry();

    const server = app.listen(PORT, '0.0.0.0', () => {
      console.log(`Backend running on 0.0.0.0:${PORT}`);
      console.log(`Health: /api/health`);
      if (config.enableSwagger) {
        console.log(`Swagger: /swagger-ui/index.html`);
      } else {
        console.log('Swagger: disabled');
      }
    });

    const shutdown = async (signal) => {
      console.log(`\n${signal}: shutting down...`);
      server.close(async () => {
        try {
          await closePool();
          console.log('Database pool closed');
          process.exit(0);
        } catch (error) {
          console.error('Error closing database pool:', error?.message || error);
          process.exit(1);
        }
      });
    };

    process.on('SIGINT', () => void shutdown('SIGINT'));
    process.on('SIGTERM', () => void shutdown('SIGTERM'));

    return server;
  } catch (error) {
    console.error('Server startup failed:', error?.message || error);
    try {
      await closePool();
    } catch {
      // ignore
    }
    process.exit(1);
  }
}

startServer();
