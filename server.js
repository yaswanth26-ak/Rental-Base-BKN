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

const corsOptions = {
  origin: true,
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['*'],
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

mountSwagger(app);

app.get('/', (req, res) => {
  res.status(200).json({
    application: 'rental-booking-backend',
    status: 'up',
    message: 'Rental Booking API is running',
    docs: '/swagger-ui/index.html',
  });
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
    await connectDatabaseWithRetry();

    const server = app.listen(PORT, () => {
      console.log(`Backend running on port ${PORT}`);
      console.log(`Root: http://localhost:${PORT}/`);
      console.log(`Health: http://localhost:${PORT}/api/health`);
      console.log(`Swagger: http://localhost:${PORT}/swagger-ui/index.html`);
    });

    const shutdown = async (signal) => {
      console.log(`\n${signal}: shutting down...`);
      server.close(async () => {
        try {
          await closePool();
          console.log('Database pool closed');
          process.exit(0);
        } catch (error) {
          console.error('Error closing database pool:', error);
          process.exit(1);
        }
      });
    };

    process.on('SIGINT', () => void shutdown('SIGINT'));
    process.on('SIGTERM', () => void shutdown('SIGTERM'));

    return server;
  } catch (error) {
    console.error('Server startup failed:', error);
    try {
      await closePool();
    } catch {
      // ignore
    }
    process.exit(1);
  }
}

startServer();
