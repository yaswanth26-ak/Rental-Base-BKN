import { asyncHandler } from '../utils/errors.js';
import * as propertyService from '../services/propertyService.js';

export const listAmenities = asyncHandler(async (req, res) => {
  const amenities = await propertyService.listAmenities();
  return res.status(200).json({
    success: true,
    message: 'Amenities fetched successfully',
    data: amenities,
  });
});

export const getPropertyAmenities = asyncHandler(async (req, res) => {
  const amenities = await propertyService.getPropertyAmenities(
    req.params.propertyId
  );
  return res.status(200).json({
    success: true,
    message: 'Property amenities fetched successfully',
    data: amenities,
  });
});

export const replacePropertyAmenities = asyncHandler(async (req, res) => {
  const amenities = await propertyService.replacePropertyAmenities(
    req.params.propertyId,
    req.user.id,
    req.body
  );
  return res.status(200).json({
    success: true,
    message: 'Property amenities updated successfully',
    data: amenities,
  });
});
