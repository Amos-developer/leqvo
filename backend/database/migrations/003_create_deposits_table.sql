\connect leqvo;

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

CREATE UNIQUE INDEX IF NOT EXISTS deposits_pending_user_currency_network_unique
  ON deposits (user_id, pay_currency, pay_network)
  WHERE status IN ('waiting', 'confirming', 'confirmed');
