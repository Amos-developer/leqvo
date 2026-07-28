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
  client.release();
  console.log("PostgreSQL database connection established");
};

const query = (text, params) => pool.query(text, params);

module.exports = {
  pool,
  connectDatabase,
  query
};
