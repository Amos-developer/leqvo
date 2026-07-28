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

CREATE INDEX IF NOT EXISTS trades_user_id_status_index
  ON trades (user_id, status);

CREATE INDEX IF NOT EXISTS trades_created_at_index
  ON trades (created_at DESC);
