import pool from '../config/db.js';

function mapProperty(row) {
  if (!row) return null;
  return {
    id: Number(row.id),
    owner_id: Number(row.owner_id),
    name: row.name,
    description: row.description,
    address: row.address,
    city: row.city,
    state: row.state,
    price_per_day: row.price_per_day != null ? Number(row.price_per_day) : null,
    max_guests: Number(row.max_guests),
    bedrooms: Number(row.bedrooms),
    bathrooms: Number(row.bathrooms),
    is_active: Boolean(row.is_active),
    created_at: row.created_at,
    updated_at: row.updated_at,
    main_image: row.main_image || null,
  };
}

class PropertyDB {
  static async create(ownerId, data) {
    const result = await pool.query(
      `INSERT INTO properties (
         owner_id, name, description, address, city, state,
         price_per_day, max_guests, bedrooms, bathrooms
       ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)
       RETURNING *`,
      [
        ownerId,
        data.name,
        data.description || null,
        data.address,
        data.city || null,
        data.state || null,
        data.price_per_day,
        data.max_guests ?? 1,
        data.bedrooms ?? 1,
        data.bathrooms ?? 1,
      ]
    );
    return mapProperty(result.rows[0]);
  }

  static async findById(id) {
    const result = await pool.query('SELECT * FROM properties WHERE id = $1', [
      id,
    ]);
    return mapProperty(result.rows[0]);
  }

  static async findByOwner(ownerId) {
    const result = await pool.query(
      `SELECT p.*,
              (
                SELECT pi.image_url
                FROM property_images pi
                WHERE pi.property_id = p.id
                ORDER BY
                  CASE WHEN pi.image_type = 'main' THEN 0 ELSE 1 END,
                  pi.display_order ASC,
                  pi.id ASC
                LIMIT 1
              ) AS main_image
       FROM properties p
       WHERE p.owner_id = $1
       ORDER BY p.created_at DESC`,
      [ownerId]
    );
    return result.rows.map(mapProperty);
  }

  static async listActive(filters = {}) {
    const clauses = ['p.is_active = TRUE'];
    const params = [];

    if (filters.city) {
      params.push(filters.city);
      clauses.push(`LOWER(p.city) = LOWER($${params.length})`);
    }
    if (filters.min_price != null) {
      params.push(filters.min_price);
      clauses.push(`p.price_per_day >= $${params.length}`);
    }
    if (filters.max_price != null) {
      params.push(filters.max_price);
      clauses.push(`p.price_per_day <= $${params.length}`);
    }
    if (filters.guests != null) {
      params.push(filters.guests);
      clauses.push(`p.max_guests >= $${params.length}`);
    }
    if (filters.bedrooms != null) {
      params.push(filters.bedrooms);
      clauses.push(`p.bedrooms >= $${params.length}`);
    }

    const result = await pool.query(
      `SELECT p.id, p.name, p.city, p.state, p.price_per_day,
              p.max_guests, p.bedrooms, p.bathrooms, p.is_active,
              (
                SELECT pi.image_url
                FROM property_images pi
                WHERE pi.property_id = p.id
                ORDER BY
                  CASE WHEN pi.image_type = 'main' THEN 0 ELSE 1 END,
                  pi.display_order ASC,
                  pi.id ASC
                LIMIT 1
              ) AS main_image
       FROM properties p
       WHERE ${clauses.join(' AND ')}
       ORDER BY p.created_at DESC`,
      params
    );

    return result.rows.map((row) => ({
      id: Number(row.id),
      name: row.name,
      city: row.city,
      state: row.state,
      price_per_day: Number(row.price_per_day),
      max_guests: Number(row.max_guests),
      bedrooms: Number(row.bedrooms),
      bathrooms: Number(row.bathrooms),
      main_image: row.main_image || null,
    }));
  }

  static async update(id, data) {
    const result = await pool.query(
      `UPDATE properties
       SET name = $1,
           description = $2,
           address = $3,
           city = $4,
           state = $5,
           price_per_day = $6,
           max_guests = $7,
           bedrooms = $8,
           bathrooms = $9,
           updated_at = NOW()
       WHERE id = $10
       RETURNING *`,
      [
        data.name,
        data.description || null,
        data.address,
        data.city || null,
        data.state || null,
        data.price_per_day,
        data.max_guests,
        data.bedrooms,
        data.bathrooms,
        id,
      ]
    );
    return mapProperty(result.rows[0]);
  }

  static async setActive(id, isActive) {
    const result = await pool.query(
      `UPDATE properties
       SET is_active = $1,
           updated_at = NOW()
       WHERE id = $2
       RETURNING *`,
      [isActive, id]
    );
    return mapProperty(result.rows[0]);
  }

  static async countByOwner(ownerId) {
    const result = await pool.query(
      `SELECT
         COUNT(*)::int AS total_properties,
         COUNT(*) FILTER (WHERE is_active = TRUE)::int AS active_properties
       FROM properties
       WHERE owner_id = $1`,
      [ownerId]
    );
    return result.rows[0];
  }
}

export default PropertyDB;
