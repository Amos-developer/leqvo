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

const resetUsersTable = async () => {
  await pool.query("DROP TABLE IF EXISTS users;");
  await pool.query(`
    CREATE TABLE users (
      id VARCHAR(10) PRIMARY KEY,
      username VARCHAR(80) NOT NULL UNIQUE,
      email VARCHAR(160) NOT NULL UNIQUE,
      password TEXT NOT NULL,
      referral_code CHAR(6) NOT NULL UNIQUE,
      balance NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
  `);
};

resetUsersTable()
  .then(() => {
    console.log("Users table reset successfully");
  })
  .catch((error) => {
    console.error("Failed to reset users table:", error.message);
    process.exitCode = 1;
  })
  .finally(() => {
    pool.end();
  });
