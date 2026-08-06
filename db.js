// ─── MySQL pool ─────────────────────────────────────
const mysql = require('mysql2/promise');
const cfg = require('./config.js');

const pool = mysql.createPool({
  host: cfg.db.host,
  port: cfg.db.port,
  user: cfg.db.user,
  password: cfg.db.password,
  database: cfg.db.database,
  ssl: cfg.db.ssl,
  waitForConnections: true,
  connectionLimit: 10,
  namedPlaceholders: true
});

// Tiny query helper: always returns rows, throws on error
async function q(sql, params) {
  const [rows] = await pool.execute(sql, params || []);
  return rows;
}

module.exports = { pool, q };
