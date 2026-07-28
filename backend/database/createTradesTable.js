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

const createTradesTable = async () => {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS trades (
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
    ALTER TABLE trades
      ADD COLUMN IF NOT EXISTS user_id VARCHAR(10) REFERENCES users(id) ON DELETE CASCADE,
      ADD COLUMN IF NOT EXISTS username VARCHAR(80),
      ADD COLUMN IF NOT EXISTS pair VARCHAR(20),
      ADD COLUMN IF NOT EXISTS symbol VARCHAR(20),
      ADD COLUMN IF NOT EXISTS signal_code VARCHAR(80),
      ADD COLUMN IF NOT EXISTS allocation_percent NUMERIC(5, 2),
      ADD COLUMN IF NOT EXISTS amount NUMERIC(18, 8),
      ADD COLUMN IF NOT EXISTS entry_price NUMERIC(18, 8) NOT NULL DEFAULT 0,
      ADD COLUMN IF NOT EXISTS exit_price NUMERIC(18, 8),
      ADD COLUMN IF NOT EXISTS pnl_amount NUMERIC(18, 8) NOT NULL DEFAULT 0,
      ADD COLUMN IF NOT EXISTS pnl_percent NUMERIC(8, 4) NOT NULL DEFAULT 0,
      ADD COLUMN IF NOT EXISTS status VARCHAR(20) NOT NULL DEFAULT 'active',
      ADD COLUMN IF NOT EXISTS opened_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      ADD COLUMN IF NOT EXISTS closed_at TIMESTAMPTZ,
      ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW();
  `);

  await pool.query(`
    CREATE INDEX IF NOT EXISTS trades_user_id_status_index
      ON trades (user_id, status);
  `);

  await pool.query(`
    CREATE INDEX IF NOT EXISTS trades_created_at_index
      ON trades (created_at DESC);
  `);
};

createTradesTable()
  .then(() => {
    console.log("Trades table ready");
  })
  .catch((error) => {
    console.error("Failed to create trades table:", error.message);
    process.exitCode = 1;
  })
  .finally(() => {
    pool.end();
  });
