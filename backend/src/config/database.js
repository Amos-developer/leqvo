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
        referred_by VARCHAR(10) REFERENCES users(id) ON DELETE SET NULL,
        balance NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
        trading_balance NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
        trading_started_at TIMESTAMPTZ,
        trading_unlocks_at TIMESTAMPTZ,
        trial_bonus_amount NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
        trial_bonus_expires_at TIMESTAMPTZ,
        trial_bonus_expired BOOLEAN NOT NULL DEFAULT FALSE,
        withdrawal_pin TEXT,
        withdrawal_pin_set_at TIMESTAMPTZ,
        withdrawal_asset VARCHAR(20),
        withdrawal_network VARCHAR(40),
        withdrawal_address TEXT,
        withdrawal_address_status VARCHAR(20) NOT NULL DEFAULT 'not_set',
        withdrawal_address_note TEXT,
        withdrawal_address_reviewed_by VARCHAR(10) REFERENCES users(id) ON DELETE SET NULL,
        withdrawal_address_reviewed_at TIMESTAMPTZ,
        withdrawal_address_submitted_at TIMESTAMPTZ,
        pending_withdrawal_asset VARCHAR(20),
        pending_withdrawal_network VARCHAR(40),
        pending_withdrawal_address TEXT,
        pending_withdrawal_status VARCHAR(20) NOT NULL DEFAULT 'not_set',
        pending_withdrawal_note TEXT,
        pending_withdrawal_reviewed_by VARCHAR(10) REFERENCES users(id) ON DELETE SET NULL,
        pending_withdrawal_reviewed_at TIMESTAMPTZ,
        pending_withdrawal_submitted_at TIMESTAMPTZ,
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
      ALTER TABLE users
        ADD COLUMN IF NOT EXISTS referred_by VARCHAR(10) REFERENCES users(id) ON DELETE SET NULL;
    `);

    await client.query(`
      ALTER TABLE users
        ADD COLUMN IF NOT EXISTS trading_balance NUMERIC(12, 2) NOT NULL DEFAULT 0.00;
    `);

    await client.query(`
      ALTER TABLE users
        ADD COLUMN IF NOT EXISTS trading_started_at TIMESTAMPTZ;
    `);

    await client.query(`
      ALTER TABLE users
        ADD COLUMN IF NOT EXISTS trading_unlocks_at TIMESTAMPTZ;
    `);

    await client.query(`
      ALTER TABLE users
        ADD COLUMN IF NOT EXISTS trial_bonus_amount NUMERIC(12, 2) NOT NULL DEFAULT 0.00;
    `);

    await client.query(`
      ALTER TABLE users
        ADD COLUMN IF NOT EXISTS trial_bonus_expires_at TIMESTAMPTZ;
    `);

    await client.query(`
      ALTER TABLE users
        ADD COLUMN IF NOT EXISTS trial_bonus_expired BOOLEAN NOT NULL DEFAULT FALSE;
    `);

    await client.query(`
      ALTER TABLE users
        ADD COLUMN IF NOT EXISTS withdrawal_pin TEXT;
    `);

    await client.query(`
      ALTER TABLE users
        ADD COLUMN IF NOT EXISTS withdrawal_pin_set_at TIMESTAMPTZ;
    `);

    await client.query(`
      ALTER TABLE users
        ADD COLUMN IF NOT EXISTS withdrawal_asset VARCHAR(20);
    `);

    await client.query(`
      ALTER TABLE users
        ADD COLUMN IF NOT EXISTS withdrawal_network VARCHAR(40);
    `);

    await client.query(`
      ALTER TABLE users
        ADD COLUMN IF NOT EXISTS withdrawal_address TEXT;
    `);

    await client.query(`
      ALTER TABLE users
        ADD COLUMN IF NOT EXISTS withdrawal_address_status VARCHAR(20) NOT NULL DEFAULT 'not_set';
    `);

    await client.query(`
      ALTER TABLE users
        ADD COLUMN IF NOT EXISTS withdrawal_address_note TEXT;
    `);

    await client.query(`
      ALTER TABLE users
        ADD COLUMN IF NOT EXISTS withdrawal_address_reviewed_by VARCHAR(10) REFERENCES users(id) ON DELETE SET NULL;
    `);

    await client.query(`
      ALTER TABLE users
        ADD COLUMN IF NOT EXISTS withdrawal_address_reviewed_at TIMESTAMPTZ;
    `);

    await client.query(`
      ALTER TABLE users
        ADD COLUMN IF NOT EXISTS withdrawal_address_submitted_at TIMESTAMPTZ;
    `);

    await client.query(`
      ALTER TABLE users
        ADD COLUMN IF NOT EXISTS pending_withdrawal_asset VARCHAR(20);
    `);

    await client.query(`
      ALTER TABLE users
        ADD COLUMN IF NOT EXISTS pending_withdrawal_network VARCHAR(40);
    `);

    await client.query(`
      ALTER TABLE users
        ADD COLUMN IF NOT EXISTS pending_withdrawal_address TEXT;
    `);

    await client.query(`
      ALTER TABLE users
        ADD COLUMN IF NOT EXISTS pending_withdrawal_status VARCHAR(20) NOT NULL DEFAULT 'not_set';
    `);

    await client.query(`
      ALTER TABLE users
        ADD COLUMN IF NOT EXISTS pending_withdrawal_note TEXT;
    `);

    await client.query(`
      ALTER TABLE users
        ADD COLUMN IF NOT EXISTS pending_withdrawal_reviewed_by VARCHAR(10) REFERENCES users(id) ON DELETE SET NULL;
    `);

    await client.query(`
      ALTER TABLE users
        ADD COLUMN IF NOT EXISTS pending_withdrawal_reviewed_at TIMESTAMPTZ;
    `);

    await client.query(`
      ALTER TABLE users
        ADD COLUMN IF NOT EXISTS pending_withdrawal_submitted_at TIMESTAMPTZ;
    `);

    await client.query(`
      CREATE INDEX IF NOT EXISTS users_withdrawal_address_status_index
        ON users (withdrawal_address_status);
    `);

    await client.query(`
      CREATE INDEX IF NOT EXISTS users_pending_withdrawal_status_index
        ON users (pending_withdrawal_status);
    `);

    await client.query(`
      UPDATE users
      SET pending_withdrawal_asset = withdrawal_asset,
          pending_withdrawal_network = withdrawal_network,
          pending_withdrawal_address = withdrawal_address,
          pending_withdrawal_status = withdrawal_address_status,
          pending_withdrawal_note = withdrawal_address_note,
          pending_withdrawal_reviewed_by = withdrawal_address_reviewed_by,
          pending_withdrawal_reviewed_at = withdrawal_address_reviewed_at,
          pending_withdrawal_submitted_at = withdrawal_address_submitted_at,
          withdrawal_asset = NULL,
          withdrawal_network = NULL,
          withdrawal_address = NULL,
          withdrawal_address_status = 'not_set',
          withdrawal_address_note = NULL,
          withdrawal_address_reviewed_by = NULL,
          withdrawal_address_reviewed_at = NULL,
          withdrawal_address_submitted_at = NULL
      WHERE withdrawal_address_status = 'pending'
        AND withdrawal_address IS NOT NULL
        AND pending_withdrawal_address IS NULL;
    `);

    await client.query(`
      CREATE INDEX IF NOT EXISTS users_is_admin_index
        ON users (is_admin);
    `);

    await client.query(`
      CREATE TABLE IF NOT EXISTS account_transfers (
        id SERIAL PRIMARY KEY,
        user_id VARCHAR(10) NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        username VARCHAR(80) NOT NULL,
        from_account VARCHAR(20) NOT NULL,
        to_account VARCHAR(20) NOT NULL,
        amount NUMERIC(18, 8) NOT NULL,
        fee_amount NUMERIC(18, 8) NOT NULL DEFAULT 0,
        net_amount NUMERIC(18, 8) NOT NULL DEFAULT 0,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        CONSTRAINT account_transfers_account_check
          CHECK (from_account IN ('main', 'trading') AND to_account IN ('main', 'trading')),
        CONSTRAINT account_transfers_direction_check CHECK (from_account <> to_account),
        CONSTRAINT account_transfers_amount_check CHECK (amount > 0)
      );
    `);

    await client.query(`
      CREATE INDEX IF NOT EXISTS account_transfers_user_id_created_at_index
        ON account_transfers (user_id, created_at DESC);
    `);

    await client.query(`
      ALTER TABLE account_transfers
        ADD COLUMN IF NOT EXISTS fee_amount NUMERIC(18, 8) NOT NULL DEFAULT 0;
    `);

    await client.query(`
      ALTER TABLE account_transfers
        ADD COLUMN IF NOT EXISTS net_amount NUMERIC(18, 8) NOT NULL DEFAULT 0;
    `);

    await client.query(`
      UPDATE account_transfers
      SET net_amount = amount
      WHERE net_amount = 0;
    `);

    await client.query(`
      UPDATE users u
      SET trading_started_at = first_transfer.first_trading_entry,
          trading_unlocks_at = first_transfer.first_trading_entry + INTERVAL '10 days'
      FROM (
        SELECT user_id, MIN(created_at) AS first_trading_entry
        FROM account_transfers
        WHERE from_account = 'main'
          AND to_account = 'trading'
        GROUP BY user_id
      ) first_transfer
      WHERE u.id = first_transfer.user_id
        AND u.trading_started_at IS NULL;
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
        target_profit_percent NUMERIC(8, 4) NOT NULL DEFAULT 0,
        settles_at TIMESTAMPTZ,
        pnl_amount NUMERIC(18, 8) NOT NULL DEFAULT 0,
        pnl_percent NUMERIC(8, 4) NOT NULL DEFAULT 0,
        status VARCHAR(20) NOT NULL DEFAULT 'active',
        is_trial_trade BOOLEAN NOT NULL DEFAULT FALSE,
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
      CREATE INDEX IF NOT EXISTS trades_user_id_opened_at_index
        ON trades (user_id, opened_at DESC);
    `);

    await client.query(`
      ALTER TABLE trades
        ADD COLUMN IF NOT EXISTS is_trial_trade BOOLEAN NOT NULL DEFAULT FALSE;
    `);

    await client.query(`
      ALTER TABLE trades
        ADD COLUMN IF NOT EXISTS target_profit_percent NUMERIC(8, 4) NOT NULL DEFAULT 0;
    `);

    await client.query(`
      ALTER TABLE trades
        ADD COLUMN IF NOT EXISTS settles_at TIMESTAMPTZ;
    `);

    await client.query(`
      UPDATE trades t
      SET target_profit_percent = COALESCE(cs.profit_percent, t.target_profit_percent),
          settles_at = COALESCE(cs.valid_to, t.settles_at)
      FROM copy_signals cs
      WHERE t.signal_code = cs.signal_code
        AND (t.target_profit_percent = 0 OR t.settles_at IS NULL);
    `);

    await client.query(`
      UPDATE trades t
      SET is_trial_trade = TRUE
      WHERE NOT EXISTS (
        SELECT 1
        FROM account_transfers at
        WHERE at.user_id = t.user_id
          AND at.from_account = 'main'
          AND at.to_account = 'trading'
          AND at.created_at <= t.opened_at
      );
    `);

    await client.query(`
      CREATE TABLE IF NOT EXISTS copy_signals (
        id SERIAL PRIMARY KEY,
        pair VARCHAR(20) NOT NULL,
        currency VARCHAR(20) NOT NULL,
        signal_code VARCHAR(80) NOT NULL UNIQUE,
        profit_percent NUMERIC(8, 4) NOT NULL,
        min_deposit_required NUMERIC(18, 8) NOT NULL DEFAULT 0,
        valid_from TIMESTAMPTZ NOT NULL,
        valid_to TIMESTAMPTZ NOT NULL,
        status VARCHAR(20) NOT NULL DEFAULT 'active',
        created_by VARCHAR(10) REFERENCES users(id) ON DELETE SET NULL,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        CONSTRAINT copy_signals_status_check CHECK (status IN ('active', 'expired', 'cancelled')),
        CONSTRAINT copy_signals_window_check CHECK (valid_to > valid_from)
      );
    `);

    await client.query(`
      CREATE INDEX IF NOT EXISTS copy_signals_valid_from_index
        ON copy_signals (valid_from DESC);
    `);

    await client.query(`
      ALTER TABLE copy_signals
        ADD COLUMN IF NOT EXISTS min_deposit_required NUMERIC(18, 8) NOT NULL DEFAULT 0;
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

    await client.query(`
      DO $$
      BEGIN
        IF to_regclass('public.withdrawal_addresses') IS NOT NULL THEN
          UPDATE users u
          SET withdrawal_asset = latest.asset,
              withdrawal_network = latest.network,
              withdrawal_address = latest.address,
              withdrawal_address_status = latest.status,
              withdrawal_address_note = latest.note,
              withdrawal_address_reviewed_by = latest.reviewed_by,
              withdrawal_address_reviewed_at = latest.reviewed_at,
              withdrawal_address_submitted_at = latest.submitted_at,
              updated_at = NOW()
          FROM (
            SELECT DISTINCT ON (user_id)
              user_id,
              asset,
              network,
              address,
              status,
              note,
              reviewed_by,
              reviewed_at,
              submitted_at
            FROM withdrawal_addresses
            ORDER BY user_id, submitted_at DESC
          ) latest
          WHERE u.id = latest.user_id
            AND u.withdrawal_address IS NULL;

          DROP TABLE withdrawal_addresses;
        END IF;
      END $$;
    `);

    await client.query(`
      CREATE TABLE IF NOT EXISTS withdrawal_address_codes (
        id SERIAL PRIMARY KEY,
        user_id VARCHAR(10) NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        code CHAR(6) NOT NULL,
        expires_at TIMESTAMPTZ NOT NULL,
        used_at TIMESTAMPTZ,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );
    `);

    await client.query(`
      CREATE INDEX IF NOT EXISTS withdrawal_address_codes_user_id_created_at_index
        ON withdrawal_address_codes (user_id, created_at DESC);
    `);

    await client.query(`
      CREATE TABLE IF NOT EXISTS teams (
        id SERIAL PRIMARY KEY,
        user_id VARCHAR(10) NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        member_id VARCHAR(10) NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        level INT NOT NULL CHECK (level BETWEEN 1 AND 5),
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        UNIQUE (user_id, member_id)
      );
    `);

    await client.query(`
      CREATE INDEX IF NOT EXISTS teams_user_id_level_index
        ON teams (user_id, level);
    `);

    await client.query(`
      CREATE TABLE IF NOT EXISTS lucky_box (
        id SERIAL PRIMARY KEY,
        user_id VARCHAR(10) NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        username VARCHAR(80) NOT NULL,
        box_number INT NOT NULL CHECK (box_number BETWEEN 1 AND 9),
        prize_amount NUMERIC(12, 2) NOT NULL,
        source_type VARCHAR(20),
        source_user_id VARCHAR(10) REFERENCES users(id) ON DELETE SET NULL,
        qualifying_deposit_id INT REFERENCES deposits(id) ON DELETE SET NULL,
        opened_on DATE NOT NULL DEFAULT CURRENT_DATE,
        opened_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );
    `);

    await client.query(`
      ALTER TABLE lucky_box
        ADD COLUMN IF NOT EXISTS source_type VARCHAR(20);
    `);

    await client.query(`
      ALTER TABLE lucky_box
        ADD COLUMN IF NOT EXISTS source_user_id VARCHAR(10) REFERENCES users(id) ON DELETE SET NULL;
    `);

    await client.query(`
      ALTER TABLE lucky_box
        ADD COLUMN IF NOT EXISTS qualifying_deposit_id INT REFERENCES deposits(id) ON DELETE SET NULL;
    `);

    await client.query(`
      DO $$
      BEGIN
        IF EXISTS (
          SELECT 1
          FROM information_schema.table_constraints
          WHERE table_name = 'lucky_box'
            AND constraint_name = 'lucky_box_user_id_opened_on_key'
        ) THEN
          ALTER TABLE lucky_box DROP CONSTRAINT lucky_box_user_id_opened_on_key;
        END IF;
      END $$;
    `);

    await client.query(`
      CREATE INDEX IF NOT EXISTS lucky_box_user_id_opened_at_index
        ON lucky_box (user_id, opened_at DESC);
    `);

    await client.query(`
      CREATE UNIQUE INDEX IF NOT EXISTS lucky_box_source_type_deposit_unique
        ON lucky_box (source_type, qualifying_deposit_id)
        WHERE source_type IS NOT NULL AND qualifying_deposit_id IS NOT NULL;
    `);

    await client.query(`
      CREATE TABLE IF NOT EXISTS leadership (
        id SERIAL PRIMARY KEY,
        user_id VARCHAR(10) NOT NULL UNIQUE REFERENCES users(id) ON DELETE CASCADE,
        username VARCHAR(80) NOT NULL,
        rank_level INT NOT NULL DEFAULT 0 CHECK (rank_level BETWEEN 0 AND 5),
        rank_name VARCHAR(60) NOT NULL DEFAULT 'No rank',
        active_level_one_members INT NOT NULL DEFAULT 0,
        level_one_deposit NUMERIC(18, 8) NOT NULL DEFAULT 0,
        level_two_three_deposit NUMERIC(18, 8) NOT NULL DEFAULT 0,
        one_time_reward NUMERIC(18, 8) NOT NULL DEFAULT 0,
        weekly_salary NUMERIC(18, 8) NOT NULL DEFAULT 0,
        is_qualified BOOLEAN NOT NULL DEFAULT FALSE,
        next_rank_name VARCHAR(60),
        members_needed INT NOT NULL DEFAULT 0,
        level_one_deposit_needed NUMERIC(18, 8) NOT NULL DEFAULT 0,
        level_two_three_deposit_needed NUMERIC(18, 8) NOT NULL DEFAULT 0,
        last_calculated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );
    `);

    await client.query(`
      CREATE INDEX IF NOT EXISTS leadership_rank_level_index
        ON leadership (rank_level);
    `);

    await client.query(`
      CREATE TABLE IF NOT EXISTS leadership_rewards (
        id SERIAL PRIMARY KEY,
        user_id VARCHAR(10) NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        username VARCHAR(80) NOT NULL,
        leadership_id INT REFERENCES leadership(id) ON DELETE SET NULL,
        reward_type VARCHAR(30) NOT NULL,
        amount NUMERIC(18, 8) NOT NULL,
        note TEXT,
        granted_by VARCHAR(10) REFERENCES users(id) ON DELETE SET NULL,
        granted_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );
    `);

    await client.query(`
      CREATE INDEX IF NOT EXISTS leadership_rewards_user_id_granted_at_index
        ON leadership_rewards (user_id, granted_at DESC);
    `);

    await client.query(`
      CREATE TABLE IF NOT EXISTS daily_spin (
        id SERIAL PRIMARY KEY,
        user_id VARCHAR(10) NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        username VARCHAR(80) NOT NULL,
        spin_date DATE NOT NULL DEFAULT CURRENT_DATE,
        streak_day INT NOT NULL DEFAULT 1,
        prize_label VARCHAR(80) NOT NULL,
        prize_amount NUMERIC(12, 2) NOT NULL DEFAULT 0,
        segment_index INT NOT NULL DEFAULT 0,
        spun_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        UNIQUE (user_id, spin_date)
      );
    `);

    await client.query(`
      CREATE INDEX IF NOT EXISTS daily_spin_user_id_spun_at_index
        ON daily_spin (user_id, spun_at DESC);
    `);

    await client.query(`
      CREATE TABLE IF NOT EXISTS rewards (
        id SERIAL PRIMARY KEY,
        user_id VARCHAR(10) NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        username VARCHAR(80) NOT NULL,
        source VARCHAR(40) NOT NULL,
        title VARCHAR(120) NOT NULL,
        amount NUMERIC(18, 8) NOT NULL DEFAULT 0,
        status VARCHAR(30) NOT NULL DEFAULT 'credited',
        reference_id VARCHAR(80),
        awarded_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );
    `);

    await client.query(`
      CREATE UNIQUE INDEX IF NOT EXISTS rewards_source_reference_unique
        ON rewards (source, reference_id)
        WHERE reference_id IS NOT NULL;
    `);

    await client.query(`
      CREATE INDEX IF NOT EXISTS rewards_user_id_awarded_at_index
        ON rewards (user_id, awarded_at DESC);
    `);

    await client.query(`
      CREATE TABLE IF NOT EXISTS password_change_codes (
        id SERIAL PRIMARY KEY,
        user_id VARCHAR(10) NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        code CHAR(6) NOT NULL,
        expires_at TIMESTAMPTZ NOT NULL,
        used_at TIMESTAMPTZ,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );
    `);

    await client.query(`
      CREATE INDEX IF NOT EXISTS password_change_codes_user_id_created_at_index
        ON password_change_codes (user_id, created_at DESC);
    `);

    await client.query(`
      CREATE TABLE IF NOT EXISTS withdrawal_pin_codes (
        id SERIAL PRIMARY KEY,
        user_id VARCHAR(10) NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        code CHAR(6) NOT NULL,
        expires_at TIMESTAMPTZ NOT NULL,
        used_at TIMESTAMPTZ,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );
    `);

    await client.query(`
      CREATE INDEX IF NOT EXISTS withdrawal_pin_codes_user_id_created_at_index
        ON withdrawal_pin_codes (user_id, created_at DESC);
    `);

    await client.query(`
      CREATE TABLE IF NOT EXISTS kyc_submissions (
        id SERIAL PRIMARY KEY,
        user_id VARCHAR(10) NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        username VARCHAR(80) NOT NULL,
        email VARCHAR(160) NOT NULL,
        id_front TEXT NOT NULL,
        id_back TEXT NOT NULL,
        selfie TEXT NOT NULL,
        status VARCHAR(20) NOT NULL DEFAULT 'pending',
        note TEXT,
        reviewed_by VARCHAR(10) REFERENCES users(id) ON DELETE SET NULL,
        reviewed_at TIMESTAMPTZ,
        submitted_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        CONSTRAINT kyc_submissions_status_check CHECK (status IN ('pending', 'approved', 'rejected'))
      );
    `);

    await client.query(`
      CREATE INDEX IF NOT EXISTS kyc_submissions_user_id_status_index
        ON kyc_submissions (user_id, status);
    `);

    await client.query(`
      CREATE INDEX IF NOT EXISTS kyc_submissions_status_submitted_at_index
        ON kyc_submissions (status, submitted_at DESC);
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
