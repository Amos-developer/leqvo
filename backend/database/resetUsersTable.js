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
  await pool.query("DROP TABLE IF EXISTS trades;");
  await pool.query("DROP TABLE IF EXISTS deposits;");
  await pool.query("DROP TABLE IF EXISTS users;");
  await pool.query(`
    CREATE TABLE users (
      id VARCHAR(10) PRIMARY KEY,
      username VARCHAR(80) NOT NULL UNIQUE,
      email VARCHAR(160) NOT NULL UNIQUE,
      password TEXT NOT NULL,
      referral_code CHAR(6) NOT NULL UNIQUE,
      balance NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
      is_admin BOOLEAN NOT NULL DEFAULT FALSE,
      email_verified BOOLEAN NOT NULL DEFAULT FALSE,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
  `);
  await pool.query(`
    CREATE TABLE deposits (
      id SERIAL PRIMARY KEY,
      user_id VARCHAR(10) NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      username VARCHAR(80) NOT NULL,
      price_amount NUMERIC(18, 8) NOT NULL DEFAULT 0,
      pay_amount NUMERIC(18, 8) NOT NULL,
      actually_paid NUMERIC(18, 8) NOT NULL DEFAULT 0,
      actually_paid_at_fiat NUMERIC(18, 8) NOT NULL DEFAULT 0,
      pay_currency VARCHAR(40) NOT NULL,
      pay_network VARCHAR(40) NOT NULL,
      pay_id VARCHAR(80) NOT NULL UNIQUE,
      pay_address TEXT NOT NULL,
      qr_code TEXT NOT NULL,
      status VARCHAR(40) NOT NULL DEFAULT 'waiting',
      credited_at TIMESTAMPTZ,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
  `);
  await pool.query(`
    CREATE UNIQUE INDEX deposits_pending_user_currency_network_unique
      ON deposits (user_id, pay_currency, pay_network)
      WHERE status IN ('waiting', 'confirming', 'confirmed');
  `);
  await pool.query(`
    CREATE TABLE trades (
      id SERIAL PRIMARY KEY,
      user_id VARCHAR(10) NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      username VARCHAR(80) NOT NULL,
      pair VARCHAR(20) NOT NULL,
      symbol VARCHAR(20) NOT NULL,
      signal_code VARCHAR(80) NOT NULL,
      allocation_percent NUMERIC(5, 2) NOT NULL,
      amount NUMERIC(18, 8) NOT NULL,
      entry_price NUMERIC(18, 8) NOT NULL DEFAULT 0,
      exit_price NUMERIC(18, 8),
      pnl_amount NUMERIC(18, 8) NOT NULL DEFAULT 0,
      pnl_percent NUMERIC(8, 4) NOT NULL DEFAULT 0,
      status VARCHAR(20) NOT NULL DEFAULT 'active',
      opened_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      closed_at TIMESTAMPTZ,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      CONSTRAINT trades_status_check CHECK (status IN ('active', 'win', 'loose'))
    );
  `);
  await pool.query(`
    CREATE INDEX trades_user_id_status_index
      ON trades (user_id, status);
  `);
  await pool.query(`
    CREATE INDEX trades_created_at_index
      ON trades (created_at DESC);
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
