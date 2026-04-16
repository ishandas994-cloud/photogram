
const { Pool } = require('pg');

const pool = new Pool({
  host:     process.env.DB_HOST     || 'localhost',
  port:     parseInt(process.env.DB_PORT) || 5432,
  database: process.env.DB_NAME     || 'photogram',
  user:     process.env.DB_USER     || 'postgres',
  password: process.env.DB_PASSWORD || '23032005',
  max: 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000,
});

pool.on('error', (err) => {
  console.error('Unexpected error on idle DB client', err);
  process.exit(-1);
});

const db = async (strings, ...values) => {
  const text = strings.reduce((acc, str, i) =>
    acc + str + (i < values.length ? '$' + (i+1) : ''), '');
  const client = await pool.connect();
  try {
    return await client.query(text, values);
  } finally {
    client.release();
  }
};

db.pool    = pool;
db.query   = (text, params) => pool.query(text, params);
db.connect = () => pool.connect();

module.exports = db;