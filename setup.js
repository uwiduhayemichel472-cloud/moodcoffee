// Creates the 'moodcoffee' database from moodcoffee.sql
// Run: npm run db:init
const fs = require('fs');
const path = require('path');
const mysql = require('mysql2/promise');

async function main() {
  const cfg = require('./config.js');
  const conn = await mysql.createConnection({
    host: cfg.db.host, port: cfg.db.port, user: cfg.db.user, password: cfg.db.password,
    ssl: cfg.db.ssl, multipleStatements: true
  });
  const sql = fs.readFileSync(path.join(__dirname, 'moodcoffee.sql'), 'utf8');
  await conn.query(sql);
  await conn.end();
  console.log('OK: database "' + cfg.db.database + '" is ready.');
}

main().catch(e => {
  console.error('Setup failed: ' + e.message);
  console.error('Is MySQL running? (Start it in XAMPP Control Panel)');
  process.exit(1);
});
