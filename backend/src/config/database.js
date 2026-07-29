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
      CREATE TABLE IF NOT EXISTS users (
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

    await client.query(`
      ALTER TABLE users
        ADD COLUMN IF NOT EXISTS is_admin BOOLEAN NOT NULL DEFAULT FALSE;
    `);

    await client.query(`
      ALTER TABLE users
        ADD COLUMN IF NOT EXISTS email_verified BOOLEAN NOT NULL DEFAULT FALSE;
    `);

    await client.query(`
      CREATE INDEX IF NOT EXISTS users_is_admin_index
        ON users (is_admin);
    `);

    await client.query(`
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

    await client.query(`
      CREATE UNIQUE INDEX IF NOT EXISTS deposits_pending_user_currency_network_unique
        ON deposits (user_id, pay_currency, pay_network)
        WHERE status IN ('waiting', 'confirming', 'confirmed');
    `);

    await client.query(`
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

    await client.query(`
      CREATE INDEX IF NOT EXISTS trades_user_id_status_index
        ON trades (user_id, status);
    `);

    await client.query(`
      CREATE INDEX IF NOT EXISTS trades_created_at_index
        ON trades (created_at DESC);
    `);

    await client.query(`
      CREATE TABLE IF NOT EXISTS withdrawals (
        id SERIAL PRIMARY KEY,
        user_id VARCHAR(10) NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        username VARCHAR(80) NOT NULL,
        amount NUMERIC(18, 8) NOT NULL,
        fee_amount NUMERIC(18, 8) NOT NULL DEFAULT 0,
        asset VARCHAR(20) NOT NULL DEFAULT 'USDT',
        network VARCHAR(40) NOT NULL DEFAULT 'bep20',
        address TEXT NOT NULL DEFAULT '',
        status VARCHAR(30) NOT NULL DEFAULT 'pending',
        requested_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        processed_at TIMESTAMPTZ,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );
    `);

    await client.query(`
      CREATE INDEX IF NOT EXISTS withdrawals_user_id_status_index
        ON withdrawals (user_id, status);
    `);

    await client.query(`
      CREATE INDEX IF NOT EXISTS withdrawals_created_at_index
        ON withdrawals (created_at DESC);
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
