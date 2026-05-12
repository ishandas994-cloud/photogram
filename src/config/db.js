const { Pool } = require('pg');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,

  ssl: {
    rejectUnauthorized: false,
  },
});

pool.on('error', (err) => {
  console.error('Unexpected error on idle DB client', err);
  process.exit(-1);
});

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

db.pool = pool;
db.query = (text, params) => pool.query(text, params);
db.connect = () => pool.connect();

module.exports = db;