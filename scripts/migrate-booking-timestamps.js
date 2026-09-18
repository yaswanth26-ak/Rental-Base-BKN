/**
 * Safe one-time migration: bookings.check_in / check_out DATE → TIMESTAMPTZ
 * Existing date-only values become that date at 10:00 AM Asia/Kolkata.
 * Does NOT delete or truncate any data.
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
  const beforeCols = await client.query(
    `SELECT column_name, data_type
     FROM information_schema.columns
     WHERE table_schema = 'public' AND table_name = 'bookings'
       AND column_name IN ('check_in', 'check_out')
     ORDER BY column_name`
  );
  console.log('BEFORE_COLUMNS', JSON.stringify(beforeCols.rows));

  const beforeRows = await client.query(
    `SELECT id,
            check_in::text AS check_in_text,
            check_out::text AS check_out_text,
            total_nights, status
     FROM bookings ORDER BY id`
  );
  console.log('BEFORE_ROWS', JSON.stringify(beforeRows.rows, null, 2));

  const alreadyDone = beforeCols.rows.every(
    (r) => r.data_type === 'timestamp with time zone'
  );

  if (alreadyDone) {
    console.log('MIGRATION_SKIPPED: columns already TIMESTAMPTZ');
  } else {
    await client.query('BEGIN');

    await client.query(`
      ALTER TABLE bookings
        ALTER COLUMN check_in TYPE TIMESTAMPTZ
        USING ((check_in::timestamp + TIME '10:00') AT TIME ZONE 'Asia/Kolkata')
    `);

    await client.query(`
      ALTER TABLE bookings
        ALTER COLUMN check_out TYPE TIMESTAMPTZ
        USING ((check_out::timestamp + TIME '10:00') AT TIME ZONE 'Asia/Kolkata')
    `);

    await client.query('COMMIT');
    console.log('MIGRATION_APPLIED');
  }

  const afterCols = await client.query(
    `SELECT column_name, data_type
     FROM information_schema.columns
     WHERE table_schema = 'public' AND table_name = 'bookings'
       AND column_name IN ('check_in', 'check_out')
     ORDER BY column_name`
  );
  console.log('AFTER_COLUMNS', JSON.stringify(afterCols.rows));

  const afterRows = await client.query(
    `SELECT id,
            check_in AT TIME ZONE 'Asia/Kolkata' AS check_in_ist,
            check_out AT TIME ZONE 'Asia/Kolkata' AS check_out_ist,
            to_char(check_in AT TIME ZONE 'Asia/Kolkata', 'YYYY-MM-DD HH24:MI:SS') AS check_in_display,
            to_char(check_out AT TIME ZONE 'Asia/Kolkata', 'YYYY-MM-DD HH24:MI:SS') AS check_out_display,
            total_nights, status
     FROM bookings ORDER BY id`
  );
  console.log('AFTER_ROWS', JSON.stringify(afterRows.rows, null, 2));

  const constraint = await client.query(
    `SELECT conname, pg_get_constraintdef(oid) AS def
     FROM pg_constraint
     WHERE conrelid = 'public.bookings'::regclass
       AND conname = 'check_booking_dates'`
  );
  console.log('DATE_CONSTRAINT', JSON.stringify(constraint.rows));
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
