import { asyncHandler } from '../utils/errors.js';
import * as propertyService from '../services/propertyService.js';

export const createProperty = asyncHandler(async (req, res) => {
  const property = await propertyService.createProperty(req.user.id, req.body);
  return res.status(201).json({
    success: true,
    message: 'Property created successfully',
    data: property,
  });
});

export const listPublicProperties = asyncHandler(async (req, res) => {
  const properties = await propertyService.listPublicProperties(req.query);
  return res.status(200).json({
    success: true,
    message: 'Properties fetched successfully',
    data: properties,
  });
});

export const listMyProperties = asyncHandler(async (req, res) => {
  const properties = await propertyService.listMyProperties(req.user.id);
  return res.status(200).json({
    success: true,
    message: 'Owner properties fetched successfully',
    data: properties,
  });
});

export const getPropertyById = asyncHandler(async (req, res) => {
  const property = await propertyService.getPropertyDetails(
    req.params.id,
    req.user || null
  );
  return res.status(200).json({
    success: true,
    message: 'Property fetched successfully',
    data: property,
  });
});

export const updateProperty = asyncHandler(async (req, res) => {
  const property = await propertyService.updateProperty(
    req.params.id,
    req.user.id,
    req.body
  );
  return res.status(200).json({
    success: true,
    message: 'Property updated successfully',
    data: property,
  });
});

export const deleteProperty = asyncHandler(async (req, res) => {
  const property = await propertyService.deactivateProperty(
    req.params.id,
    req.user.id
  );
  return res.status(200).json({
    success: true,
    message: 'Property deactivated successfully',
    data: property,
  });
});

export const updatePropertyStatus = asyncHandler(async (req, res) => {
  const property = await propertyService.updatePropertyStatus(
    req.params.id,
    req.user.id,
    req.body
  );
  return res.status(200).json({
    success: true,
    message: 'Property status updated successfully',
    data: property,
  });
});
