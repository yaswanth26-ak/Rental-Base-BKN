import PropertyDB from '../models/propertyDB.js';
import PropertyImageDB from '../models/propertyImageDB.js';
import AmenityDB from '../models/amenityDB.js';
import { AppError } from '../utils/errors.js';
import {
  ALLOWED_IMAGE_TYPES,
  parsePositiveInt,
  requireFields,
} from '../utils/validation.js';

async function assertOwnerProperty(propertyId, ownerId) {
  const property = await PropertyDB.findById(propertyId);
  if (!property) {
    throw new AppError('Property not found', 404);
  }
  if (property.owner_id !== ownerId) {
    throw new AppError('You do not own this property', 403);
  }
  return property;
}

export async function createProperty(ownerId, body) {
  requireFields(body, ['name', 'address', 'price_per_day']);

  const price = Number(body.price_per_day);
  if (!Number.isFinite(price) || price <= 0) {
    throw new AppError('price_per_day must be a positive number', 400);
  }

  return PropertyDB.create(ownerId, {
    name: String(body.name).trim(),
    description: body.description ? String(body.description).trim() : null,
    address: String(body.address).trim(),
    city: body.city ? String(body.city).trim() : null,
    state: body.state ? String(body.state).trim() : null,
    price_per_day: price,
    max_guests: body.max_guests != null ? Number(body.max_guests) : 1,
    bedrooms: body.bedrooms != null ? Number(body.bedrooms) : 1,
    bathrooms: body.bathrooms != null ? Number(body.bathrooms) : 1,
  });
}

export async function listMyProperties(ownerId) {
  return PropertyDB.findByOwner(ownerId);
}

export async function listPublicProperties(query) {
  const filters = {};

  if (query.city) filters.city = String(query.city).trim();
  if (query.min_price != null && query.min_price !== '') {
    filters.min_price = Number(query.min_price);
  }
  if (query.max_price != null && query.max_price !== '') {
    filters.max_price = Number(query.max_price);
  }
  if (query.guests != null && query.guests !== '') {
    filters.guests = Number(query.guests);
  }
  if (query.bedrooms != null && query.bedrooms !== '') {
    filters.bedrooms = Number(query.bedrooms);
  }

  return PropertyDB.listActive(filters);
}

export async function getPropertyDetails(propertyId, requester) {
  const id = parsePositiveInt(propertyId, 'property id');
  const property = await PropertyDB.findById(id);
  if (!property) {
    throw new AppError('Property not found', 404);
  }

  const isOwner =
    requester &&
    requester.role === 'admin' &&
    requester.id === property.owner_id;

  if (!property.is_active && !isOwner) {
    throw new AppError('Property not found', 404);
  }

  const [images, amenities] = await Promise.all([
    PropertyImageDB.findByProperty(id),
    AmenityDB.findByProperty(id),
  ]);

  return { ...property, images, amenities };
}

export async function updateProperty(propertyId, ownerId, body) {
  const id = parsePositiveInt(propertyId, 'property id');
  const existing = await assertOwnerProperty(id, ownerId);

  requireFields(body, ['name', 'address', 'price_per_day']);

  const price = Number(body.price_per_day);
  if (!Number.isFinite(price) || price <= 0) {
    throw new AppError('price_per_day must be a positive number', 400);
  }

  return PropertyDB.update(id, {
    name: String(body.name).trim(),
    description: body.description ? String(body.description).trim() : null,
    address: String(body.address).trim(),
    city: body.city ? String(body.city).trim() : null,
    state: body.state ? String(body.state).trim() : null,
    price_per_day: price,
    max_guests:
      body.max_guests != null ? Number(body.max_guests) : existing.max_guests,
    bedrooms:
      body.bedrooms != null ? Number(body.bedrooms) : existing.bedrooms,
    bathrooms:
      body.bathrooms != null ? Number(body.bathrooms) : existing.bathrooms,
  });
}

export async function deactivateProperty(propertyId, ownerId) {
  const id = parsePositiveInt(propertyId, 'property id');
  await assertOwnerProperty(id, ownerId);
  return PropertyDB.setActive(id, false);
}

