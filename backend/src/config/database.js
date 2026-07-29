const { Pool } = require("pg");
const env = require("./env");

const pool = new Pool({
  host: env.database.host,
  port: env.database.port,
  database: env.database.name,
  user: env.database.user,
  password: env.database.password,
  ssl: env.database.ssl ? { rejectUnauthorized: false } : false
});

const connectDatabase = async () => {
  const client = await pool.connect();

  try {
    await client.query(`
      ALTER TABLE users
        ADD COLUMN IF NOT EXISTS is_admin BOOLEAN NOT NULL DEFAULT FALSE;
    `);

    await client.query(`
      CREATE INDEX IF NOT EXISTS users_is_admin_index
        ON users (is_admin);
    `);

    console.log("PostgreSQL database connection established");
  } finally {
    client.release();
  }
};

const query = (text, params) => pool.query(text, params);

module.exports = {
  pool,
  connectDatabase,
  query
};
