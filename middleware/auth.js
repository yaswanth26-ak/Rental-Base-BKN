import { verifyToken } from '../utils/jwt.js';
import { AppError } from '../utils/errors.js';

/**
 * Require a valid JWT Bearer token.
 * Attaches req.user = { id, role }
 */
export function requireAuth(req, res, next) {
  try {
    const header = req.headers.authorization;

    if (!header || !header.startsWith('Bearer ')) {
      throw new AppError('Authentication required', 401);
    }

    const token = header.slice(7).trim();
    if (!token) {
      throw new AppError('Authentication required', 401);
    }

    const decoded = verifyToken(token);
    const id = Number(decoded.id);
    const role = decoded.role;

    if (!id || !role) {
      throw new AppError('Invalid token payload', 401);
    }

    req.user = { id, role };
    next();
  } catch (error) {
    next(error);
  }
}

/**
 * Optional auth — attaches req.user when a valid token is present.
 */
export function optionalAuth(req, res, next) {
  try {
    const header = req.headers.authorization;
    if (!header || !header.startsWith('Bearer ')) {
      return next();
    }

    const token = header.slice(7).trim();
    if (!token) {
      return next();
    }

    const decoded = verifyToken(token);
    const id = Number(decoded.id);
    const role = decoded.role;
    if (id && role) {
      req.user = { id, role };
    }
    next();
  } catch {
    // Invalid optional token → treat as unauthenticated
    next();
  }
}

/**
 * Admin-only (function name kept for route compatibility).
 * Login role value: admin
 */
export function requireOwner(req, res, next) {
  if (!req.user) {
    return next(new AppError('Authentication required', 401));
  }
  if (req.user.role !== 'admin') {
    return next(new AppError('Admin access required', 403));
  }
  next();
}

/**
 * User-only (function name kept for route compatibility).
 * Login role value: user
 */
export function requireCustomer(req, res, next) {
  if (!req.user) {
    return next(new AppError('Authentication required', 401));
  }
  if (req.user.role !== 'user') {
    return next(new AppError('User access required', 403));
  }
  next();
}
