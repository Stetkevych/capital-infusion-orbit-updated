const { Pool } = require('pg');

let pool;

const initializeDb = async () => {
  pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    max: 20,
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 2000,
  });

  pool.on('error', (err) => {
    console.error('Unexpected error on idle client', err);
  });

  try {
    const client = await pool.connect();
    console.log('Database connected successfully');
    client.release();
  } catch (err) {
    console.error('Failed to connect to database:', err);
    throw err;
  }
};

const getPool = () => {
  if (!pool) {
    throw new Error('Database pool not initialized');
  }
  return pool;
};

const query = async (sql, params = []) => {
  const client = await getPool().connect();
  try {
    const result = await client.query(sql, params);
    return result;
  } finally {
    client.release();
  }
};

const closeDb = async () => {
  if (pool) {
    await pool.end();
  }
};

module.exports = {
  initializeDb,
  getPool,
  query,
  closeDb
};
