require("dotenv").config();

const { Pool } = require("pg");

const pool = new Pool({
  host: process.env.DB_HOST || "localhost",
  port: Number(process.env.DB_PORT) || 5432,
  database: process.env.DB_NAME || "leqvo",
  user: process.env.DB_USER || "postgres",
  password: process.env.DB_PASSWORD || "postgres",
  ssl: process.env.DB_SSL === "true" ? { rejectUnauthorized: false } : false
});

pool
  .query(
    `SELECT column_name
     FROM information_schema.columns
     WHERE table_name = 'users'
     ORDER BY ordinal_position`
  )
  .then((result) => {
    console.log(result.rows.map((row) => row.column_name).join(", "));
  })
  .catch((error) => {
    console.error("Failed to check users table:", error.message);
    process.exitCode = 1;
  })
  .finally(() => {
    pool.end();
  });
