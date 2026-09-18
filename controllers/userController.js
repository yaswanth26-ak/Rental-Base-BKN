import { asyncHandler } from '../utils/errors.js';
import * as authService from '../services/authService.js';

export const getMe = asyncHandler(async (req, res) => {
  const user = await authService.getCurrentUser(req.user.id);
  return res.status(200).json({
    success: true,
    message: 'Profile fetched successfully',
    data: user,
  });
});

export const updateMe = asyncHandler(async (req, res) => {
  const user = await authService.updateProfile(req.user.id, req.body);
  return res.status(200).json({
    success: true,
    message: 'Profile updated successfully',
    data: user,
  });
});

export const changePassword = asyncHandler(async (req, res) => {
  await authService.changePassword(req.user.id, req.body);
  return res.status(200).json({
    success: true,
    message: 'Password updated successfully',
  });
});
