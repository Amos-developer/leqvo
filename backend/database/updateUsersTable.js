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

const updateUsersTable = async () => {
  await pool.query(`
    ALTER TABLE users
      ADD COLUMN IF NOT EXISTS is_admin BOOLEAN NOT NULL DEFAULT FALSE;
  `);

  await pool.query(`
    CREATE INDEX IF NOT EXISTS users_is_admin_index
      ON users (is_admin);
  `);
};

updateUsersTable()
  .then(() => {
    console.log("Users table updated successfully");
  })
  .catch((error) => {
    console.error("Failed to update users table:", error.message);
    process.exitCode = 1;
  })
  .finally(() => {
    pool.end();
  });
