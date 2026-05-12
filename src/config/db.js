const { Pool } = require('pg');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,

  // REQUIRED for Neon / Vercel / cloud Postgres
  ssl: {
    rejectUnauthorized: false,
  },

  max: 10,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 5000,
});

pool.on('error', (err) => {
  console.error('❌ Unexpected DB error:', err);
  process.exit(-1);
});

// Tagged query helper
const db = async (strings, ...values) => {
  const text = strings.reduce(
    (acc, str, i) =>
      acc + str + (i < values.length ? '$' + (i + 1) : ''),
    ''
  );

  const client = await pool.connect();

  try {
    return await client.query(text, values);
  } finally {
    client.release();
  }
};

// Helpers
db.pool = pool;
db.query = (text, params) => pool.query(text, params);
db.connect = () => pool.connect();

module.exports = db;