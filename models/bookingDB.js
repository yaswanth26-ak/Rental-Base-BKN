import pool from '../config/db.js';
import { formatBookingTimestamp } from '../utils/bookingTime.js';

function mapBooking(row) {
  if (!row) return null;
  return {
    id: Number(row.id),
    property_id: Number(row.property_id),
    customer_id: Number(row.customer_id),
    check_in: formatBookingTimestamp(row.check_in),
    check_out: formatBookingTimestamp(row.check_out),
    total_nights: Number(row.total_nights),
    total_amount: Number(row.total_amount),
    status: row.status,
    created_at: row.created_at,
    updated_at: row.updated_at,
    property_name: row.property_name || undefined,
    property_city: row.property_city || undefined,
    customer_name: row.customer_name || undefined,
    customer_phone: row.customer_phone || undefined,
  };
}

class BookingDB {
  static async createWithOverlapCheck({
    propertyId,
    customerId,
    checkIn,
    checkOut,
    totalNights,
    totalAmount,
  }) {
    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      // Lock property row to reduce race conditions
      const propertyResult = await client.query(
        `SELECT * FROM properties WHERE id = $1 FOR UPDATE`,
        [propertyId]
      );
      const property = propertyResult.rows[0];
      if (!property) {
        await client.query('ROLLBACK');
        return { error: 'NOT_FOUND' };
      }
      if (!property.is_active) {
        await client.query('ROLLBACK');
        return { error: 'INACTIVE' };
      }

      const overlap = await client.query(
        `SELECT id FROM bookings
         WHERE property_id = $1
           AND status IN ('pending', 'confirmed')
           AND check_in < $3
           AND check_out > $2
         FOR UPDATE`,
        [propertyId, checkIn, checkOut]
      );

      if (overlap.rows.length > 0) {
        await client.query('ROLLBACK');
        return { error: 'OVERLAP' };
      }

      const insert = await client.query(
        `INSERT INTO bookings (
           property_id, customer_id, check_in, check_out,
           total_nights, total_amount, status
         ) VALUES ($1, $2, $3, $4, $5, $6, 'confirmed')
         RETURNING *`,
        [propertyId, customerId, checkIn, checkOut, totalNights, totalAmount]
      );

      await client.query('COMMIT');
      return { booking: mapBooking(insert.rows[0]), property };
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  /**
   * Read-only overlap check (same rule as createWithOverlapCheck).
   * Only pending/confirmed bookings block availability.
   */
  static async hasOverlappingBooking(propertyId, checkIn, checkOut) {
    const result = await pool.query(
      `SELECT id FROM bookings
       WHERE property_id = $1
         AND status IN ('pending', 'confirmed')
         AND check_in < $3
         AND check_out > $2
       LIMIT 1`,
      [propertyId, checkIn, checkOut]
    );
    return result.rows.length > 0;
  }

  /**
   * Blocking intervals only (no customer PII).
   */
  static async listBlockingIntervals(propertyId) {
    const result = await pool.query(
      `SELECT check_in, check_out
       FROM bookings
       WHERE property_id = $1
         AND status IN ('pending', 'confirmed')
       ORDER BY check_in ASC`,
      [propertyId]
    );
    return result.rows.map((row) => ({
      check_in: row.check_in,
      check_out: row.check_out,
    }));
  }

  static async findById(id) {
    const result = await pool.query(
      `SELECT b.*,
              p.name AS property_name,
              p.city AS property_city,
              u.name AS customer_name,
              u.phone AS customer_phone
       FROM bookings b
       INNER JOIN properties p ON p.id = b.property_id
       INNER JOIN users u ON u.id = b.customer_id
       WHERE b.id = $1`,
      [id]
    );
    return mapBooking(result.rows[0]);
  }

  static async findByCustomer(customerId) {
    const result = await pool.query(
      `SELECT b.*,
              p.name AS property_name,
              p.city AS property_city
       FROM bookings b
       INNER JOIN properties p ON p.id = b.property_id
       WHERE b.customer_id = $1
       ORDER BY b.created_at DESC`,
      [customerId]
    );
    return result.rows.map(mapBooking);
  }

  static async findByOwner(ownerId) {
    const result = await pool.query(
      `SELECT b.*,
              p.name AS property_name,
              p.city AS property_city,
              u.name AS customer_name,
              u.phone AS customer_phone
       FROM bookings b
       INNER JOIN properties p ON p.id = b.property_id
       INNER JOIN users u ON u.id = b.customer_id
       WHERE p.owner_id = $1
       ORDER BY b.created_at DESC`,
      [ownerId]
    );
    return result.rows.map(mapBooking);
  }

  static async findByProperty(propertyId) {
    const result = await pool.query(
      `SELECT b.*,
              u.name AS customer_name,
              u.phone AS customer_phone
       FROM bookings b
       INNER JOIN users u ON u.id = b.customer_id
       WHERE b.property_id = $1
       ORDER BY b.check_in DESC`,
      [propertyId]
    );
    return result.rows.map(mapBooking);
  }

  static async updateStatus(id, status) {
    const result = await pool.query(
      `UPDATE bookings
       SET status = $1,
           updated_at = NOW()
       WHERE id = $2
       RETURNING *`,
      [status, id]
    );
    return mapBooking(result.rows[0]);
  }

  static async countByOwner(ownerId) {
    const result = await pool.query(
      `SELECT
         COUNT(*)::int AS total_bookings,
         COUNT(*) FILTER (WHERE b.status = 'confirmed')::int AS confirmed_bookings,
         COUNT(*) FILTER (WHERE b.status = 'pending')::int AS pending_bookings,
         COUNT(*) FILTER (WHERE b.status = 'cancelled')::int AS cancelled_bookings
       FROM bookings b
       INNER JOIN properties p ON p.id = b.property_id
       WHERE p.owner_id = $1`,
      [ownerId]
    );
    return result.rows[0];
  }

  static async getPropertyOwnerId(bookingId) {
    const result = await pool.query(
      `SELECT p.owner_id, b.customer_id, b.status
       FROM bookings b
       INNER JOIN properties p ON p.id = b.property_id
       WHERE b.id = $1`,
      [bookingId]
    );
    return result.rows[0] || null;
  }
}

export default BookingDB;
