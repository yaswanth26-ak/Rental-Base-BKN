import { asyncHandler } from '../utils/errors.js';
import * as authService from '../services/authService.js';

export const register = asyncHandler(async (req, res) => {
  const data = await authService.registerUser(req.body);
  return res.status(201).json({
    success: true,
    message: 'Registration successful',
    data,
  });
});

export const login = asyncHandler(async (req, res) => {
  const data = await authService.loginUser(req.body);
  return res.status(200).json({
    success: true,
    message: 'Login successful',
    data,
  });
});

export const me = asyncHandler(async (req, res) => {
  const user = await authService.getCurrentUser(req.user.id);
  return res.status(200).json({
    success: true,
    message: 'User fetched successfully',
    data: user,
  });
});
