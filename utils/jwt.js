import jwt from 'jsonwebtoken';
import config from '../config/index.js';
import { AppError } from './errors.js';

export function signToken(payload) {
  if (!config.jwt.secretKey) {
    throw new AppError('JWT secret is not configured', 500);
  }

  return jwt.sign(payload, config.jwt.secretKey, {
    expiresIn: config.jwt.expiresIn,
  });
}

export function verifyToken(token) {
  if (!config.jwt.secretKey) {
    throw new AppError('JWT secret is not configured', 500);
  }

  try {
    return jwt.verify(token, config.jwt.secretKey);
  } catch {
    throw new AppError('Invalid or expired token', 401);
  }
}
