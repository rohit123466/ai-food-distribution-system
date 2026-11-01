/*
 * Plain-SQL migration runner: applies every .sql file in ./migrations, in filename
 * order, that isn't already recorded in the schema_migrations table.
 * Reads DB connection settings from ../server/.env.
 */
require('dotenv').config({ path: require('path').join(__dirname, '..', 'server', '.env') });
const fs = require('fs');
const path = require('path');
const mysql = require('mysql2/promise');

const MIGRATIONS_DIR = path.join(__dirname, 'migrations');

async function run() {
  const connection = await mysql.createConnection({
    host: process.env.DB_HOST || 'localhost',
    port: Number(process.env.DB_PORT) || 3306,
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'food_waste_redistribution',
    multipleStatements: true,
  });

  await connection.query(`
    CREATE TABLE IF NOT EXISTS schema_migrations (
      name       VARCHAR(255) PRIMARY KEY,
      applied_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
    )
  `);

  const [appliedRows] = await connection.query('SELECT name FROM schema_migrations');
  const applied = new Set(appliedRows.map((row) => row.name));

  const files = fs
    .readdirSync(MIGRATIONS_DIR)
    .filter((file) => file.endsWith('.sql'))
    .sort();

  for (const file of files) {
    if (applied.has(file)) {
      console.log(`skip  ${file} (already applied)`);
      continue;
    }
    const sql = fs.readFileSync(path.join(MIGRATIONS_DIR, file), 'utf8');
    console.log(`apply ${file}`);
    await connection.query(sql);
    await connection.query('INSERT INTO schema_migrations (name) VALUES (?)', [file]);
  }

  await connection.end();
  console.log('Migrations up to date.');
}

run().catch((err) => {
  console.error('Migration failed:', err.message);
  process.exit(1);
});
