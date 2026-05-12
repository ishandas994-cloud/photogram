const { Pool } = require('pg');

const pool = new Pool({
  host: process.env.DB_HOST,
  port: parseInt(process.env.DB_PORT) || 5432,
  database: process.env.DB_NAME,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,

  // IMPORTANT for Vercel / cloud DBs
  ssl: { rejectUnauthorized: false },

  max: 10,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 5000,
});

pool.on('error', (err) => {
  console.error('❌ Unexpected DB error:', err);
  process.exit(-1);
});

// Tagged query helper (your existing style)
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

// Extra helpers
db.pool = pool;
db.query = (text, params) => pool.query(text, params);
db.connect = () => pool.connect();

module.exports = db;