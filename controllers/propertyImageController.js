import { asyncHandler } from '../utils/errors.js';
import * as propertyService from '../services/propertyService.js';

export const addImage = asyncHandler(async (req, res) => {
  const image = await propertyService.addPropertyImage(
    req.params.propertyId,
    req.user.id,
    req.body
  );
  return res.status(201).json({
    success: true,
    message: 'Image added successfully',
    data: image,
  });
});

export const listImages = asyncHandler(async (req, res) => {
  const images = await propertyService.listPropertyImages(
    req.params.propertyId
  );
  return res.status(200).json({
    success: true,
    message: 'Images fetched successfully',
    data: images,
  });
});

export const updateImage = asyncHandler(async (req, res) => {
  const image = await propertyService.updatePropertyImage(
    req.params.propertyId,
    req.params.imageId,
    req.user.id,
    req.body
  );
  return res.status(200).json({
    success: true,
    message: 'Image updated successfully',
    data: image,
  });
});

export const deleteImage = asyncHandler(async (req, res) => {
  const image = await propertyService.deletePropertyImage(
    req.params.propertyId,
    req.params.imageId,
    req.user.id
  );
  return res.status(200).json({
    success: true,
    message: 'Image deleted successfully',
    data: image,
  });
});
