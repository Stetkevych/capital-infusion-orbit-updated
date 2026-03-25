const fs = require('fs');
const path = require('path');
const { getPool } = require('../src/config/database');

async function runMigrations() {
  const pool = getPool();

  try {
    console.log('Running migrations...');

    // Read and execute schema
    const schemaPath = path.join(__dirname, '../..', 'schema', '001_init_schema.sql');
    const schema = fs.readFileSync(schemaPath, 'utf8');

    const client = await pool.connect();
    try {
      await client.query(schema);
      console.log('✓ Schema created successfully');
    } finally {
      client.release();
    }

    console.log('✓ All migrations completed');
    process.exit(0);
  } catch (err) {
    console.error('Migration error:', err);
    process.exit(1);
  }
}

runMigrations();
