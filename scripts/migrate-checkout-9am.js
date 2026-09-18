/**
 * Safe migration: move existing booking check_out from 10:00 AM IST → 9:00 AM IST
 * on the same calendar date. Does NOT delete rows or change dates/amounts/status.
 */
import dotenv from 'dotenv';
dotenv.config();
import pg from 'pg';

const pool = new pg.Pool({
  host: process.env.DB_HOST,
  port: Number(process.env.DB_PORT) || 5432,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
});

const client = await pool.connect();

try {
  const before = await client.query(
    `SELECT id,
            to_char(check_in AT TIME ZONE 'Asia/Kolkata', 'YYYY-MM-DD HH24:MI') AS cin,
            to_char(check_out AT TIME ZONE 'Asia/Kolkata', 'YYYY-MM-DD HH24:MI') AS cout,
            total_nights, status
     FROM bookings
     ORDER BY id`
  );
  console.log('BEFORE', JSON.stringify(before.rows, null, 2));

  await client.query('BEGIN');

  const updated = await client.query(
    `UPDATE bookings
     SET check_out = (
           ((check_out AT TIME ZONE 'Asia/Kolkata')::date + TIME '09:00')
           AT TIME ZONE 'Asia/Kolkata'
         ),
         updated_at = NOW()
     WHERE to_char(check_out AT TIME ZONE 'Asia/Kolkata', 'HH24:MI') = '10:00'
     RETURNING id,
               to_char(check_out AT TIME ZONE 'Asia/Kolkata', 'YYYY-MM-DD HH24:MI') AS cout`
  );

  await client.query('COMMIT');
  console.log('UPDATED_COUNT', updated.rowCount);
  console.log('UPDATED_ROWS', JSON.stringify(updated.rows, null, 2));

  const after = await client.query(
    `SELECT id,
            to_char(check_in AT TIME ZONE 'Asia/Kolkata', 'YYYY-MM-DD HH24:MI') AS cin,
            to_char(check_out AT TIME ZONE 'Asia/Kolkata', 'YYYY-MM-DD HH24:MI') AS cout,
            total_nights, status
     FROM bookings
     ORDER BY id`
  );
  console.log('AFTER', JSON.stringify(after.rows, null, 2));
} catch (e) {
  try {
    await client.query('ROLLBACK');
  } catch {
    // ignore
  }
  console.error('MIGRATION_FAILED', e.message);
  process.exitCode = 1;
} finally {
  client.release();
  await pool.end();
}