export async function updatePropertyStatus(propertyId, ownerId, body) {
  const id = parsePositiveInt(propertyId, 'property id');
  await assertOwnerProperty(id, ownerId);

  if (typeof body.is_active !== 'boolean') {
    throw new AppError('is_active (boolean) is required', 400);
  }

  return PropertyDB.setActive(id, body.is_active);
}

export async function addPropertyImage(propertyId, ownerId, body) {
  const id = parsePositiveInt(propertyId, 'property id');
  await assertOwnerProperty(id, ownerId);
  requireFields(body, ['image_url']);

  const imageType = body.image_type
    ? String(body.image_type).trim()
    : 'other';

  if (!ALLOWED_IMAGE_TYPES.includes(imageType)) {
    throw new AppError(
      `image_type must be one of: ${ALLOWED_IMAGE_TYPES.join(', ')}`,
      400
    );
  }

  return PropertyImageDB.create(id, {
    image_url: String(body.image_url).trim(),
    image_type: imageType,
    display_order:
      body.display_order != null ? Number(body.display_order) : 0,
  });
}

export async function listPropertyImages(propertyId) {
  const id = parsePositiveInt(propertyId, 'property id');
  const property = await PropertyDB.findById(id);
  if (!property) {
    throw new AppError('Property not found', 404);
  }
  return PropertyImageDB.findByProperty(id);
}

export async function updatePropertyImage(
  propertyId,
  imageId,
  ownerId,
  body
) {
  const pId = parsePositiveInt(propertyId, 'property id');
  const iId = parsePositiveInt(imageId, 'image id');
  await assertOwnerProperty(pId, ownerId);

  const image = await PropertyImageDB.findById(iId);
  if (!image || image.property_id !== pId) {
    throw new AppError('Image not found', 404);
  }

  requireFields(body, ['image_url']);

  const imageType = body.image_type
    ? String(body.image_type).trim()
    : image.image_type;

  if (!ALLOWED_IMAGE_TYPES.includes(imageType)) {
    throw new AppError(
      `image_type must be one of: ${ALLOWED_IMAGE_TYPES.join(', ')}`,
      400
    );
  }

  return PropertyImageDB.update(iId, {
    image_url: String(body.image_url).trim(),
    image_type: imageType,
    display_order:
      body.display_order != null
        ? Number(body.display_order)
        : image.display_order,
  });
}

export async function deletePropertyImage(propertyId, imageId, ownerId) {
  const pId = parsePositiveInt(propertyId, 'property id');
  const iId = parsePositiveInt(imageId, 'image id');
  await assertOwnerProperty(pId, ownerId);

  const image = await PropertyImageDB.findById(iId);
  if (!image || image.property_id !== pId) {
    throw new AppError('Image not found', 404);
  }

  return PropertyImageDB.delete(iId);
}

export async function listAmenities() {
  return AmenityDB.findAll();
}

export async function getPropertyAmenities(propertyId) {
  const id = parsePositiveInt(propertyId, 'property id');
  const property = await PropertyDB.findById(id);
  if (!property) {
    throw new AppError('Property not found', 404);
  }
  return AmenityDB.findByProperty(id);
}

export async function replacePropertyAmenities(propertyId, ownerId, body) {
  const id = parsePositiveInt(propertyId, 'property id');
  await assertOwnerProperty(id, ownerId);

  if (!Array.isArray(body.amenity_ids)) {
    throw new AppError('amenity_ids must be an array', 400);
  }

  const amenityIds = body.amenity_ids.map((v) => Number(v));
  if (amenityIds.some((v) => !Number.isInteger(v) || v <= 0)) {
    throw new AppError('amenity_ids must contain positive integers', 400);
  }

  const uniqueIds = [...new Set(amenityIds)];
  if (uniqueIds.length > 0) {
    const found = await AmenityDB.findByIds(uniqueIds);
    if (found.length !== uniqueIds.length) {
      throw new AppError('One or more amenity IDs are invalid', 400);
    }
  }

  return AmenityDB.replaceForProperty(id, uniqueIds);
}
