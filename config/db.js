import pg from 'pg';
import config from './index.js';

const { Pool } = pg;

/**
 * PostgreSQL connection pool.
 * Mirrors the reference project's config/db.js pattern
 * (assert required env, create pool, testConnection, closePool, default export).
 */
function assertDbConfig() {
  const required = ['host', 'user', 'password', 'database'];
  const missing = required.filter((key) => !config.db[key]);
  if (missing.length > 0) {
    throw new Error(
      `Missing database configuration: ${missing.join(', ')}. Set DB_* values in .env`
    );
  }
}

assertDbConfig();

const pool = new Pool({
  host: config.db.host,
  port: config.db.port,
  user: config.db.user,
  password: config.db.password,
  database: config.db.database,
  max: config.db.connectionLimit,
});

/**
 * Verify connectivity (used at startup and health check).
 * @returns {Promise<{ ok: boolean, currentTime?: Date|string, database?: string }>}
 */
export async function testConnection() {
  const client = await pool.connect();
  try {
    const result = await client.query(
      'SELECT NOW() AS "currentTime", current_database() AS "databaseName"'
    );
    return {
      ok: true,
      currentTime: result.rows[0]?.currentTime,
      database: result.rows[0]?.databaseName,
    };
  } finally {
    client.release();
  }
}

export async function closePool() {
  await pool.end();
}

export default pool;
