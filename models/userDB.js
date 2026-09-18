import pool from '../config/db.js';

function mapUser(row) {
  if (!row) return null;
  return {
    id: Number(row.id),
    name: row.name,
    phone: row.phone,
    email: row.email,
    password_hash: row.password_hash,
    role: row.role,
    created_at: row.created_at,
    updated_at: row.updated_at,
  };
}

class UserDB {
  static async create({ name, phone, email, passwordHash, role }) {
    const result = await pool.query(
      `INSERT INTO users (name, phone, email, password_hash, role)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING *`,
      [name, phone, email || null, passwordHash, role]
    );
    return mapUser(result.rows[0]);
  }

  static async findById(id) {
    const result = await pool.query('SELECT * FROM users WHERE id = $1', [id]);
    return mapUser(result.rows[0]);
  }

  static async findByPhone(phone) {
    const result = await pool.query('SELECT * FROM users WHERE phone = $1', [
      phone,
    ]);
    return mapUser(result.rows[0]);
  }

  static async findByEmail(email) {
    if (!email) return null;
    const result = await pool.query('SELECT * FROM users WHERE email = $1', [
      email,
    ]);
    return mapUser(result.rows[0]);
  }

  static async updateProfile(id, { name, email, phone }) {
    const result = await pool.query(
      `UPDATE users
       SET name = $1,
           email = $2,
           phone = $3,
           updated_at = NOW()
       WHERE id = $4
       RETURNING *`,
      [name, email || null, phone, id]
    );
    return mapUser(result.rows[0]);
  }

  static async updatePassword(id, passwordHash) {
    const result = await pool.query(
      `UPDATE users
       SET password_hash = $1,
           updated_at = NOW()
       WHERE id = $2
       RETURNING *`,
      [passwordHash, id]
    );
    return mapUser(result.rows[0]);
  }
}

export default UserDB;
