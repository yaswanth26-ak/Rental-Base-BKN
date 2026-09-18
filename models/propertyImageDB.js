import pool from '../config/db.js';

function mapImage(row) {
  if (!row) return null;
  return {
    id: Number(row.id),
    property_id: Number(row.property_id),
    image_url: row.image_url,
    image_type: row.image_type,
    display_order: Number(row.display_order),
    created_at: row.created_at,
  };
}

class PropertyImageDB {
  static async create(propertyId, { image_url, image_type, display_order }) {
    const result = await pool.query(
      `INSERT INTO property_images (property_id, image_url, image_type, display_order)
       VALUES ($1, $2, $3, $4)
       RETURNING *`,
      [propertyId, image_url, image_type || 'other', display_order ?? 0]
    );
    return mapImage(result.rows[0]);
  }

  static async findByProperty(propertyId) {
    const result = await pool.query(
      `SELECT * FROM property_images
       WHERE property_id = $1
       ORDER BY display_order ASC, id ASC`,
      [propertyId]
    );
    return result.rows.map(mapImage);
  }

  static async findById(imageId) {
    const result = await pool.query(
      'SELECT * FROM property_images WHERE id = $1',
      [imageId]
    );
    return mapImage(result.rows[0]);
  }

  static async update(imageId, { image_url, image_type, display_order }) {
    const result = await pool.query(
      `UPDATE property_images
       SET image_url = $1,
           image_type = $2,
           display_order = $3
       WHERE id = $4
       RETURNING *`,
      [image_url, image_type, display_order, imageId]
    );
    return mapImage(result.rows[0]);
  }

  static async delete(imageId) {
    const result = await pool.query(
      'DELETE FROM property_images WHERE id = $1 RETURNING *',
      [imageId]
    );
    return mapImage(result.rows[0]);
  }
}

export default PropertyImageDB;
