// Adds new tables/columns to an EXISTING 'moodcoffee' database WITHOUT deleting data.
// Run: node migrate.js    (start MySQL/XAMPP first)
const mysql = require('mysql2/promise');
const cfg = require('./config.js');

async function colExists(conn, table, col) {
  const [rows] = await conn.query(
    'SELECT COUNT(*) n FROM information_schema.COLUMNS WHERE TABLE_SCHEMA=? AND TABLE_NAME=? AND COLUMN_NAME=?',
    [cfg.db.database, table, col]);
  return !!rows[0].n;
}
async function addCol(conn, table, def) {
  const name = def.split(' ')[0];
  if (await colExists(conn, table, name)) return console.log(`  · ${table}.${name} — already exists`);
  await conn.query(`ALTER TABLE ${table} ADD COLUMN ${def}`);
  console.log(`  + ${table}.${name}`);
}

async function main() {
  const conn = await mysql.createConnection({
    host: cfg.db.host, port: cfg.db.port, user: cfg.db.user, password: cfg.db.password,
    ssl: cfg.db.ssl, multipleStatements: true
  });
  await conn.query(`CREATE DATABASE IF NOT EXISTS \`${cfg.db.database}\` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci`);
  await conn.query(`USE \`${cfg.db.database}\``);

  console.log('Creating new tables (if missing)…');
  await conn.query(`CREATE TABLE IF NOT EXISTS reviews (
    id INT AUTO_INCREMENT PRIMARY KEY,
    product_id INT NOT NULL,
    user_id INT DEFAULT NULL,
    customer_name VARCHAR(80) NOT NULL,
    rating TINYINT NOT NULL DEFAULT 5,
    comment VARCHAR(500) DEFAULT '',
    status TINYINT(1) NOT NULL DEFAULT 1,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE,
    FOREIGN KEY (user_id) REFERENCES customers(id) ON DELETE SET NULL
  ) ENGINE=InnoDB`);
  await conn.query(`CREATE TABLE IF NOT EXISTS reservations (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT DEFAULT NULL,
    name VARCHAR(80) NOT NULL,
    phone VARCHAR(30) NOT NULL,
    guests INT NOT NULL DEFAULT 1,
    res_date DATE NOT NULL,
    res_time VARCHAR(10) NOT NULL,
    notes VARCHAR(500) DEFAULT '',
    status VARCHAR(20) NOT NULL DEFAULT 'Pending',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES customers(id) ON DELETE SET NULL
  ) ENGINE=InnoDB`);
  await conn.query(`CREATE TABLE IF NOT EXISTS giftcards (
    id INT AUTO_INCREMENT PRIMARY KEY,
    code VARCHAR(24) NOT NULL UNIQUE,
    amount DECIMAL(8,2) NOT NULL,
    balance DECIMAL(8,2) NOT NULL,
    buyer_name VARCHAR(80) DEFAULT '',
    buyer_email VARCHAR(120) DEFAULT '',
    message VARCHAR(500) DEFAULT '',
    status TINYINT(1) NOT NULL DEFAULT 1,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
  ) ENGINE=InnoDB`);
  await conn.query(`CREATE TABLE IF NOT EXISTS rewards (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    code VARCHAR(24) NOT NULL UNIQUE,
    title VARCHAR(60) NOT NULL,
    value DECIMAL(8,2) NOT NULL,
    status TINYINT(1) NOT NULL DEFAULT 1,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    redeemed_at DATETIME DEFAULT NULL,
    FOREIGN KEY (user_id) REFERENCES customers(id) ON DELETE CASCADE
  ) ENGINE=InnoDB`);

  console.log('Adding new columns (if missing)…');
  await addCol(conn, 'customers', 'points INT NOT NULL DEFAULT 0');
  await addCol(conn, 'orders', 'points_earned INT DEFAULT 0');
  await addCol(conn, 'orders', 'points_used INT DEFAULT 0');
  await addCol(conn, 'orders', 'gift_code VARCHAR(24) DEFAULT NULL');
  await addCol(conn, 'orders', 'gift_amount DECIMAL(8,2) DEFAULT 0');
  await addCol(conn, 'orders', 'tx_id VARCHAR(64) DEFAULT NULL');
  await addCol(conn, 'orders', 'charge_id VARCHAR(64) DEFAULT NULL');
  await addCol(conn, 'settings', 'points_value DECIMAL(8,4) DEFAULT 0.0100');
  await addCol(conn, 'settings', 'loyalty_threshold INT NOT NULL DEFAULT 100');
  await addCol(conn, 'settings', 'smtp_json VARCHAR(2000) DEFAULT NULL');
  await addCol(conn, 'settings', 'max_review_len INT DEFAULT 300');
  await addCol(conn, 'sessions', "ip VARCHAR(45) DEFAULT ''");
  await addCol(conn, 'sessions', "ua VARCHAR(255) DEFAULT ''");

  // Ensure the loyalty toggle exists in the existing settings JSON (default ON)
  const [stRows] = await conn.query('SELECT toggles FROM settings WHERE id=1');
  if (stRows.length) {
    let t = {};
    try { t = JSON.parse(stRows[0].toggles || '{}'); } catch (e) { t = {}; }
    if (t.loyalty === undefined) {
      t.loyalty = true;
      await conn.query('UPDATE settings SET toggles=? WHERE id=1', [JSON.stringify(t)]);
      console.log('  + settings.toggles.loyalty (default ON)');
    }
  }

  await conn.end();
  console.log('OK: database "' + cfg.db.database + '" is up to date.');
}

// Auto-run when invoked directly (node migrate.js), or imported by server.js
// so every deploy brings the schema up to date automatically.
if (require.main === module) {
  main().catch(e => {
    console.error('Migration failed: ' + e.message);
    console.error('Is MySQL running? (Start it in XAMPP Control Panel)');
    process.exit(1);
  });
}

module.exports = { migrate: main };
