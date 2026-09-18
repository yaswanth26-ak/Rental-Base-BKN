/**
 * Central 404 + error handlers.
 */

import { AppError } from '../utils/errors.js';

export function notFoundHandler(req, res) {
  return res.status(404).json({
    success: false,
    message: `Cannot ${req.method} ${req.originalUrl}`,
  });
}

export function errorHandler(err, req, res, next) {
  if (res.headersSent) {
    return next(err);
  }

  // Known application errors
  if (err instanceof AppError || err.statusCode || err.status) {
    const status = err.statusCode || err.status || 400;
    return res.status(status).json({
      success: false,
      message: err.message || 'Request failed',
    });
  }

  // PostgreSQL unique violation
  if (err.code === '23505') {
    const detail = err.detail || '';
    if (detail.includes('phone')) {
      return res.status(409).json({
        success: false,
        message: 'Phone number is already registered',
      });
    }
    if (detail.includes('email')) {
      return res.status(409).json({
        success: false,
        message: 'Email is already registered',
      });
    }
    return res.status(409).json({
      success: false,
      message: 'Duplicate record already exists',
    });
  }

  // PostgreSQL foreign key / check constraint
  if (err.code === '23503') {
    return res.status(400).json({
      success: false,
      message: 'Related record not found',
    });
  }

  if (err.code === '23514') {
    return res.status(400).json({
      success: false,
      message: 'Database constraint violated',
    });
  }

  console.error('Unhandled error:', err);
  return res.status(500).json({
    success: false,
    message: 'Internal Server Error',
  });
}
