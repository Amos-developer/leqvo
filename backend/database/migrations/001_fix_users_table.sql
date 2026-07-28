\connect leqvo;

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

ALTER TABLE users
  ADD COLUMN IF NOT EXISTS id UUID DEFAULT uuid_generate_v4(),
  ADD COLUMN IF NOT EXISTS username VARCHAR(80),
  ADD COLUMN IF NOT EXISTS email VARCHAR(160),
  ADD COLUMN IF NOT EXISTS password TEXT,
  ADD COLUMN IF NOT EXISTS referral_code CHAR(6),
  ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW();

UPDATE users
SET id = uuid_generate_v4()
WHERE id IS NULL;

ALTER TABLE users
  ALTER COLUMN id SET NOT NULL,
  ALTER COLUMN username SET NOT NULL,
  ALTER COLUMN email SET NOT NULL,
  ALTER COLUMN password SET NOT NULL,
  ALTER COLUMN referral_code SET NOT NULL;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'users_pkey'
  ) THEN
    ALTER TABLE users ADD CONSTRAINT users_pkey PRIMARY KEY (id);
  END IF;
END $$;

CREATE UNIQUE INDEX IF NOT EXISTS users_username_unique ON users (username);
CREATE UNIQUE INDEX IF NOT EXISTS users_email_unique ON users (email);
CREATE UNIQUE INDEX IF NOT EXISTS users_referral_code_unique ON users (referral_code);
