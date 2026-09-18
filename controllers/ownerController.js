import { asyncHandler } from '../utils/errors.js';
import { getOwnerDashboard } from '../services/bookingService.js';

export const dashboard = asyncHandler(async (req, res) => {
  const data = await getOwnerDashboard(req.user.id);
  return res.status(200).json({
    success: true,
    message: 'Owner dashboard fetched successfully',
    data,
  });
});
