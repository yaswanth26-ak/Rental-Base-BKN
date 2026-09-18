import pool from '../config/db.js';

function mapAmenity(row) {
  if (!row) return null;
  return {
    id: Number(row.id),
    name: row.name,
    icon: row.icon,
    created_at: row.created_at,
  };
}

class AmenityDB {
  static async findAll() {
    const result = await pool.query(
      'SELECT * FROM amenities ORDER BY name ASC'
    );
    return result.rows.map(mapAmenity);
  }

  static async findByIds(ids) {
    if (!ids.length) return [];
    const result = await pool.query(
      'SELECT * FROM amenities WHERE id = ANY($1::bigint[])',
      [ids]
    );
    return result.rows.map(mapAmenity);
  }

  static async findByProperty(propertyId) {
    const result = await pool.query(
      `SELECT a.*
       FROM amenities a
       INNER JOIN property_amenities pa ON pa.amenity_id = a.id
       WHERE pa.property_id = $1
       ORDER BY a.name ASC`,
      [propertyId]
    );
    return result.rows.map(mapAmenity);
  }

  /**
   * Replace all amenities for a property inside a transaction.
   */
  static async replaceForProperty(propertyId, amenityIds) {
    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      await client.query(
        'DELETE FROM property_amenities WHERE property_id = $1',
        [propertyId]
      );

      const uniqueIds = [...new Set(amenityIds.map(Number))];

      for (const amenityId of uniqueIds) {
        await client.query(
          `INSERT INTO property_amenities (property_id, amenity_id)
           VALUES ($1, $2)`,
          [propertyId, amenityId]
        );
      }

      await client.query('COMMIT');

      return AmenityDB.findByProperty(propertyId);
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }
}

export default AmenityDB;
