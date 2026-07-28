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

const createDepositsTable = async () => {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS deposits (
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
    CREATE UNIQUE INDEX IF NOT EXISTS deposits_pending_user_currency_network_unique
      ON deposits (user_id, pay_currency, pay_network)
      WHERE status IN ('waiting', 'confirming', 'confirmed');
  `);

  await pool.query(`
    ALTER TABLE deposits
      ADD COLUMN IF NOT EXISTS price_amount NUMERIC(18, 8) NOT NULL DEFAULT 0,
      ADD COLUMN IF NOT EXISTS actually_paid NUMERIC(18, 8) NOT NULL DEFAULT 0,
      ADD COLUMN IF NOT EXISTS actually_paid_at_fiat NUMERIC(18, 8) NOT NULL DEFAULT 0,
      ADD COLUMN IF NOT EXISTS credited_at TIMESTAMPTZ;
  `);
};

createDepositsTable()
  .then(() => {
    console.log("Deposits table ready");
  })
  .catch((error) => {
    console.error("Failed to create deposits table:", error.message);
    process.exitCode = 1;
  })
  .finally(() => {
    pool.end();
  });
